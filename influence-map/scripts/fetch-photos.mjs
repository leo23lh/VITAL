#!/usr/bin/env node
// Downloads each person's Wikipedia lead photo, if it is freely licensed, into
// public/photos/<slug>.<ext> and records credit, license and source in the file's
// "photo" field.
//
//   node scripts/fetch-photos.mjs                 people without a photo
//   node scripts/fetch-photos.mjs peter-thiel     one person (re-fetches)
//   node scripts/fetch-photos.mjs --all           everyone (re-fetches)
//
// Needs network access to en.wikipedia.org and upload.wikimedia.org. Uses curl,
// which follows the HTTPS_PROXY settings of the machine.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, 'data', 'people');
const PHOTOS = path.join(ROOT, 'public', 'photos');
// Wikimedia asks automated clients to say who they are.
const UA = 'InfluenceMapViewer/0.1 (https://github.com/leo23lh/VITAL; personal research tool)';
// Free licenses only: Creative Commons BY / BY-SA, CC0 and public domain.
const FREE = /^(cc[ -]by(-sa)?[ -]?\d|cc0|public domain|pd\b|pd-)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** curl with retries: Wikimedia answers 429 when the shared network is busy. */
async function curl(url, out) {
  const args = ['-sS', '--fail', '-m', '30', '-A', UA, '-L', url];
  if (out) args.push('-o', out);
  for (let attempt = 0; ; attempt++) {
    try {
      return execFileSync('curl', args, { encoding: out ? undefined : 'utf8', maxBuffer: 20e6, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      if (attempt >= 5 || !/\b(429|503)\b/.test(String(e.stderr ?? e.message))) throw e;
      await sleep(5000 * 2 ** attempt);
    }
  }
}

async function api(params) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  return JSON.parse(await curl(`https://en.wikipedia.org/w/api.php?${q}`));
}

function stripHtml(s) {
  return String(s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** The person's Wikipedia article title: from a cited en.wikipedia.org URL, else their name. */
function wikiTitle(p) {
  const urls = [...(p.sources ?? []), ...(p.timeline ?? []).flatMap((t) => t.sources ?? [])]
    .map((s) => (typeof s === 'string' ? s : s.url))
    .filter(Boolean);
  const own = urls.find((u) => /en\.wikipedia\.org\/wiki\//.test(u) && decodeURIComponent(u).includes(p.name.split(' ').at(-1)));
  return own ? decodeURIComponent(own.split('/wiki/')[1]).replace(/_/g, ' ') : p.name;
}

/** Inserts or replaces the top-level "photo" field without reformatting the rest of the file. */
function writePhotoField(file, photo) {
  let text = fs.readFileSync(file, 'utf8');
  const block = `  "photo": {\n    "file": ${JSON.stringify(photo.file)},\n    "credit": ${JSON.stringify(photo.credit)},\n    "license": ${JSON.stringify(photo.license)},\n    "source": { "url": ${JSON.stringify(photo.source.url)}, "title": ${JSON.stringify(photo.source.title)} }\n  },\n`;
  text = text.replace(/^  "photo": \{[\s\S]*?^  \},\n/m, '');
  text = text.replace(/^(  "current_role": )/m, `${block}$1`);
  JSON.parse(text);
  fs.writeFileSync(file, text);
}

/** Looks up lead images and their licenses for many people in two API calls. */
async function lookup(people) {
  const titles = people.map((p) => p.title);
  const res = await api({ action: 'query', titles: titles.join('|'), redirects: '1', prop: 'pageimages', piprop: 'name' });
  // Follow the API's renames (normalization and redirects) back to the title we asked for.
  const renamed = new Map();
  for (const r of [...(res.query.normalized ?? []), ...(res.query.redirects ?? [])]) renamed.set(r.from, r.to);
  const finalTitle = (t) => {
    let cur = t;
    for (let i = 0; i < 5 && renamed.has(cur); i++) cur = renamed.get(cur);
    return cur;
  };
  const pageImage = new Map(res.query.pages.map((pg) => [pg.title, pg.pageimage]));
  for (const p of people) p.pageimage = pageImage.get(finalTitle(p.title));

  const files = [...new Set(people.map((p) => p.pageimage).filter(Boolean))];
  if (!files.length) return;
  await sleep(1500);
  const info = await api({
    action: 'query',
    titles: files.map((f) => `File:${f}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '250',
    iiextmetadatafilter: 'LicenseShortName|Artist|Credit',
  });
  const fileRenamed = new Map((info.query.normalized ?? []).map((r) => [r.from, r.to]));
  const byTitle = new Map(info.query.pages.map((pg) => [pg.title, pg]));
  for (const p of people) {
    if (!p.pageimage) continue;
    const t = `File:${p.pageimage}`;
    p.info = byTitle.get(fileRenamed.get(t) ?? t) ?? byTitle.get(t.replace(/_/g, ' '));
  }
}

async function save(p) {
  const { slug, file, info } = p;
  if (!p.pageimage) return `${slug}: no lead image on Wikipedia ("${p.title}")`;
  const ii = info?.imageinfo?.[0];
  if (!ii) return `${slug}: no image info for ${p.pageimage}`;
  if (info.imagerepository !== 'shared') return `${slug}: skipped ${p.pageimage} (not on Wikimedia Commons, likely non-free)`;
  const license = stripHtml(ii.extmetadata?.LicenseShortName?.value);
  if (!FREE.test(license)) return `${slug}: skipped ${p.pageimage} (license "${license || 'unknown'}" is not free)`;
  const credit = stripHtml(ii.extmetadata?.Artist?.value) || stripHtml(ii.extmetadata?.Credit?.value) || 'Unknown';

  // thumb.wikimedia.org isn't reachable from every network; the same file is on upload.wikimedia.org.
  const thumb = ii.thumburl.split('?')[0].replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/');
  const ext = (thumb.match(/\.(jpe?g|png|webp)$/i)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
  fs.mkdirSync(PHOTOS, { recursive: true });
  for (const old of fs.readdirSync(PHOTOS)) if (old.startsWith(`${slug}.`)) fs.rmSync(path.join(PHOTOS, old));
  await curl(thumb, path.join(PHOTOS, `${slug}.${ext}`));

  writePhotoField(file, {
    file: `${slug}.${ext}`,
    credit,
    license,
    source: { url: ii.descriptionurl, title: `${info.title} — Wikimedia Commons` },
  });
  return `${slug}: ${p.pageimage} · ${credit} · ${license}`;
}

async function main() {
  const args = process.argv.slice(2);
  const all = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  const slugs = args.includes('--all')
    ? all
    : args.length
      ? args
      : all.filter((s) => !JSON.parse(fs.readFileSync(path.join(DATA, `${s}.json`), 'utf8')).photo);
  const people = [];
  for (const slug of slugs) {
    const file = path.join(DATA, `${slug}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.public_figure === false) console.log(`${slug}: skipped (not a public figure)`);
    else people.push({ slug, file, title: wikiTitle(data) });
  }
  for (let i = 0; i < people.length; i += 40) {
    const batch = people.slice(i, i + 40);
    try {
      await lookup(batch);
    } catch (e) {
      console.log(`lookup failed (${String(e.stderr ?? e.message ?? e).split('\n')[0]}); try again later`);
      continue;
    }
    for (const p of batch) {
      await sleep(800);
      try {
        console.log(await save(p));
      } catch (e) {
        console.log(`${p.slug}: failed (${String(e.stderr ?? e.message ?? e).split('\n')[0]})`);
      }
    }
  }
}

main();

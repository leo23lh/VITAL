#!/usr/bin/env node
// Builds the public site into dist-web/: the viewer (vite --mode web) plus data.json, the
// public copy of the data (scripts/lib/public-data.mjs), link-preview tags, and a small share
// page per person at p/<slug>/ (scripts/lib/share-pages.mjs). Fails if anything private got through.
//   npm run build:web            (SITE_URL=https://… to build for another address)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { leaks, publicPayload } from './lib/public-data.mjs';
import { SITE_DESCRIPTION, SITE_TITLE, metaTags, previewOf, sharePage } from './lib/share-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-web');
// Link previews need absolute addresses.
const site = (process.env.SITE_URL ?? 'https://leo23lh.github.io/VITAL/').replace(/\/?$/, '/');

const { payload, dropped } = publicPayload(root);
const found = leaks(payload, dropped);
if (found.length) {
  console.error(`Not building: private data would reach the public site (${found.join(', ')}).`);
  process.exit(1);
}

await build({ root, mode: 'web', configFile: path.join(root, 'vite.config.ts'), logLevel: 'warn' });
fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(payload));
// Photos of people left out never ship (there are none today, but a file could gain one).
for (const d of dropped) for (const f of fs.readdirSync(path.join(out, 'photos')).filter((f) => f.startsWith(`${d.slug}.`))) fs.rmSync(path.join(out, 'photos', f));
// GitHub Pages: serve files as they are (no Jekyll processing).
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// Link previews: the map's own card on the front page, and one share page per person and
// organization (only those in the public payload, so nobody left out gets one).
const indexPath = path.join(out, 'index.html');
const front = metaTags({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: site, image: `${site}og.png`, imageAlt: SITE_TITLE, large: true });
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace('</title>', `</title>\n    ${front}`));
if (!fs.existsSync(path.join(out, 'og.png'))) console.warn('No og.png: run `npm run og-image` for the front page preview.');
fs.rmSync(path.join(out, 'p'), { recursive: true, force: true });
const shared = [...payload.people, ...payload.orgs];
for (const f of shared) {
  const dir = path.join(out, 'p', f.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), sharePage(previewOf(f, site)));
}
const strays = dropped.filter((d) => fs.existsSync(path.join(out, 'p', d.slug)));
if (strays.length) {
  console.error(`Not publishing: share pages for left-out files (${strays.map((d) => d.slug).join(', ')}).`);
  process.exit(1);
}

const mb = (p) => (fs.statSync(p).size / 1e6).toFixed(1);
console.log(
  `dist-web/: ${payload.people.length} people, ${payload.orgs.length} organizations, data.json ${mb(path.join(out, 'data.json'))} MB, ${shared.length} share pages; left out: ${dropped.map((d) => d.slug).join(', ') || 'none'}`,
);

#!/usr/bin/env node
// Checks data/people/*.json against the research rules in CLAUDE.md.
// No dependencies, so it runs with plain `node` even before `npm install`.
//
//   node scripts/validate.mjs            (from influence-map/)
//   node influence-map/scripts/validate.mjs   (from the repo root)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep in sync with src/lib/schema.ts (a unit test checks this).
export const RELATIONSHIP_TYPES = [
  'mentor',
  'protégé',
  'employer',
  'employee',
  'colleague',
  'ally',
  'rival',
  'donor',
  'funded_by',
  'co-founder',
  'family',
];

export const INVERSE_TYPE = {
  mentor: 'protégé',
  'protégé': 'mentor',
  employer: 'employee',
  employee: 'employer',
  donor: 'funded_by',
  funded_by: 'donor',
  colleague: 'colleague',
  ally: 'ally',
  rival: 'rival',
  'co-founder': 'co-founder',
  family: 'family',
};

// Keep in sync with SECTORS and GROUPS in src/lib/schema.ts (a unit test checks this).
export const SECTORS = ['politics', 'tech', 'ai-defense', 'business'];
export const GROUPS = [
  'trump-circle',
  'paypal-mafia',
  'tech-right',
  'ai-race',
  'defense-tech',
  'middle-east',
  'media',
  'critics',
];

const PRIVACY_PATTERNS = [
  { what: 'an email address', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { what: 'a phone number', re: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/ },
  { what: 'an SSN-like ID number', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  {
    what: 'a street address',
    re: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Terrace|Place|Pl)\b/,
  },
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const urlOf = (s) => (typeof s === 'string' ? s : s && typeof s === 'object' ? s.url : undefined);
const isHttp = (u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u);
const isYear = (y) => y === null || y === undefined || (Number.isInteger(y) && y > 1800 && y < 2200);

/**
 * @param {{file: string, slug: string, data: any}[]} records
 * @param {{photosDir?: string}} [opts] when given, photo files must exist there
 * @returns {{errors: {file: string, message: string}[], warnings: {file: string, message: string}[]}}
 */
export function validatePeople(records, opts = {}) {
  const errors = [];
  const warnings = [];
  const err = (file, message) => errors.push({ file, message });
  const warn = (file, message) => warnings.push({ file, message });

  const bySlug = new Map(records.map((r) => [r.slug, r]));
  const byNameSlug = new Map();
  for (const r of records) {
    for (const n of [r.data?.name, ...(r.data?.aliases ?? [])]) {
      if (typeof n === 'string' && n) byNameSlug.set(slugify(n), r.slug);
    }
  }

  for (const { file, slug, data: p } of records) {
    if (!p || typeof p !== 'object') {
      err(file, 'File is not a JSON object');
      continue;
    }
    if (!SLUG_RE.test(slug)) err(file, `File name "${slug}" is not a lowercase-hyphenated slug`);
    if (typeof p.name !== 'string' || !p.name.trim()) err(file, 'Missing "name"');
    if (typeof p.public_figure !== 'boolean') err(file, '"public_figure" must be true or false');
    if (typeof p.last_researched !== 'string' || !DATE_RE.test(p.last_researched))
      err(file, '"last_researched" must be a YYYY-MM-DD date');
    if (p.photo !== undefined) {
      const ph = p.photo;
      if (!ph || typeof ph !== 'object') err(file, '"photo" must be an object');
      else {
        if (typeof ph.file !== 'string' || !/^[a-z0-9-]+\.(jpg|png|webp)$/.test(ph.file))
          err(file, 'photo.file must be a file name like "<slug>.jpg"');
        else if (opts.photosDir && !fs.existsSync(path.join(opts.photosDir, ph.file)))
          err(file, `photo.file "${ph.file}" is missing from public/photos`);
        if (typeof ph.credit !== 'string' || !ph.credit.trim()) err(file, 'photo.credit is required (the license needs attribution)');
        if (typeof ph.license !== 'string' || !ph.license.trim()) err(file, 'photo.license is required');
        if (!isHttp(urlOf(ph.source))) err(file, 'photo.source must link to the image page');
        if (p.public_figure === false) err(file, 'Only public figures may have a photo');
      }
    }
    if (p.sector === undefined) warn(file, `No "sector"; the dot shows untinted (one of ${SECTORS.join(', ')})`);
    else if (!SECTORS.includes(p.sector)) err(file, `"sector" must be one of ${SECTORS.join(', ')}`);
    if (p.groups !== undefined) {
      if (!Array.isArray(p.groups)) err(file, '"groups" must be an array');
      else
        for (const g of p.groups)
          if (!GROUPS.includes(g)) err(file, `groups: "${g}" must be one of ${GROUPS.join(', ')}`);
    }
    for (const key of ['aliases', 'timeline', 'affiliations', 'connections']) {
      if (p[key] !== undefined && !Array.isArray(p[key])) err(file, `"${key}" must be an array`);
    }

    const researched = p.public_figure === true;
    // Files for non-public people hold only what the user provided, so "user-provided" stands in for a URL.
    const checkSources = (sources, where, { required = true } = {}) => {
      if (!Array.isArray(sources) || sources.length === 0) {
        if (required && researched) err(file, `${where}: no sources (drop it or add a source URL)`);
        return;
      }
      for (const s of sources) {
        const u = urlOf(s);
        if (isHttp(u)) continue;
        if (!researched && u === 'user-provided') continue;
        err(file, `${where}: source ${JSON.stringify(s)} is not an http(s) URL`);
      }
    };

    if (researched && (p.summary || p.current_role)) checkSources(p.sources, 'summary/current_role');

    (p.timeline ?? []).forEach((t, i) => {
      const where = `timeline[${i}] (${t?.role ?? '?'} @ ${t?.org ?? '?'})`;
      if (!t || typeof t.role !== 'string') err(file, `${where}: missing "role"`);
      if (!isYear(t?.year)) err(file, `${where}: "year" must be a year or null`);
      if (!isYear(t?.end_year)) err(file, `${where}: "end_year" must be a year or null`);
      checkSources(t?.sources, where);
    });

    (p.affiliations ?? []).forEach((a, i) => {
      if (typeof a === 'string') {
        if (researched) err(file, `affiliations[${i}] "${a}": write as {name, role, sources} so it can carry a source`);
        return;
      }
      checkSources(a?.sources, `affiliations[${i}] (${a?.name ?? '?'})`);
    });

    (p.source_conflicts ?? []).forEach((c, i) => {
      if (!c?.topic || !c?.details) err(file, `source_conflicts[${i}]: needs "topic" and "details"`);
      checkSources(c?.sources, `source_conflicts[${i}]`);
    });

    const seen = new Set();
    (p.connections ?? []).forEach((c, i) => {
      const where = `connection to ${c?.name ?? `#${i}`}`;
      if (!c || typeof c !== 'object') return err(file, `connections[${i}] is not an object`);
      if (typeof c.name !== 'string' || !c.name) err(file, `connections[${i}]: missing "name"`);
      if (typeof c.slug !== 'string' || !SLUG_RE.test(c.slug)) err(file, `${where}: "slug" must be a lowercase-hyphenated slug`);
      if (c.slug === slug) err(file, `${where}: connection to self`);
      if (!RELATIONSHIP_TYPES.includes(c.relationship_type))
        err(file, `${where}: relationship_type "${c.relationship_type}" must be one of ${RELATIONSHIP_TYPES.join(', ')}`);
      if (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1)
        err(file, `${where}: "confidence" must be a number from 0 to 1`);
      if (!isYear(c.start_year) || !isYear(c.end_year)) err(file, `${where}: start_year/end_year must be years or null`);
      if (!c.description) warn(file, `${where}: no description`);
      checkSources(c.sources, where);

      const key = `${c.slug}|${c.relationship_type}`;
      if (seen.has(key)) err(file, `${where}: duplicate ${c.relationship_type} record — merge them`);
      seen.add(key);

      const target = bySlug.get(c.slug);
      if (!target) {
        const existing = byNameSlug.get(slugify(c.name ?? ''));
        if (existing && existing !== slug)
          err(file, `${where}: slug "${c.slug}" has no file, but ${existing}.json is this person — use slug "${existing}"`);
        if (c.relationship_type === 'family')
          warn(file, `${where}: family link to someone without a file — confirm the relative is a public figure`);
        return;
      }

      if (c.relationship_type === 'family' && target.data?.public_figure === false)
        err(file, `${where}: family links are only allowed to relatives who are public figures`);

      // Reciprocity: the other person's file must point back with the inverse type.
      if (!researched || !RELATIONSHIP_TYPES.includes(c.relationship_type)) return;
      const inverse = INVERSE_TYPE[c.relationship_type];
      const back = (target.data?.connections ?? []).filter((b) => b?.slug === slug);
      if (back.length === 0) {
        err(file, `${where}: ${target.file} has no connection back to "${slug}" (add a "${inverse}" record there)`);
      } else if (!back.some((b) => b.relationship_type === inverse)) {
        err(
          file,
          `${where}: ${target.file} links back as ${back.map((b) => `"${b.relationship_type}"`).join('/')} but the inverse of "${c.relationship_type}" is "${inverse}"`,
        );
      }
    });

    for (const { path: at, value } of textValues(p)) {
      for (const { what, re } of PRIVACY_PATTERNS) {
        if (re.test(value)) err(file, `${at} looks like it contains ${what} — remove it (public-role information only)`);
      }
    }
  }

  return { errors, warnings };
}

/** Every string in the file except URLs. */
function* textValues(value, at = '') {
  if (typeof value === 'string') {
    if (!isHttp(value)) yield { path: at || '(root)', value };
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* textValues(value[i], `${at}[${i}]`);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'url') continue;
      yield* textValues(v, at ? `${at}.${k}` : k);
    }
  }
}

export function loadDir(dir) {
  const records = [];
  const parseErrors = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      records.push({ file, slug: file.replace(/\.json$/, ''), data: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) });
    } catch (e) {
      parseErrors.push({ file, message: `Invalid JSON: ${e.message}` });
    }
  }
  return { records, parseErrors };
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(process.argv[2] ?? path.join(here, '..', 'data', 'people'));
  if (!fs.existsSync(dir)) {
    console.error(`No data directory at ${dir}`);
    process.exit(1);
  }
  const { records, parseErrors } = loadDir(dir);
  const { errors, warnings } = validatePeople(records, { photosDir: path.join(dir, '..', '..', 'public', 'photos') });
  const all = [...parseErrors, ...errors];

  for (const w of warnings) console.log(`warning  ${w.file}: ${w.message}`);
  for (const e of all) console.log(`ERROR    ${e.file}: ${e.message}`);

  const people = records.length;
  const links = records.reduce((n, r) => n + (r.data?.connections?.length ?? 0), 0);
  console.log(
    `\n${people} people, ${links} connection records — ${all.length} error(s), ${warnings.length} warning(s)`,
  );
  process.exit(all.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

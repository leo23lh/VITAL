#!/usr/bin/env node
// Checks data/people/*.json and data/orgs/*.json against the research rules in CLAUDE.md.
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
  'enemy',
  'donor',
  'funded_by',
  'co-founder',
  'family',
  'friend',
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
  enemy: 'enemy',
  'co-founder': 'co-founder',
  family: 'family',
  friend: 'friend',
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
  '2028-race',
  'natcon',
];

// Keep in sync with RECIPIENT_KINDS and GIVING_SIDES in src/lib/schema.ts (a unit test checks this).
export const RECIPIENT_KINDS = ['super-pac', 'dark-money', 'candidate', 'party', 'pac', 'ballot-measure', 'other'];
export const GIVING_SIDES = ['D', 'R', 'both', 'nonpartisan'];

// Keep in sync with ORG_KINDS and ORG_RELATIONSHIP_TYPES in src/lib/schema.ts (a unit test checks this).
export const ORG_KINDS = [
  'super-pac',
  'dark-money',
  'pac',
  'party',
  'think-tank',
  'advocacy',
  'foundation',
  'investment-firm',
  'company',
  'media',
  'other',
];
export const ORG_RELATIONSHIP_TYPES = [
  'employer',
  'employee',
  'donor',
  'funded_by',
  'co-founder',
  'colleague',
  'ally',
  'rival',
  'enemy',
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
 * @param {{file: string, slug: string, data: any}[]} records people
 * @param {{photosDir?: string, orgs?: {file: string, slug: string, data: any}[]}} [opts]
 *   photosDir: when given, photo files must exist there. orgs: the data/orgs/ files.
 * @returns {{errors: {file: string, message: string}[], warnings: {file: string, message: string}[]}}
 */
export function validatePeople(records, opts = {}) {
  const errors = [];
  const warnings = [];
  const err = (file, message) => errors.push({ file, message });
  const warn = (file, message) => warnings.push({ file, message });

  const orgs = (opts.orgs ?? []).map((r) => ({ ...r, file: `orgs/${r.file}`, isOrg: true }));
  const bySlug = new Map(records.map((r) => [r.slug, r]));
  for (const o of orgs) {
    if (bySlug.has(o.slug)) err(o.file, `slug "${o.slug}" is also a person's file name — give the organization a distinct slug`);
    else bySlug.set(o.slug, o);
  }
  const byNameSlug = new Map();
  for (const r of [...records, ...orgs]) {
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
    for (const key of ['aliases', 'timeline', 'affiliations', 'connections', 'lean']) {
      if (p[key] !== undefined && !Array.isArray(p[key])) err(file, `"${key}" must be an array`);
    }

    if (p.self_added !== undefined) {
      if (p.self_added !== true) err(file, '"self_added" must be true or left out');
      else if (p.public_figure !== false) err(file, '"self_added" is only for the map owner\'s own file, with "public_figure": false');
    }

    const researched = p.public_figure === true;
    // Files for non-public people hold only what the user provided, so "user-provided" stands in for a URL.
    const checkSources = (sources, where, { required = true, allowUser = false } = {}) => {
      if (!Array.isArray(sources) || sources.length === 0) {
        if (required && researched) err(file, `${where}: no sources (drop it or add a source URL)`);
        return;
      }
      for (const s of sources) {
        const u = urlOf(s);
        if (isHttp(u)) continue;
        if ((!researched || allowUser) && u === 'user-provided') continue;
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

    // Political lean: integer periods from -3 (far left) to +3 (far right), in order, not overlapping.
    if (Array.isArray(p.lean)) {
      if (p.lean.length && !researched) err(file, '"lean" is researched, so only public figures may have one');
      let prevEnd;
      p.lean.forEach((l, i) => {
        const where = `lean[${i}]`;
        if (!l || typeof l !== 'object') return err(file, `${where} is not an object`);
        if (!Number.isInteger(l.value) || l.value < -3 || l.value > 3) err(file, `${where}: "value" must be a whole number from -3 to 3`);
        if (!isYear(l.start_year) || !isYear(l.end_year)) err(file, `${where}: start_year/end_year must be years or null`);
        if (Number.isInteger(l.start_year) && Number.isInteger(l.end_year) && l.end_year < l.start_year)
          err(file, `${where}: end_year is before start_year`);
        if (i > 0) {
          if (prevEnd == null) err(file, `${where}: the period before it has no end_year (only the last period may be open-ended)`);
          else if (!Number.isInteger(l.start_year) || l.start_year <= prevEnd)
            err(file, `${where}: start_year must come after the previous period's end_year (${prevEnd})`);
        }
        if (i < p.lean.length - 1 && l.end_year == null) err(file, `${where}: only the last period may be open-ended`);
        prevEnd = l.end_year;
        if (typeof l.basis !== 'string' || !l.basis.trim()) err(file, `${where}: "basis" must say what the value rests on`);
        checkSources(l.sources, where);
      });
    } else if (researched && p.lean === undefined) {
      warn(file, 'No "lean"; on the main map the person is placed left–right by their links only');
    }

    if (p.race_2028 !== undefined) {
      const r = p.race_2028;
      if (!r || typeof r !== 'object') err(file, '"race_2028" must be an object');
      else {
        if (!['contender', 'camp'].includes(r.role)) err(file, 'race_2028.role must be "contender" or "camp"');
        if (r.role === 'camp') {
          if (!Array.isArray(r.contenders) || !r.contenders.length) err(file, 'race_2028.contenders must list the contenders\' slugs');
          else
            for (const s of r.contenders) {
              // Linked to the contender, or to someone else in the same camp.
              const linked = (p.connections ?? []).some(
                (c) => c?.slug === s || bySlug.get(c?.slug)?.data?.race_2028?.contenders?.includes(s),
              );
              if (!linked) err(file, `race_2028: in ${s}'s camp but linked neither to ${s} nor to anyone in that camp`);
              const target = bySlug.get(s);
              if (target && target.data?.race_2028?.role !== 'contender')
                err(file, `race_2028: ${s}.json is not marked as a 2028 contender`);
            }
        }
        if (typeof r.basis !== 'string' || !r.basis.trim()) err(file, 'race_2028.basis is required');
        checkSources(r.sources, 'race_2028');
        if (!Array.isArray(p.groups) || !p.groups.includes('2028-race'))
          warn(file, 'Has race_2028 but not the "2028-race" group, so it won\'t show in the 2028 race view');
      }
    }

    // Giving: cycles of reported donations, and a sourced outlook for the next cycle.
    if (p.giving !== undefined) {
      const g = p.giving;
      const isCycle = (y) => Number.isInteger(y) && y % 2 === 0 && y > 1970 && y < 2100;
      const isUsd = (n) => n === undefined || (typeof n === 'number' && Number.isFinite(n) && n >= 0);
      const checkTarget = (t, where) => {
        if (typeof t?.name !== 'string' || !t.name.trim()) err(file, `${where}: missing "name"`);
        if (t?.slug !== undefined && (typeof t.slug !== 'string' || !SLUG_RE.test(t.slug)))
          err(file, `${where}: "slug" must be a lowercase-hyphenated slug`);
        if (!RECIPIENT_KINDS.includes(t?.kind)) err(file, `${where}: "kind" must be one of ${RECIPIENT_KINDS.join(', ')}`);
        if (t?.side !== undefined && !GIVING_SIDES.includes(t.side))
          err(file, `${where}: "side" must be one of ${GIVING_SIDES.join(', ')}`);
        checkSources(t?.sources, where);
      };
      if (!g || typeof g !== 'object') err(file, '"giving" must be an object');
      else {
        if (!researched) err(file, '"giving" is researched, so only public figures may have it');
        if (g.cycles !== undefined && !Array.isArray(g.cycles)) err(file, 'giving.cycles must be an array');
        const seenCycles = new Set();
        (Array.isArray(g.cycles) ? g.cycles : []).forEach((c, i) => {
          const where = `giving.cycles[${i}] (${c?.cycle ?? '?'})`;
          if (!isCycle(c?.cycle)) err(file, `${where}: "cycle" must be an even election year`);
          if (seenCycles.has(c?.cycle)) err(file, `${where}: duplicate cycle — merge them`);
          seenCycles.add(c?.cycle);
          if (!isUsd(c?.total_usd)) err(file, `${where}: "total_usd" must be a dollar amount`);
          if (c?.rank !== undefined && (!Number.isInteger(c.rank) || c.rank < 1)) err(file, `${where}: "rank" must be 1 or more`);
          if ((c?.rank !== undefined || c?.total_usd !== undefined) && !c?.ranking)
            warn(file, `${where}: say which ranking the total/rank come from ("ranking")`);
          checkSources(c?.sources, where);
          if (c?.recipients !== undefined && !Array.isArray(c.recipients)) err(file, `${where}: "recipients" must be an array`);
          (Array.isArray(c?.recipients) ? c.recipients : []).forEach((r, j) => {
            const rw = `${where} recipient ${r?.name ?? `#${j}`}`;
            checkTarget(r, rw);
            if (!isUsd(r?.amount_usd)) err(file, `${rw}: "amount_usd" must be a dollar amount`);
          });
        });
        if (g.outlook !== undefined) {
          const o = g.outlook;
          if (!o || typeof o !== 'object') err(file, 'giving.outlook must be an object');
          else {
            if (!isCycle(o.cycle)) err(file, 'giving.outlook: "cycle" must be an even election year');
            if (typeof o.summary !== 'string' || !o.summary.trim()) err(file, 'giving.outlook: "summary" is required');
            if (o.sources !== undefined) checkSources(o.sources, 'giving.outlook');
            if (o.likely !== undefined && !Array.isArray(o.likely)) err(file, 'giving.outlook.likely must be an array');
            (Array.isArray(o.likely) ? o.likely : []).forEach((l, j) => {
              const lw = `giving.outlook likely ${l?.name ?? `#${j}`}`;
              checkTarget(l, lw);
              if (typeof l?.basis !== 'string' || !l.basis.trim()) err(file, `${lw}: "basis" must say what reporting it rests on`);
              if (typeof l?.confidence !== 'number' || l.confidence < 0.3 || l.confidence > 1)
                err(file, `${lw}: "confidence" must be from 0.3 to 1 (below 0.3, leave it out)`);
            });
          }
        }
      }
    }

    (p.source_conflicts ?? []).forEach((c, i) => {
      if (!c?.topic || !c?.details) err(file, `source_conflicts[${i}]: needs "topic" and "details"`);
      checkSources(c?.sources, `source_conflicts[${i}]`);
    });

    checkConnections(file, slug, p, researched, checkSources);

    for (const { path: at, value } of textValues(p)) {
      for (const { what, re } of PRIVACY_PATTERNS) {
        if (re.test(value)) err(file, `${at} looks like it contains ${what} — remove it (public-role information only)`);
      }
    }
  }

  // Organizations: same sourcing and two-way-link rules as people, plus their own fields.
  for (const { file, slug, data: o } of orgs) {
    if (!o || typeof o !== 'object') {
      err(file, 'File is not a JSON object');
      continue;
    }
    const checkSources = (sources, where, { required = true } = {}) => {
      if (!Array.isArray(sources) || sources.length === 0) {
        if (required) err(file, `${where}: no sources (drop it or add a source URL)`);
        return;
      }
      for (const s of sources) if (!isHttp(urlOf(s))) err(file, `${where}: source ${JSON.stringify(s)} is not an http(s) URL`);
    };
    if (!SLUG_RE.test(slug)) err(file, `File name "${slug}" is not a lowercase-hyphenated slug`);
    if (typeof o.name !== 'string' || !o.name.trim()) err(file, 'Missing "name"');
    if (!ORG_KINDS.includes(o.kind)) err(file, `"kind" must be one of ${ORG_KINDS.join(', ')}`);
    if (o.side !== undefined && !GIVING_SIDES.includes(o.side)) err(file, `"side" must be one of ${GIVING_SIDES.join(', ')}`);
    if (!isYear(o.founded) || !isYear(o.dissolved)) err(file, '"founded"/"dissolved" must be years or null');
    if (typeof o.last_researched !== 'string' || !DATE_RE.test(o.last_researched))
      err(file, '"last_researched" must be a YYYY-MM-DD date');
    for (const key of ['public_figure', 'photo', 'lean', 'giving', 'race_2028', 'sector', 'self_added'])
      if (o[key] !== undefined) err(file, `"${key}" is a person field; organizations don't take it`);
    if (o.groups !== undefined) {
      if (!Array.isArray(o.groups)) err(file, '"groups" must be an array');
      else for (const g of o.groups) if (!GROUPS.includes(g)) err(file, `groups: "${g}" must be one of ${GROUPS.join(', ')}`);
    }
    for (const key of ['aliases', 'connections', 'finances', 'source_conflicts'])
      if (o[key] !== undefined && !Array.isArray(o[key])) err(file, `"${key}" must be an array`);
    if (typeof o.summary !== 'string' || !o.summary.trim()) err(file, 'Missing "summary"');
    checkSources(o.sources, 'summary');
    (Array.isArray(o.finances) ? o.finances : []).forEach((f, i) => {
      const where = `finances[${i}] (${f?.cycle ?? '?'})`;
      if (!Number.isInteger(f?.cycle) || f.cycle % 2 !== 0) err(file, `${where}: "cycle" must be an even election year`);
      for (const k of ['raised_usd', 'spent_usd'])
        if (f?.[k] !== undefined && !(typeof f[k] === 'number' && f[k] >= 0)) err(file, `${where}: "${k}" must be a dollar amount`);
      checkSources(f?.sources, where);
    });
    (Array.isArray(o.source_conflicts) ? o.source_conflicts : []).forEach((c, i) => {
      if (!c?.topic || !c?.details) err(file, `source_conflicts[${i}]: needs "topic" and "details"`);
      checkSources(c?.sources, `source_conflicts[${i}]`);
    });
    if (!(o.connections ?? []).length) warn(file, 'No connections; the organization shows as a lone square');
    checkConnections(file, slug, o, true, checkSources, true);
    for (const { path: at, value } of textValues(o)) {
      for (const { what, re } of PRIVACY_PATTERNS) {
        if (re.test(value)) err(file, `${at} looks like it contains ${what} — remove it (public-role information only)`);
      }
    }
  }

  // Giving entries may name an organization's file.
  for (const { file, data: p } of records) {
    const targets = [
      ...(p?.giving?.cycles ?? []).flatMap((c) => c?.recipients ?? []),
      ...(p?.giving?.outlook?.likely ?? []),
    ];
    for (const t of targets) {
      if (t?.org === undefined) continue;
      if (!bySlug.get(t.org)?.isOrg) err(file, `giving: "${t.name}" points to org "${t.org}", which has no file in data/orgs/`);
    }
  }

  return { errors, warnings };

  function checkConnections(file, slug, p, researched, checkSources, selfIsOrg = false) {
    const seen = new Set();
    (p.connections ?? []).forEach((c, i) => {
      const where = `connection to ${c?.name ?? `#${i}`}`;
      if (!c || typeof c !== 'object') return err(file, `connections[${i}] is not an object`);
      if (typeof c.name !== 'string' || !c.name) err(file, `connections[${i}]: missing "name"`);
      if (typeof c.slug !== 'string' || !SLUG_RE.test(c.slug)) err(file, `${where}: "slug" must be a lowercase-hyphenated slug`);
      if (c.slug === slug) err(file, `${where}: connection to self`);
      if (c.relationship_type === 'friend' && p.public_figure === false)
        err(file, `${where}: friend links are only allowed between public figures`);
      if (!RELATIONSHIP_TYPES.includes(c.relationship_type))
        err(file, `${where}: relationship_type "${c.relationship_type}" must be one of ${RELATIONSHIP_TYPES.join(', ')}`);
      else if ((selfIsOrg || bySlug.get(c.slug)?.isOrg) && !ORG_RELATIONSHIP_TYPES.includes(c.relationship_type))
        err(file, `${where}: an organization can't be a "${c.relationship_type}" (use one of ${ORG_RELATIONSHIP_TYPES.join(', ')})`);
      if (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1)
        err(file, `${where}: "confidence" must be a number from 0 to 1`);
      if (!isYear(c.start_year) || !isYear(c.end_year)) err(file, `${where}: start_year/end_year must be years or null`);
      if (!c.description) warn(file, `${where}: no description`);
      // A link to the owner's self-added file may cite what the owner provided.
      checkSources(c.sources, where, { allowUser: bySlug.get(c.slug)?.data?.self_added === true });

      const key = `${c.slug}|${c.relationship_type}`;
      if (seen.has(key)) err(file, `${where}: duplicate ${c.relationship_type} record — merge them`);
      seen.add(key);

      const target = bySlug.get(c.slug);
      if (!target) {
        const existing = byNameSlug.get(slugify(c.name ?? ''));
        if (existing && existing !== slug)
          err(file, `${where}: slug "${c.slug}" has no file, but ${bySlug.get(existing)?.file ?? `${existing}.json`} is this one — use slug "${existing}"`);
        if (c.relationship_type === 'family' || c.relationship_type === 'friend')
          warn(file, `${where}: ${c.relationship_type} link to someone without a file — confirm they are a public figure`);
        return;
      }

      // Exception: the map owner may add themselves and share a family link (see CLAUDE.md rule 2).
      if (c.relationship_type === 'family' && !target.isOrg && target.data?.public_figure === false && target.data?.self_added !== true)
        err(file, `${where}: family links are only allowed to relatives who are public figures`);
      // Friendships are personal ties: only between public figures, never with someone kept private.
      if (c.relationship_type === 'friend' && !target.isOrg && target.data?.public_figure === false)
        err(file, `${where}: friend links are only allowed between public figures`);

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

  }
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

/** data/updates.json: [{ id: "YYYY-MM-DD-label", date, text, people: [slug, …] }], every slug a file in the map. */
export function validateUpdates(file, slugs) {
  const errs = [];
  const err = (message) => errs.push({ file: 'updates.json', message });
  let list;
  try {
    list = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    err(`does not parse: ${e.message}`);
    return errs;
  }
  if (!Array.isArray(list)) {
    err('must be an array');
    return errs;
  }
  const ids = new Set();
  list.forEach((u, i) => {
    const where = `entry ${i + 1}`;
    if (!u || typeof u !== 'object') return err(`${where} is not an object`);
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(u.id ?? '')) err(`${where}: "id" must be the date plus a short lowercase label, e.g. 2026-11-08-hegseth-refresh`);
    else if (ids.has(u.id)) err(`${where}: duplicate id "${u.id}"`);
    else if (!u.id.startsWith(u.date ?? '')) err(`${where}: "id" must start with its date`);
    ids.add(u.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(u.date ?? '')) err(`${where}: "date" must be YYYY-MM-DD`);
    if (typeof u.text !== 'string' || !u.text.trim()) err(`${where}: missing "text"`);
    if (!Array.isArray(u.people) || !u.people.length) err(`${where}: "people" must list at least one slug`);
    for (const s of u.people ?? []) if (!slugs.has(s)) err(`${where}: "${s}" has no file in data/people or data/orgs`);
  });
  return errs;
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(process.argv[2] ?? path.join(here, '..', 'data', 'people'));
  if (!fs.existsSync(dir)) {
    console.error(`No data directory at ${dir}`);
    process.exit(1);
  }
  const { records, parseErrors } = loadDir(dir);
  const orgDir = path.join(dir, '..', 'orgs');
  const orgLoad = fs.existsSync(orgDir) ? loadDir(orgDir) : { records: [], parseErrors: [] };
  const { errors, warnings } = validatePeople(records, {
    photosDir: path.join(dir, '..', '..', 'public', 'photos'),
    orgs: orgLoad.records,
  });
  const all = [...parseErrors, ...orgLoad.parseErrors.map((e) => ({ ...e, file: `orgs/${e.file}` })), ...errors];
  const updatesFile = path.join(dir, '..', 'updates.json');
  if (fs.existsSync(updatesFile)) {
    const slugs = new Set([...records, ...orgLoad.records].map((r) => r.file.replace(/\.json$/, '')));
    all.push(...validateUpdates(updatesFile, slugs));
  }

  for (const w of warnings) console.log(`warning  ${w.file}: ${w.message}`);
  for (const e of all) console.log(`ERROR    ${e.file}: ${e.message}`);

  const people = records.length;
  const links = [...records, ...orgLoad.records].reduce((n, r) => n + (r.data?.connections?.length ?? 0), 0);
  console.log(
    `\n${people} people, ${orgLoad.records.length} organizations, ${links} connection records — ${all.length} error(s), ${warnings.length} warning(s)`,
  );
  process.exit(all.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

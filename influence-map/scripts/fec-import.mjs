// Imports campaign finance filings (FEC schedule A: itemized receipts) for the map's donors.
//   node influence-map/scripts/fec-import.mjs                 dry run: what would change, and what was turned away
//   node influence-map/scripts/fec-import.mjs --write         write giving recipients and donor links into the files
//   node influence-map/scripts/fec-import.mjs elon-musk ...   only these donors
// Needs network access to api.open.fec.gov and an API key (the "VITAL" cloud environment adds it;
// elsewhere set FEC_API_KEY). Raw responses are cached under --cache <dir> (default: the system
// temp folder), never in the repo: they carry contributors' addresses, which this project does
// not collect (research rule 2). Only names of committees, amounts, years and fec.gov links are
// written. See CLAUDE.md "FEC import".
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fec, receiptsUrl } from './lib/fec.mjs';
import { autoKeywords, matches, nameParts, norm } from './lib/fec-match.mjs';
import { formatJson } from './lib/json-style.mjs';
import { ROOT, readData } from './lib/load.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const cacheAt = args.indexOf('--cache');
const CACHE = cacheAt >= 0 ? args[cacheAt + 1] : join(tmpdir(), 'influence-map-fec');
const only = args.filter((a, i) => !a.startsWith('--') && i !== cacheAt + 1);

const config = JSON.parse(readFileSync(join(ROOT, 'data', 'fec.json'), 'utf8'));
const { people, orgs } = readData();
const personBySlug = new Map(people.map((p) => [p.slug, p]));
const orgBySlug = new Map(orgs.map((o) => [o.slug, o]));
const fileOf = (slug) => personBySlug.get(slug) ?? orgBySlug.get(slug);

/** A gift to a mapped person or organization counts from this much; other committees need LARGE and a top-ten place. */
const MIN_MAPPED = 1000;
const LARGE = 25000;
const TOP_UNMAPPED = 10;
/** A money line is drawn from this much in total (below it, the gift is only listed under Giving). */
const MIN_LINK = 10000;
const MAX_PAGES = 12;
const today = new Date().toISOString().slice(0, 10);
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

const leanNow = (p) => {
  const l = (p?.data.lean ?? []).find((x) => x.end_year == null) ?? (p?.data.lean ?? []).at(-1);
  return l ? l.value : null;
};
function sideOf(committee, target) {
  if (target?.org) return orgBySlug.get(target.org)?.data.side;
  if (target?.slug) {
    const v = leanNow(personBySlug.get(target.slug));
    if (v) return v > 0 ? 'R' : 'D';
  }
  const party = committee.party ?? '';
  return party === 'REP' ? 'R' : ['DEM', 'DFL'].includes(party) ? 'D' : undefined;
}
function kindOf(committee, target) {
  const t = committee.type;
  if (['H', 'S', 'P'].includes(t)) return 'candidate';
  if (['X', 'Y', 'Z'].includes(t)) return 'party';
  if (['O', 'U', 'V', 'W', 'I'].includes(t)) return 'super-pac';
  if (target?.org) return orgBySlug.get(target.org)?.data.kind === 'super-pac' ? 'super-pac' : 'pac';
  return 'pac';
}

/** Every matching receipt of one donor in one cycle, largest first. */
async function receipts(person, rule, cycle) {
  const { last, first } = nameParts(person.name);
  const queries = [`${last}, ${first}`, ...(rule.queries ?? [])];
  const seen = new Set();
  const kept = [];
  const turnedAway = new Map();
  for (const q of queries) {
    let cursor = {};
    for (let page = 0; page < MAX_PAGES; page++) {
      const d = await fec(
        '/schedules/schedule_a/',
        { contributor_name: q, two_year_transaction_period: cycle, per_page: 100, sort: '-contribution_receipt_amount', is_individual: true, ...cursor },
        CACHE,
      );
      const rows = d.results ?? [];
      for (const r of rows) {
        if (seen.has(r.sub_id)) continue;
        seen.add(r.sub_id);
        const verdict = matches(r, person, rule);
        if (verdict === 'yes') kept.push(r);
        else if (verdict === 'employer') {
          // Same name, unrecognized employer: listed in the dry run so a rule can be added if it is them.
          const key = `${norm(r.contributor_name)} | ${norm(r.contributor_employer)} | ${norm(r.contributor_occupation)}`;
          const g = turnedAway.get(key) ?? { n: 0, usd: 0 };
          g.n++;
          g.usd += r.contribution_receipt_amount ?? 0;
          turnedAway.set(key, g);
        }
      }
      const li = d.pagination?.last_indexes;
      if (rows.length < 100 || !li || (rows.at(-1).contribution_receipt_amount ?? 0) < MIN_MAPPED) break;
      cursor = { last_index: li.last_index, last_contribution_receipt_amount: li.last_contribution_receipt_amount };
    }
  }
  return { kept, turnedAway };
}

function targetOf(committeeId, date) {
  const c = config.committees[committeeId];
  // "from": the day the committee became this person's (Biden's committees passed to Harris in July 2024).
  if (!c || (c.from && !(date >= c.from))) return null;
  if (c.slug && !personBySlug.has(c.slug)) return null;
  if (c.org && !orgBySlug.has(c.org)) return null;
  return c;
}

const sameSource = (list, url) => list.some((s) => (typeof s === 'string' ? s : s.url) === url);
function addSource(list, source) {
  if (!sameSource(list, source.url)) list.push(source);
}

/** The sentence this script adds to a money link's description, so a re-run can replace it. */
const FEC_SENTENCE = /FEC filings show .*? in (?:the \d{4} cycle|\d+ cycles \(\d{4}–\d{4}\))\./;

const report = [];
const touched = new Set();
const donors = people.filter((p) => {
  const d = p.data;
  if (only.length) return only.includes(p.slug);
  if (config.donors[p.slug]?.skip) return false;
  return d.public_figure !== false && !d.died && !d.org_chart_only && (d.giving || ['business', 'tech', 'ai-defense'].includes(d.sector));
});

for (const donor of donors) {
  const person = donor.data;
  const extra = config.donors[donor.slug] ?? {};
  const orgNames = (person.connections ?? []).filter((c) => orgBySlug.has(c.slug) && ['employer', 'co-founder'].includes(c.relationship_type)).map((c) => orgBySlug.get(c.slug).data.name);
  const rule = { ...extra, employers: [...autoKeywords(person, orgNames), ...(extra.employers ?? [])] };
  const contributorName = (() => {
    const { last, first } = nameParts(person.name);
    return `${last}, ${first}`;
  })();

  let donorTotal = 0;
  let donorRecords = 0;
  const away = new Map();
  /** target key → { target, usd, years } across cycles, for the money lines. */
  const lines = new Map();
  const cyclesOut = [];

  for (const cycle of config.cycles) {
    const { kept, turnedAway } = await receipts(person, rule, cycle);
    for (const [k, g] of turnedAway) {
      const a = away.get(k) ?? { n: 0, usd: 0 };
      a.n += g.n;
      a.usd += g.usd;
      away.set(k, a);
    }
    if (!kept.length) continue;
    donorRecords += kept.length;

    // One entry per recipient: a mapped person or organization (all their committees together), or a single committee.
    const groups = new Map();
    let cycleTotal = 0;
    for (const r of kept) {
      const amount = r.contribution_receipt_amount ?? 0;
      cycleTotal += amount;
      const target = targetOf(r.committee_id, (r.contribution_receipt_date ?? '').slice(0, 10));
      const key = target ? (target.org ?? target.slug) : r.committee_id;
      const g = groups.get(key) ?? { key, target, usd: 0, committees: new Map(), years: new Set() };
      g.usd += amount;
      const c = g.committees.get(r.committee_id) ?? { id: r.committee_id, name: r.committee?.name ?? r.committee_name, type: r.committee?.committee_type, party: r.committee?.party, usd: 0 };
      c.usd += amount;
      g.committees.set(r.committee_id, c);
      const y = Number((r.contribution_receipt_date ?? '').slice(0, 4));
      if (y) g.years.add(y);
      groups.set(key, g);
    }
    donorTotal += cycleTotal;
    const all = [...groups.values()].filter((g) => g.usd > 0).sort((a, b) => b.usd - a.usd);
    const unmappedTop = new Set(all.filter((g) => !g.target && g.usd >= LARGE).slice(0, TOP_UNMAPPED));
    const chosen = all.filter((g) => (g.target ? g.usd >= MIN_MAPPED : unmappedTop.has(g)));
    cyclesOut.push({ cycle, total: cycleTotal, chosen });

    for (const g of chosen.filter((x) => x.target)) {
      const l = lines.get(g.key) ?? { key: g.key, target: g.target, usd: 0, years: new Set(), cycles: [], committees: new Map() };
      l.usd += g.usd;
      g.years.forEach((y) => l.years.add(y));
      l.cycles.push(cycle);
      for (const c of g.committees.values()) l.committees.set(c.id, c.name);
      lines.set(g.key, l);
    }
  }

  // --- Giving: recipients per cycle.
  if (cyclesOut.length) {
    person.giving ??= {};
    person.giving.cycles ??= [];
    for (const { cycle, total, chosen } of cyclesOut) {
      const cycleSource = { url: receiptsUrl(contributorName, null, cycle), title: `FEC itemized receipts: ${contributorName}, ${cycle} cycle` };
      let entry = person.giving.cycles.find((c) => c.cycle === cycle);
      if (!entry) {
        entry = { cycle, total_usd: Math.round(total), ranking: 'FEC itemized receipts (federal committees only)', sources: [cycleSource], recipients: [] };
        person.giving.cycles.push(entry);
        person.giving.cycles.sort((a, b) => b.cycle - a.cycle);
      } else {
        entry.sources ??= [];
        addSource(entry.sources, cycleSource);
        if (entry.total_usd === undefined || entry.ranking === 'FEC itemized receipts (federal committees only)') {
          entry.total_usd = Math.round(total);
          entry.ranking = 'FEC itemized receipts (federal committees only)';
        }
        entry.recipients ??= [];
      }
      for (const g of chosen) {
        const committees = [...g.committees.values()].sort((a, b) => b.usd - a.usd);
        const ids = committees.map((c) => c.id).sort();
        const amount = Math.round(g.usd);
        const main = committees[0];
        const t = g.target;
        const name = t?.org ? orgBySlug.get(t.org).data.name : t?.slug ? personBySlug.get(t.slug).data.name : titleCase(main.name);
        const description =
          committees.length > 1 || t
            ? `Per FEC filings: ${committees.slice(0, 4).map((c) => `${titleCase(c.name)} ${usd(c.usd)}`).join('; ')}${committees.length > 4 ? `; and ${committees.length - 4} more` : ''}.`
            : undefined;
        const sources = committees.slice(0, 3).map((c) => ({ url: receiptsUrl(contributorName, c.id, cycle), title: `FEC receipts: ${contributorName} to ${titleCase(c.name)}, ${cycle} cycle` }));
        const old =
          entry.recipients.find((r) => r.fec_ids && r.fec_ids.join() === ids.join()) ??
          entry.recipients.find((r) => committees.some((c) => norm(c.name) === norm(r.name))) ??
          entry.recipients.find((r) => (t?.org && r.org === t.org) || (t?.slug && !t.org && r.slug === t.slug && !r.org && norm(r.name) === norm(name)));
        if (old) {
          // A figure that came from reporting stays; the filings' figure sits beside it.
          if (old.amount_usd === undefined || old.amount_usd === old.fec_usd) old.amount_usd = amount;
          old.fec_usd = amount;
          old.fec_ids = ids;
          old.sources ??= [];
          for (const s of sources) addSource(old.sources, s);
        } else {
          entry.recipients.push({ name, slug: t?.slug, org: t?.org, kind: kindOf(main, t), side: sideOf(main, t), amount_usd: amount, fec_usd: amount, fec_ids: ids, description, sources });
        }
      }
    }
    touched.add(donor.slug);
  }

  // --- Money lines to people and organizations on the map.
  let newLines = 0;
  for (const l of lines.values()) {
    if (l.usd < MIN_LINK) continue;
    const targetSlug = l.key;
    if (targetSlug === donor.slug) continue;
    const target = fileOf(targetSlug);
    const years = [...l.years].sort();
    const names = [...l.committees.values()].map(titleCase);
    const sources = [...l.committees.keys()].slice(0, 3).map((id) => ({ url: receiptsUrl(contributorName, id, l.cycles.at(-1)), title: `FEC receipts: ${contributorName} to ${titleCase(l.committees.get(id))}` }));
    const cyclesText = l.cycles.length === 1 ? `the ${l.cycles[0]} cycle` : `${l.cycles.length} cycles (${l.cycles[0]}–${l.cycles.at(-1)})`;
    const sentence = `FEC filings show ${usd(l.usd)} from ${person.name} to ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' and others' : ''} in ${cyclesText}.`;
    const upsert = (file, otherSlug, otherName, type) => {
      file.connections ??= [];
      const old = file.connections.find((c) => c.slug === otherSlug && c.relationship_type === type);
      if (old) {
        old.sources ??= [];
        for (const s of sources) addSource(old.sources, s);
        old.description = FEC_SENTENCE.test(old.description ?? '') ? old.description.replace(FEC_SENTENCE, sentence) : `${old.description ?? ''} ${sentence}`.trim();
        if (typeof old.start_year !== 'number' || years[0] < old.start_year) old.start_year = years[0];
        if (typeof old.end_year === 'number' && years.at(-1) > old.end_year) old.end_year = years.at(-1);
        return false;
      }
      file.connections.push({ name: otherName, slug: otherSlug, relationship_type: type, description: sentence, start_year: years[0], end_year: years.at(-1), confidence: 0.95, sources });
      return true;
    };
    // In the donor's file the recipient is "funded_by" the subject; in the recipient's file the donor is a "donor".
    const created = upsert(person, targetSlug, target.data.name, 'funded_by');
    upsert(target.data, donor.slug, person.name, 'donor');
    if (created) newLines++;
    touched.add(donor.slug);
    touched.add(targetSlug);
  }

  const bigAway = [...away.entries()].filter(([, g]) => g.usd >= 5000).sort((a, b) => b[1].usd - a[1].usd).slice(0, 4);
  report.push({ slug: donor.slug, records: donorRecords, total: donorTotal, cycles: cyclesOut.length, lines: lines.size, newLines, bigAway });
}

/** "SENATE LEADERSHIP FUND" → "Senate Leadership Fund", keeping common abbreviations in capitals. */
function titleCase(s) {
  const keep = new Set(['PAC', 'JFC', 'USA', 'US', 'GOP', 'NRSC', 'NRCC', 'DSCC', 'DCCC', 'DNC', 'RNC', 'CLF', 'SLF', 'SMP', 'HMP', 'FF', 'II', 'III', 'JD', 'MAGA', 'MAHA', 'AIPAC', 'LLC', 'UDP', 'POV', 'AFP', 'CVA']);
  return (s ?? '')
    .split(/(\s+|-)/)
    .map((w) => {
      if (/^\s+$|^-$/.test(w) || keep.has(w.replace(/[^A-Z]/g, ''))) return w;
      const lead = w.match(/^[^A-Za-z]*/)[0];
      const rest = w.slice(lead.length);
      return lead + rest.charAt(0) + rest.slice(1).toLowerCase();
    })
    .join('')
    .replace(/\bMc([a-z])/g, (m, c) => `Mc${c.toUpperCase()}`)
    .replace(/\b(Of|For|The|And|To|In|A)\b/g, (m, w, i) => (i === 0 ? m : m.toLowerCase()));
}

report.sort((a, b) => b.total - a.total);
console.log(`${write ? 'Imported' : 'Dry run'}: ${report.filter((r) => r.records).length} of ${report.length} donors have matching filings.`);
for (const r of report) {
  if (!r.records && !r.bigAway.length) continue;
  console.log(`  ${r.slug.padEnd(22)} ${String(r.records).padStart(5)} records  ${usd(r.total).padStart(14)}  ${r.cycles} cycles  ${r.lines} on the map (${r.newLines} new lines)`);
  for (const [k, g] of r.bigAway) console.log(`      turned away ${usd(g.usd)} x${g.n}: ${k}`);
}
console.log(`Files ${write ? 'changed' : 'that would change'}: ${touched.size}`);

if (write) {
  for (const slug of touched) {
    const f = fileOf(slug);
    writeFileSync(join(ROOT, f.file), formatJson(f.data) + '\n');
  }
  config.last_import = today;
  writeFileSync(join(ROOT, 'data', 'fec.json'), formatJson(config) + '\n');
}

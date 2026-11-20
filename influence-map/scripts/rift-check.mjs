// Backtest for the rift watch: freeze the map at the end of a past year, score every friendly
// pair, and check whether the pairs that later fell out (a rivalry or feud that started after
// the cutoff) scored higher than the ones that didn't. See CLAUDE.md "Factions and rifts".
//   node influence-map/scripts/rift-check.mjs            score 2020, 2022 and 2024
//   node influence-map/scripts/rift-check.mjs --top 25   also list today's top warnings
//   node influence-map/scripts/rift-check.mjs --save     record today's Elevated-or-higher warnings in data/rifts.json
// Every run also reports how saved warnings are holding up (which pairs have since fallen out).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readData, withLib } from './lib/load.mjs';

const args = process.argv.slice(2);
const top = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) || 25 : 0;
const save = args.includes('--save');
const LOG = join(ROOT, 'data', 'rifts.json');
const SAVE_MIN = 40;
const CUTOFFS = [2020, 2022, 2024];

await withLib(async (lib) => {
  const { buildGraph, mergePairs, pairKey } = await lib('graph');
  const { findFactions, factionMembers, signedEdges } = await lib('factions');
  const { riftWatch, riftCandidates, describeReason, RIFT_WEIGHTS } = await lib('rifts');
  const { freeze, auc } = await lib('backtest');
  const files = readData();

  // Breaks recorded today: pair → the year the rivalry or feud began.
  const breaks = new Map();
  for (const f of files.people)
    for (const c of f.data.connections ?? [])
      if ((c.relationship_type === 'rival' || c.relationship_type === 'enemy') && typeof c.start_year === 'number') {
        const k = pairKey(f.slug, c.slug);
        breaks.set(k, Math.min(breaks.get(k) ?? Infinity, c.start_year));
      }

  const rows = [];
  const all = { pos: [], neg: [] };
  for (const year of CUTOFFS) {
    const frozen = freeze(files, year);
    const g = buildGraph(frozen.people, frozen.orgs);
    const pairs = mergePairs(g.links);
    const factions = findFactions(g.nodes, pairs, year);
    const keep = new Set(factionMembers(g.nodes).filter((n) => !n.isOrg).map((n) => n.id));
    const friendly = riftCandidates(pairs, signedEdges(pairs, keep, year), year);
    const now = new Date(`${year}-12-31T00:00:00Z`);
    const score = new Map(riftWatch(g.nodes, pairs, factions, { year, now, noRace: true }).map((w) => [pairKey(w.a, w.b), w.score]));
    const pos = [];
    const neg = [];
    const hits = [];
    for (const e of friendly) {
      const k = pairKey(e.a, e.b);
      const s = score.get(k) ?? 0;
      if ((breaks.get(k) ?? 0) > year) {
        pos.push(s);
        hits.push([k, s]);
      } else neg.push(s);
    }
    const flagged = [...score.values()].filter((s) => s >= 40).length;
    const caught = pos.filter((s) => s >= 40).length;
    all.pos.push(...pos);
    all.neg.push(...neg);
    rows.push({ year, pairs: friendly.length, breaks: pos.length, auc: auc(pos, neg), flagged, caught, hits });
  }
  console.log('Rift watch backtest (friendly pairs at the cutoff; a break = rivalry or feud that began later)');
  console.log('weights', JSON.stringify(RIFT_WEIGHTS));
  for (const r of rows) {
    console.log(`  ${r.year}: ${r.pairs} friendly pairs, ${r.breaks} later broke; AUC ${Number.isNaN(r.auc) ? 'n/a' : r.auc.toFixed(2)}; ${r.flagged} flagged Elevated or higher, ${r.caught} of the breaks among them`);
    for (const [k, s] of r.hits) console.log(`      ${k.padEnd(40)} ${s}`);
  }
  console.log(`  All cutoffs: AUC ${auc(all.pos, all.neg).toFixed(2)} on ${all.pos.length} breaks (few breaks, so read this loosely)`);

  const year = new Date().getFullYear();
  const g = buildGraph(files.people, files.orgs);
  const pairs = mergePairs(g.links);
  const factions = findFactions(g.nodes, pairs, year);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const name = (id) => byId.get(id)?.name ?? id;
  const list = riftWatch(g.nodes, pairs, factions, { year });

  // How saved warnings are holding up: a pair has broken if a rivalry or feud between them
  // now on file began in or after the run's year.
  const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : { about: '', runs: [] };
  for (const run of log.runs) {
    const y = Number(run.date.slice(0, 4));
    const broke = run.warnings.filter(([a, b]) => (breaks.get(pairKey(a, b)) ?? 0) >= y);
    console.log(`\nSaved ${run.date}: ${run.warnings.length} warnings, ${broke.length} since broke${broke.length ? `: ${broke.map(([a, b, s]) => `${name(a)} – ${name(b)} (${s})`).join('; ')}` : ''}`);
  }
  if (save) {
    const today = new Date().toISOString().slice(0, 10);
    const run = { date: today, min: SAVE_MIN, warnings: list.filter((w) => w.score >= SAVE_MIN).map((w) => [w.a, w.b, w.score, [...new Set(w.reasons.map((r) => r.kind))].join('+')]) };
    const runs = [run, ...log.runs.filter((r) => r.date !== today)];
    const body = runs
      .map((r) => `    {\n      "date": ${JSON.stringify(r.date)}, "min": ${r.min},\n      "warnings": [\n${r.warnings.map((w) => `        ${JSON.stringify(w)}`).join(',\n')}\n      ]\n    }`)
      .join(',\n');
    writeFileSync(LOG, `{\n  "about": "Dated rift-watch warnings: [person, person, score, strains]. A warning comes true when a rivalry or feud between the pair begins. Written by scripts/rift-check.mjs --save; see CLAUDE.md, Factions and rifts.",\n  "runs": [\n${body}\n  ]\n}\n`);
    console.log(`\nSaved ${run.warnings.length} warnings at ${SAVE_MIN}+ to data/rifts.json (${today}).`);
  }

  if (top) {
    console.log(`\nToday's top ${top} of ${list.length} warnings:`);
    for (const w of list.slice(0, top)) {
      console.log(`  ${String(w.score).padStart(3)} ${w.label.padEnd(8)} ${name(w.a)} – ${name(w.b)}`);
      for (const r of w.reasons) console.log(`        · ${describeReason(r, name)}`);
    }
  }
});

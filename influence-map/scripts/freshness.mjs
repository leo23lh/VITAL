// What needs checking: posts not confirmed lately and files not researched lately, most important
// first; plus when the FEC import, predictions, scorecard and monthly snapshot last ran.
//   node influence-map/scripts/freshness.mjs [how many to list, default 25]
//   node influence-map/scripts/freshness.mjs --snapshot    also record this month's Pull and 2028 first choices
// The weekly refresh works from this list. See CLAUDE.md "Freshness".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatJson } from './lib/json-style.mjs';
import { ROOT, readData, withLib } from './lib/load.mjs';

const args = process.argv.slice(2);
const snapshot = args.includes('--snapshot');
const top = Number(args.find((a) => /^\d+$/.test(a))) || 25;
const read = (f) => (existsSync(join(ROOT, 'data', f)) ? JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')) : null);

await withLib(async (lib) => {
  const { buildGraph, workplaceIndex } = await lib('graph');
  const { bondIndex, power, rankPull } = await lib('pull');
  const { daysSince, freshnessOf, refreshQueue, AGING_DAYS, STALE_DAYS, OFFICE_DUE_DAYS } = await lib('freshness');
  const { backingBoard } = await lib('backing');
  const { people, orgs } = readData();
  const g = buildGraph(people, orgs);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const idx = bondIndex(g.nodes, g.links, workplaceIndex(g.nodes));
  const pull = new Map(rankPull(g.nodes, idx).map((r) => [r.id, r.score]));
  const weightOf = (n) => Math.max(power(n), (pull.get(n.id) ?? 0) / 100, Math.min(1, n.degree / 40));

  const counts = { fresh: 0, aging: 0, stale: 0, unknown: 0 };
  for (const f of people) if (f.data.public_figure !== false) counts[freshnessOf(daysSince(f.data.last_researched))]++;
  console.log(`Files: ${counts.fresh} fresh (≤${AGING_DAYS} days), ${counts.aging} aging, ${counts.stale} stale (>${STALE_DAYS} days)${counts.unknown ? `, ${counts.unknown} with no date` : ''}`);

  const queue = refreshQueue(g.nodes, weightOf);
  const posts = queue.filter((q) => q.kind === 'office');
  console.log(`Posts not confirmed in ${OFFICE_DUE_DAYS} days: ${posts.length}`);
  console.log(`\nCheck first (${Math.min(top, queue.length)} of ${queue.length}):`);
  for (const q of queue.slice(0, top)) {
    const n = byId.get(q.id);
    const what = q.kind === 'office' ? `confirm post: ${n.person.office.title}` : 'refresh file';
    console.log(`  ${n.name.padEnd(26)} ${String(q.days).padStart(4)} days  ${what}`);
  }

  // When the recurring jobs last ran.
  const fec = read('fec.json');
  const preds = read('predictions.json');
  const card = read('scorecard.json');
  const history = read('history.json');
  const last = (d) => (d ? `${d} (${daysSince(d)} days ago)` : 'never');
  console.log('\nLast runs:');
  console.log(`  FEC import     ${last(fec?.last_import)}`);
  console.log(`  predictions    ${last(preds?.runs?.[0]?.date)}`);
  console.log(`  scorecard      ${last(card?.runs?.[0]?.date)}`);
  const months = Object.keys(history?.months ?? {}).sort();
  console.log(`  snapshot       ${months.length ? `${months.at(-1)} (${months.length} months on file)` : 'never'}`);

  if (snapshot) {
    // One snapshot a month (a later run in the same month replaces it): Pull for everyone ranked,
    // and each person's first choice for 2028. Rising and falling arrows will read these.
    const today = new Date().toISOString().slice(0, 10);
    const board = backingBoard(g.nodes, g.links);
    const first = {};
    for (const [id, rows] of board.byPerson) if (rows[0] && rows[0].score >= 45) first[id] = [rows[0].contender, rows[0].score];
    const out = history ?? {
      about: 'Monthly snapshots for trends: pull = Pull score by slug; first = 2028 first choice [contender, score] for people at 45 or more. Written by scripts/freshness.mjs --snapshot.',
      months: {},
    };
    out.months[today.slice(0, 7)] = { date: today, pull: Object.fromEntries([...pull.entries()].sort()), first: Object.fromEntries(Object.entries(first).sort()) };
    out.months = Object.fromEntries(Object.entries(out.months).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(join(ROOT, 'data', 'history.json'), formatJson(out) + '\n');
    console.log(`\nSaved this month's snapshot to data/history.json (${pull.size} Pull scores, ${Object.keys(first).length} first choices).`);
  }
});

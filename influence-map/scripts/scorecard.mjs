// The scorecard: how well the map, frozen at a past year, predicts what came next.
//   node influence-map/scripts/scorecard.mjs            print the scores
//   node influence-map/scripts/scorecard.mjs --save     also record them in data/scorecard.json
// Run it before and after any change to the scoring rules (graph.ts, pull.ts, evidence.ts).
// AUC: 0.50 is a coin flip, 1.00 is perfect. See CLAUDE.md "Scorecard".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readData, withLib } from './lib/load.mjs';

const CUTOFFS = [2022, 2024];
const save = process.argv.includes('--save');
const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : ' n/a');
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v]));

await withLib(async (lib) => {
  const { scorecard } = await lib('backtest');
  const { buildGraph } = await lib('graph');
  const files = readData();
  const card = scorecard(files, CUTOFFS);
  const raw = scorecard(files, CUTOFFS, { rawConfidence: true });

  console.log('NEW TIES: do untied pairs the map rates close go on to form a tie?');
  for (const [i, t] of card.ties.entries()) {
    console.log(`  Frozen at end of ${t.cutoff}: ${t.positives} new ties among ${t.candidates} untied pairs (${t.coldStarts} more not testable)`);
    console.log(`    map closeness   AUC ${f2(t.auc)}   (without evidence cap ${f2(raw.ties[i].auc)})`);
    console.log(`    shared friends  AUC ${f2(t.aucSharedFriends)}   well-connected  AUC ${f2(t.aucPopularity)}   ← simple baselines`);
    console.log(`    of the ${t.topN} closest untied pairs, ${t.topHits} formed a tie; chance alone would give ${t.topExpected.toFixed(1)}`);
  }
  console.log('\nBACKING: does the map predict whom donors fund in the next cycle?');
  for (const [i, t] of card.giving.entries()) {
    console.log(`  Frozen at end of ${t.cutoff}, predicting the ${t.cycle} cycle: ${t.gifts} gifts by ${t.donors} donors (${t.newGifts} to first-time recipients)`);
    console.log(`    map closeness   AUC ${f2(t.auc)}   (without evidence cap ${f2(raw.giving[i].auc)})`);
    console.log(`    "same as last time" baseline  AUC ${f2(t.aucRepeat)}`);
    console.log(`    first-time recipients only    AUC ${f2(t.aucNew)}`);
    console.log(`    recipient was in the donor's five closest for ${Number.isFinite(t.top5) ? Math.round(t.top5 * 100) + '%' : 'n/a'} of gifts`);
  }

  if (save) {
    const g = buildGraph(files.people, files.orgs);
    const grades = { strong: 0, solid: 0, thin: 0, none: 0 };
    for (const l of g.links) grades[l.evidence.grade]++;
    const path = join(ROOT, 'data', 'scorecard.json');
    const runs = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).runs : [];
    const date = new Date().toISOString().slice(0, 10);
    const run = {
      date,
      map: { people: files.people.length, orgs: files.orgs.length, links: g.links.length },
      evidence: { ...grades, held: g.links.filter((l) => l.stated > l.confidence + 1e-9).length },
      ties: card.ties.map(round),
      giving: card.giving.map(round),
    };
    // One entry per day, newest first.
    writeFileSync(path, JSON.stringify({ runs: [run, ...runs.filter((r) => r.date !== date)] }, null, 2) + '\n');
    console.log(`\nSaved to data/scorecard.json (${date}).`);
  }
});

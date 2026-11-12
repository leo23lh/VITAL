// Tests Pull against the track record: for every decided ask, freeze the map as it stood when the
// ask was made, score the asker, and check whether higher scores went with asks that were granted.
//   node influence-map/scripts/tune-pull.mjs          report today's weights and the best alternatives
// Granted asks count as positives, denied ones as negatives; partly granted ones are left out of
// the AUC (0.50 is a coin flip). See CLAUDE.md "Track record".
import { readData, withLib } from './lib/load.mjs';

const GRID = {
  leverageStep: [0, 0.1, 0.15, 0.2, 0.3],
  accessBoost: [0, 0.15, 0.3],
  falloff: [0.3, 0.5, 0.7],
};
const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : ' n/a');
/** "2025-06" → the last day of that month: the map as it stood while the ask was being made. */
const asOf = (d) => (d.length === 7 ? new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).toISOString().slice(0, 10) : d);

await withLib(async (lib) => {
  const { buildGraph, workplaceIndex } = await lib('graph');
  const { bondIndex, pullOf, DEFAULT_PULL } = await lib('pull');
  const { freeze, auc } = await lib('backtest');
  const { deciderAccess, deciderPower } = await lib('trackrecord');
  const files = readData();

  // Every decided ask, with the frozen map it was made in.
  const cases = [];
  const maps = new Map();
  for (const f of files.people)
    for (const ask of f.data.asks ?? []) {
      if (ask.outcome === 'pending') continue;
      const day = asOf(ask.date);
      if (!maps.has(day)) {
        const frozen = freeze(files, Number(day.slice(0, 4)), { date: day, keepLeverage: true });
        const g = buildGraph(frozen.people, frozen.orgs);
        maps.set(day, { nodes: g.nodes, byId: new Map(g.nodes.map((n) => [n.id, n])), idx: bondIndex(g.nodes, g.links, workplaceIndex(g.nodes)) });
      }
      cases.push({ slug: f.slug, name: f.data.name, ask, day, map: maps.get(day), y: ask.outcome === 'granted' ? 1 : ask.outcome === 'denied' ? 0 : 0.5 });
    }

  const score = (c, p, how) => {
    const { nodes, byId, idx } = c.map;
    const self = byId.get(c.slug);
    if (!self) return 0;
    const pull = pullOf(c.slug, nodes, idx, new Date(c.day), self, p).score;
    if (how === 'pull') return pull;
    const near = deciderAccess(self, c.ask, byId, idx, p.accessBoost, p.metOnlyBond);
    if (how === 'decider') return near ?? pull;
    // Blend: closeness to whoever decided, weighted by their post, on top of overall pull.
    return near === null ? pull : 0.5 * pull + 0.5 * near * Math.max(0.5, deciderPower(c.ask, byId));
  };
  const aucOf = (scores) => {
    const pos = [];
    const neg = [];
    cases.forEach((c, i) => (c.y === 1 ? pos : c.y === 0 ? neg : null)?.push(scores[i]));
    return auc(pos, neg);
  };

  const granted = cases.filter((c) => c.y === 1).length;
  const denied = cases.filter((c) => c.y === 0).length;
  console.log(`Track record: ${cases.length} decided asks (${granted} granted, ${denied} denied, ${cases.length - granted - denied} partly granted) by ${new Set(cases.map((c) => c.slug)).size} people.\n`);

  console.log("Today's weights:");
  for (const how of ['pull', 'decider', 'blend']) console.log(`  ${how.padEnd(8)} AUC ${f2(aucOf(cases.map((c) => score(c, DEFAULT_PULL, how))))}`);

  // Every combination of weights, for each way of scoring.
  const combos = [];
  for (const leverageStep of GRID.leverageStep)
    for (const accessBoost of GRID.accessBoost)
      for (const falloff of GRID.falloff) combos.push({ ...DEFAULT_PULL, leverageStep, accessBoost, falloff });
  const table = combos.map((p) => ({ p, scores: Object.fromEntries(['pull', 'decider', 'blend'].map((h) => [h, cases.map((c) => score(c, p, h))])) }));

  for (const how of ['pull', 'decider', 'blend']) {
    const ranked = table.map((t) => ({ p: t.p, a: aucOf(t.scores[how]) })).sort((x, y) => y.a - x.a);
    const best = ranked[0];
    // Leave one out: pick the weights on all the other asks, then score the one left out with them.
    const held = cases.map((c, i) => {
      const keep = (s) => s.filter((_, j) => j !== i);
      const pos = [];
      const neg = [];
      let pick = null;
      for (const t of table) {
        pos.length = 0;
        neg.length = 0;
        cases.forEach((d, j) => j !== i && (d.y === 1 ? pos : d.y === 0 ? neg : null)?.push(t.scores[how][j]));
        const a = auc(pos, neg);
        if (!pick || a > pick.a) pick = { a, t };
      }
      void keep;
      return pick.t.scores[how][i];
    });
    console.log(
      `\n${how}: best AUC ${f2(best.a)} at leverage step ${best.p.leverageStep}, meeting boost ${best.p.accessBoost}, falloff ${best.p.falloff}; ` +
        `held out (leave one out) ${f2(aucOf(held))}`,
    );
    console.log(`  ${ranked.filter((r) => r.a >= best.a - 1e-9).length} of ${ranked.length} combinations tie for best`);
  }

  console.log('\nEach ask, scored with today\'s weights (pull · closeness to whoever decided):');
  for (const c of [...cases].sort((a, b) => score(b, DEFAULT_PULL, 'pull') - score(a, DEFAULT_PULL, 'pull'))) {
    const { byId, idx } = c.map;
    const near = byId.get(c.slug) ? deciderAccess(byId.get(c.slug), c.ask, byId, idx, DEFAULT_PULL.accessBoost, DEFAULT_PULL.metOnlyBond) : null;
    console.log(`  ${String(score(c, DEFAULT_PULL, 'pull')).padStart(3)} · ${near === null ? ' — ' : String(near).padStart(3)}  ${c.ask.outcome.padEnd(8)} ${c.name}: ${c.ask.what.slice(0, 70)}…`);
  }
});

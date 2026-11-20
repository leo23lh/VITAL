// How well the map's ties are documented, and which thin ones matter most.
//   node influence-map/scripts/evidence-report.mjs [how many to list, default 40]
// A thin tie rests on one source that isn't an official record. The list is the research queue:
// find a second independent source (or an official record) for the ties at the top first.
import { readData, withLib } from './lib/load.mjs';

const top = Number(process.argv[2]) || 40;

await withLib(async (lib) => {
  const { buildGraph, mergePairs, workplaceIndex, CLOSENESS } = await lib('graph');
  const { bondIndex, rankPull, power } = await lib('pull');
  const { GRADE_LABEL } = await lib('evidence');
  const { people, orgs } = readData();

  const g = buildGraph(people, orgs);
  const raw = buildGraph(people, orgs, { rawConfidence: true });
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const name = (id) => byId.get(id)?.name ?? id;

  const grades = { strong: 0, solid: 0, thin: 0, none: 0 };
  for (const l of g.links) grades[l.evidence.grade]++;
  const held = g.links.filter((l) => l.stated > l.confidence + 1e-9);
  const pairs = mergePairs(g.links);
  console.log(`Links: ${g.links.length} between ${pairs.length} pairs`);
  for (const k of Object.keys(grades))
    if (grades[k]) console.log(`  ${GRADE_LABEL[k].padEnd(9)} ${String(grades[k]).padStart(4)}  ${((100 * grades[k]) / g.links.length).toFixed(0)}%`);
  console.log(`Held below the stated confidence: ${held.length} links`);
  console.log(`Pairs drawn dashed (every link thin): ${pairs.filter((p) => p.thin).length}`);

  // What the cap does to Pull.
  const rank = (graph) => rankPull(graph.nodes, bondIndex(graph.nodes, graph.links, workplaceIndex(graph.nodes)));
  const before = new Map(rank(raw).map((r) => [r.id, r.score]));
  const moved = rank(g)
    .map((r) => ({ id: r.id, now: r.score, was: before.get(r.id) ?? 0 }))
    .filter((r) => r.now !== r.was)
    .sort((a, b) => Math.abs(b.now - b.was) - Math.abs(a.now - a.was));
  console.log(`\nPull scores changed by the evidence cap: ${moved.length}`);
  for (const r of moved.slice(0, 15)) console.log(`  ${name(r.id).padEnd(28)} ${r.was} → ${r.now}`);

  // Research queue: thin ties, by how much they matter (kind of tie × the power of the stronger end).
  const pull = new Map(rank(g).map((r) => [r.id, r.score]));
  const weight = (id) => Math.max(power(byId.get(id)), (pull.get(id) ?? 0) / 100, 0.1);
  const queue = g.links
    .filter((l) => l.evidence.grade === 'thin' || l.evidence.grade === 'none')
    .map((l) => ({ l, impact: CLOSENESS[l.group] * Math.max(weight(l.sourceId), weight(l.targetId)) * Math.max(0.05, l.stated - l.confidence) }))
    .sort((a, b) => b.impact - a.impact);
  console.log(`\nResearch queue (top ${Math.min(top, queue.length)} of ${queue.length} thin links):`);
  for (const { l } of queue.slice(0, top))
    console.log(
      `  ${l.group.padEnd(11)} ${name(l.sourceId)} — ${name(l.targetId)}  stated ${Math.round(l.stated * 100)}% → ${Math.round(l.confidence * 100)}%  [${l.evidence.publishers.map((p) => p.domain).join(', ')}]`,
    );
});

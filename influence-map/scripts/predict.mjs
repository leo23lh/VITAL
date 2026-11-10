// The prediction log: dated 2028 backing predictions, kept so they can be checked later.
//   node influence-map/scripts/predict.mjs            show today's predictions and how earlier runs are holding up
//   node influence-map/scripts/predict.mjs --save     also record today's run in data/predictions.json
// A run lists every person the map rates Leaning (45) or higher for a contender whose camp they are
// not in, and who was in nobody's camp on that side at the time. A pick has come true when the files
// later put the person in that contender's camp or record a gift to them; it has missed when the
// person has since joined only a same-side rival's camp.
// See CLAUDE.md "Backing".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readData, withLib } from './lib/load.mjs';

const save = process.argv.includes('--save');
const MODEL = 'backing-1';
const MIN = 45;

await withLib(async (lib) => {
  const { buildGraph } = await lib('graph');
  const { backingBoard, sideOf } = await lib('backing');
  const { people, orgs } = readData();
  const g = buildGraph(people, orgs);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const name = (id) => byId.get(id)?.name ?? id;
  const year = new Date().getFullYear();
  const board = backingBoard(g.nodes, g.links, year);

  const picks = [];
  for (const c of board.contenders)
    for (const b of c.backers)
      if (b.basis !== 'camp' && !b.elsewhere.length && b.score >= MIN) picks.push({ person: b.person, contender: b.contender, score: b.score, basis: b.basis });
  picks.sort((a, b) => b.score - a.score || a.person.localeCompare(b.person) || a.contender.localeCompare(b.contender));

  console.log(`${picks.length} predictions at ${MIN}+ (not counting people already in a camp):`);
  for (const c of board.contenders) {
    const mine = picks.filter((p) => p.contender === c.id);
    if (mine.length) console.log(`  ${name(c.id).padEnd(26)} ${String(mine.length).padStart(3)}   top: ${mine.slice(0, 4).map((p) => `${name(p.person)} ${p.score}`).join(', ')}`);
  }

  // How earlier runs are holding up against today's files.
  const path = join(ROOT, 'data', 'predictions.json');
  const log = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { runs: [] };
  const today = new Date().toISOString().slice(0, 10);
  const campsOf = (id) => (byId.get(id)?.person?.race_2028?.role === 'camp' ? (byId.get(id).person.race_2028.contenders ?? []) : []);
  const gaveTo = (id, c) => [...(byId.get(id)?.givenTo?.get(c)?.cycles ?? [])].some((cycle) => cycle >= 2028);
  for (const run of log.runs.filter((r) => r.date < today)) {
    let hit = 0;
    let miss = 0;
    for (const [person, contender] of run.picks) {
      // Camps the person has joined since the run (older runs carry the camp members of their day in `already`).
      const camps = campsOf(person).filter((c) => !(run.already ?? {})[person]?.includes(c));
      const side = sideOf(byId.get(contender), year);
      if (campsOf(person).includes(contender) || gaveTo(person, contender)) hit++;
      else if (camps.some((c) => sideOf(byId.get(c), year) === side)) miss++;
    }
    console.log(`Run of ${run.date} (${run.model}): ${run.picks.length} picks, ${hit} came true, ${miss} missed, ${run.picks.length - hit - miss} still open`);
  }

  if (save) {
    const already = Object.fromEntries(g.nodes.filter((n) => campsOf(n.id).length).map((n) => [n.id, campsOf(n.id)]));
    const run = { date: today, model: MODEL, min: MIN, already, picks: picks.map((p) => [p.person, p.contender, p.score, p.basis]) };
    const runs = [run, ...log.runs.filter((r) => r.date !== today)];
    // One pick per line keeps the file readable and its diffs small.
    const body = runs
      .map((r) => `    {\n      "date": ${JSON.stringify(r.date)}, "model": ${JSON.stringify(r.model)}, "min": ${r.min},\n      "already": ${JSON.stringify(r.already ?? {})},\n      "picks": [\n${r.picks.map((p) => `        ${JSON.stringify(p)}`).join(',\n')}\n      ]\n    }`)
      .join(',\n');
    writeFileSync(path, `{\n  "about": "Dated 2028 backing predictions: [person, contender, score, basis]; already = who was in which camp on that day. See CLAUDE.md, Backing.",\n  "runs": [\n${body}\n  ]\n}\n`);
    console.log(`\nSaved to data/predictions.json (${today}).`);
  }
});

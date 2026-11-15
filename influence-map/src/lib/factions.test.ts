import { describe, expect, it } from 'vitest';
import { factionOf, findFactions, signedEdges, signedLouvain } from './factions';
import { buildGraph, mergePairs } from './graph';
import { describeReason, riftLabel, riftWatch } from './rifts';
import type { Person, PersonFile } from './schema';

const src = [{ url: 'https://www.example.gov/1' }];
const lean = (value: number) => ({ lean: [{ value, basis: 'b', sources: src }] });
const person = (slug: string, extra: Partial<Person> = {}): PersonFile => ({
  slug,
  file: `${slug}.json`,
  data: { name: slug, public_figure: true, connections: [], ...extra },
});
function tie(files: PersonFile[], a: string, b: string, type: string, end_year: number | null = null) {
  const c = (slug: string) => ({ name: slug, slug, relationship_type: type, start_year: 2015, end_year, confidence: 0.9, sources: src });
  files.find((f) => f.slug === a)!.data.connections!.push(c(b));
  files.find((f) => f.slug === b)!.data.connections!.push(c(a));
}

/** Two tight blocs of five that feud with each other, joined by one friendly bridge (a1–b1). */
function world() {
  const A = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const B = ['b1', 'b2', 'b3', 'b4', 'b5'];
  const files = [...A.map((s) => person(s, lean(2))), ...B.map((s) => person(s, lean(-2))), person('loner')];
  for (const blk of [A, B]) for (let i = 0; i < blk.length; i++) for (let j = i + 1; j < blk.length; j++) tie(files, blk[i], blk[j], 'ally');
  tie(files, 'a2', 'b1', 'enemy');
  tie(files, 'a3', 'b3', 'rival');
  tie(files, 'a1', 'b1', 'friend');
  return files;
}
const build = (files: PersonFile[]) => {
  const g = buildGraph(files, []);
  return { g, pairs: mergePairs(g.links) };
};

describe('signedEdges', () => {
  it('gives a feuding pair no friendly weight, and an ended tie less', () => {
    const files = world();
    tie(files, 'a4', 'b4', 'colleague', 2020);
    const { pairs } = build(files);
    const keep = new Set(files.map((f) => f.slug));
    const e = signedEdges(pairs, keep, 2026);
    const find = (a: string, b: string) => e.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!;
    expect(find('a2', 'b1').pos).toBe(0);
    expect(find('a2', 'b1').neg).toBeGreaterThan(0);
    expect(find('a4', 'b4').pos).toBeLessThan(find('a1', 'a2').pos);
  });
});

describe('signedLouvain', () => {
  it('splits two feuding blocs even with a friendly bridge between them', () => {
    const { pairs } = build(world());
    const ids = world().map((f) => f.slug);
    const of = signedLouvain(ids, signedEdges(pairs, new Set(ids), 2026));
    expect(new Set(['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => of.get(id))).size).toBe(1);
    expect(new Set(['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => of.get(id))).size).toBe(1);
    expect(of.get('a1')).not.toBe(of.get('b1'));
    expect(of.get('loner')).not.toBe(of.get('a1'));
  });
});

describe('findFactions', () => {
  const { g, pairs } = build(world());
  const factions = findFactions(g.nodes, pairs, 2026);
  it('lists factions of at least four people, with feuds between them', () => {
    expect(factions).toHaveLength(2);
    const [x, y] = factions;
    expect(x.opponents).toEqual([{ id: y.id, feuds: 2 }]);
    expect(x.cohesion).toBeGreaterThan(0.8);
    expect(factionOf(factions).get('loner')).toBeUndefined();
  });
  it('names a faction for its best-tied person when no group is shared', () => {
    expect(factions.every((f) => f.label.startsWith('Around '))).toBe(true);
  });
  it('averages lean', () => {
    expect(factions.map((f) => f.lean).sort()).toEqual([-2, 2]);
  });
});

describe('riftWatch', () => {
  it('flags a friendly tie across feuding factions, with an unbalanced triangle', () => {
    const { g, pairs } = build(world());
    const factions = findFactions(g.nodes, pairs, 2026);
    const list = riftWatch(g.nodes, pairs, factions, { year: 2026, now: new Date('2026-06-01') });
    const w = list.find((r) => [r.a, r.b].sort().join() === 'a1,b1')!;
    expect(w).toBeDefined();
    expect(w.reasons.map((r) => r.kind).sort()).toEqual(['factions', 'politics', 'triad']);
    expect(w.score).toBeGreaterThan(60);
    // Ties inside a bloc with no strain are left out.
    expect(list.find((r) => [r.a, r.b].sort().join() === 'a4,a5')).toBeUndefined();
    expect(list[0]).toBe(w);
  });

  it('counts a recent ask the other turned down, but not an old one, and leaves ended ties out', () => {
    const files = world();
    const ask = (decided: string) => ({ date: decided, with: ['a5'], what: 'a post', kind: 'appointment' as never, outcome: 'denied' as const, decided, sources: src });
    files.find((f) => f.slug === 'a4')!.data.asks = [ask('2026-03'), ask('2020-01')];
    tie(files, 'a5', 'b5', 'colleague', 2020);
    const { g, pairs } = build(files);
    const list = riftWatch(g.nodes, pairs, findFactions(g.nodes, pairs, 2026), { year: 2026, now: new Date('2026-06-01') });
    const w = list.find((r) => [r.a, r.b].sort().join() === 'a4,a5')!;
    expect(w.reasons.filter((r) => r.kind === 'denied')).toHaveLength(1);
    expect(list.find((r) => [r.a, r.b].sort().join() === 'a5,b5')).toBeUndefined();
    expect(describeReason(w.reasons[0], (id) => id.toUpperCase())).toContain('A4 was turned down');
  });

  it('flags same-side 2028 contenders', () => {
    const files = world();
    for (const s of ['a1', 'a2']) files.find((f) => f.slug === s)!.data.race_2028 = { role: 'contender', basis: 'b', sources: src };
    const { g, pairs } = build(files);
    const list = riftWatch(g.nodes, pairs, findFactions(g.nodes, pairs, 2026), { year: 2026 });
    const w = list.find((r) => [r.a, r.b].sort().join() === 'a1,a2')!;
    expect(w.reasons.map((r) => r.kind)).toContain('prize');
    const noRace = riftWatch(g.nodes, pairs, findFactions(g.nodes, pairs, 2026), { year: 2026, noRace: true });
    expect(noRace.find((r) => [r.a, r.b].sort().join() === 'a1,a2')?.reasons.map((r) => r.kind)).not.toContain('prize');
  });

  it('labels scores', () => {
    expect([riftLabel(70), riftLabel(45), riftLabel(25), riftLabel(5)]).toEqual(['High', 'Elevated', 'Watch', 'Low']);
  });
});

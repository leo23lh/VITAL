import { describe, expect, it } from 'vitest';
import { backingBoard, backingLabel, backingOf, backingReason, fitOf, leanValue, structuralBacking } from './backing';
import { buildGraph, closenessIndex, mergePairs } from './graph';
import { rankPull, bondIndex } from './pull';
import { workplaceIndex } from './graph';
import type { Person, PersonFile } from './schema';

const src = [{ url: 'https://www.example.gov/1' }];
const lean = (value: number) => ({ lean: [{ value, basis: 'b', sources: src }] });
const person = (slug: string, extra: Partial<Person> = {}): PersonFile => ({
  slug,
  file: `${slug}.json`,
  data: { name: slug, public_figure: true, connections: [], ...extra },
});
const conn = (slug: string, relationship_type: string, end_year: number | null = null) => ({
  name: slug,
  slug,
  relationship_type,
  start_year: 2015,
  end_year,
  confidence: 0.9,
  sources: src,
});
/** Adds both halves of a tie to the files. */
function tie(files: PersonFile[], a: string, b: string, type: string) {
  files.find((f) => f.slug === a)!.data.connections!.push(conn(b, type));
  files.find((f) => f.slug === b)!.data.connections!.push(conn(a, type));
}
const contender = { race_2028: { role: 'contender' as const, basis: 'b', sources: src } };
const camp = (...contenders: string[]) => ({ race_2028: { role: 'camp' as const, contenders, basis: 'b', sources: src } });

function world() {
  const files = [
    person('red', { ...contender, ...lean(2) }),
    person('red2', { ...contender, ...lean(2) }),
    person('blue', { ...contender, ...lean(-2) }),
    person('ally', lean(2)),
    person('stranger', lean(2)),
    person('lefty', lean(-2)),
    person('nolean'),
    person('aide', { ...camp('red'), ...lean(2) }),
    person('foe', lean(2)),
    person('donor', {
      ...lean(2),
      giving: {
        cycles: [{ cycle: 2026, total_usd: 5_000_000, sources: src }],
        outlook: { cycle: 2028, summary: 's', likely: [{ name: 'red2', slug: 'red2', kind: 'candidate', basis: 'said so', confidence: 0.8, sources: src }] },
      },
    }),
    person('gone', { ...lean(2), died: 2025 }),
    person('clerk', {
      ...lean(2),
      org_chart_only: true,
      office: { title: 'Clerk', unit: 'labor', rank: 4, sources: src },
    }),
  ];
  tie(files, 'ally', 'red', 'ally');
  tie(files, 'aide', 'red', 'employer');
  tie(files, 'aide', 'red2', 'ally');
  tie(files, 'foe', 'red', 'enemy');
  tie(files, 'gone', 'red', 'ally');
  tie(files, 'clerk', 'red', 'ally');
  tie(files, 'lefty', 'red', 'friend');
  return files;
}

describe('fit', () => {
  it('falls with distance and is neutral when a lean is missing', () => {
    expect(fitOf(2, 2)).toBe(1);
    expect(fitOf(2, 1)).toBe(0.9);
    expect(fitOf(2, 0)).toBe(0.6);
    expect(fitOf(2, -1)).toBe(0.3);
    expect(fitOf(2, -2)).toBe(0.08);
    expect(fitOf(3, -3)).toBe(0.08);
    expect(fitOf(null, 2)).toBe(0.6);
  });

  it('reads an organization’s side as a lean', () => {
    const g = buildGraph([], [
      { slug: 'pac', file: 'pac.json', data: { name: 'PAC', kind: 'super-pac', side: 'D' } },
      { slug: 'firm', file: 'firm.json', data: { name: 'Firm', kind: 'company' } },
    ]);
    expect(leanValue(g.nodes.find((n) => n.id === 'pac'), 2026)).toBe(-2);
    expect(leanValue(g.nodes.find((n) => n.id === 'firm'), 2026)).toBeNull();
  });
});

describe('backing', () => {
  const g = buildGraph(world());
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const index = closenessIndex(mergePairs(g.links), 2026);
  const of = (p: string, c: string) => backingOf(p, c, index, byId, 2026);

  it('gives the same side with no tie a floor, and the other side almost nothing', () => {
    // Fit alone: 0.3 × 1.
    expect(of('stranger', 'red').score).toBe(30);
    expect(of('stranger', 'red').label).toBe('Possible');
    expect(of('stranger', 'blue').score).toBe(2);
    expect(of('nolean', 'red').score).toBe(18);
  });

  it('counts a tie more than fit, and lets a close tie carry across sides', () => {
    expect(of('ally', 'red').score).toBeGreaterThan(of('stranger', 'red').score + 20);
    expect(of('ally', 'red').direct).toBe(true);
    // A friend on the other side still scores on the friendship.
    expect(of('lefty', 'red').score).toBeGreaterThan(50);
    expect(backingReason(of('lefty', 'red'), (id) => id)).toContain('opposite side');
  });

  it('all but rules out someone feuding with the contender', () => {
    const b = of('foe', 'red');
    expect(b.feud).toBe(true);
    expect(b.score).toBeLessThan(5);
    expect(structuralBacking('foe', 'red', index, byId, 2026).score).toBeLessThan(0.05);
  });

  it('puts camp members near the top and lowers them for same-side rivals', () => {
    expect(of('aide', 'red').basis).toBe('camp');
    expect(of('aide', 'red').score).toBeGreaterThanOrEqual(90);
    const rival = of('aide', 'red2');
    expect(rival.elsewhere).toEqual(['red']);
    // The alliance with red2 alone would score well; the camp with red cuts it by 0.6.
    expect(rival.score).toBeLessThan(of('ally', 'red').score);
    // A camp on one side doesn't change a score on the other.
    expect(of('aide', 'blue').elsewhere).toEqual([]);
  });

  it('raises the score for a reported plan to give', () => {
    const b = of('donor', 'red2');
    expect(b.basis).toBe('reported');
    // 1 − (1 − 0.3)(1 − 0.8) = 0.86
    expect(b.score).toBe(86);
    expect(backingReason(b, (id) => id)).toMatch(/^Reported likely to give/);
  });

  it('labels the bands', () => {
    expect([90, 70, 50, 35, 10].map(backingLabel)).toEqual(['Very likely', 'Likely', 'Leaning', 'Possible', 'Unlikely']);
  });
});

describe('backingBoard', () => {
  const g = buildGraph(world());
  const board = backingBoard(g.nodes, g.links, 2026);
  const red = board.contenders.find((c) => c.id === 'red')!;

  it('leaves out contenders, the dead and org-chart-only officials as backers', () => {
    const backers = red.backers.map((b) => b.person);
    expect(backers).toEqual(expect.arrayContaining(['ally', 'aide', 'stranger', 'donor']));
    for (const id of ['red', 'red2', 'blue', 'gone', 'clerk']) expect(backers).not.toContain(id);
    expect(board.byPerson.has('gone')).toBe(false);
  });

  it('summarizes each contender, Republicans first', () => {
    expect(board.contenders.map((c) => c.side)).toEqual(['R', 'R', 'D']);
    expect(red.declared).toBe(1);
    // ally and lefty pick red first without being in the camp.
    expect(red.predicted).toBe(2);
    const red2 = board.contenders.find((c) => c.id === 'red2')!;
    expect(red2.predicted).toBe(1);
    expect(red2.donorMoney).toBe(5_000_000);
    expect(red.backers[0].person).toBe('aide');
  });

  it('ranks each person’s contenders', () => {
    expect(board.byPerson.get('donor')!.map((b) => b.contender)).toEqual(['red2', 'red', 'blue']);
  });
});

describe('people who have died', () => {
  it('hold no pull', () => {
    const office = { office: { title: 'President', unit: 'white-house' as const, rank: 1 as const, sources: src } };
    const files = [person('pres', office), person('alive'), person('gone', { died: 2025 })];
    tie(files, 'alive', 'pres', 'ally');
    tie(files, 'gone', 'pres', 'ally');
    const g = buildGraph(files);
    const ranked = rankPull(g.nodes, bondIndex(g.nodes, g.links, workplaceIndex(g.nodes))).map((r) => r.id);
    expect(ranked).toEqual(['alive']);
  });
});

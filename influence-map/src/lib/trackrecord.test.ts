import { describe, expect, it } from 'vitest';
import { freeze } from './backtest';
import { buildGraph, workplaceIndex } from './graph';
import { bondIndex, DEFAULT_PULL, pullOf } from './pull';
import type { Ask, Person, PersonFile } from './schema';
import { deciderAccess, deciderPower, recordOf } from './trackrecord';

const src = [{ url: 'https://www.example.gov/1' }];
const person = (slug: string, extra: Partial<Person> = {}): PersonFile => ({
  slug,
  file: `${slug}.json`,
  data: { name: slug, public_figure: true, connections: [], ...extra },
});
const conn = (slug: string, relationship_type: string, end_year: number | null = null) => ({
  name: slug, slug, relationship_type, start_year: 2015, end_year, confidence: 0.9, sources: src,
});
const ask = (extra: Partial<Ask>): Ask => ({ date: '2025-06', with: ['pres'], what: 'x', kind: 'policy', outcome: 'granted', decided: '2025-07-01', sources: src, ...extra });
const pres = { office: { title: 'President', unit: 'white-house' as const, rank: 1 as const, since: '2025-01-20', sources: src } };

describe('recordOf', () => {
  it('counts outcomes and gives partial asks half credit', () => {
    const r = recordOf([ask({}), ask({ outcome: 'denied' }), ask({ outcome: 'partial' }), ask({ outcome: 'pending', decided: undefined })]);
    expect(r).toMatchObject({ granted: 1, denied: 1, partial: 1, pending: 1 });
    expect(r.rate).toBeCloseTo(0.5);
    expect(recordOf([]).rate).toBeNull();
  });
});

describe('deciderAccess', () => {
  const files = [
    person('pres', { ...pres, connections: [conn('friend', 'ally'), conn('foe', 'enemy')] }),
    person('friend', { connections: [conn('pres', 'ally')] }),
    person('foe', { connections: [conn('pres', 'enemy')] }),
    person('stranger', { access: [{ date: '2025-05-02', with: ['pres'], what: 'met', sources: src }] }),
  ];
  const g = buildGraph(files);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const idx = bondIndex(g.nodes, g.links, workplaceIndex(g.nodes));
  const of = (id: string, a: Ask) => deciderAccess(byId.get(id)!, a, byId, idx, DEFAULT_PULL.accessBoost, DEFAULT_PULL.metOnlyBond);

  it('is the bond with whoever decided', () => {
    expect(of('friend', ask({}))).toBe(idx.get('friend|pres')!.score);
    expect(of('friend', ask({ with: [] }))).toBeNull();
    expect(deciderPower(ask({}), byId)).toBe(1);
  });

  it('counts a feud as no access, and a recent meeting as a start', () => {
    expect(of('foe', ask({}))).toBe(0);
    // One meeting in the year before: 20 + 80 × 0.15.
    expect(of('stranger', ask({}))).toBe(32);
    // A meeting after the ask doesn't count.
    expect(of('stranger', ask({ date: '2025-04' }))).toBe(0);
  });
});

describe('freezing at a day', () => {
  it('drops posts and meetings that came later, and can keep leverage', () => {
    const files = {
      people: [
        person('pres', pres),
        person('donor', {
          leverage: { level: 2, basis: 'x', sources: src },
          access: [
            { date: '2025-03-01', with: ['pres'], what: 'met', sources: src },
            { date: '2025-09-01', with: ['pres'], what: 'met', sources: src },
          ],
        }),
      ],
      orgs: [],
    };
    const before = freeze(files, 2025, { date: '2025-01-10' });
    expect(before.people[0].data.office).toBeUndefined();
    const mid = freeze(files, 2025, { date: '2025-06-30', keepLeverage: true });
    expect(mid.people[0].data.office?.title).toBe('President');
    expect(mid.people[1].data.access).toHaveLength(1);
    expect(mid.people[1].data.leverage?.level).toBe(2);
    expect(freeze(files, 2025).people[1].data.leverage).toBeUndefined();
  });
});

describe('Pull weights', () => {
  it('default to the documented values and can be changed for testing', () => {
    const g = buildGraph([person('pres', { ...pres, connections: [conn('a', 'ally')] }), person('a', { connections: [conn('pres', 'ally')], leverage: { level: 2, basis: 'x', sources: src } })]);
    const idx = bondIndex(g.nodes, g.links, workplaceIndex(g.nodes));
    const base = pullOf('a', g.nodes, idx);
    const noLeverage = pullOf('a', g.nodes, idx, new Date(), undefined, { ...DEFAULT_PULL, leverageStep: 0 });
    expect(base.score).toBeGreaterThan(noLeverage.score);
    expect(noLeverage.score).toBe(noLeverage.access);
  });
});

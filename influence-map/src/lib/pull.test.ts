import { describe, expect, it } from 'vitest';
import { buildGraph, workplaceIndex } from './graph';
import { moneyFactor, orgDistanceFactor } from './graph';
import { bondIndex, earOf, power, pullOf, rankPull } from './pull';
import type { Person, PersonFile } from './schema';

const src = [{ url: 'https://example.com/1', title: 'Source' }];
const office = (title: string, unit: string, rank: number) => ({ office: { title, unit, rank, sources: src } }) as never;
function person(slug: string, connections: Person['connections'] = [], extra: Partial<Person> = {}): PersonFile {
  return {
    slug,
    file: `${slug}.json`,
    data: { name: slug.toUpperCase(), aliases: [], public_figure: true, summary: 'S', sources: src, timeline: [], affiliations: [], connections, last_researched: '2026-11-07', ...extra },
  };
}
const conn = (slug: string, relationship_type: string, confidence = 0.9) => ({
  name: slug.toUpperCase(),
  slug,
  relationship_type,
  description: 'link',
  start_year: 2010,
  end_year: null,
  confidence,
  sources: src,
});

// pres ← ally: insider (ally of the President) and outsider (ally of a deputy only).
const g = buildGraph([
  person('pres', [conn('insider', 'ally'), conn('friend', 'ally'), conn('sec', 'employee')], office('President', 'white-house', 1)),
  person('sec', [conn('pres', 'employer'), conn('aide', 'employee'), conn('dep', 'employee')], office('Secretary', 'labor', 1)),
  person('dep', [conn('sec', 'employer'), conn('outsider', 'ally')], office('Deputy', 'labor', 2)),
  person('insider', [conn('pres', 'ally')]),
  person('outsider', [conn('dep', 'ally')]),
  person('friend', [conn('pres', 'ally'), conn('me', 'friend')]),
  person('aide', [conn('sec', 'employer'), conn('me', 'colleague')]),
  person('me', [conn('friend', 'friend'), conn('aide', 'colleague')], { public_figure: false, self_added: true } as never),
]);
const idx = bondIndex(g.nodes, g.links, workplaceIndex(g.nodes));
const node = (id: string) => g.nodes.find((n) => n.id === id);

describe('power', () => {
  it('weights posts by unit and rank', () => {
    expect(power(node('pres'))).toBe(1);
    expect(power(node('sec'))).toBe(0.7);
    expect(power(node('dep'))).toBe(0.45);
    expect(power(node('insider'))).toBe(0);
  });
});

describe('pullOf', () => {
  it('counts ties to the more powerful for more', () => {
    expect(pullOf('insider', g.nodes, idx).score).toBeGreaterThan(pullOf('outsider', g.nodes, idx).score);
  });

  it('counts ties to juniors a quarter', () => {
    const sec = pullOf('sec', g.nodes, idx);
    const viaDep = sec.via.find((v) => v.id === 'dep')!;
    expect(viaDep.weight).toBeCloseTo((0.45 * viaDep.bond) / 100 / 4);
  });

  it('ranks people, leaving out the President', () => {
    const ids = rankPull(g.nodes, idx).map((r) => r.id);
    expect(ids).not.toContain('pres');
    expect(ids.indexOf('insider')).toBeLessThan(ids.indexOf('outsider'));
  });

  it('lists who has an official’s ear', () => {
    expect(earOf('pres', g.nodes, idx).map((e) => e.id)).toEqual(expect.arrayContaining(['insider', 'friend', 'sec']));
  });
});

describe('pull v2', () => {
  const office = (title: string, unit: string, rank: number, reports_to?: string) =>
    ({ office: { title, unit, rank, reports_to, sources: src } }) as never;
  const g2 = buildGraph([
    person('pres', [conn('direct', 'employee'), conn('far', 'employee'), conn('mogul', 'ally')], office('President', 'white-house', 1)),
    person('direct', [conn('pres', 'employer')], office('Secretary', 'labor', 1, 'pres')),
    person('far', [conn('pres', 'employer')], office('Adviser', 'agencies', 4)),
    person('mogul', [conn('pres', 'ally')], {
      leverage: { level: 3, basis: 'Owns a company the government needs.', sources: src },
      access: [{ date: '2026-10-01', with: ['pres'], what: 'Met in the Oval Office.', sources: src }],
    } as never),
    person('nobody', [conn('pres', 'ally')]),
  ]);
  // The President's file needs the inverse ally record for nobody; buildGraph merges one-sided records anyway.
  const idx2 = bondIndex(g2.nodes, g2.links, workplaceIndex(g2.nodes));
  const now = new Date('2026-11-08');

  it('weighs a government job by reporting distance', () => {
    expect(orgDistanceFactor(g2.nodes.find((n) => n.id === 'direct'), g2.nodes.find((n) => n.id === 'pres'))).toBe(1);
    expect(orgDistanceFactor(g2.nodes.find((n) => n.id === 'far'), g2.nodes.find((n) => n.id === 'pres'))).toBe(0.6);
    expect(pullOf('direct', g2.nodes, idx2, now).score).toBeGreaterThan(pullOf('far', g2.nodes, idx2, now).score);
  });

  it('weighs money by amount', () => {
    expect(moneyFactor(1e5)).toBeCloseTo(0.55);
    expect(moneyFactor(1e7)).toBeCloseTo(0.75);
    expect(moneyFactor(1e10)).toBe(1);
    expect(moneyFactor(undefined)).toBe(0.65);
  });

  it('adds leverage and recent access', () => {
    const m = pullOf('mogul', g2.nodes, idx2, now);
    const plain = pullOf('nobody', g2.nodes, idx2, now);
    expect(m.leverage).toBe(3);
    expect(m.via[0].recent).toBe(1);
    expect(m.score).toBeGreaterThan(plain.score);
    // A meeting more than a year ago doesn't count.
    expect(pullOf('mogul', g2.nodes, idx2, new Date('2028-01-01')).via[0].recent).toBe(0);
  });
});

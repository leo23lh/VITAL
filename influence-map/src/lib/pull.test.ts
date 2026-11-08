import { describe, expect, it } from 'vitest';
import { buildGraph, workplaceIndex } from './graph';
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

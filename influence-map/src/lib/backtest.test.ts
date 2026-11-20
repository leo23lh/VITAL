import { describe, expect, it } from 'vitest';
import { auc, freeze, givingTest, newTieTest } from './backtest';
import type { Person, PersonFile } from './schema';

const src = [{ url: 'https://www.example.gov/1' }];
const person = (slug: string, connections: Person['connections'] = [], extra: Partial<Person> = {}): PersonFile => ({
  slug,
  file: `${slug}.json`,
  data: { name: slug, public_figure: true, connections, ...extra },
});
const conn = (slug: string, relationship_type: string, start_year: number | null, end_year?: number | null) => ({
  name: slug,
  slug,
  relationship_type,
  start_year,
  end_year,
  confidence: 0.9,
  sources: src,
});
/** Both halves of a tie. */
const tie = (map: Map<string, Person['connections']>, a: string, b: string, type: string, start: number | null, end?: number | null) => {
  map.set(a, [...(map.get(a) ?? []), conn(b, type, start, end)]);
  map.set(b, [...(map.get(b) ?? []), conn(a, type, start, end)]);
};

describe('auc', () => {
  it('is 1 when every positive outscores every negative, 0.5 when they tie', () => {
    expect(auc([3, 4], [1, 2])).toBe(1);
    expect(auc([1, 2], [3, 4])).toBe(0);
    expect(auc([1], [1])).toBe(0.5);
    expect(auc([2, 0], [1])).toBe(0.5);
    expect(auc([], [1])).toBeNaN();
  });
});

describe('freeze', () => {
  it('drops what started later and reopens what ended later', () => {
    const files = {
      people: [
        person(
          'a',
          [conn('b', 'ally', 2010, 2023), conn('c', 'ally', 2025, null), conn('d', 'ally', null)],
          {
            groups: ['trump-circle'],
            leverage: { level: 2, basis: 'x', sources: src },
            race_2028: { role: 'contender', basis: 'x', sources: src },
            office: { title: 'Secretary', unit: 'labor', rank: 1, since: '2025-03-11', sources: src },
            access: [
              { date: '2021-05-01', with: ['b'], what: 'met', sources: src },
              { date: '2026-01-01', with: ['b'], what: 'met', sources: src },
            ],
            giving: {
              cycles: [
                { cycle: 2022, sources: src },
                { cycle: 2024, sources: src },
              ],
              outlook: { cycle: 2028, summary: 'x' },
            },
            timeline: [
              { year: 2019, end_year: 2024, role: 'r', org: 'o' },
              { year: 2025, role: 'r', org: 'o' },
            ],
          },
        ),
      ],
      orgs: [
        { slug: 'old', file: 'old.json', data: { name: 'Old', kind: 'pac' as const, founded: 2010, connections: [conn('a', 'donor', 2024)] } },
        { slug: 'new', file: 'new.json', data: { name: 'New', kind: 'pac' as const, founded: 2024 } },
      ],
    };
    const { people, orgs } = freeze(files, 2022);
    const a = people[0].data;
    expect(a.connections!.map((c) => [c.slug, c.end_year])).toEqual([
      ['b', null],
      ['d', undefined],
    ]);
    expect(a.groups).toEqual([]);
    expect(a.leverage).toBeUndefined();
    expect(a.race_2028).toBeUndefined();
    expect(a.office).toBeUndefined();
    expect(a.access).toHaveLength(1);
    expect(a.giving).toEqual({ cycles: [{ cycle: 2022, sources: src }] });
    expect(a.timeline).toEqual([{ year: 2019, end_year: null, role: 'r', org: 'o' }]);
    expect(orgs.map((o) => o.slug)).toEqual(['old']);
    expect(orgs[0].data.connections).toEqual([]);
    // The input is left alone.
    expect(files.people[0].data.connections).toHaveLength(3);
  });
});

describe('newTieTest', () => {
  it('scores whether close untied pairs went on to form a tie', () => {
    // Two circles before 2020. Afterwards a and b (who share two friends) tie up; nobody crosses circles.
    const m = new Map<string, Person['connections']>();
    tie(m, 'a', 'x', 'ally', 2010, null);
    tie(m, 'a', 'y', 'ally', 2010, null);
    tie(m, 'b', 'x', 'ally', 2010, null);
    tie(m, 'b', 'y', 'ally', 2010, null);
    tie(m, 'p', 'q', 'ally', 2010, null);
    tie(m, 'q', 'r', 'ally', 2010, null);
    tie(m, 'a', 'b', 'ally', 2022, null);
    tie(m, 'a', 'newcomer', 'ally', 2023, null);
    tie(m, 'p', 'x', 'enemy', 2023, null);
    const people = [...m.entries()].map(([slug, c]) => person(slug, c));
    const t = newTieTest({ people, orgs: [] }, 2020, {}, 2);
    expect(t.positives).toBe(1);
    // The newcomer had no tie in 2020, so that tie can't be tested; the feud is not a friendly tie.
    expect(t.coldStarts).toBe(1);
    // x and y share two friends as well (a and b), so they tie with the pair that formed.
    expect(t.auc).toBeCloseTo(13.5 / 14);
    expect(t.aucSharedFriends).toBeCloseTo(13.5 / 14);
    expect(t.topHits).toBe(1);
    expect(t.topExpected).toBeCloseTo(2 / 15);
    expect(t.candidates).toBe(7 * 6 / 2 - 6);
  });
});

describe('givingTest', () => {
  it('scores next-cycle gifts against the frozen map', () => {
    const m = new Map<string, Person['connections']>();
    tie(m, 'donor', 'friend', 'ally', 2010, null);
    tie(m, 'friend', 'cand1', 'ally', 2010, null);
    tie(m, 'cand2', 'other', 'ally', 2010, null);
    const gift = (slug: string) => ({ name: slug, slug, kind: 'candidate' as const, sources: src });
    const people = [...m.entries()].map(([slug, c]) =>
      person(slug, c, slug === 'donor' ? { giving: { cycles: [{ cycle: 2024, sources: src, recipients: [gift('cand1')] }] } } : slug === 'other' ? { giving: { cycles: [{ cycle: 2022, sources: src, recipients: [gift('cand2')] }] } } : {}),
    );
    const t = givingTest({ people, orgs: [] }, 2022);
    expect(t.cycle).toBe(2024);
    expect(t.donors).toBe(1);
    expect(t.gifts).toBe(1);
    expect(t.newGifts).toBe(1);
    // cand1 is two steps from the donor, cand2 unreachable.
    expect(t.auc).toBe(1);
    expect(t.top5).toBe(1);
  });
});

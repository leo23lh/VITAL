import { describe, expect, it } from 'vitest';
import { ago, daysSince, freshnessOf, refreshQueue } from './freshness';
import { buildGraph } from './graph';
import type { Person, PersonFile } from './schema';

const src = [{ url: 'https://www.example.gov/1' }];
const person = (slug: string, extra: Partial<Person> = {}): PersonFile => ({
  slug,
  file: `${slug}.json`,
  data: { name: slug, public_figure: true, connections: [], ...extra },
});
const now = new Date('2027-03-01T12:00:00Z');

describe('freshness', () => {
  it('counts days and labels them', () => {
    expect(daysSince('2027-02-27', now)).toBe(2);
    expect(daysSince('2027-02', now)).toBeNull();
    expect(daysSince(undefined, now)).toBeNull();
    expect([10, 60, 120].map((d) => freshnessOf(d))).toEqual(['fresh', 'aging', 'stale']);
    expect(freshnessOf(null)).toBe('unknown');
    expect([0, 1, 20, 100].map(ago)).toEqual(['today', '1 day ago', '3 weeks ago', '3 months ago']);
  });

  it('queues unconfirmed posts and old files, most important first', () => {
    const office = (verified?: string) => ({ office: { title: 'Secretary', unit: 'labor' as const, rank: 1 as const, verified, sources: src } });
    const g = buildGraph([
      person('fresh', { last_researched: '2027-02-20' }),
      person('old', { last_researched: '2026-10-01' }),
      person('minister', { last_researched: '2027-02-20', ...office('2027-01-01') }),
      person('checked', { last_researched: '2026-12-01', ...office('2027-02-25') }),
      person('private', { public_figure: false, last_researched: '2020-01-01' }),
    ]);
    const weights: Record<string, number> = { old: 0.2, minister: 0.7, checked: 0.7 };
    const q = refreshQueue(g.nodes, (n) => weights[n.id] ?? 0.1, now);
    expect(q.map((x) => `${x.id}:${x.kind}`)).toEqual(['minister:office', 'checked:file', 'old:file']);
    // A post's own verified date wins over the file's research date.
    expect(q.find((x) => x.id === 'minister')!.days).toBe(59);
  });
});

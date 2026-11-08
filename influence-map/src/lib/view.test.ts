import { describe, expect, it } from 'vitest';
import { buildGraph, workplaceIndex } from './graph';
import type { Person, PersonFile } from './schema';
import { buildOrgChart } from './orgchart';
import { activeFilterCount, campSizes, filterLinks, fitKey, spotlightFor, visibleGraph, type Filters, type View } from './view';

const src = [{ url: 'https://example.com/1', title: 'Source' }];

function person(slug: string, connections: Person['connections'] = [], extra: Partial<Person> = {}): PersonFile {
  return {
    slug,
    file: `${slug}.json`,
    data: {
      name: slug.toUpperCase(),
      aliases: [],
      public_figure: true,
      current_role: 'Role',
      summary: 'Summary',
      sources: src,
      timeline: [],
      affiliations: [],
      connections,
      last_researched: '2026-11-07',
      ...extra,
    },
  };
}

const conn = (slug: string, relationship_type: string, end_year: number | null = null) => ({
  name: slug.toUpperCase(),
  slug,
  relationship_type,
  description: `${relationship_type} link`,
  start_year: 2010,
  end_year,
  confidence: 0.9,
  sources: src,
});

// a–b allies now; a–c colleagues until 2015; b–d rivals now; e has no links.
const graph = buildGraph([
  person('a', [conn('b', 'ally'), conn('c', 'colleague', 2015)]),
  person('b', [conn('a', 'ally'), conn('d', 'rival')]),
  person('c', [conn('a', 'colleague', 2015)]),
  person('d', [conn('b', 'rival')]),
  person('e'),
]);
const byId = new Map(graph.nodes.map((n) => [n.id, n]));
const base: Filters = { hidden: new Set(), years: null, timeMode: 'now', showOrgs: true, showSuggested: false, leanMode: false, colorAll: true };

function shown(view: View, filters: Filters = base, selectedNodeId: string | null = null) {
  const links = filterLinks(graph.links, byId, filters);
  const spotlight = spotlightFor(view, graph.nodes, byId, links, filters);
  const v = visibleGraph({
    graph,
    byId,
    links,
    view,
    comparison: null,
    spotlight,
    extras: new Set(),
    selectedNodeId,
    workplaces: workplaceIndex(graph.nodes),
    filters,
  });
  return { ids: v.nodes.map((n) => n.id).sort(), v, spotlight };
}

describe('filterLinks', () => {
  it('drops ended ties in Now and keeps them in All time', () => {
    expect(filterLinks(graph.links, byId, base)).toHaveLength(2);
    expect(filterLinks(graph.links, byId, { ...base, timeMode: 'all' })).toHaveLength(3);
  });

  it('keeps ties active in a date range, ignoring Now', () => {
    expect(filterLinks(graph.links, byId, { ...base, years: { from: 2011, to: 2012 } })).toHaveLength(3);
  });

  it('hides a whole relationship family', () => {
    const links = filterLinks(graph.links, byId, { ...base, timeMode: 'all', hidden: new Set(['rivalry']) });
    expect(links).toHaveLength(2);
  });
});

describe('visibleGraph', () => {
  it('main view: only people with a tie left after the filters', () => {
    expect(shown({ kind: 'all' }).ids).toEqual(['a', 'b', 'd']);
    expect(shown({ kind: 'all' }, { ...base, timeMode: 'all' }).ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a selected person brings their own ties along', () => {
    expect(shown({ kind: 'world', id: 'd', depth: 1 }, base, 'a').ids).toEqual(['a', 'b', 'd']);
  });

  it('gives every pair a bond score for line width', () => {
    for (const p of shown({ kind: 'all' }).v.pairs) expect(p.bond).toBeTypeOf('number');
  });
});

describe('spotlightFor', () => {
  it('Feuds shows only the feuding pair and offers their other ties as outsiders', () => {
    const { ids, spotlight, v } = shown({ kind: 'feuds' });
    expect(ids).toEqual(['b', 'd']);
    expect(v.links).toHaveLength(1);
    // a is tied to b, but not by a feud, so the lens leaves it out.
    expect(spotlight!.outsiders).toEqual([]);
  });

  it('is off outside spotlight views', () => {
    expect(shown({ kind: 'all' }).spotlight).toBeNull();
  });
});

describe('small helpers', () => {
  it('counts filters that differ from the defaults', () => {
    expect(activeFilterCount(base)).toBe(0);
    expect(activeFilterCount({ ...base, showOrgs: false, years: { from: 2000, to: 2010 } })).toBe(2);
  });

  it('fit key changes with the view and time setting', () => {
    const k = fitKey({ kind: 'all' }, base, true);
    expect(fitKey({ kind: 'all' }, { ...base, timeMode: 'all' }, true)).not.toBe(k);
    expect(fitKey({ kind: 'compare', a: 'a', b: 'b' }, base, true)).not.toBe(k);
  });

  it('ranks 2028 camps by size', () => {
    const g = buildGraph([
      person('x', [], { race_2028: { role: 'contender' } } as never),
      person('y', [], { race_2028: { role: 'contender' } } as never),
      person('z', [], { race_2028: { role: 'backer', contenders: ['y'] } } as never),
    ]);
    const camps = campSizes(g.nodes, new Map(g.nodes.map((n) => [n.id, n])));
    expect(camps.map((c) => [c.id, c.count])).toEqual([
      ['y', 1],
      ['x', 0],
    ]);
  });
});

describe('buildOrgChart', () => {
  const src2 = [{ url: 'https://example.com/2', title: 'Source' }];
  const office = (title: string, unit: string, rank: number, reports_to?: string) =>
    ({ office: { title, unit, rank, reports_to, sources: src2 } }) as never;
  const g = buildGraph([
    person('pres', [conn('sec', 'employee')], office('President', 'white-house', 1)),
    person('sec', [conn('pres', 'employer')], office('Secretary of Labor', 'labor', 1, 'pres')),
    person('dep', [], office('Deputy Secretary of Labor', 'labor', 2, 'sec')),
    person('cos', [], office('Chief of Staff', 'labor', 3, 'sec')),
    person('sen', [], office('Senator', 'senate', 4)),
    person('donor'),
  ]);
  const chart = buildOrgChart(g.nodes, g.links, workplaceIndex(g.nodes));

  it('groups people by unit, in the official order, executive before Congress', () => {
    expect(chart.executive.map((u) => u.id)).toEqual(['white-house', 'labor']);
    expect(chart.legislative.map((u) => u.id)).toEqual(['senate']);
  });

  it('nests reports under their boss inside a unit, by rank', () => {
    const labor = chart.executive[1];
    expect(labor.rows.map((r) => r.id)).toEqual(['sec']);
    expect(labor.rows[0].children.map((r) => r.id)).toEqual(['dep', 'cos']);
  });

  it('notes a boss in another unit and the bond with them', () => {
    const sec = chart.executive[1].rows[0];
    expect(sec.bossElsewhere).toBe(true);
    expect(sec.bossName).toBe('PRES');
    expect(sec.bond).toBeGreaterThan(0);
    // No recorded tie between the deputy and the secretary.
    expect(sec.children[0].bond).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import * as validator from '../../scripts/validate.mjs';
import { activeInYear, buildGraph, describeLink, mergePairs, neighborhood, roleOfOther } from './graph';
import { GROUPS, INVERSE_TYPE, RELATIONSHIP_TYPES, SECTORS, type Person, type PersonFile } from './schema';

const src = (n: number) => [{ url: `https://example.com/${n}`, title: `Source ${n}` }];

function person(slug: string, name: string, connections: Person['connections'] = [], extra: Partial<Person> = {}): PersonFile {
  return {
    slug,
    file: `${slug}.json`,
    data: {
      name,
      aliases: [],
      public_figure: true,
      current_role: 'Role',
      summary: 'Summary',
      sources: src(0),
      timeline: [],
      affiliations: [],
      connections,
      last_researched: '2026-11-07',
      ...extra,
    },
  };
}

const conn = (slug: string, name: string, relationship_type: string, confidence = 0.9, extra = {}) => ({
  name,
  slug,
  relationship_type,
  description: `${relationship_type} link`,
  start_year: 2009,
  end_year: 2016,
  confidence,
  sources: src(1),
  ...extra,
});

describe('buildGraph', () => {
  it('merges the two halves of a reciprocal link into one directed edge', () => {
    const g = buildGraph([
      person('a', 'Aide', [conn('b', 'Boss', 'employer')]),
      person('b', 'Boss', [conn('a', 'Aide', 'employee', 0.8)]),
    ]);
    expect(g.links).toHaveLength(1);
    const [l] = g.links;
    expect(l.group).toBe('employment');
    expect(l.sourceId).toBe('b');
    expect(l.targetId).toBe('a');
    expect(l.records).toHaveLength(2);
    expect(l.confidence).toBe(0.9);
    expect(describeLink(l, (id) => (id === 'a' ? 'Aide' : 'Boss'))).toBe('Boss employed Aide');
    expect(roleOfOther(l, 'a')).toBe('employer');
    expect(roleOfOther(l, 'b')).toBe('employee');
  });

  it('points mentorship and funding arrows from mentor and donor', () => {
    const g = buildGraph([
      person('m', 'Mentee', [conn('t', 'Teacher', 'mentor'), conn('d', 'Donor', 'donor')]),
    ]);
    const mentor = g.links.find((l) => l.group === 'mentorship')!;
    const funding = g.links.find((l) => l.group === 'funding')!;
    expect([mentor.sourceId, mentor.targetId]).toEqual(['t', 'm']);
    expect([funding.sourceId, funding.targetId]).toEqual(['d', 'm']);
  });

  it('creates suggested nodes for connections without a file and sizes nodes by distinct neighbours', () => {
    const g = buildGraph([
      person('a', 'A', [conn('x', 'X Person', 'ally'), conn('x', 'X Person', 'colleague'), conn('y', 'Y', 'rival')]),
    ]);
    const x = g.nodes.find((n) => n.id === 'x')!;
    expect(x.researched).toBe(false);
    expect(x.mentionedBy).toEqual(['A']);
    expect(g.nodes.find((n) => n.id === 'a')!.degree).toBe(2);
    expect(g.links.every((l) => l.touchesSuggested)).toBe(true);
    // Two links between the same pair are curved apart.
    const pair = g.links.filter((l) => [l.sourceId, l.targetId].includes('x'));
    expect(pair[0].curvature).not.toBe(pair[1].curvature);
  });

  it('flags disagreements and skips unknown relationship types', () => {
    const g = buildGraph([
      person('a', 'A', [conn('b', 'B', 'colleague', 0.9, { start_year: 2001 }), conn('c', 'C', 'pen-pal')]),
      person('b', 'B', [conn('a', 'A', 'colleague', 0.5, { start_year: 2003 })]),
    ]);
    expect(g.links).toHaveLength(1);
    expect(g.links[0].disagreements.join(' ')).toMatch(/Start year/);
    expect(g.links[0].disagreements.join(' ')).toMatch(/Confidence/);
    expect(g.skipped).toEqual([{ file: 'a.json', name: 'C', relationship_type: 'pen-pal' }]);
  });
});

describe('views', () => {
  const files = [
    person('a', 'A', [conn('b', 'B', 'donor'), conn('b', 'B', 'rival', 0.8, { start_year: 2020, end_year: null })]),
    person('b', 'B', [conn('a', 'A', 'funded_by'), conn('a', 'A', 'rival', 0.8, { start_year: 2020, end_year: null }), conn('c', 'C', 'ally')]),
  ];
  const g = buildGraph(files);

  it('draws one line per pair, colored by the highest-priority family', () => {
    const pairs = mergePairs(g.links);
    const ab = pairs.find((p) => p.id === 'a|b')!;
    expect(ab.links).toHaveLength(2);
    expect(ab.family).toBe('rivalry');
    expect(ab.directed).toBe(false);
    const bc = pairs.find((p) => p.id === 'b|c')!;
    expect(bc.links).toHaveLength(1);
  });

  it('filters links by year and finds neighbourhoods', () => {
    const rival = g.links.find((l) => l.group === 'rival')!;
    const funding = g.links.find((l) => l.group === 'funding')!;
    expect(activeInYear(rival, 2019)).toBe(false);
    expect(activeInYear(rival, 2026)).toBe(true);
    expect(activeInYear(funding, 2017)).toBe(false);
    expect(activeInYear(funding, 2010)).toBe(true);
    expect([...neighborhood('a', g.links, 1)].sort()).toEqual(['a', 'b']);
    expect([...neighborhood('a', g.links, 2)].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('validatePeople', () => {
  it('uses the same relationship types as the app', () => {
    expect(validator.RELATIONSHIP_TYPES).toEqual([...RELATIONSHIP_TYPES]);
    expect(validator.INVERSE_TYPE).toEqual(INVERSE_TYPE);
    expect(validator.SECTORS).toEqual(SECTORS.map((s) => s.id));
    expect(validator.GROUPS).toEqual(GROUPS.map((g) => g.id));
  });

  it('checks sector and group names', () => {
    const p = person('a', 'A', [], { sector: 'sports' as never, groups: ['paypal-mafia', 'nope'] as never });
    const { errors } = validator.validatePeople([p]);
    expect(errors.map((e) => e.message).join('\n')).toMatch(/sector/);
    expect(errors.map((e) => e.message).join('\n')).toMatch(/nope/);
  });

  it('accepts a clean reciprocal pair', () => {
    const { errors } = validator.validatePeople([
      person('a', 'A', [conn('b', 'B', 'mentor')]),
      person('b', 'B', [conn('a', 'A', 'protégé')]),
    ]);
    expect(errors).toEqual([]);
  });

  it('requires reciprocal links with the inverse type', () => {
    const missing = validator.validatePeople([person('a', 'A', [conn('b', 'B', 'mentor')]), person('b', 'B')]);
    expect(missing.errors[0].message).toMatch(/no connection back/);
    const wrong = validator.validatePeople([
      person('a', 'A', [conn('b', 'B', 'mentor')]),
      person('b', 'B', [conn('a', 'A', 'mentor')]),
    ]);
    expect(wrong.errors.map((e: { message: string }) => e.message).join('\n')).toMatch(/inverse of "mentor" is "protégé"/);
  });

  it('rejects unsourced facts and private contact details', () => {
    const { errors } = validator.validatePeople([
      person('a', 'A', [conn('x', 'X', 'ally', 0.7, { sources: [] })], {
        timeline: [{ year: 2001, role: 'Aide', org: 'Office' }],
        affiliations: ['Some Club'],
        summary: 'Reach him at 202-555-0143 or a@b.com',
      }),
    ]);
    const text = errors.map((e: { message: string }) => e.message).join('\n');
    expect(text).toMatch(/connection to X: no sources/);
    expect(text).toMatch(/timeline\[0\].*no sources/);
    expect(text).toMatch(/affiliations\[0\]/);
    expect(text).toMatch(/phone number/);
    expect(text).toMatch(/email address/);
  });

  it('lets non-public files use user-provided sources and catches slug mismatches', () => {
    const { errors } = validator.validatePeople([
      person('pat-doe', 'Pat Doe', [conn('jeff-session', 'Jeff Sessions', 'colleague', 0.6, { sources: ['user-provided'] })], {
        public_figure: false,
        sources: ['user-provided'],
      }),
      person('jeff-sessions', 'Jeff Sessions'),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/use slug "jeff-sessions"/);
  });
});

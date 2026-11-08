import { describe, expect, it } from 'vitest';
import * as validator from '../../scripts/validate.mjs';
import {
  activeInRange,
  activeInYear,
  buildGraph,
  describeLink,
  familyOf,
  findClusters,
  leanAt,
  mergePairs,
  neighborhood,
  ringDistances,
  roleOfOther,
} from './graph';
import {
  GIVING_SIDES,
  GROUPS,
  INVERSE_TYPE,
  ORG_KINDS,
  ORG_RELATIONSHIP_TYPES,
  RECIPIENT_KINDS,
  RELATIONSHIP_TYPES,
  SECTORS,
  formatUsd,
  type Org,
  type OrgFile,
  type Person,
  type PersonFile,
} from './schema';

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
    // A range shows a link if any part of it overlaps.
    expect(activeInRange(funding, { from: 2016, to: 2018 })).toBe(true);
    expect(activeInRange(rival, { from: 2017, to: 2019 })).toBe(false);
    expect(activeInRange(rival, { from: 2017, to: 2030 })).toBe(true);
    expect([...neighborhood('a', g.links, 1)].sort()).toEqual(['a', 'b']);
    expect([...neighborhood('a', g.links, 2)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('splits rivalries into current (ongoing) and past (ended)', () => {
    const g2 = buildGraph([
      person('x', 'X', [conn('y', 'Y', 'rival', 0.9, { end_year: 2016 }), conn('z', 'Z', 'rival', 0.9, { end_year: null })]),
      person('y', 'Y', [conn('x', 'X', 'rival', 0.9, { end_year: 2016 })]),
      person('z', 'Z', [conn('x', 'X', 'rival', 0.9, { end_year: null })]),
    ]);
    const xy = g2.links.find((l) => l.targetId === 'y' || l.sourceId === 'y')!;
    const xz = g2.links.find((l) => l.targetId === 'z' || l.sourceId === 'z')!;
    expect(familyOf(xy)).toBe('past-rivalry');
    expect(familyOf(xz)).toBe('rivalry');
    expect(describeLink(xy, (id) => id.toUpperCase())).toBe('X and Y were rivals');
    expect(roleOfOther(xy, 'x')).toBe('past rival');
  });

  it('puts the core in the middle and everyone else on rings by distance', () => {
    const { rings, unlinked } = ringDistances(new Set(['a']), g.links, ['a', 'b', 'c', 'z']);
    expect(Object.fromEntries(rings)).toEqual({ a: 0, b: 1, c: 2, z: 3 });
    expect(unlinked).toBe(3);
  });
});

describe('validatePeople', () => {
  it('uses the same relationship types as the app', () => {
    expect(validator.RELATIONSHIP_TYPES).toEqual([...RELATIONSHIP_TYPES]);
    expect(validator.INVERSE_TYPE).toEqual(INVERSE_TYPE);
    expect(validator.SECTORS).toEqual(SECTORS.map((s) => s.id));
    expect(validator.GROUPS).toEqual(GROUPS.map((g) => g.id));
    expect(validator.RECIPIENT_KINDS).toEqual(RECIPIENT_KINDS.map((k) => k.id));
    expect(validator.GIVING_SIDES).toEqual([...GIVING_SIDES]);
    expect(validator.ORG_KINDS).toEqual(ORG_KINDS.map((k) => k.id));
    expect(validator.ORG_RELATIONSHIP_TYPES).toEqual([...ORG_RELATIONSHIP_TYPES]);
  });

  it("allows a family link only to the owner's self-added file", () => {
    const pub = person('mom', 'Mom', [{ ...conn('me', 'Me', 'family'), sources: ['user-provided'] }]);
    const me = person('me', 'Me', [{ ...conn('mom', 'Mom', 'family'), sources: ['user-provided'] }], {
      public_figure: false,
      self_added: true,
    });
    expect(validator.validatePeople([pub, me]).errors).toEqual([]);
    const notSelf = person('me', 'Me', [{ ...conn('mom', 'Mom', 'family'), sources: ['user-provided'] }], {
      public_figure: false,
    });
    const errs = validator.validatePeople([pub, notSelf]).errors.map((e) => e.message).join('\n');
    expect(errs).toMatch(/family links are only allowed/);
    expect(errs).toMatch(/not an http/);
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

describe('political lean', () => {
  const lean = [
    { value: -1, end_year: 2016, basis: 'Democratic donor', sources: src(1) },
    { value: 2, start_year: 2017, end_year: null, basis: 'Republican official', sources: src(2) },
  ];

  it('picks the period that covers the year, and the current one by default', () => {
    expect(leanAt(lean, 2010)?.value).toBe(-1);
    expect(leanAt(lean, 2016)?.value).toBe(-1);
    expect(leanAt(lean, 2017)?.value).toBe(2);
    expect(leanAt(lean, null)?.value).toBe(2);
    expect(leanAt([], 2020)).toBeUndefined();
  });

  it('uses the nearest period outside the recorded ones', () => {
    const later = [{ value: 1, start_year: 2015, end_year: 2018, basis: 'b', sources: src(1) }];
    expect(leanAt(later, 2000)?.value).toBe(1);
    expect(leanAt(later, 2024)?.value).toBe(1);
  });

  it('validates values, order and sources', () => {
    expect(validator.validatePeople([person('a', 'A', [], { lean })]).errors).toEqual([]);
    const bad = person('a', 'A', [], {
      lean: [
        { value: 5, basis: 'x', sources: src(1) },
        { value: 1, start_year: 2010, basis: '', sources: [] },
      ],
    });
    const text = validator.validatePeople([bad]).errors.map((e: { message: string }) => e.message).join('\n');
    expect(text).toMatch(/-3 to 3/);
    expect(text).toMatch(/only the last period may be open-ended/);
    expect(text).toMatch(/basis/);
    expect(text).toMatch(/no sources/);
    const priv = person('me', 'Me', [], { public_figure: false, lean: [{ value: 0, basis: 'b', sources: ['user-provided'] }] });
    expect(validator.validatePeople([priv]).errors[0].message).toMatch(/only public figures/);
  });

  it('pulls close relationships harder than rivalries', () => {
    const g = buildGraph([
      person('a', 'A', [conn('b', 'B', 'family'), conn('c', 'C', 'rival', 0.9, { end_year: null })]),
      person('b', 'B', [conn('a', 'A', 'family')]),
      person('c', 'C', [conn('a', 'A', 'rival', 0.9, { end_year: null })]),
    ]);
    const pairs = mergePairs(g.links);
    const fam = pairs.find((p) => p.id === 'a|b')!;
    const riv = pairs.find((p) => p.id === 'a|c')!;
    expect(fam.closeness).toBeGreaterThan(riv.closeness);
  });
});

describe('giving', () => {
  const giving = {
    cycles: [
      {
        cycle: 2026,
        total_usd: 445_500_000,
        rank: 1,
        ranking: 'OpenSecrets',
        sources: src(1),
        recipients: [{ name: 'America PAC', kind: 'super-pac' as const, side: 'R' as const, amount_usd: 216e6, sources: src(2) }],
      },
    ],
    outlook: {
      cycle: 2028,
      summary: 'Expected to keep funding Republicans.',
      likely: [{ name: 'JD Vance', slug: 'jd-vance', kind: 'candidate' as const, side: 'R' as const, basis: 'Reported interest.', confidence: 0.5, sources: src(3) }],
    },
  };

  it('accepts a well-formed record', () => {
    expect(validator.validatePeople([person('a', 'A', [], { giving })]).errors).toEqual([]);
  });

  it('rejects bad cycles, kinds, amounts and unsourced items', () => {
    const bad = person('a', 'A', [], {
      giving: {
        cycles: [
          { cycle: 2025, total_usd: -1, sources: [], recipients: [{ name: 'X', kind: 'church' as never, sources: [] }] },
        ],
        outlook: { cycle: 2028, summary: '', likely: [{ name: 'Y', kind: 'candidate', basis: '', confidence: 0.1, sources: src(1) }] },
      },
    });
    const text = validator.validatePeople([bad]).errors.map((e: { message: string }) => e.message).join('\n');
    expect(text).toMatch(/even election year/);
    expect(text).toMatch(/dollar amount/);
    expect(text).toMatch(/"kind" must be one of/);
    expect(text).toMatch(/no sources/);
    expect(text).toMatch(/"summary" is required/);
    expect(text).toMatch(/"basis"/);
    expect(text).toMatch(/0.3 to 1/);
  });

  it('is only for public figures', () => {
    const priv = person('me', 'Me', [], { public_figure: false, giving });
    expect(validator.validatePeople([priv]).errors.map((e: { message: string }) => e.message).join('\n')).toMatch(
      /only public figures/,
    );
  });

  it('formats dollar amounts', () => {
    expect(formatUsd(445_500_000)).toBe('$445.5M');
    expect(formatUsd(16_000_000)).toBe('$16M');
    expect(formatUsd(1_200_000_000)).toBe('$1.2B');
    expect(formatUsd(500_000)).toBe('$500K');
  });
});

function org(slug: string, name: string, connections: Org['connections'] = [], extra: Partial<Org> = {}): OrgFile {
  return {
    slug,
    file: `${slug}.json`,
    data: { name, kind: 'super-pac', side: 'R', summary: 'Summary', sources: src(0), connections, last_researched: '2026-11-08', ...extra },
  };
}

describe('organizations', () => {
  const donor = person('donor', 'Donor', [conn('pac', 'The PAC', 'funded_by')]);
  const candidate = person('cand', 'Candidate', [conn('pac', 'The PAC', 'donor')]);
  const founder = person('boss', 'Boss', [conn('pac', 'The PAC', 'co-founder')]);
  const pac = org('pac', 'The PAC', [
    conn('donor', 'Donor', 'donor'),
    conn('cand', 'Candidate', 'funded_by'),
    conn('boss', 'Boss', 'co-founder'),
  ]);

  it('become square nodes that money flows through', () => {
    const g = buildGraph([donor, candidate, founder], [pac]);
    const node = g.nodes.find((n) => n.id === 'pac')!;
    expect(node.isOrg).toBe(true);
    expect(node.researched).toBe(true);
    expect(node.degree).toBe(3);
    const isOrg = (id: string) => id === 'pac';
    const money = g.links.filter((l) => l.group === 'funding').map((l) => `${l.sourceId}->${l.targetId}`).sort();
    expect(money).toEqual(['donor->pac', 'pac->cand']);
    const founded = g.links.find((l) => l.group === 'co-founder')!;
    expect(describeLink(founded, (id) => id, isOrg)).toBe('boss founded pac');
    expect(roleOfOther(founded, 'boss', isOrg)).toBe('founded it');
    expect(roleOfOther(founded, 'pac', isOrg)).toBe('founder');
  });

  it('pass validation with two-way links', () => {
    const { errors } = validator.validatePeople([donor, candidate, founder], { orgs: [pac] });
    expect(errors).toEqual([]);
  });

  it('need back-links, allowed types and their own fields', () => {
    const bad = org('pac', 'The PAC', [conn('donor', 'Donor', 'donor'), conn('boss', 'Boss', 'mentor')], {
      kind: 'club' as never,
      public_figure: true,
    } as Partial<Org>);
    const text = validator
      .validatePeople([person('donor', 'Donor'), person('boss', 'Boss', [conn('pac', 'The PAC', 'protégé')])], { orgs: [bad] })
      .errors.map((e: { message: string }) => e.message)
      .join('\n');
    expect(text).toMatch(/"kind" must be one of/);
    expect(text).toMatch(/person field/);
    expect(text).toMatch(/can't be a "mentor"/);
    expect(text).toMatch(/no connection back to "pac"/);
  });

  it('can be named from a giving entry', () => {
    const giving = {
      cycles: [{ cycle: 2026, sources: src(2), recipients: [{ name: 'The PAC', org: 'pac', kind: 'super-pac', sources: src(3) }] }],
    };
    const p = person('donor', 'Donor', [conn('pac', 'The PAC', 'funded_by')], { giving } as Partial<Person>);
    expect(validator.validatePeople([p, candidate, founder], { orgs: [pac] }).errors).toEqual([]);
    const missing = validator.validatePeople([p, candidate, founder], { orgs: [] }).errors;
    expect(missing.map((e: { message: string }) => e.message).join('\n')).toMatch(/no file in data\/orgs/);
  });
});

describe('findClusters', () => {
  it('splits two tight groups joined by one weak link', () => {
    const tri = (a: string, b: string, c: string) => [
      person(a, a, [conn(b, b, 'colleague'), conn(c, c, 'colleague')]),
      person(b, b, [conn(a, a, 'colleague'), conn(c, c, 'colleague')]),
      person(c, c, [conn(a, a, 'colleague'), conn(b, b, 'colleague')]),
    ];
    const files = [...tri('a1', 'a2', 'a3'), ...tri('b1', 'b2', 'b3'), person('loner', 'Loner')];
    files[0].data.connections!.push(conn('b1', 'b1', 'rival', 0.5));
    files[3].data.connections!.push(conn('a1', 'a1', 'rival', 0.5));
    const g = buildGraph(files);
    const c = findClusters(
      g.nodes.map((n) => n.id),
      mergePairs(g.links),
    );
    expect(c.get('a1')).toBe(c.get('a3'));
    expect(c.get('b1')).toBe(c.get('b2'));
    expect(c.get('a1')).not.toBe(c.get('b1'));
    expect(c.get('loner')).not.toBe(c.get('a1'));
    expect(c.get('loner')).not.toBe(c.get('b1'));
  });
});

// The scorecard: freeze the map as it stood at the end of a past year, let it "predict" what
// came next, and score the predictions against what the files now record. Every change to the
// scoring rules should be judged by whether these numbers go up. See CLAUDE.md "Scorecard".

import { structuralBacking } from './backing';
import { buildGraph, closenessIndex, compare, mergePairs, pairKey, type BuildOptions, type GraphData, type GraphLink } from './graph';
import type { Connection, OrgFile, Person, PersonFile, TimelineEntry } from './schema';

export interface MapFiles {
  people: PersonFile[];
  orgs: OrgFile[];
}

const yearOf = (date: string | undefined) => (date ? Number(date.slice(0, 4)) : NaN);

function clipConnections(connections: Connection[] | undefined, year: number): Connection[] {
  return (connections ?? [])
    // A tie with no recorded start is taken as already standing.
    .filter((c) => typeof c.start_year !== 'number' || c.start_year <= year)
    .map((c) => (typeof c.end_year === 'number' && c.end_year > year ? { ...c, end_year: null } : c));
}

/**
 * The map as it stood at the end of `year`. Ties, jobs, gifts and meetings that started later
 * are dropped, and ones that ended later are open again. What is only known with hindsight
 * (groups, the 2028 race, leverage, giving outlooks) is stripped too, so nothing leaks back.
 */
export interface FreezeOptions {
  /** Cut posts and meetings at this day (YYYY-MM-DD) instead of the end of `year`. Ties still go by year. */
  date?: string;
  /** Keep `leverage` (what someone controls changes slowly; the track-record test keeps it). */
  keepLeverage?: boolean;
}

/** "2025" → "2025-01-01", "2025-03" → "2025-03-01": the earliest day a partial date can mean. */
const firstDay = (d: string) => (d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d);

export function freeze({ people, orgs }: MapFiles, year: number, opts: FreezeOptions = {}): MapFiles {
  const before = (d: string | undefined) => (opts.date ? !d || firstDay(d) <= opts.date : !(yearOf(d) > year));
  const clipTimeline = (t: TimelineEntry[] | undefined) =>
    (t ?? [])
      .filter((e) => typeof e.year !== 'number' || e.year <= year)
      .map((e) => (typeof e.end_year === 'number' && e.end_year > year ? { ...e, end_year: null } : e));
  return {
    people: people.map((f) => {
      const d = f.data;
      const office = d.office && before(d.office.since) ? d.office : undefined;
      const cycles = d.giving?.cycles?.filter((c) => c.cycle <= year);
      const data: Person = {
        ...d,
        groups: [],
        race_2028: undefined,
        leverage: opts.keepLeverage ? d.leverage : undefined,
        office,
        org_chart_only: office ? d.org_chart_only : undefined,
        access: d.access?.filter((e) => (opts.date ? firstDay(e.date) <= opts.date : yearOf(e.date) <= year)),
        giving: cycles?.length ? { cycles } : undefined,
        timeline: clipTimeline(d.timeline),
        connections: clipConnections(d.connections, year),
      };
      return { ...f, data };
    }),
    orgs: orgs
      .filter((f) => !(typeof f.data.founded === 'number' && f.data.founded > year))
      .map((f) => ({ ...f, data: { ...f.data, groups: [], connections: clipConnections(f.data.connections, year) } })),
  };
}

/**
 * Area under the ROC curve: the chance a random positive outscores a random negative
 * (ties count half). 0.5 is a coin flip, 1 is perfect. NaN when either side is empty.
 */
export function auc(positives: number[], negatives: number[]): number {
  if (!positives.length || !negatives.length) return NaN;
  const all = [...positives.map((s) => ({ s, pos: true })), ...negatives.map((s) => ({ s, pos: false }))].sort((a, b) => a.s - b.s);
  let rankSum = 0;
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j < all.length && all[j].s === all[i].s) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (all[k].pos) rankSum += avgRank;
    i = j;
  }
  return (rankSum - (positives.length * (positives.length + 1)) / 2) / (positives.length * negatives.length);
}

const friendly = (l: GraphLink) => l.group !== 'rival' && l.group !== 'enemy';

interface Frozen {
  graph: GraphData;
  /** Friendly neighbours of each node. */
  neighbours: Map<string, Set<string>>;
  tied: Set<string>;
  /** 0–100 closeness of a pair from the frozen map (see compare()). */
  score: (a: string, b: string) => number;
  /** 0–1 backing score of a pair from the frozen map: closeness plus political fit (see backing.ts). */
  backing: (a: string, b: string) => number;
}

function frozenMap(files: MapFiles, year: number, opts: BuildOptions): Frozen {
  const f = freeze(files, year);
  const graph = buildGraph(f.people, f.orgs, opts);
  const neighbours = new Map<string, Set<string>>();
  const tied = new Set<string>();
  for (const l of graph.links.filter(friendly)) {
    tied.add(pairKey(l.sourceId, l.targetId));
    for (const [x, y] of [[l.sourceId, l.targetId], [l.targetId, l.sourceId]]) {
      if (!neighbours.has(x)) neighbours.set(x, new Set());
      neighbours.get(x)!.add(y);
    }
  }
  const index = closenessIndex(mergePairs(graph.links), year);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return {
    graph,
    neighbours,
    tied,
    score: (a, b) => compare(a, b, index, byId, year).score,
    backing: (a, b) => structuralBacking(a, b, index, byId, year).score,
  };
}

export interface TieTest {
  cutoff: number;
  /** New friendly ties since the cutoff between two people or organizations already on the frozen map. */
  positives: number;
  /** New ties that can't be tested because one end had no tie yet at the cutoff. */
  coldStarts: number;
  /** Untied pairs the map had to choose among. */
  candidates: number;
  /** AUC of the map's closeness score. */
  auc: number;
  /** Baselines: how many friends they share, and how well connected both are. */
  aucSharedFriends: number;
  aucPopularity: number;
  /** Of the `topN` untied pairs the map rated closest, how many went on to form a tie. */
  topN: number;
  topHits: number;
  /** How many of `topN` random untied pairs would have (the base rate). */
  topExpected: number;
}

/** Does closeness on the frozen map predict which untied pairs go on to form a friendly tie? */
export function newTieTest(files: MapFiles, cutoff: number, opts: BuildOptions = {}, topN = 100): TieTest {
  const full = buildGraph(files.people, files.orgs, opts);
  const frozen = frozenMap(files, cutoff, opts);
  const eligible = frozen.graph.nodes
    .filter((n) => n.researched && n.publicFigure && frozen.neighbours.has(n.id))
    .map((n) => n.id)
    .sort();
  const eligibleSet = new Set(eligible);

  const formed = new Set<string>();
  let coldStarts = 0;
  for (const l of full.links) {
    const key = pairKey(l.sourceId, l.targetId);
    if (!friendly(l) || frozen.tied.has(key) || !(typeof l.startYear === 'number' && l.startYear > cutoff) || formed.has(key)) continue;
    if (eligibleSet.has(l.sourceId) && eligibleSet.has(l.targetId)) formed.add(key);
    else coldStarts++;
  }

  const rows: { hit: boolean; score: number; shared: number; popularity: number }[] = [];
  for (let i = 0; i < eligible.length; i++)
    for (let j = i + 1; j < eligible.length; j++) {
      const [a, b] = [eligible[i], eligible[j]];
      const key = pairKey(a, b);
      if (frozen.tied.has(key)) continue;
      const na = frozen.neighbours.get(a)!;
      const nb = frozen.neighbours.get(b)!;
      let shared = 0;
      for (const x of na) if (nb.has(x)) shared++;
      rows.push({ hit: formed.has(key), score: frozen.score(a, b), shared, popularity: na.size * nb.size });
    }

  const split = (pick: (r: (typeof rows)[number]) => number) =>
    auc(rows.filter((r) => r.hit).map(pick), rows.filter((r) => !r.hit).map(pick));
  const top = [...rows].sort((x, y) => y.score - x.score).slice(0, topN);
  return {
    cutoff,
    positives: formed.size,
    coldStarts,
    candidates: rows.length,
    auc: split((r) => r.score),
    aucSharedFriends: split((r) => r.shared),
    aucPopularity: split((r) => r.popularity),
    topN: top.length,
    topHits: top.filter((r) => r.hit).length,
    topExpected: rows.length ? (top.length * formed.size) / rows.length : 0,
  };
}

export interface GivingTest {
  cutoff: number;
  /** The cycle being predicted (the first one after the cutoff). */
  cycle: number;
  donors: number;
  /** Donor → recipient gifts in that cycle, to people and organizations on the map. */
  gifts: number;
  /** Gifts to someone the donor had not funded before the cutoff. */
  newGifts: number;
  /** AUC of the backing score (closeness plus political fit) over every donor × recipient pair. */
  aucBacking: number;
  /** The same on first-time recipients only. */
  aucBackingNew: number;
  /** Share of the gifts whose recipient was among the donor's five highest backing scores. */
  top5Backing: number;
  /** How often pairs in each backing band went on to give: what the labels have meant in the past. */
  bands: { label: string; min: number; pairs: number; gave: number }[];
  /** AUC of closeness alone over every donor × recipient pair. */
  auc: number;
  /** Baseline: "they will fund whoever they funded before". */
  aucRepeat: number;
  /** AUC on first-time recipients only, where repeating the past can't help. */
  aucNew: number;
  /** Share of the gifts whose recipient was among the donor's five closest. */
  top5: number;
}

/** The backing labels' score bands (see backingLabel()). */
const BANDS: [string, number, number][] = [
  ['Likely or better (65+)', 65, 101],
  ['Leaning (45–64)', 45, 65],
  ['Possible (30–44)', 30, 45],
  ['Unlikely (under 30)', 0, 30],
];

/** Does the frozen map predict whom donors fund in the next cycle? */
export function givingTest(files: MapFiles, cutoff: number, opts: BuildOptions = {}): GivingTest {
  const cycle = cutoff + 2 - (cutoff % 2);
  const frozen = frozenMap(files, cutoff, opts);
  const onMap = new Set(frozen.graph.nodes.filter((n) => n.researched).map((n) => n.id));
  const keysOf = (r: { slug?: string; org?: string }) => [r.slug, r.org].filter((k): k is string => !!k && onMap.has(k));

  // Everyone and everything on the map that takes political money, in any cycle.
  const recipients = new Set<string>();
  for (const f of files.people) for (const c of f.data.giving?.cycles ?? []) for (const r of c.recipients ?? []) keysOf(r).forEach((k) => recipients.add(k));

  const rows: { hit: boolean; before: boolean; score: number; rank: number; backing: number; backingRank: number }[] = [];
  let donors = 0;
  for (const f of files.people) {
    if (!onMap.has(f.slug)) continue;
    const next = new Set((f.data.giving?.cycles ?? []).filter((c) => c.cycle === cycle).flatMap((c) => (c.recipients ?? []).flatMap(keysOf)));
    next.delete(f.slug);
    if (!next.size) continue;
    donors++;
    const node = frozen.graph.nodes.find((n) => n.id === f.slug);
    const scored = [...recipients]
      .filter((r) => r !== f.slug)
      .map((r) => ({
        hit: next.has(r),
        // Funded them before: a gift in an earlier cycle, or a money line already on the frozen map.
        before:
          !!node?.givenTo?.has(r) ||
          frozen.graph.links.some((l) => l.group === 'funding' && l.sourceId === f.slug && l.targetId === r),
        score: frozen.score(f.slug, r),
        rank: 0,
        backing: frozen.backing(f.slug, r),
        backingRank: 0,
      }))
      .sort((x, y) => y.score - x.score);
    scored.forEach((r, i) => (r.rank = i + 1));
    [...scored].sort((x, y) => y.backing - x.backing).forEach((r, i) => (r.backingRank = i + 1));
    rows.push(...scored);
  }

  const hits = rows.filter((r) => r.hit);
  const misses = rows.filter((r) => !r.hit);
  const fresh = rows.filter((r) => !r.before);
  return {
    cutoff,
    cycle,
    donors,
    gifts: hits.length,
    newGifts: hits.filter((r) => !r.before).length,
    aucBacking: auc(hits.map((r) => r.backing), misses.map((r) => r.backing)),
    aucBackingNew: auc(fresh.filter((r) => r.hit).map((r) => r.backing), fresh.filter((r) => !r.hit).map((r) => r.backing)),
    top5Backing: hits.length ? hits.filter((r) => r.backingRank <= 5).length / hits.length : NaN,
    bands: BANDS.map(([label, min, max]) => {
      const inBand = rows.filter((r) => r.backing * 100 >= min && r.backing * 100 < max);
      return { label, min, pairs: inBand.length, gave: inBand.filter((r) => r.hit).length };
    }),
    auc: auc(hits.map((r) => r.score), misses.map((r) => r.score)),
    aucRepeat: auc(hits.map((r) => +r.before), misses.map((r) => +r.before)),
    aucNew: auc(fresh.filter((r) => r.hit).map((r) => r.score), fresh.filter((r) => !r.hit).map((r) => r.score)),
    top5: hits.length ? hits.filter((r) => r.rank <= 5).length / hits.length : NaN,
  };
}

export interface Scorecard {
  ties: TieTest[];
  giving: GivingTest[];
}

/** Every test at every cutoff. `rawConfidence` scores the map without the evidence cap, for comparison. */
export function scorecard(files: MapFiles, cutoffs: number[], opts: BuildOptions = {}): Scorecard {
  return {
    ties: cutoffs.map((c) => newTieTest(files, c, opts)),
    giving: cutoffs.map((c) => givingTest(files, c, opts)),
  };
}

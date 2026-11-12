// Backing: how likely someone is to back a 2028 contender, 0–100. See CLAUDE.md "Backing".
// The structural part (closeness plus political fit) is what the scorecard tests against past
// giving; declared camps and reported plans sit on top of it and can't be backtested.

import {
  closenessIndex,
  compare,
  isPastRivalry,
  leanAt,
  mergePairs,
  type ClosenessIndex,
  type GraphLink,
  type GraphNode,
} from './graph';

/** How much political fit alone is worth: someone on the same side with no tie at all scores 30. */
export const FIT_WEIGHT = 0.3;
/** Fit by how far apart two leans are (0–6 steps on the −3…+3 scale); 4 or more is the other side. */
const FIT_BY_DISTANCE = [1, 0.9, 0.6, 0.3, 0.08];
/** One of the two has no recorded lean. */
const FIT_UNKNOWN = 0.6;
/** A current feud all but rules backing out. */
const FEUD_FACTOR = 0.1;
/** Being in a contender's camp counts this much on its own. */
const CAMP_WEIGHT = 0.9;
/** Someone committed to a same-side rival's camp is this much less likely to back another. */
const ELSEWHERE_FACTOR = 0.6;

/** A person's lean in `year`, or an organization's side as a lean (R = +2, D = −2). */
export function leanValue(n: GraphNode | undefined, year: number): number | null {
  if (!n) return null;
  if (n.isOrg) return n.org?.side === 'R' ? 2 : n.org?.side === 'D' ? -2 : null;
  return leanAt(n.person?.lean, year)?.value ?? null;
}

/** 0–1: how well two leans fit. Same lean 1, one step 0.9, two 0.6, three 0.3, opposite sides 0.08. */
export function fitOf(a: number | null, b: number | null): number {
  if (a === null || b === null) return FIT_UNKNOWN;
  return FIT_BY_DISTANCE[Math.min(FIT_BY_DISTANCE.length - 1, Math.abs(a - b))];
}

export interface Structural {
  /** 0–1. */
  score: number;
  /** 0–100, from compare(). */
  closeness: number;
  fit: number;
  feud: boolean;
  /** The strongest chain between them (ids, the person first), and the people they share. */
  chain: string[] | null;
  shared: string[];
  direct: GraphLink[];
}

/**
 * The part of backing the map can be tested on: closeness (compare(): the strongest chain and
 * the shared circle) combined with political fit, so that either can carry the score. A current
 * feud between the two all but rules it out.
 */
export function structuralBacking(
  a: string,
  b: string,
  index: ClosenessIndex,
  byId: Map<string, GraphNode>,
  year: number,
): Structural {
  const cmp = compare(a, b, index, byId, year);
  const fit = fitOf(leanValue(byId.get(a), year), leanValue(byId.get(b), year));
  const feud = !!cmp.tension && !isPastRivalry(cmp.tension);
  const score = (1 - (1 - cmp.score / 100) * (1 - FIT_WEIGHT * fit)) * (feud ? FEUD_FACTOR : 1);
  return { score, closeness: cmp.score, fit, feud, chain: cmp.chain, shared: cmp.shared.map((s) => s.id), direct: cmp.direct };
}

/** How the backing is known: they are in the camp, reporting says they are likely to give, or the map predicts it. */
export type BackingBasis = 'camp' | 'reported' | 'predicted';

export interface Backing {
  person: string;
  contender: string;
  /** 0–100. */
  score: number;
  label: string;
  basis: BackingBasis;
  /** 0–100 closeness, and 0–1 political fit. */
  closeness: number;
  fit: number;
  feud: boolean;
  /** Same-side contenders whose camp this person is in (when it isn't this one). */
  elsewhere: string[];
  /** Up to two people both are tied to, strongest first. */
  through: string[];
  /** Whether the two are directly tied. */
  direct: boolean;
}

const LABELS: [number, string][] = [
  [85, 'Very likely'],
  [65, 'Likely'],
  [45, 'Leaning'],
  [30, 'Possible'],
];
export const backingLabel = (score: number) => LABELS.find(([min]) => score >= min)?.[1] ?? 'Unlikely';

export const isContender = (n: GraphNode | undefined) => n?.person?.race_2028?.role === 'contender';
/** 'R' or 'D' by the sign of their lean; null for a centrist or someone with no lean. */
export function sideOf(n: GraphNode | undefined, year: number): 'R' | 'D' | null {
  const v = leanValue(n, year);
  return v === null || v === 0 ? null : v > 0 ? 'R' : 'D';
}

/**
 * One person's backing for one contender. The structural score is raised by a declared camp
 * (race_2028) or a reported plan to give (giving.outlook), and lowered when the person is
 * already in the camp of a rival on the same side.
 */
export function backingOf(
  person: string,
  contender: string,
  index: ClosenessIndex,
  byId: Map<string, GraphNode>,
  year: number,
): Backing {
  const p = byId.get(person);
  const c = byId.get(contender);
  const s = structuralBacking(person, contender, index, byId, year);

  const camps = p?.person?.race_2028?.role === 'camp' ? (p.person.race_2028.contenders ?? []) : [];
  const inCamp = camps.includes(contender);
  const outlook = p?.person?.giving?.outlook;
  const reported = outlook?.likely?.find((l) => l.slug === contender)?.confidence ?? 0;
  const side = sideOf(c, year);
  const elsewhere = inCamp ? [] : camps.filter((id) => id !== contender && side !== null && sideOf(byId.get(id), year) === side);

  const declared = Math.max(inCamp ? CAMP_WEIGHT : 0, reported);
  let raw = 1 - (1 - s.score) * (1 - declared);
  if (elsewhere.length) raw *= ELSEWHERE_FACTOR;
  const score = Math.round(100 * raw);
  return {
    person,
    contender,
    score,
    label: backingLabel(score),
    basis: inCamp ? 'camp' : reported > 0 ? 'reported' : 'predicted',
    closeness: s.closeness,
    fit: s.fit,
    feud: s.feud,
    elsewhere,
    through: s.shared.slice(0, 2),
    direct: s.direct.some((l) => l.group !== 'rival' && l.group !== 'enemy'),
  };
}

/** One line on why: "In the camp · tied directly · close through Peter Thiel". */
export function backingReason(b: Backing, nameOf: (id: string) => string): string {
  const parts: string[] = [];
  if (b.basis === 'camp') parts.push('In the camp');
  if (b.basis === 'reported') parts.push('Reported likely to give');
  if (b.feud) parts.push('Feuding now');
  else if (b.direct) parts.push('Tied directly');
  if (b.through.length) parts.push(`${b.direct ? 'also ' : 'close '}through ${b.through.map(nameOf).join(', ')}`);
  if (b.fit >= 0.9) parts.push('same politics');
  else if (b.fit <= 0.3) parts.push(b.fit <= 0.1 ? 'opposite side' : 'far apart politically');
  if (b.elsewhere.length) parts.push(`in ${b.elsewhere.map(nameOf).join(' and ')}’s camp`);
  return parts.join(' · ') || 'No tie on record';
}

export interface ContenderSummary {
  id: string;
  side: 'R' | 'D' | null;
  /** People in the camp, per the files. */
  declared: number;
  /** People not in the camp for whom this contender is the first choice (45 or more). */
  predicted: number;
  /** What the donors among both gave in their latest reported cycle, in dollars. */
  donorMoney: number;
  /** Everyone scored for this contender, strongest first. */
  backers: Backing[];
}

export interface BackingBoard {
  contenders: ContenderSummary[];
  /** Each person's contenders, strongest first. */
  byPerson: Map<string, Backing[]>;
  /** Donors with no camp whose two best same-side choices are within CONTESTED points. */
  contested: { person: string; first: Backing; second: Backing; lastCycleUsd: number }[];
}

/** A first choice must reach this score. */
export const FIRST_CHOICE_MIN = 45;
const CONTESTED = 8;

/** The total a donor gave in their latest cycle with a reported total, in dollars (0 if none). */
export function lastCycleUsd(n: GraphNode | undefined): number {
  const cycles = (n?.person?.giving?.cycles ?? []).filter((c) => typeof c.total_usd === 'number');
  if (!cycles.length) return 0;
  return cycles.reduce((a, b) => (b.cycle > a.cycle ? b : a)).total_usd ?? 0;
}

/**
 * Everyone's backing for every contender. Backers are living, researched public figures on the
 * main web (no organizations, org-chart-only officials or the contenders themselves).
 */
export function backingBoard(nodes: GraphNode[], links: GraphLink[], year = new Date().getFullYear()): BackingBoard {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const index = closenessIndex(mergePairs(links), year);
  const contenders = nodes.filter(isContender);
  const people = nodes.filter(
    (n) => n.researched && !n.isOrg && n.publicFigure && !n.person?.org_chart_only && !n.person?.died && !isContender(n),
  );

  const byPerson = new Map<string, Backing[]>();
  const byContender = new Map<string, Backing[]>(contenders.map((c) => [c.id, []]));
  for (const p of people) {
    const rows = contenders.map((c) => backingOf(p.id, c.id, index, byId, year)).sort((a, b) => b.score - a.score);
    byPerson.set(p.id, rows);
    for (const r of rows) byContender.get(r.contender)!.push(r);
  }

  const firstChoice = new Map<string, Backing>();
  const contested: BackingBoard['contested'] = [];
  for (const [id, rows] of byPerson) {
    const first = rows[0];
    if (!first || first.score < FIRST_CHOICE_MIN) continue;
    firstChoice.set(id, first);
    const usd = lastCycleUsd(byId.get(id));
    const side = sideOf(byId.get(first.contender), year);
    const second = rows.find((r) => r !== first && sideOf(byId.get(r.contender), year) === side);
    if (usd > 0 && first.basis === 'predicted' && second && first.score - second.score <= CONTESTED)
      contested.push({ person: id, first, second, lastCycleUsd: usd });
  }
  contested.sort((a, b) => b.lastCycleUsd - a.lastCycleUsd);

  const summaries = contenders.map((c): ContenderSummary => {
    const backers = byContender.get(c.id)!.sort((a, b) => b.score - a.score);
    const firsts = backers.filter((b) => firstChoice.get(b.person) === b);
    return {
      id: c.id,
      side: sideOf(c, year),
      declared: backers.filter((b) => b.basis === 'camp').length,
      predicted: firsts.filter((b) => b.basis !== 'camp').length,
      donorMoney: firsts.reduce((sum, b) => sum + lastCycleUsd(byId.get(b.person)), 0),
      backers,
    };
  });
  const order = { R: 0, D: 1 } as const;
  summaries.sort(
    (a, b) =>
      (a.side ? order[a.side] : 2) - (b.side ? order[b.side] : 2) ||
      b.declared + b.predicted - (a.declared + a.predicted) ||
      a.id.localeCompare(b.id),
  );
  return { contenders: summaries, byPerson, contested };
}

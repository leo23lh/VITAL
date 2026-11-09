// Pull: how close someone is to the people who hold power, from Bond scores (see graph.ts).
import { bond, pairKey, type Bond, type GraphLink, type GraphNode, type WorkplaceIndex } from './graph';
import type { AccessEvent, OfficeUnit } from './schema';

const DEPARTMENTS = new Set<OfficeUnit>([
  'state', 'treasury', 'war', 'justice', 'interior', 'agriculture', 'commerce', 'labor',
  'hhs', 'hud', 'transportation', 'energy', 'education', 'va', 'dhs',
]);

/** Weight of a post by unit and rank (1 head, 2 deputy, 3 senior, 4 other). */
const POWER: Record<'white-house' | 'eop' | 'department' | 'agencies' | 'envoys' | 'congress', [number, number, number, number]> = {
  'white-house': [1, 0.8, 0.5, 0.3],
  eop: [0.55, 0.4, 0.35, 0.25],
  department: [0.7, 0.45, 0.3, 0.2],
  agencies: [0.6, 0.4, 0.3, 0.15],
  envoys: [0.5, 0.45, 0.45, 0.25],
  congress: [0.65, 0.6, 0.4, 0.25],
};

/** How much power a person's current post carries, 0–1 (0 = no government post). */
export function power(n: GraphNode | undefined): number {
  const o = n?.person?.office;
  if (!o) return 0;
  const cls = DEPARTMENTS.has(o.unit)
    ? 'department'
    : o.unit === 'senate' || o.unit === 'house'
      ? 'congress'
      : (o.unit as 'white-house' | 'eop' | 'agencies' | 'envoys');
  return POWER[cls][o.rank - 1] ?? 0;
}

export type BondIndex = Map<string, Bond>;

/** Bond for every pair of people with at least one link between them. */
export function bondIndex(nodes: GraphNode[], links: GraphLink[], workplaces: WorkplaceIndex): BondIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byPair = new Map<string, GraphLink[]>();
  for (const l of links) {
    const k = pairKey(l.sourceId, l.targetId);
    const list = byPair.get(k);
    if (list) list.push(l);
    else byPair.set(k, [l]);
  }
  const out: BondIndex = new Map();
  for (const [k, ls] of byPair) {
    const [a, b] = k.split('|');
    out.set(k, bond(byId.get(a), byId.get(b), ls, workplaces));
  }
  return out;
}


export interface PullVia {
  id: string;
  /** Their post's weight, 0–1. */
  power: number;
  /** The pair's Bond score (0 when they are linked only by a recent meeting). */
  bond: number;
  /** Documented meetings or deals with them in the last 12 months. */
  recent: number;
  /** The bond as Pull uses it, raised by recent access. */
  effective: number;
  /** Whether the map has a link between them (else only `access` connects them). */
  linked: boolean;
  /** power × effective bond, 0–1: what this tie adds. */
  weight: number;
}

export interface Pull {
  score: number;
  label: string;
  /** The people in power behind the score, strongest first. */
  via: PullVia[];
  /** The access part alone (ties to people in power), 0–100. */
  access: number;
  /** Leverage level (0–3) and what it adds. */
  leverage: number;
}

const PULL_LABELS: [number, string][] = [
  [75, 'Inner-circle access'],
  [55, 'Strong pull'],
  [35, 'Real pull'],
  [15, 'Some pull'],
  [1, 'Little pull'],
];
export const pullLabel = (score: number) => PULL_LABELS.find(([min]) => score >= min)?.[1] ?? 'No pull on record';

/** Ties to people below you count a quarter: pull is about access upward. */
const DOWNWARD = 0.25;
/** Each further tie counts half as much as the one before. */
const FALLOFF = 0.5;

/** What each leverage level adds to the part of pull that ties leave open. */
export const LEVERAGE_WEIGHT = [0, 0.15, 0.3, 0.45] as const;
export const LEVERAGE_LABELS = ['', 'notable', 'major', 'systemic'] as const;
/** Each recent documented meeting or deal with an official closes this share of the gap to a full bond (up to three). */
export const ACCESS_BOOST = 0.15;

/** An access date (YYYY-MM-DD, or YYYY-MM read as the 1st) as a UTC day number; NaN if invalid. */
export function accessDay(date: string): number {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(date);
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 1)];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  // Reject impossible dates such as 2026-13 or 2026-02-30.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;
  return t / 86400000;
}

/** How many documented meetings or deals with each official fall in the 365 days up to `now`. */
function recentByOfficial(events: AccessEvent[] | undefined, now: Date): Map<string, number> {
  const today = Math.floor(now.getTime() / 86400000);
  const counts = new Map<string, number>();
  for (const e of events ?? []) {
    const day = accessDay(e.date);
    if (!(day <= today && day > today - 365)) continue;
    for (const s of e.with) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return counts;
}

/**
 * Pull, 0–100. Access: each tie to someone in power counts as their post's weight × bond / 100
 * (a quarter for people junior to this person); recent documented meetings or deals with that
 * official strengthen the tie. The strongest tie counts in full, the next half, the next a quarter,
 * combined so it never passes 100. Leverage (what they control that people in power need) then
 * closes part of the remaining gap. Setbacks (firings, court rulings, stalled nominations) don't
 * lower it: pull counts documented access and leverage only.
 */
/** Bond assumed for an official met recently but with no link in the map. */
const MET_ONLY_BOND = 20;

export function pullOf(id: string, nodes: GraphNode[], idx: BondIndex, now = new Date(), self = nodes.find((n) => n.id === id)): Pull {
  const own = power(self);
  const recentCounts = recentByOfficial(self?.person?.access, now);
  const via: PullVia[] = [];
  for (const d of nodes) {
    if (d.id === id) continue;
    const p = power(d);
    if (!p) continue;
    const recent = recentCounts.get(d.id) ?? 0;
    const tie = idx.get(pairKey(id, d.id));
    // A current feud is no access, whatever meetings took place.
    if (tie?.status === 'hostile') continue;
    const bond = tie?.score ?? 0;
    if (!bond && !recent) continue;
    const base = tie ? bond : MET_ONLY_BOND;
    const effective = Math.round(base + (100 - base) * ACCESS_BOOST * Math.min(recent, 3));
    via.push({ id: d.id, power: p, bond, recent, effective, linked: !!tie, weight: ((p * effective) / 100) * (p < own ? DOWNWARD : 1) });
  }
  via.sort((x, y) => y.weight - x.weight);
  const access = 1 - via.reduce((acc, v, i) => acc * (1 - v.weight * FALLOFF ** i), 1);
  const leverage = self?.person?.leverage?.level ?? 0;
  const score = Math.round(100 * (access + (1 - access) * LEVERAGE_WEIGHT[leverage]));
  return { score, label: pullLabel(score), via, access: Math.round(100 * access), leverage };
}

export interface PullRow extends Pull {
  id: string;
}

/** Everyone ranked by pull (people only; the President is left out as the source of it). */
export function rankPull(nodes: GraphNode[], idx: BondIndex, now = new Date()): PullRow[] {
  return nodes
    .filter((n) => n.researched && !n.isOrg && !(n.person?.office?.unit === 'white-house' && n.person.office.rank === 1))
    .map((n) => ({ id: n.id, ...pullOf(n.id, nodes, idx, now, n) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Who has this person's ear: everyone ranked by their bond with them. */
export function earOf(id: string, nodes: GraphNode[], idx: BondIndex): { id: string; bond: number; label: string }[] {
  const out: { id: string; bond: number; label: string }[] = [];
  for (const n of nodes) {
    if (n.id === id || n.isOrg) continue;
    const b = idx.get(pairKey(id, n.id));
    if (b && b.score > 0) out.push({ id: n.id, bond: b.score, label: b.label });
  }
  return out.sort((a, b) => b.bond - a.bond);
}

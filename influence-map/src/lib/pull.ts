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

const bondScore = (idx: BondIndex, a: string, b: string) => idx.get(pairKey(a, b))?.score ?? 0;

export interface PullVia {
  id: string;
  /** Their post's weight, 0–1. */
  power: number;
  bond: number;
  /** Documented meetings or deals with them in the last 12 months. */
  recent: number;
  /** power × bond, 0–1: what this tie adds. */
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
/** Each recent documented meeting or deal with an official closes this share of the gap to a full bond (up to three). */
export const ACCESS_BOOST = 0.15;

/** Meetings or deals with `official` in the 12 months before `now`. */
function recentWith(events: AccessEvent[] | undefined, official: string, now: Date): number {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return (events ?? []).filter((e) => e.with.includes(official) && new Date(e.date.length === 7 ? `${e.date}-15` : e.date) >= cutoff && new Date(e.date) <= now).length;
}

/**
 * Pull, 0–100. Access: each tie to someone in power counts as their post's weight × bond / 100
 * (a quarter for people junior to this person); recent documented meetings or deals with that
 * official strengthen the tie. The strongest tie counts in full, the next half, the next a quarter,
 * combined so it never passes 100. Leverage (what they control that people in power need) then
 * closes part of the remaining gap. Setbacks (firings, court rulings, stalled nominations) don't
 * lower it: pull counts documented access and leverage only.
 */
export function pullOf(id: string, nodes: GraphNode[], idx: BondIndex, now = new Date()): Pull {
  const self = nodes.find((n) => n.id === id);
  const own = power(self);
  const events = self?.person?.access;
  const via: PullVia[] = [];
  for (const d of nodes) {
    if (d.id === id) continue;
    const p = power(d);
    if (!p) continue;
    const recent = recentWith(events, d.id, now);
    let b = bondScore(idx, id, d.id);
    if (!b && !recent) continue;
    if (!b) b = 20;
    b = Math.round(b + (100 - b) * ACCESS_BOOST * Math.min(recent, 3));
    via.push({ id: d.id, power: p, bond: b, recent, weight: ((p * b) / 100) * (p < own ? DOWNWARD : 1) });
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
export function rankPull(nodes: GraphNode[], idx: BondIndex): PullRow[] {
  return nodes
    .filter((n) => n.researched && !n.isOrg && !(n.person?.office?.unit === 'white-house' && n.person.office.rank === 1))
    .map((n) => ({ id: n.id, ...pullOf(n.id, nodes, idx) }))
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

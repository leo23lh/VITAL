// Pull: how close someone is to the people who hold power, from Bond scores (see graph.ts).
import { bond, pairKey, type Bond, type GraphLink, type GraphNode, type WorkplaceIndex } from './graph';
import type { OfficeUnit } from './schema';

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
  /** power × bond, 0–1: what this tie adds. */
  weight: number;
}

export interface Pull {
  score: number;
  label: string;
  /** The people in power behind the score, strongest first. */
  via: PullVia[];
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

/**
 * Pull, 0–100: each tie to someone in power counts as their post's weight × bond / 100
 * (a quarter for people junior to this person). The strongest tie counts in full, the
 * next half, the next a quarter, and so on, combined so the score never passes 100.
 */
export function pullOf(id: string, nodes: GraphNode[], idx: BondIndex): Pull {
  const own = power(nodes.find((n) => n.id === id));
  const via: PullVia[] = [];
  for (const d of nodes) {
    if (d.id === id) continue;
    const p = power(d);
    if (!p) continue;
    const b = bondScore(idx, id, d.id);
    if (b > 0) via.push({ id: d.id, power: p, bond: b, weight: ((p * b) / 100) * (p < own ? DOWNWARD : 1) });
  }
  via.sort((x, y) => y.weight - x.weight);
  const score = Math.round(100 * (1 - via.reduce((acc, v, i) => acc * (1 - v.weight * FALLOFF ** i), 1)));
  return { score, label: pullLabel(score), via };
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

// Rift watch: friendly ties showing the strains that have come before a public break.
// Each warning lists its reasons, so it can be checked. See CLAUDE.md "Factions and rifts".

import { isPastRivalry, leanAt, linkEndId, pairKey, type GraphNode, type PairLink } from './graph';
import { factionOf, signedEdges, factionMembers, type Faction, type SignedEdge } from './factions';
import { sideOf } from './backing';

export type RiftReason =
  | { kind: 'triad'; via: string; friendOf: string; enemyOf: string }
  | { kind: 'factions'; a: string; b: string; feuding: boolean }
  | { kind: 'prize'; note: string }
  | { kind: 'denied'; asker: string; what: string; date: string }
  | { kind: 'politics'; distance: number }
  | { kind: 'history' };

export interface RiftWarning {
  a: string;
  b: string;
  /** 0–100. */
  score: number;
  label: string;
  /** How close they are now (0–1), from the friendly ties between them. */
  closeness: number;
  reasons: RiftReason[];
}

/**
 * How much each kind of strain adds, combined so that a second strain adds less than the first.
 * They were set against the scorecard's record of past breaks (scripts/rift-check.mjs).
 */
export const RIFT_WEIGHTS = {
  /** A close friend of one is feuding with the other (an unbalanced triangle). */
  triad: 0.5,
  /** They sit in factions that are feuding (0.5 of this when the factions merely differ). */
  factions: 0.35,
  /** Same-side 2028 contenders, or one in a same-side rival's camp. */
  prize: 0.45,
  /** One asked the other for something in the past two years and was turned down. */
  denied: 0.4,
  /** Their politics are far apart (three or more steps on the lean scale). */
  politics: 0.25,
  /** They feuded before and made up. */
  history: 0.3,
};

const LABELS: [number, string][] = [
  [60, 'High'],
  [40, 'Elevated'],
  [20, 'Watch'],
];
export const riftLabel = (score: number) => LABELS.find(([min]) => score >= min)?.[1] ?? 'Low';

export interface RiftOptions {
  /** Today's year (for leans and ended ties). */
  year?: number;
  /** Today's date, for how recent a denied ask is. */
  now?: Date;
  /** Leave the 2028 race out (the scorecard strips it as hindsight). */
  noRace?: boolean;
  weights?: typeof RIFT_WEIGHTS;
}

/**
 * The pairs that could break: friendly, not feuding, and still tied today (a tie that already
 * ended has nothing left to split). Organizations are left out.
 */
export function riftCandidates(pairs: PairLink[], edges: SignedEdge[], year: number): SignedEdge[] {
  const standing = new Set<string>();
  for (const p of pairs)
    if (p.links.some((l) => l.group !== 'rival' && l.group !== 'enemy' && !(typeof l.endYear === 'number' && l.endYear < year)))
      standing.add(pairKey(linkEndId(p.source), linkEndId(p.target)));
  return edges.filter((e) => e.pos && !e.neg && standing.has(pairKey(e.a, e.b)));
}

/** Every friendly pair on the map with its rift risk, highest first (pairs with no strain left out). */
export function riftWatch(nodes: GraphNode[], pairs: PairLink[], factions: Faction[], opts: RiftOptions = {}): RiftWarning[] {
  const year = opts.year ?? new Date().getFullYear();
  const now = opts.now ?? new Date();
  const w = opts.weights ?? RIFT_WEIGHTS;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pool = factionMembers(nodes).filter((n) => !n.isOrg);
  const keep = new Set(pool.map((n) => n.id));
  const edges = signedEdges(pairs, keep, year);
  const candidates = riftCandidates(pairs, edges, year);

  const pos = new Map<string, Map<string, number>>();
  const neg = new Map<string, Map<string, number>>();
  const put = (m: Map<string, Map<string, number>>, x: string, y: string, v: number) =>
    (m.get(x) ?? m.set(x, new Map()).get(x)!).set(y, v);
  for (const e of edges) {
    if (e.pos) {
      put(pos, e.a, e.b, e.pos);
      put(pos, e.b, e.a, e.pos);
    }
    if (e.neg) {
      put(neg, e.a, e.b, e.neg);
      put(neg, e.b, e.a, e.neg);
    }
  }
  const pastFeud = new Set<string>();
  for (const p of pairs) if (p.links.some((l) => (l.group === 'rival' || l.group === 'enemy') && isPastRivalry(l))) pastFeud.add(pairKey(linkEndId(p.source), linkEndId(p.target)));

  const fOf = factionOf(factions);
  const opponents = new Map(factions.map((f) => [f.id, new Set(f.opponents.map((o) => o.id))]));
  const label = new Map(factions.map((f) => [f.id, f.label]));
  const camps = (n: GraphNode | undefined) => (n?.person?.race_2028?.role === 'camp' ? (n.person.race_2028.contenders ?? []) : []);
  const isContender = (n: GraphNode | undefined) => n?.person?.race_2028?.role === 'contender';
  const day = now.getTime();

  const out: RiftWarning[] = [];
  for (const e of candidates) {
    const A = byId.get(e.a)!;
    const B = byId.get(e.b)!;
    const reasons: RiftReason[] = [];
    let miss = 1;

    // 1. Unbalanced triangles: someone close to one side is feuding with the other.
    let triad = 0;
    let worst: RiftReason | null = null;
    for (const [x, y] of [
      [e.a, e.b],
      [e.b, e.a],
    ])
      for (const [c, p] of pos.get(x) ?? []) {
        const q = neg.get(y)?.get(c);
        if (!q || c === y) continue;
        const s = Math.min(p, q);
        if (s > triad) {
          triad = s;
          worst = { kind: 'triad', via: c, friendOf: x, enemyOf: y };
        }
      }
    if (worst) {
      reasons.push(worst);
      miss *= 1 - w.triad * Math.min(1, triad / 0.6);
    }

    // 2. Factions that feud.
    const fa = fOf.get(e.a);
    const fb = fOf.get(e.b);
    if (fa && fb && fa !== fb) {
      const feuding = !!opponents.get(fa)?.has(fb);
      reasons.push({ kind: 'factions', a: label.get(fa)!, b: label.get(fb)!, feuding });
      miss *= 1 - w.factions * (feuding ? 1 : 0.5);
    }

    // 3. The same prize: 2028 contenders on one side, or a contender and a same-side rival's camp.
    if (!opts.noRace) {
      const sA = sideOf(A, year);
      const sB = sideOf(B, year);
      let note = '';
      if (isContender(A) && isContender(B) && sA && sA === sB) note = 'Both are 2028 contenders on the same side';
      else
        for (const [x, y] of [
          [A, B],
          [B, A],
        ]) {
          if (!isContender(x)) continue;
          const rival = camps(y).find((c) => c !== x.id && isContender(byId.get(c)) && sideOf(byId.get(c), year) === sideOf(x, year));
          if (rival) note = `${y.name} is in ${byId.get(rival)?.name ?? rival}'s camp, a rival of ${x.name} for 2028`;
        }
      if (note) {
        reasons.push({ kind: 'prize', note });
        miss *= 1 - w.prize;
      }
    }

    // 4. A recent ask turned down by the other.
    for (const [x, y] of [
      [A, B],
      [B, A],
    ])
      for (const ask of x.person?.asks ?? []) {
        if (!ask.with.includes(y.id) || !ask.decided) continue;
        const age = (day - Date.parse(`${ask.decided.length === 7 ? `${ask.decided}-01` : ask.decided}T00:00:00Z`)) / 86400000;
        if (age < 0 || age > 730) continue;
        if (ask.outcome === 'denied' || ask.outcome === 'partial') {
          reasons.push({ kind: 'denied', asker: x.id, what: ask.what, date: ask.decided });
          miss *= 1 - w.denied * (ask.outcome === 'denied' ? 1 : 0.5);
        }
      }

    // 5. Far apart politically.
    const la = leanAt(A.person?.lean, year)?.value;
    const lb = leanAt(B.person?.lean, year)?.value;
    if (typeof la === 'number' && typeof lb === 'number' && Math.abs(la - lb) >= 3) {
      reasons.push({ kind: 'politics', distance: Math.abs(la - lb) });
      miss *= 1 - w.politics * (Math.abs(la - lb) >= 4 ? 1 : 0.6);
    }

    // 6. An old feud, since mended.
    if (pastFeud.has(pairKey(e.a, e.b))) {
      reasons.push({ kind: 'history' });
      miss *= 1 - w.history;
    }

    if (!reasons.length) continue;
    const score = Math.round(100 * (1 - miss));
    out.push({ a: e.a, b: e.b, score, label: riftLabel(score), closeness: e.pos, reasons });
  }
  // Highest risk first; among equals, the closer (more consequential) ties first.
  return out.sort((x, y) => y.score - x.score || y.closeness - x.closeness || x.a.localeCompare(y.a));
}

/** One line per reason, for the viewer. */
export function describeReason(r: RiftReason, nameOf: (id: string) => string): string {
  switch (r.kind) {
    case 'triad':
      return `${nameOf(r.via)}, close to ${nameOf(r.friendOf)}, is feuding with ${nameOf(r.enemyOf)}`;
    case 'factions':
      return r.feuding ? `In feuding factions: ${r.a} and ${r.b}` : `In different factions: ${r.a} and ${r.b}`;
    case 'prize':
      return r.note;
    case 'denied':
      return `${nameOf(r.asker)} was turned down (${r.date}): ${r.what.length > 90 ? `${r.what.slice(0, 88)}…` : r.what}`;
    case 'politics':
      return `Politics ${r.distance} steps apart`;
    case 'history':
      return 'They feuded before and made up';
  }
}

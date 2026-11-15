// Factions: groups of people who stand together today, found from friendly ties *and* feuds.
// Unlike the map's clusters (which only look at how close people are), a faction split puts
// friends together and feuding people apart, so a feud between two camps keeps them apart even
// when they share many acquaintances. See CLAUDE.md "Factions and rifts".

import { CLOSENESS, isPastRivalry, leanAt, linkEndId, type GraphNode, type PairLink } from './graph';
import { GROUPS, type GroupId } from './schema';

/** A tie that has ended still says something about where someone stands, but much less. */
const ENDED_FACTOR = 0.3;
/** How hard a current feud pushes two people apart. */
const FEUD_WEIGHT = { enemy: 0.8, rival: 0.5 } as const;

export interface SignedEdge {
  a: string;
  b: string;
  /** 0–1: how strongly the pair stands together (0 when they feud now). */
  pos: number;
  /** 0–1: how strongly a current feud sets them against each other. */
  neg: number;
}

/** The people and organizations factions are drawn from: researched, living, on the main web. */
export function factionMembers(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter(
    (n) => n.researched && !n.person?.died && !n.person?.org_chart_only && n.person?.public_figure !== false,
  );
}

/** Each pair's pull together and push apart, as of `now`. */
export function signedEdges(pairs: PairLink[], keep: Set<string>, now = new Date().getFullYear()): SignedEdge[] {
  const out: SignedEdge[] = [];
  for (const p of pairs) {
    const a = linkEndId(p.source);
    const b = linkEndId(p.target);
    if (!keep.has(a) || !keep.has(b)) continue;
    const feuds = p.links.filter((l) => (l.group === 'rival' || l.group === 'enemy') && !isPastRivalry(l));
    const neg = Math.max(0, ...feuds.map((l) => FEUD_WEIGHT[l.group as 'enemy' | 'rival'] * l.confidence));
    const pos = feuds.length
      ? 0
      : Math.max(
          0,
          ...p.links
            .filter((l) => l.group !== 'rival' && l.group !== 'enemy')
            .map((l) => CLOSENESS[l.group] * l.confidence * (typeof l.endYear === 'number' && l.endYear < now ? ENDED_FACTOR : 1)),
        );
    if (pos > 0 || neg > 0) out.push({ a, b, pos, neg });
  }
  return out;
}

/**
 * Signed modularity (Traag and Bruggeman, 2009) with Louvain's local moves and aggregation:
 * friendly ties count for putting two people in the same faction, feuds against it, each
 * measured against what chance would give people with that many ties. Returns a faction
 * number per id (the biggest is 0); people with no ties each get their own.
 */
export function signedLouvain(ids: string[], edges: SignedEdge[], resolution = 1): Map<string, number> {
  let nodeOf = new Map(ids.map((id, i) => [id, i]));
  let n = ids.length;
  let es: [number, number, number, number][] = [];
  for (const e of edges) {
    const a = nodeOf.get(e.a);
    const b = nodeOf.get(e.b);
    if (a == null || b == null || a === b) continue;
    es.push([a, b, e.pos, e.neg]);
  }
  let membership = ids.map((_, i) => i);

  for (let level = 0; level < 10; level++) {
    const adjP: Map<number, number>[] = Array.from({ length: n }, () => new Map());
    const adjN: Map<number, number>[] = Array.from({ length: n }, () => new Map());
    const selfP = new Array<number>(n).fill(0);
    const selfN = new Array<number>(n).fill(0);
    let m2P = 0;
    let m2N = 0;
    for (const [a, b, p, q] of es) {
      if (a === b) {
        selfP[a] += p;
        selfN[a] += q;
      } else {
        if (p) {
          adjP[a].set(b, (adjP[a].get(b) ?? 0) + p);
          adjP[b].set(a, (adjP[b].get(a) ?? 0) + p);
        }
        if (q) {
          adjN[a].set(b, (adjN[a].get(b) ?? 0) + q);
          adjN[b].set(a, (adjN[b].get(a) ?? 0) + q);
        }
      }
      m2P += 2 * p;
      m2N += 2 * q;
    }
    if (m2P === 0) break;
    const sum = (m: Map<number, number>) => [...m.values()].reduce((s, w) => s + w, 0);
    const kP = adjP.map((m, i) => sum(m) + 2 * selfP[i]);
    const kN = adjN.map((m, i) => sum(m) + 2 * selfN[i]);
    const comm = Array.from({ length: n }, (_, i) => i);
    const totP = [...kP];
    const totN = [...kN];
    const gain = (i: number, c: number, inP: number, inN: number) =>
      inP - (resolution * kP[i] * totP[c]) / m2P - (m2N ? inN - (kN[i] * totN[c]) / m2N : 0);

    let moved = false;
    for (let pass = 0; pass < 30; pass++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (kP[i] === 0 && kN[i] === 0) continue;
        const own = comm[i];
        totP[own] -= kP[i];
        totN[own] -= kN[i];
        const toP = new Map<number, number>();
        const toN = new Map<number, number>();
        for (const [j, w] of adjP[i]) toP.set(comm[j], (toP.get(comm[j]) ?? 0) + w);
        for (const [j, w] of adjN[i]) toN.set(comm[j], (toN.get(comm[j]) ?? 0) + w);
        let best = own;
        let bestGain = gain(i, own, toP.get(own) ?? 0, toN.get(own) ?? 0);
        // Only communities someone is friendly with are candidates; joining a feuding one never helps.
        for (const c of toP.keys()) {
          const g = gain(i, c, toP.get(c) ?? 0, toN.get(c) ?? 0);
          if (g > bestGain + 1e-12) {
            best = c;
            bestGain = g;
          }
        }
        comm[i] = best;
        totP[best] += kP[i];
        totN[best] += kN[i];
        if (best !== own) changed = moved = true;
      }
      if (!changed) break;
    }
    if (!moved) break;
    const renum = new Map<number, number>();
    for (const c of comm) if (!renum.has(c)) renum.set(c, renum.size);
    membership = membership.map((m) => renum.get(comm[m])!);
    const next = new Map<string, [number, number]>();
    const add = (ca: number, cb: number, p: number, q: number) => {
      const key = ca < cb ? `${ca}|${cb}` : `${cb}|${ca}`;
      const v = next.get(key) ?? [0, 0];
      v[0] += p;
      v[1] += q;
      next.set(key, v);
    };
    for (const [a, b, p, q] of es) add(renum.get(comm[a])!, renum.get(comm[b])!, p, q);
    for (let i = 0; i < n; i++) if (selfP[i] || selfN[i]) add(renum.get(comm[i])!, renum.get(comm[i])!, selfP[i], selfN[i]);
    es = [...next.entries()].map(([key, [p, q]]) => {
      const [a, b] = key.split('|').map(Number);
      return [a, b, p, q];
    });
    n = renum.size;
    nodeOf = new Map();
  }

  const size = new Map<number, number>();
  for (const m of membership) size.set(m, (size.get(m) ?? 0) + 1);
  const order = [...size.keys()].sort((a, b) => size.get(b)! - size.get(a)! || a - b);
  const rank = new Map(order.map((c, i) => [c, i]));
  return new Map(ids.map((id, i) => [id, rank.get(membership[i])!]));
}

export interface FactionMember {
  id: string;
  /** Sum of their friendly ties inside the faction. */
  inside: number;
  /** Share of their friendly ties that stay inside the faction, 0–1. */
  loyalty: number;
}

export interface Faction {
  /** Stable key for views: the faction's best-tied member. */
  id: string;
  label: string;
  /** People and organizations, most tied-in first. */
  members: FactionMember[];
  /** Average lean of members who have one, or null. */
  lean: number | null;
  /** Share of members' friendly tie weight that stays inside, 0–1. */
  cohesion: number;
  /** Feuds between two members (a split inside). */
  innerFeuds: [string, string][];
  /** Other factions it feuds with, most feuds first. */
  opponents: { id: string; feuds: number }[];
  /** Members with a strong pull toward another faction: [member, other faction id, share]. */
  bridges: { id: string; to: string; share: number }[];
}

const LABEL_SKIP = new Set<GroupId>(['2028-race', 'critics']);

/** A faction needs at least this many people (not counting organizations) to be listed. */
export const MIN_FACTION = 4;
/** A member with this share of their friendly ties in another faction is a bridge to it. */
const BRIDGE_SHARE = 0.3;

/** Factions on today's map, biggest first, with their labels, lean, feuds and bridges. */
export function findFactions(nodes: GraphNode[], pairs: PairLink[], now = new Date().getFullYear()): Faction[] {
  const pool = factionMembers(nodes);
  const keep = new Set(pool.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = signedEdges(pairs, keep, now);
  const of = signedLouvain(pool.map((n) => n.id).sort(), edges);

  // Tie weight by person and by faction.
  const posBy = new Map<string, Map<number, number>>();
  const bump = (x: string, f: number, w: number) => {
    const m = posBy.get(x) ?? new Map<number, number>();
    m.set(f, (m.get(f) ?? 0) + w);
    posBy.set(x, m);
  };
  for (const e of edges) {
    if (!e.pos) continue;
    bump(e.a, of.get(e.b)!, e.pos);
    bump(e.b, of.get(e.a)!, e.pos);
  }

  const groupsOf = new Map<number, string[]>();
  for (const [id, f] of of) (groupsOf.get(f) ?? groupsOf.set(f, []).get(f)!).push(id);

  const factions: (Faction & { index: number })[] = [];
  for (const [index, ids] of groupsOf) {
    const people = ids.filter((id) => !byId.get(id)?.isOrg);
    if (people.length < MIN_FACTION) continue;
    const members = ids
      .map((id) => {
        const m = posBy.get(id) ?? new Map();
        const total = [...m.values()].reduce((s, w) => s + w, 0);
        const inside = m.get(index) ?? 0;
        return { id, inside, loyalty: total ? inside / total : 0 };
      })
      .sort((a, b) => b.inside - a.inside || a.id.localeCompare(b.id));
    const leans = people.map((id) => leanAt(byId.get(id)?.person?.lean, now)?.value).filter((v): v is number => typeof v === 'number');
    const totalW = members.reduce((s, m) => s + (m.loyalty ? m.inside / m.loyalty : 0), 0);
    const insideW = members.reduce((s, m) => s + m.inside, 0);
    factions.push({
      index,
      id: members.find((m) => !byId.get(m.id)?.isOrg)!.id,
      label: '',
      members,
      lean: leans.length ? leans.reduce((s, v) => s + v, 0) / leans.length : null,
      cohesion: totalW ? insideW / totalW : 0,
      innerFeuds: [],
      opponents: [],
      bridges: [],
    });
  }

  const byIndex = new Map(factions.map((f) => [f.index, f]));
  // Feuds inside and between factions.
  const between = new Map<string, number>();
  for (const e of edges) {
    if (!e.neg) continue;
    const fa = of.get(e.a)!;
    const fb = of.get(e.b)!;
    if (fa === fb) byIndex.get(fa)?.innerFeuds.push([e.a, e.b]);
    else if (byIndex.has(fa) && byIndex.has(fb)) {
      const key = fa < fb ? `${fa}|${fb}` : `${fb}|${fa}`;
      between.set(key, (between.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of between) {
    const [fa, fb] = key.split('|').map(Number);
    byIndex.get(fa)!.opponents.push({ id: byIndex.get(fb)!.id, feuds: count });
    byIndex.get(fb)!.opponents.push({ id: byIndex.get(fa)!.id, feuds: count });
  }
  // Bridges: members with a real share of their friendly ties in another listed faction.
  for (const f of factions) {
    f.opponents.sort((a, b) => b.feuds - a.feuds);
    for (const m of f.members) {
      const ties = posBy.get(m.id);
      if (!ties) continue;
      const total = [...ties.values()].reduce((s, w) => s + w, 0);
      for (const [other, w] of ties)
        if (other !== f.index && byIndex.has(other) && w / total >= BRIDGE_SHARE)
          f.bridges.push({ id: m.id, to: byIndex.get(other)!.id, share: w / total });
    }
    f.bridges.sort((a, b) => b.share - a.share);
  }

  // Labels: the group most of the faction's people share, else its best-tied person.
  const used = new Map<string, number>();
  for (const f of factions) {
    const people = f.members.filter((m) => !byId.get(m.id)?.isOrg);
    const count = new Map<GroupId, number>();
    for (const m of people) for (const g of byId.get(m.id)?.groups ?? []) count.set(g, (count.get(g) ?? 0) + 1);
    // The 2028 race and critics cut across factions, so they don't name one.
    const [top] = [...count.entries()]
      .filter(([g]) => !LABEL_SKIP.has(g))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const name = (id: string) => byId.get(id)?.name ?? id;
    // Without a shared group, name it for a 2028 contender near its center, else its best-tied person.
    const contender = people.slice(0, 5).find((m) => byId.get(m.id)?.person?.race_2028?.role === 'contender');
    const base = top && top[1] >= Math.max(3, people.length * 0.4) ? GROUPS.find((g) => g.id === top[0])!.label : `Around ${name(contender?.id ?? f.id)}`;
    used.set(base, (used.get(base) ?? 0) + 1);
    f.label = used.get(base)! > 1 ? `${base} (around ${name(f.id)})` : base;
  }

  return factions.sort((a, b) => b.members.length - a.members.length).map(({ index: _i, ...f }) => f);
}

/** Faction id by member id. */
export function factionOf(factions: Faction[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of factions) for (const m of f.members) out.set(m.id, f.id);
  return out;
}

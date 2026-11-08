import {
  EDGE_GROUP_BY_ID,
  FAMILY_PRIORITY,
  type Connection,
  type EdgeFamily,
  type EdgeGroup,
  type GroupId,
  type LeanPeriod,
  type Org,
  type OrgFile,
  type Person,
  type PersonFile,
  type RelationshipType,
  type Sector,
  type SourceRef,
  TYPE_TO_EDGE,
  normalizeType,
  slugify,
  sourceUrl,
} from './schema';

export interface GraphNode {
  id: string;
  name: string;
  /** false = "suggested": someone's connection, but no file of their own yet. */
  researched: boolean;
  publicFigure: boolean;
  sector?: Sector;
  groups: GroupId[];
  /** URL of the person's portrait, relative to the page. */
  photoUrl?: string;
  person?: Person;
  /** Set for organizations (data/orgs/), drawn as squares. */
  isOrg?: boolean;
  org?: Org;
  file?: string;
  /** Number of distinct people this node is linked to. Drives node size. */
  degree: number;
  /** Names of researched people whose files mention this node. */
  mentionedBy: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

/** One connection record as written in one person's file. */
export interface EdgeRecord {
  fromSlug: string;
  fromName: string;
  toSlug: string;
  connection: Connection;
  type: RelationshipType;
}

export interface GraphLink {
  id: string;
  group: EdgeGroup;
  directed: boolean;
  /** For directed groups: the mentor / employer / donor. */
  source: string | GraphNode;
  target: string | GraphNode;
  sourceId: string;
  targetId: string;
  records: EdgeRecord[];
  confidence: number;
  startYear: number | null;
  /** null = ongoing, undefined = not recorded. */
  endYear: number | null | undefined;
  sources: SourceRef[];
  /** Set when the two files describe the link differently (dates or confidence). */
  disagreements: string[];
  curvature: number;
  touchesSuggested: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  /** Connection records skipped because of an unknown relationship_type. */
  skipped: { file: string; name: string; relationship_type: string }[];
}

export function linkEndId(end: string | GraphNode): string {
  return typeof end === 'string' ? end : end.id;
}

export function buildGraph(files: PersonFile[], orgFiles: OrgFile[] = []): GraphData {
  const nodes = new Map<string, GraphNode>();
  const skipped: GraphData['skipped'] = [];

  for (const f of orgFiles) {
    nodes.set(f.slug, {
      id: f.slug,
      name: f.data.name || f.slug,
      researched: true,
      publicFigure: true,
      groups: Array.isArray(f.data.groups) ? f.data.groups : [],
      isOrg: true,
      org: f.data,
      file: f.file,
      degree: 0,
      mentionedBy: [],
    });
  }

  for (const f of files) {
    nodes.set(f.slug, {
      id: f.slug,
      name: f.data.name || f.slug,
      researched: true,
      publicFigure: f.data.public_figure !== false,
      sector: f.data.sector,
      groups: Array.isArray(f.data.groups) ? f.data.groups : [],
      photoUrl: f.data.photo?.file ? `photos/${encodeURIComponent(f.data.photo.file)}` : undefined,
      person: f.data,
      file: f.file,
      degree: 0,
      mentionedBy: [],
    });
  }

  const links = new Map<string, GraphLink>();

  const all: { slug: string; file: string; data: { name: string; connections?: Connection[] } }[] = [...files, ...orgFiles];
  for (const f of all) {
    for (const c of f.data.connections ?? []) {
      const otherSlug = (c.slug && c.slug.trim()) || slugify(c.name ?? '');
      if (!otherSlug || otherSlug === f.slug) continue;
      const type = normalizeType(c.relationship_type);
      if (!type) {
        skipped.push({ file: f.file, name: c.name, relationship_type: c.relationship_type });
        continue;
      }

      let other = nodes.get(otherSlug);
      if (!other) {
        other = {
          id: otherSlug,
          name: c.name || otherSlug,
          researched: false,
          publicFigure: true,
          groups: [],
          degree: 0,
          mentionedBy: [],
        };
        nodes.set(otherSlug, other);
      }
      if (!other.mentionedBy.includes(f.data.name)) other.mentionedBy.push(f.data.name);

      const { group, otherIsSource } = TYPE_TO_EDGE[type];
      const directed = group === 'mentorship' || group === 'employment' || group === 'funding';
      let sourceId: string;
      let targetId: string;
      if (directed) {
        sourceId = otherIsSource ? otherSlug : f.slug;
        targetId = otherIsSource ? f.slug : otherSlug;
      } else {
        [sourceId, targetId] = [f.slug, otherSlug].sort();
      }
      const id = directed ? `${group}:${sourceId}->${targetId}` : `${group}:${sourceId}|${targetId}`;

      let link = links.get(id);
      if (!link) {
        link = {
          id,
          group,
          directed,
          source: sourceId,
          target: targetId,
          sourceId,
          targetId,
          records: [],
          confidence: 0,
          startYear: null,
          endYear: null,
          sources: [],
          disagreements: [],
          curvature: 0,
          touchesSuggested: false,
        };
        links.set(id, link);
      }
      link.records.push({ fromSlug: f.slug, fromName: f.data.name, toSlug: otherSlug, connection: c, type });
    }
  }

  for (const link of links.values()) summarizeLink(link);

  // Degree = distinct neighbours, across all relationship types.
  const neighbours = new Map<string, Set<string>>();
  const addNeighbour = (a: string, b: string) => {
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a)!.add(b);
  };
  for (const l of links.values()) {
    addNeighbour(l.sourceId, l.targetId);
    addNeighbour(l.targetId, l.sourceId);
  }
  for (const n of nodes.values()) n.degree = neighbours.get(n.id)?.size ?? 0;

  for (const l of links.values()) {
    l.touchesSuggested = !nodes.get(l.sourceId)?.researched || !nodes.get(l.targetId)?.researched;
  }

  assignCurvature([...links.values()]);

  return { nodes: [...nodes.values()], links: [...links.values()], skipped };
}

function summarizeLink(link: GraphLink) {
  const confs = link.records.map((r) => clamp01(r.connection.confidence));
  link.confidence = Math.max(...confs);

  const starts = uniq(link.records.map((r) => r.connection.start_year).filter(isYear));
  const ends = uniq(link.records.map((r) => r.connection.end_year).filter(isYear));
  link.startYear = starts.length ? Math.min(...starts) : null;
  const ongoing = link.records.some((r) => r.connection.end_year === null);
  link.endYear = ends.length ? Math.max(...ends) : ongoing ? null : undefined;

  const seen = new Set<string>();
  for (const r of link.records) {
    for (const s of r.connection.sources ?? []) {
      const key = sourceUrl(s);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      link.sources.push(s);
    }
  }

  if (link.records.length > 1) {
    if (starts.length > 1) link.disagreements.push(`Start year differs between files: ${starts.join(' vs ')}`);
    if (ends.length > 1) link.disagreements.push(`End year differs between files: ${ends.join(' vs ')}`);
    const distinctConf = uniq(confs.map((c) => Math.round(c * 100)));
    if (distinctConf.length > 1 && Math.max(...distinctConf) - Math.min(...distinctConf) >= 20) {
      link.disagreements.push(`Confidence differs between files: ${distinctConf.map((c) => c / 100).join(' vs ')}`);
    }
  }
}

/** Spread parallel links between the same two people so they don't overlap. */
function assignCurvature(links: GraphLink[]) {
  const byPair = new Map<string, GraphLink[]>();
  for (const l of links) {
    const key = [l.sourceId, l.targetId].sort().join('|');
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(l);
  }
  for (const group of byPair.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.id.localeCompare(b.id));
    const step = 0.5 / group.length;
    group.forEach((l, i) => {
      const c = (i - (group.length - 1) / 2) * step * 2;
      // Curvature is relative to source→target, so flip for links running the other way.
      const forward = l.sourceId < l.targetId;
      l.curvature = forward ? c : -c;
    });
  }
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0.5;
  return Math.min(1, Math.max(0, v));
}

function isYear(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Plain-English sentence for a link, e.g. "David Horowitz mentored Stephen Miller". */
export function describeLink(
  link: GraphLink,
  nameOf: (id: string) => string,
  isOrg: (id: string) => boolean = () => false,
): string {
  const a = nameOf(link.sourceId);
  const b = nameOf(link.targetId);
  const oa = isOrg(link.sourceId);
  const ob = isOrg(link.targetId);
  if (link.group === 'co-founder' && oa !== ob) return oa ? `${b} founded ${a}` : `${a} founded ${b}`;
  if (link.group === 'employment' && oa && !ob) return `${b} works or worked for ${a}`;
  switch (link.group) {
    case 'mentorship':
      return `${a} mentored ${b}`;
    case 'employment':
      return `${a} employed ${b}`;
    case 'funding':
      return `${a} funded ${b}`;
    case 'co-founder':
      return `${a} and ${b} co-founded something together`;
    case 'colleague':
      return `${a} and ${b} were colleagues`;
    case 'ally':
      return `${a} and ${b} are allies`;
    case 'rival':
      return isPastRivalry(link) ? `${a} and ${b} were rivals` : `${a} and ${b} are rivals`;
    case 'enemy':
      return isPastRivalry(link) ? `${a} and ${b} were enemies` : `${a} and ${b} are enemies`;
    case 'family':
      return `${a} and ${b} are family`;
  }
}

/** Short label for how `other` relates to `self` along this link, e.g. "mentor". */
export function roleOfOther(link: GraphLink, selfId: string, isOrg: (id: string) => boolean = () => false): string {
  const otherIsSource = link.sourceId !== selfId;
  const otherId = otherIsSource ? link.sourceId : link.targetId;
  if (link.group === 'co-founder' && isOrg(otherId) !== isOrg(selfId)) return isOrg(otherId) ? 'founded it' : 'founder';
  switch (link.group) {
    case 'mentorship':
      return otherIsSource ? 'mentor' : 'protégé';
    case 'employment':
      return otherIsSource ? 'employer' : 'employee';
    case 'funding':
      return otherIsSource ? 'donor' : 'funded by them';
    case 'rival':
      return isPastRivalry(link) ? 'past rival' : 'rival';
    case 'enemy':
      return isPastRivalry(link) ? 'past enemy' : 'enemy';
    default:
      return link.group;
  }
}

/** end === null means ongoing; end === undefined means the end isn't recorded. */
export function yearRange(start: number | null | undefined, end: number | null | undefined): string {
  if (start == null && end == null) return '';
  if (start != null && end === null) return `${start}–present`;
  if (start != null && end === undefined) return `from ${start}`;
  if (start == null) return `until ${end}`;
  return start === end ? `${start}` : `${start}–${end}`;
}

export function matchesQuery(node: GraphNode, q: string): boolean {
  if (!q) return true;
  const needle = fold(q);
  if (fold(node.name).includes(needle)) return true;
  return (node.person?.aliases ?? node.org?.aliases ?? []).some((a) => fold(a).includes(needle));
}

function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * A rivalry or enmity is past once a file records the year it ended; ongoing or
 * undated ones count as current.
 */
export function isPastRivalry(link: GraphLink): boolean {
  return (link.group === 'rival' || link.group === 'enemy') && typeof link.endYear === 'number';
}

export function familyOf(link: GraphLink): EdgeFamily {
  if (isPastRivalry(link)) return link.group === 'enemy' ? 'past-enmity' : 'past-rivalry';
  return EDGE_GROUP_BY_ID[link.group].family;
}

/** All the links between one pair of people, drawn as a single line. */
export interface PairLink {
  /** "a|b" with the two slugs sorted. */
  id: string;
  /** For a pair with one directed link: its source (the mentor / employer / donor). */
  source: string | GraphNode;
  target: string | GraphNode;
  links: GraphLink[];
  /** The family that colors the line (see FAMILY_PRIORITY). */
  family: EdgeFamily;
  confidence: number;
  /** Arrow only when the pair has a single, directed link. */
  directed: boolean;
  touchesSuggested: boolean;
  /** 0–1: how close the pair's closest link is (see CLOSENESS). Closer pairs pull harder. */
  closeness: number;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function mergePairs(links: GraphLink[]): PairLink[] {
  const byPair = new Map<string, GraphLink[]>();
  for (const l of links) {
    const key = pairKey(l.sourceId, l.targetId);
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key)!.push(l);
  }
  return [...byPair.entries()].map(([id, ls]) => {
    ls.sort((a, b) => FAMILY_PRIORITY.indexOf(familyOf(a)) - FAMILY_PRIORITY.indexOf(familyOf(b)) || b.confidence - a.confidence);
    const single = ls.length === 1 ? ls[0] : null;
    const [a, b] = id.split('|');
    return {
      id,
      source: single ? single.sourceId : a,
      target: single ? single.targetId : b,
      links: ls,
      family: familyOf(ls[0]),
      confidence: Math.max(...ls.map((l) => l.confidence)),
      directed: !!single?.directed,
      touchesSuggested: ls.some((l) => l.touchesSuggested),
      closeness: pairCloseness(ls),
    };
  });
}

/** A span of years, both ends included. */
export interface YearRange {
  from: number;
  to: number;
}

/**
 * Whether a link was active at any point in `range`. Undated links always count;
 * a link with a start but no recorded end counts from its start onward.
 */
export function activeInRange(link: GraphLink, range: YearRange): boolean {
  if (link.startYear != null && link.startYear > range.to) return false;
  if (typeof link.endYear === 'number' && link.endYear < range.from) return false;
  return true;
}

/** Whether a link was active in `year`. */
export function activeInYear(link: GraphLink, year: number): boolean {
  return activeInRange(link, { from: year, to: year });
}

/** `id` plus everyone within `depth` links of them. */
export function neighborhood(id: string, links: GraphLink[], depth: number): Set<string> {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    (adj.get(l.sourceId) ?? adj.set(l.sourceId, []).get(l.sourceId)!).push(l.targetId);
    (adj.get(l.targetId) ?? adj.set(l.targetId, []).get(l.targetId)!).push(l.sourceId);
  }
  const seen = new Set([id]);
  let frontier = [id];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const n of frontier) for (const m of adj.get(n) ?? []) if (!seen.has(m)) (seen.add(m), next.push(m));
    frontier = next;
  }
  return seen;
}

/** Years covered by the data, for the timeline slider. */
export function yearSpan(links: GraphLink[], now = new Date().getFullYear()): [number, number] {
  const years = links.flatMap((l) => [l.startYear, typeof l.endYear === 'number' ? l.endYear : null]).filter(isYear);
  return years.length ? [Math.min(...years), Math.max(now, ...years)] : [now, now];
}

/**
 * Steps from the nearest `core` person to everyone in `ids`, following `links`.
 * Core people are 0. People with no path go on one extra ring past the farthest
 * reachable one; `unlinked` is that ring's number (null when everyone is reachable).
 */
export function ringDistances(
  core: Set<string>,
  links: GraphLink[],
  ids: Iterable<string>,
): { rings: Map<string, number>; unlinked: number | null } {
  const adj = new Map<string, string[]>();
  for (const l of links) {
    (adj.get(l.sourceId) ?? adj.set(l.sourceId, []).get(l.sourceId)!).push(l.targetId);
    (adj.get(l.targetId) ?? adj.set(l.targetId, []).get(l.targetId)!).push(l.sourceId);
  }
  const rings = new Map<string, number>();
  let frontier = [...core];
  for (const id of frontier) rings.set(id, 0);
  for (let d = 1; frontier.length; d++) {
    const next: string[] = [];
    for (const n of frontier)
      for (const m of adj.get(n) ?? [])
        if (!rings.has(m)) {
          rings.set(m, d);
          next.push(m);
        }
    frontier = next;
  }
  const outer = Math.max(0, ...rings.values()) + 1;
  let unlinked: number | null = null;
  for (const id of ids)
    if (!rings.has(id)) {
      rings.set(id, outer);
      unlinked = outer;
    }
  return { rings, unlinked };
}

/**
 * The person's lean in `year` (null = today): the period that covers the year.
 * Before their first recorded period, the earliest one applies; after the last
 * closed one, the latest one. Undefined when nothing is recorded.
 */
export function leanAt(lean: LeanPeriod[] | undefined, year: number | null): LeanPeriod | undefined {
  const ps = (lean ?? []).filter((p) => typeof p?.value === 'number');
  if (!ps.length) return undefined;
  const sorted = [...ps].sort((a, b) => (a.start_year ?? -Infinity) - (b.start_year ?? -Infinity));
  if (year == null) return sorted.find((p) => p.end_year == null) ?? sorted[sorted.length - 1];
  const hit = sorted.find((p) => (p.start_year ?? -Infinity) <= year && (p.end_year ?? Infinity) >= year);
  if (hit) return hit;
  return (sorted[0].start_year ?? -Infinity) > year ? sorted[0] : sorted[sorted.length - 1];
}

/** How strongly a kind of link pulls two people together (0–1), before confidence. */
export const CLOSENESS: Record<EdgeGroup, number> = {
  family: 1,
  'co-founder': 0.9,
  mentorship: 0.85,
  employment: 0.8,
  funding: 0.6,
  ally: 0.6,
  colleague: 0.45,
  rival: 0.05,
  enemy: 0.03,
};

/** The closest link between a pair, weighted by confidence. Rivals and enemies barely pull. */
export function pairCloseness(links: GraphLink[]): number {
  return Math.max(0, ...links.map((l) => CLOSENESS[l.group] * l.confidence * (isPastRivalry(l) ? 0.5 : 1)));
}

/**
 * Clusters of people who are linked more to each other than to the rest
 * (Louvain modularity, weighted by how close each pair is). Returns a cluster
 * number per node; the biggest cluster is 0. People with no links each get
 * their own cluster.
 */
export function findClusters(ids: string[], pairs: PairLink[], resolution = 1): Map<string, number> {
  // Level 0: one node per person; edges weighted by closeness (floor so rivals still count a little).
  let nodeOf = new Map(ids.map((id, i) => [id, i]));
  let n = ids.length;
  let edges: [number, number, number][] = [];
  for (const p of pairs) {
    const a = nodeOf.get(linkEndId(p.source));
    const b = nodeOf.get(linkEndId(p.target));
    if (a == null || b == null || a === b) continue;
    edges.push([a, b, Math.max(0.05, p.closeness)]);
  }
  // membership[level0 node] = current community
  let membership = ids.map((_, i) => i);

  for (let level = 0; level < 10; level++) {
    const adj: Map<number, number>[] = Array.from({ length: n }, () => new Map());
    const self = new Array<number>(n).fill(0);
    let m2 = 0;
    for (const [a, b, w] of edges) {
      if (a === b) {
        self[a] += w;
        m2 += 2 * w;
        continue;
      }
      adj[a].set(b, (adj[a].get(b) ?? 0) + w);
      adj[b].set(a, (adj[b].get(a) ?? 0) + w);
      m2 += 2 * w;
    }
    if (m2 === 0) break;
    const k = adj.map((m, i) => [...m.values()].reduce((s, w) => s + w, 0) + 2 * self[i]);
    const comm = Array.from({ length: n }, (_, i) => i);
    const tot = [...k];
    let moved = false;
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (k[i] === 0) continue;
        const own = comm[i];
        tot[own] -= k[i];
        const toComm = new Map<number, number>();
        for (const [j, w] of adj[i]) toComm.set(comm[j], (toComm.get(comm[j]) ?? 0) + w);
        let best = own;
        let bestGain = (toComm.get(own) ?? 0) - (resolution * tot[own] * k[i]) / m2;
        for (const [c, w] of toComm) {
          const gain = w - (resolution * tot[c] * k[i]) / m2;
          if (gain > bestGain + 1e-12) {
            best = c;
            bestGain = gain;
          }
        }
        comm[i] = best;
        tot[best] += k[i];
        if (best !== own) changed = moved = true;
      }
      if (!changed) break;
    }
    if (!moved) break;
    // Aggregate: each community becomes one node at the next level.
    const renum = new Map<number, number>();
    for (const c of comm) if (!renum.has(c)) renum.set(c, renum.size);
    membership = membership.map((m) => renum.get(comm[m])!);
    const next = new Map<string, number>();
    for (const [a, b, w] of edges) {
      const ca = renum.get(comm[a])!;
      const cb = renum.get(comm[b])!;
      const key = ca < cb ? `${ca}|${cb}` : `${cb}|${ca}`;
      next.set(key, (next.get(key) ?? 0) + w);
    }
    for (let i = 0; i < n; i++) if (self[i]) {
      const c = renum.get(comm[i])!;
      next.set(`${c}|${c}`, (next.get(`${c}|${c}`) ?? 0) + self[i]);
    }
    edges = [...next.entries()].map(([key, w]) => {
      const [a, b] = key.split('|').map(Number);
      return [a, b, w];
    });
    n = renum.size;
    nodeOf = new Map();
  }

  // Number clusters by size, biggest first.
  const size = new Map<number, number>();
  for (const m of membership) size.set(m, (size.get(m) ?? 0) + 1);
  const order = [...size.keys()].sort((a, b) => size.get(b)! - size.get(a)! || a - b);
  const rank = new Map(order.map((c, i) => [c, i]));
  return new Map(ids.map((id, i) => [id, rank.get(membership[i])!]));
}

/**
 * How close one pair is as friends or partners: like `closeness`, but rivalries
 * and enmities count for nothing. A tie that has ended counts a bit over half, and
 * friendly ties between people who are rivals or enemies now count half again.
 */
export function friendlyCloseness(links: GraphLink[], now = new Date().getFullYear()): number {
  const feuding = links.some((l) => (l.group === 'rival' || l.group === 'enemy') && !isPastRivalry(l));
  const ties = links
    .filter((l) => l.group !== 'rival' && l.group !== 'enemy')
    .map((l) => CLOSENESS[l.group] * l.confidence * (typeof l.endYear === 'number' && l.endYear < now ? 0.6 : 1));
  return Math.max(0, ...ties) * (feuding ? 0.5 : 1);
}

/** Someone both people are tied to, and how strong the weaker of the two ties is. */
export interface SharedTie {
  id: string;
  strength: number;
  /** The pair (person A ↔ them) and (them ↔ person B). */
  viaA: PairLink;
  viaB: PairLink;
}

export interface Comparison {
  a: string;
  b: string;
  /** Every link directly between the two, rivalries included. */
  direct: GraphLink[];
  /** The strongest chain of friendly links from a to b (ids, a first), at most 4 links long; null if none. */
  chain: string[] | null;
  /** The pair for each link in the chain, in order. */
  chainPairs: PairLink[];
  /** 0–1: the chain's links' closeness multiplied together. */
  chainStrength: number;
  /** People and organizations both are tied to (friendly links only), strongest first. */
  shared: SharedTie[];
  sharedGroups: GroupId[];
  /** A direct rivalry or enmity, current one first. */
  tension: GraphLink | null;
  /** 0–100. */
  score: number;
  label: string;
}

const MAX_CHAIN = 4;

/**
 * Ties that run through someone with a very large network say less (everyone is
 * two steps apart through Trump). Up to HUB connections counts fully; past that,
 * the tie is scaled by √(HUB / connections): 48 connections → ½, 108 → ⅓.
 */
const HUB = 12;
export function hubFactor(degree: number): number {
  return degree <= HUB ? 1 : Math.sqrt(HUB / degree);
}

/**
 * How closely two people are tied: the strongest chain between them, the circle
 * they share, and a 0–100 score from both. A direct rivalry or enmity lowers the score.
 */
export function compare(
  a: string,
  b: string,
  pairs: PairLink[],
  nodes: Map<string, GraphNode>,
  now = new Date().getFullYear(),
): Comparison {
  const hub = (id: string) => hubFactor(nodes.get(id)?.degree ?? 0);
  const adj = new Map<string, { other: string; pair: PairLink; w: number }[]>();
  let direct: GraphLink[] = [];
  for (const p of pairs) {
    const s = linkEndId(p.source);
    const t = linkEndId(p.target);
    if (pairKey(s, t) === pairKey(a, b)) direct = p.links;
    const w = friendlyCloseness(p.links, now);
    if (w <= 0) continue;
    (adj.get(s) ?? adj.set(s, []).get(s)!).push({ other: t, pair: p, w });
    (adj.get(t) ?? adj.set(t, []).get(t)!).push({ other: s, pair: p, w });
  }

  // Strongest chain: best product of closeness over at most MAX_CHAIN links, no one visited twice.
  let best: { strength: number; path: string[]; pairs: PairLink[] } | null = null;
  let layer = new Map<string, { strength: number; path: string[]; pairs: PairLink[] }>([[a, { strength: 1, path: [a], pairs: [] }]]);
  for (let hop = 0; hop < MAX_CHAIN && layer.size; hop++) {
    const next = new Map<string, { strength: number; path: string[]; pairs: PairLink[] }>();
    for (const [id, st] of layer)
      for (const e of adj.get(id) ?? []) {
        if (st.path.includes(e.other)) continue;
        // Passing through someone: their network's size waters the tie down.
        const strength = st.strength * e.w * (e.other === b ? 1 : hub(e.other));
        if (best && strength <= best.strength) continue;
        const cand = { strength, path: [...st.path, e.other], pairs: [...st.pairs, e.pair] };
        if (e.other === b) {
          best = cand;
          continue;
        }
        if ((next.get(e.other)?.strength ?? 0) < strength) next.set(e.other, cand);
      }
    layer = next;
  }

  const ofA = new Map((adj.get(a) ?? []).map((e) => [e.other, e]));
  const shared: SharedTie[] = [];
  for (const e of adj.get(b) ?? []) {
    const fromA = ofA.get(e.other);
    if (fromA)
      shared.push({ id: e.other, strength: Math.min(fromA.w, e.w) * hub(e.other), viaA: fromA.pair, viaB: e.pair });
  }
  shared.sort((x, y) => y.strength - x.strength);

  const groupsB = new Set(nodes.get(b)?.groups ?? []);
  const sharedGroups = (nodes.get(a)?.groups ?? []).filter((g) => groupsB.has(g));

  const tensions = direct.filter((l) => l.group === 'rival' || l.group === 'enemy');
  const tension = tensions.find((l) => !isPastRivalry(l)) ?? tensions[0] ?? null;

  const chainStrength = best?.strength ?? 0;
  const sharedSum = shared.reduce((s, t) => s + t.strength, 0);
  const sharedScore = 1 - Math.exp(-sharedSum / 2);
  const groupScore = Math.min(1, sharedGroups.length / 3);
  let raw = 1 - (1 - chainStrength) * (1 - 0.55 * sharedScore) * (1 - 0.15 * groupScore);
  if (tension) raw *= isPastRivalry(tension) ? 0.85 : 0.6;
  const score = Math.round(100 * raw);

  return {
    a,
    b,
    direct,
    chain: best?.path ?? null,
    chainPairs: best?.pairs ?? [],
    chainStrength,
    shared,
    sharedGroups,
    tension,
    score,
    label: closenessLabel(score),
  };
}

export function closenessLabel(score: number): string {
  if (score >= 75) return 'Very close';
  if (score >= 55) return 'Close';
  if (score >= 35) return 'Connected';
  if (score >= 15) return 'Loosely connected';
  return 'Far apart';
}

import {
  EDGE_GROUP_BY_ID,
  FAMILY_PRIORITY,
  type Connection,
  type EdgeFamily,
  type EdgeGroup,
  type GroupId,
  type LeanPeriod,
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

export function buildGraph(files: PersonFile[]): GraphData {
  const nodes = new Map<string, GraphNode>();
  const skipped: GraphData['skipped'] = [];

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

  for (const f of files) {
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
export function describeLink(link: GraphLink, nameOf: (id: string) => string): string {
  const a = nameOf(link.sourceId);
  const b = nameOf(link.targetId);
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
    case 'family':
      return `${a} and ${b} are family`;
  }
}

/** Short label for how `other` relates to `self` along this link, e.g. "mentor". */
export function roleOfOther(link: GraphLink, selfId: string): string {
  const otherIsSource = link.sourceId !== selfId;
  switch (link.group) {
    case 'mentorship':
      return otherIsSource ? 'mentor' : 'protégé';
    case 'employment':
      return otherIsSource ? 'employer' : 'employee';
    case 'funding':
      return otherIsSource ? 'donor' : 'funded by them';
    case 'rival':
      return isPastRivalry(link) ? 'past rival' : 'rival';
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
  return (node.person?.aliases ?? []).some((a) => fold(a).includes(needle));
}

function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** A rivalry is past once a file records the year it ended; ongoing or undated ones count as current. */
export function isPastRivalry(link: GraphLink): boolean {
  return link.group === 'rival' && typeof link.endYear === 'number';
}

export function familyOf(link: GraphLink): EdgeFamily {
  return isPastRivalry(link) ? 'past-rivalry' : EDGE_GROUP_BY_ID[link.group].family;
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

/**
 * Whether a link was active in `year`. Undated links always count; a link with a
 * start but no recorded end counts from its start onward.
 */
export function activeInYear(link: GraphLink, year: number): boolean {
  if (link.startYear != null && link.startYear > year) return false;
  if (typeof link.endYear === 'number' && link.endYear < year) return false;
  return true;
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
};

/** The closest link between a pair, weighted by confidence. Rivals barely pull. */
export function pairCloseness(links: GraphLink[]): number {
  return Math.max(0, ...links.map((l) => CLOSENESS[l.group] * l.confidence * (isPastRivalry(l) ? 0.5 : 1)));
}

/** Main-map row (north = money, south = politics) for a person, in steps from the middle. */
export function compassRow(node: Pick<GraphNode, 'sector' | 'groups'>): number | undefined {
  const inGov = node.groups.includes('trump-circle');
  switch (node.sector) {
    case 'business':
      return inGov ? -0.6 : -2;
    case 'tech':
      return inGov ? 0 : -1.3;
    case 'ai-defense':
      return inGov ? 0 : -0.7;
    case 'politics':
      return node.groups.includes('tech-right') ? 0.7 : 1.4;
    default:
      return undefined;
  }
}

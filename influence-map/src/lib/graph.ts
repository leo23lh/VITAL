import {
  type Connection,
  type EdgeGroup,
  type Person,
  type PersonFile,
  type RelationshipType,
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
      return `${a} and ${b} are rivals`;
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

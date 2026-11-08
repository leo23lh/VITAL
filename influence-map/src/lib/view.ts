// What the map shows for the current view and filters. Pure functions, so they can be tested without React.
import {
  activeInRange,
  bond,
  compare,
  familyOf,
  findClusters,
  isCurrent,
  leanAt,
  linkEndId,
  mergePairs,
  neighborhood,
  ringDistances,
  type Comparison,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type PairLink,
  type YearRange,
  type WorkplaceIndex,
} from './graph';
import { EDGE_FAMILIES, GROUPS, type EdgeFamily, type GroupId } from './schema';

/** `id` of a link selection is a pair id ("a|b"): every link between the two people. */
export type Selection = { kind: 'node'; id: string } | { kind: 'link'; id: string } | null;

export type View =
  | { kind: 'all' }
  | { kind: 'group'; id: GroupId }
  /** A 2028 contender and everyone in their camp (from each file's race_2028). */
  | { kind: 'camp'; id: string }
  | { kind: 'money' }
  | { kind: 'feuds' }
  | { kind: 'world'; id: string; depth: 1 | 2 }
  /** How closely two people are tied: their strongest chain and shared circle. */
  | { kind: 'compare'; a: string; b: string };

export type Layout = 'wide' | 'card' | 'sheet';

/** Without a date range: 'now' hides ties that have ended (old jobs, past donations, finished feuds). */
export type TimeMode = 'now' | 'all';

/** Layout sliders (Filters → Forces). Each is a multiplier on the default, 1 = normal. */
export interface Forces {
  /** How hard dots push each other apart. */
  repel: number;
  /** Length of the lines. */
  distance: number;
  /** How hard each cluster gathers around its own spot. */
  cluster: number;
  /** Pull toward the middle, which keeps loose dots from drifting off. */
  center: number;
}

export const DEFAULT_FORCES: Forces = { repel: 1, distance: 1, cluster: 1, center: 1 };

/**
 * Main view only: each person's left–right spot, from their political lean
 * (-3 far left … +3 far right) at the end of the selected date range (today when none). Up–down is left to the links.
 */
export type Compass = Map<string, { x?: number; inferred?: boolean }>;

/** For a view: who sits in the middle, how many steps out everyone else is, which lines to stress. */
export interface RadialLayout {
  core: Set<string>;
  rings: Map<string, number>;
  /** The outer ring for people with no path to the core, if any. */
  unlinked: number | null;
  /** Lens family whose lines stay colored (Follow the money, Feuds); null = core-to-core lines. */
  emphasis: EdgeFamily[] | null;
}

/** The filter settings that decide which links and people are on the map. */
export interface Filters {
  hidden: Set<EdgeFamily>;
  years: YearRange | null;
  timeMode: TimeMode;
  showOrgs: boolean;
  showSuggested: boolean;
  leanMode: boolean;
  colorAll: boolean;
}

/** How many filters differ from the defaults (badge on the Filters button). */
export function activeFilterCount(f: Filters): number {
  return f.hidden.size + (f.years ? 1 : 0) + (f.showSuggested ? 1 : 0) + (f.colorAll ? 0 : 1) + (f.showOrgs ? 0 : 1) + (f.leanMode ? 1 : 0);
}

export type NodeIndex = Map<string, GraphNode>;

/** Links that pass the family, year and organization filters (before choosing which people show). */
export function filterLinks(links: GraphLink[], byId: NodeIndex, f: Pick<Filters, 'hidden' | 'years' | 'timeMode' | 'showOrgs'>): GraphLink[] {
  return links.filter((l) => {
    if (f.hidden.has(familyOf(l))) return false;
    if (f.years && !activeInRange(l, f.years)) return false;
    if (!f.years && f.timeMode === 'now' && !isCurrent(l)) return false;
    if (!f.showOrgs && (byId.get(l.sourceId)?.isOrg || byId.get(l.targetId)?.isOrg)) return false;
    return true;
  });
}

/** Compare view: scored on the links that pass the filters, so a date range compares that period. */
export function comparisonFor(view: View, links: GraphLink[], byId: NodeIndex): Comparison | null {
  return view.kind === 'compare' ? compare(view.a, view.b, mergePairs(links), byId) : null;
}

export interface Spotlight {
  /** The view's own people. */
  core: Set<string>;
  /** Families whose lines count (Follow the money, Feuds); null = every family. */
  lens: EdgeFamily[] | null;
  inLens: (l: GraphLink) => boolean;
  /** Up to 10 people outside the view, tied to the most members first. */
  outsiders: { id: string; name: string; members: number; strength: number }[];
}

const FEUD_FAMILIES: EdgeFamily[] = ['rivalry', 'past-rivalry', 'enmity', 'past-enmity'];

/**
 * Spotlight views (groups, 2028 camps, Follow the money, Feuds) show only their own
 * people, with only the lines between them; everyone else is offered in a short list.
 */
export function spotlightFor(
  view: View,
  nodes: GraphNode[],
  byId: NodeIndex,
  links: GraphLink[],
  f: Pick<Filters, 'showOrgs' | 'showSuggested'>,
): Spotlight | null {
  if (view.kind !== 'group' && view.kind !== 'camp' && view.kind !== 'money' && view.kind !== 'feuds') return null;
  const lens: EdgeFamily[] | null = view.kind === 'money' ? ['money'] : view.kind === 'feuds' ? FEUD_FAMILIES : null;
  const shown = (n: GraphNode | undefined) => !!n && (f.showOrgs || !n.isOrg) && (n.researched || f.showSuggested);
  const core = new Set<string>();
  if (view.kind === 'group') {
    for (const n of nodes) if (n.groups.includes(view.id) && shown(n)) core.add(n.id);
  } else if (view.kind === 'camp') {
    core.add(view.id);
    for (const n of nodes) if (n.person?.race_2028?.contenders?.includes(view.id) && shown(n)) core.add(n.id);
  } else {
    for (const l of links) {
      if (!lens!.includes(familyOf(l))) continue;
      if (shown(byId.get(l.sourceId)) && shown(byId.get(l.targetId))) {
        core.add(l.sourceId);
        core.add(l.targetId);
      }
    }
  }
  const inLens = (l: GraphLink) => !lens || lens.includes(familyOf(l));
  // Outsiders tied to the most members (then by how close those ties are), for the list.
  const ties = new Map<string, { members: Set<string>; strength: number }>();
  for (const p of mergePairs(links.filter(inLens))) {
    const a = linkEndId(p.source);
    const b = linkEndId(p.target);
    if (core.has(a) === core.has(b)) continue;
    const out = core.has(a) ? b : a;
    if (!shown(byId.get(out))) continue;
    const t = ties.get(out) ?? { members: new Set<string>(), strength: 0 };
    t.members.add(core.has(a) ? a : b);
    t.strength += p.closeness;
    ties.set(out, t);
  }
  const outsiders = [...ties.entries()]
    .map(([id, t]) => ({ id, name: byId.get(id)?.name ?? id, members: t.members.size, strength: t.strength }))
    .sort((x, y) => y.members - x.members || y.strength - x.strength)
    .slice(0, 10);
  return { core, lens, inLens, outsiders };
}

/**
 * Researched lean sets x. People without one (no political record, or suggested)
 * get the closeness-weighted average lean of the people they're linked to, marked
 * `inferred` so it pulls more gently; with no leaned neighbours, links alone decide.
 */
export function compassSpots(nodes: GraphNode[], pairs: PairLink[], year: number | null): Compass {
  const compass: Compass = new Map();
  for (const n of nodes) {
    // An organization's side (R or D) places it gently, like a lean estimated from links.
    const side = n.org?.side;
    const seed = side === 'R' ? 2 : side === 'D' ? -2 : undefined;
    compass.set(n.id, seed != null ? { x: seed, inferred: true } : { x: leanAt(n.person?.lean, year)?.value });
  }
  const sides = new Set(nodes.filter((n) => n.org?.side === 'R' || n.org?.side === 'D').map((n) => n.id));
  // Spread inferred leans a few steps out, so clusters with no researched lean still find a side.
  for (let pass = 0; pass < 3; pass++) {
    const sums = new Map<string, { w: number; x: number }>();
    for (const p of pairs) {
      const a = linkEndId(p.source);
      const b = linkEndId(p.target);
      for (const [self, other] of [
        [a, b],
        [b, a],
      ]) {
        const me = compass.get(self);
        const them = compass.get(other);
        if (!me || (me.x != null && !me.inferred) || them?.x == null || p.closeness <= 0) continue;
        if (sides.has(self)) continue;
        // Researched neighbours count fully; inferred ones count half.
        const w = p.closeness * (them.inferred ? 0.5 : 1);
        const s = sums.get(self) ?? { w: 0, x: 0 };
        s.w += w;
        s.x += them.x * w;
        sums.set(self, s);
      }
    }
    for (const [id, s] of sums) compass.set(id, { ...compass.get(id), x: s.x / s.w, inferred: true });
  }
  return compass;
}

export interface VisibleGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  pairs: PairLink[];
  radial: RadialLayout | null;
  compass: Compass | null;
  clusters: Map<string, number> | null;
}

export interface VisibleInput {
  graph: GraphData;
  byId: NodeIndex;
  /** Output of filterLinks. */
  links: GraphLink[];
  view: View;
  comparison: Comparison | null;
  spotlight: Spotlight | null;
  /** Spotlight: outsiders the reader brought onto the map. */
  extras: Set<string>;
  selectedNodeId: string | null;
  workplaces: WorkplaceIndex;
  filters: Pick<Filters, 'showOrgs' | 'showSuggested' | 'leanMode' | 'years'>;
}

/** The people and lines on the map, plus how to lay them out. */
export function visibleGraph({ graph, byId, links: filtered, view, comparison, spotlight, extras, selectedNodeId, workplaces, filters: f }: VisibleInput): VisibleGraph {
  const ids = new Set<string>();
  const touched = new Set<string>();
  for (const l of filtered) {
    touched.add(l.sourceId);
    touched.add(l.targetId);
  }
  if (view.kind === 'world') {
    for (const id of neighborhood(view.id, filtered, view.depth)) ids.add(id);
  } else if (comparison) {
    // Just the two, their chain and the circle they share.
    for (const id of [comparison.a, comparison.b, ...(comparison.chain ?? []), ...comparison.shared.map((t) => t.id)])
      if (byId.has(id)) ids.add(id);
  } else if (spotlight) {
    for (const id of spotlight.core) ids.add(id);
    for (const id of extras) if (byId.has(id)) ids.add(id);
  } else {
    // People with no tie left after the filters (e.g. every tie ended, in Now) stay off the map until searched for.
    for (const n of graph.nodes)
      if (touched.has(n.id) && ((n.researched && (f.showOrgs || !n.isOrg)) || f.showSuggested)) ids.add(n.id);
  }
  // The selected person always brings their own connections along, suggested ones included.
  if (selectedNodeId && byId.has(selectedNodeId)) {
    ids.add(selectedNodeId);
    for (const id of neighborhood(selectedNodeId, filtered, 1)) ids.add(id);
  }

  const links = filtered.filter((l) => {
    if (!ids.has(l.sourceId) || !ids.has(l.targetId)) return false;
    if (!spotlight) return true;
    // Spotlight: the selected person's own lines, plus lines among the view's people (in the lens, if any).
    if (l.sourceId === selectedNodeId || l.targetId === selectedNodeId) return true;
    const inView = (id: string) => spotlight.core.has(id) || extras.has(id);
    return inView(l.sourceId) && inView(l.targetId) && spotlight.inLens(l);
  });
  const nodes = graph.nodes.filter((n) => ids.has(n.id));

  // Radial layout: who sits in the middle for this view, and how many steps out everyone else is.
  let radial: RadialLayout | null = null;
  if (view.kind === 'world' || view.kind === 'compare' || view.kind === 'camp') {
    const core = new Set<string>();
    if (view.kind === 'world' || view.kind === 'camp') core.add(view.id);
    else if (comparison) for (const id of comparison.chain ?? [comparison.a, comparison.b]) core.add(id);
    if (core.size) radial = { core, ...ringDistances(core, links, ids), emphasis: null };
  }
  const pairs = mergePairs(links);
  // Line thickness follows how deep each pair's own relationship runs.
  for (const p of pairs) {
    const [a, b] = p.id.split('|');
    p.bond = bond(byId.get(a), byId.get(b), p.links, workplaces).score;
  }
  const compass = view.kind === 'all' && f.leanMode ? compassSpots(nodes, pairs, f.years?.to ?? null) : null;
  // Free layout: find clusters so each can get its own patch of the map.
  const clusters =
    (view.kind === 'all' && !f.leanMode) || (spotlight && view.kind !== 'camp')
      ? findClusters(
          nodes.map((n) => n.id),
          pairs,
        )
      : null;
  return { nodes, links, pairs, radial, compass, clusters };
}

/** Links per relationship family (Filters menu). */
export function familyCounts(links: GraphLink[]): Record<EdgeFamily, number> {
  const c = Object.fromEntries(EDGE_FAMILIES.map((f) => [f.id, 0])) as Record<EdgeFamily, number>;
  for (const l of links) c[familyOf(l)]++;
  return c;
}

/** People and organizations per group (Views menu). */
export function groupCounts(nodes: GraphNode[]): Record<GroupId, number> {
  const c = Object.fromEntries(GROUPS.map((g) => [g.id, 0])) as Record<GroupId, number>;
  for (const n of nodes) for (const g of n.groups) if (g in c) c[g]++;
  return c;
}

/** 2028 contenders with the size of their camps, biggest first. */
export function campSizes(nodes: GraphNode[], byId: NodeIndex): { id: string; name: string; count: number }[] {
  const size = new Map<string, number>();
  for (const n of nodes) if (n.person?.race_2028?.role === 'contender') size.set(n.id, size.get(n.id) ?? 0);
  for (const n of nodes) for (const c of n.person?.race_2028?.contenders ?? []) if (size.has(c)) size.set(c, size.get(c)! + 1);
  return [...size.entries()]
    .map(([id, count]) => ({ id, name: byId.get(id)?.name ?? id, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Changes whenever the map should zoom to fit again. */
export function fitKey(view: View, f: Pick<Filters, 'leanMode' | 'years' | 'timeMode'>, loaded: boolean): string {
  const id = 'id' in view ? view.id : '';
  const pair = view.kind === 'compare' ? `${view.a}-${view.b}` : '';
  const depth = view.kind === 'world' ? view.depth : '';
  const time = f.years ? `${f.years.from}-${f.years.to}` : f.timeMode;
  return `${f.leanMode}:${view.kind}:${id}:${pair}:${depth}:${time}:${loaded}`;
}

/** Key for the view's identity (resets spotlight extras when it changes). */
export const viewKey = (view: View) => `${view.kind}:${'id' in view ? view.id : ''}`;

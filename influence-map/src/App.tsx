import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GraphView, { BACKGROUND, type GraphHandle } from './components/GraphView';
import Menus, { type MenuName } from './components/Menus';
import SidePanel from './components/SidePanel';
import Toolbar from './components/Toolbar';
import ViewChips from './components/ViewChips';
import { canExport, exportGraphPng } from './lib/exportPng';
import {
  activeInRange,
  buildGraph,
  compare,
  familyOf,
  findClusters,
  leanAt,
  linkEndId,
  mergePairs,
  neighborhood,
  ringDistances,
  yearSpan,
  type GraphNode,
  type PairLink,
  type YearRange,
} from './lib/graph';
import { EDGE_FAMILIES, GROUPS, type EdgeFamily, type GroupId } from './lib/schema';
import { usePeople } from './lib/usePeople';

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

/**
 * Researched lean sets x. People without one (no political record, or suggested)
 * get the closeness-weighted average lean of the people they're linked to, marked
 * `inferred` so it pulls more gently; with no leaned neighbours, links alone decide.
 */
function compassSpots(nodes: GraphNode[], pairs: PairLink[], year: number | null): Compass {
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

/** For a view: who sits in the middle, how many steps out everyone else is, which lines to stress. */
export interface RadialLayout {
  core: Set<string>;
  rings: Map<string, number>;
  /** The outer ring for people with no path to the core, if any. */
  unlinked: number | null;
  /** Lens family whose lines stay colored (Follow the money, Feuds); null = core-to-core lines. */
  emphasis: EdgeFamily[] | null;
}

function currentLayout(): Layout {
  if (window.matchMedia('(min-width: 1100px)').matches) return 'wide';
  if (window.matchMedia('(min-width: 600px)').matches) return 'card';
  return 'sheet';
}

export default function App() {
  const { people, orgs, errors, loaded, fetchError, lastUpdated, live } = usePeople();
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<EdgeFamily>>(new Set());
  const [showSuggested, setShowSuggested] = useState(false);
  const [colorAll, setColorAll] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showOrgs, setShowOrgs] = useState(true);
  // Main view: arrange left–right by political lean (off = clusters spread out freely).
  const [leanMode, setLeanMode] = useState(false);
  const [forces, setForces] = useState<Forces>(DEFAULT_FORCES);
  const [view, setView] = useState<View>({ kind: 'all' });
  // Date range filter: only links active at some point in it. null = all years.
  const [years, setYears] = useState<YearRange | null>(null);
  const [menu, setMenu] = useState<MenuName | null>(null);
  const [layout, setLayout] = useState<Layout>(currentLayout);
  const fgRef = useRef<GraphHandle>(undefined);
  const graphWrapRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, GraphNode>());
  const [exportable, setExportable] = useState(false);

  useEffect(() => {
    void canExport().then(setExportable);
    const onResize = () => setLayout(currentLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Rebuild when files change, keeping existing nodes where they were.
  const graph = useMemo(() => {
    const g = buildGraph(people, orgs);
    for (const n of g.nodes) {
      const prev = positions.current.get(n.id);
      if (prev) Object.assign(n, { x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy });
    }
    positions.current = new Map(g.nodes.map((n) => [n.id, n]));
    return g;
  }, [people, orgs]);

  const span = useMemo(() => yearSpan(graph.links), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  // Links that pass the family, year and view filters (before choosing which people show).
  const filteredLinks = useMemo(
    () =>
      graph.links.filter((l) => {
        const fam = familyOf(l);
        if (hidden.has(fam)) return false;
        if (years && !activeInRange(l, years)) return false;
        if (!showOrgs && (byId.get(l.sourceId)?.isOrg || byId.get(l.targetId)?.isOrg)) return false;
        return true;
      }),
    [graph, byId, hidden, years, showOrgs],
  );

  const selectedNodeId = selection?.kind === 'node' ? selection.id : null;

  // Compare view: scored on the links that pass the filters, so a date range compares that period.
  const comparison = useMemo(
    () => (view.kind === 'compare' ? compare(view.a, view.b, mergePairs(filteredLinks), byId) : null),
    [view, filteredLinks, byId],
  );

  const visible = useMemo(() => {
    const ids = new Set<string>();
    const touched = new Set<string>();
    for (const l of filteredLinks) {
      touched.add(l.sourceId);
      touched.add(l.targetId);
    }
    if (view.kind === 'world') {
      for (const id of neighborhood(view.id, filteredLinks, view.depth)) ids.add(id);
    } else if (comparison) {
      // Just the two, their chain and the circle they share.
      for (const id of [comparison.a, comparison.b, ...(comparison.chain ?? []), ...comparison.shared.map((t) => t.id)])
        if (byId.has(id)) ids.add(id);
    } else {
      // Groups and lenses keep everyone on the map; the view's core people go in the middle.
      for (const n of graph.nodes)
        if ((n.researched && (showOrgs || !n.isOrg)) || (showSuggested && touched.has(n.id))) ids.add(n.id);
    }
    // The selected person always brings their own connections along, suggested ones included.
    if (selectedNodeId && byId.has(selectedNodeId)) {
      ids.add(selectedNodeId);
      for (const id of neighborhood(selectedNodeId, filteredLinks, 1)) ids.add(id);
    }

    const links = filteredLinks.filter((l) => ids.has(l.sourceId) && ids.has(l.targetId));
    const nodes = graph.nodes.filter((n) => ids.has(n.id));

    // Radial layout: who sits in the middle for this view, and how many steps out everyone else is.
    let radial: RadialLayout | null = null;
    if (view.kind !== 'all') {
      const core = new Set<string>();
      const lens: EdgeFamily[] | null =
        view.kind === 'money' ? ['money'] : view.kind === 'feuds' ? ['rivalry', 'past-rivalry', 'enmity', 'past-enmity'] : null;
      if (view.kind === 'world') {
        core.add(view.id);
      } else if (comparison) {
        for (const id of comparison.chain ?? [comparison.a, comparison.b]) core.add(id);
      } else if (view.kind === 'group') {
        for (const n of nodes) if (n.groups.includes(view.id)) core.add(n.id);
      } else if (view.kind === 'camp') {
        core.add(view.id);
        for (const n of nodes) if (n.person?.race_2028?.contenders?.includes(view.id)) core.add(n.id);
      } else {
        for (const l of links) {
          if (!lens?.includes(familyOf(l))) continue;
          core.add(l.sourceId);
          core.add(l.targetId);
        }
      }
      if (core.size) radial = { core, ...ringDistances(core, links, ids), emphasis: lens };
    }
    const pairs = mergePairs(links);
    const compass = view.kind === 'all' && leanMode ? compassSpots(nodes, pairs, years?.to ?? null) : null;
    // Free layout: find clusters so each can get its own patch of the map.
    const clusters =
      view.kind === 'all' && !leanMode
        ? findClusters(
            nodes.map((n) => n.id),
            pairs,
          )
        : null;
    return { nodes, links, pairs, radial, compass, clusters };
  }, [graph, byId, filteredLinks, view, comparison, showSuggested, showOrgs, selectedNodeId, years, leanMode]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(EDGE_FAMILIES.map((f) => [f.id, 0])) as Record<EdgeFamily, number>;
    for (const l of graph.links) c[familyOf(l)]++;
    return c;
  }, [graph]);

  // 2028 contenders with the size of their camps, biggest first.
  const camps = useMemo(() => {
    const size = new Map<string, number>();
    for (const n of graph.nodes) {
      if (n.person?.race_2028?.role === 'contender') size.set(n.id, size.get(n.id) ?? 0);
    }
    for (const n of graph.nodes)
      for (const c of n.person?.race_2028?.contenders ?? []) if (size.has(c)) size.set(c, size.get(c)! + 1);
    return [...size.entries()]
      .map(([id, count]) => ({ id, name: byId.get(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [graph, byId]);

  const groupCounts = useMemo(() => {
    const c = Object.fromEntries(GROUPS.map((g) => [g.id, 0])) as Record<GroupId, number>;
    for (const n of graph.nodes) for (const g of n.groups) if (g in c) c[g]++;
    return c;
  }, [graph]);

  const focusNode = useCallback(
    (id: string) => {
      setSelection({ kind: 'node', id });
      const n = byId.get(id);
      const fg = fgRef.current;
      if (!fg || !n || n.x == null || n.y == null) return;
      const k = Math.max(fg.zoom(), 1.6);
      const el = graphWrapRef.current;
      const w = el?.clientWidth ?? 0;
      const h = el?.clientHeight ?? 0;
      // Aim for the part of the map the details panel doesn't cover.
      const dx = layout === 'card' ? Math.min(400, w * 0.48) / 2 / k : 0;
      const dy = layout === 'sheet' ? (h * 0.2) / k : 0;
      fg.centerAt(n.x + dx, n.y + dy, 600);
      fg.zoom(k, 600);
    },
    [byId, layout],
  );

  const openWorld = useCallback((id: string) => {
    setView({ kind: 'world', id, depth: 1 });
    setSelection({ kind: 'node', id });
  }, []);

  const openCompare = useCallback((a: string, b: string) => {
    setView({ kind: 'compare', a, b });
    setSelection(null);
  }, []);

  const fitKey = `${leanMode}:${view.kind}:${'id' in view ? view.id : ''}:${'a' in view ? `${view.a}-${view.b}` : ''}:${'depth' in view ? view.depth : ''}:${years ? `${years.from}-${years.to}` : ''}:${loaded}`;
  const empty = loaded && people.length === 0;

  const stats = {
    researched: graph.nodes.filter((n) => n.researched && !n.isOrg).length,
    orgs: graph.nodes.filter((n) => n.isOrg).length,
    suggested: graph.nodes.filter((n) => !n.researched).length,
    links: graph.links.length,
  };

  return (
    <div className="app">
      <Toolbar
        nodes={graph.nodes}
        query={query}
        onQuery={setQuery}
        onPick={(id) => {
          focusNode(id);
          setQuery('');
        }}
        view={view}
        nameOf={(id) => byId.get(id)?.name ?? id}
        menu={menu}
        onMenu={setMenu}
        filtersActive={hidden.size + (years ? 1 : 0) + (showSuggested ? 1 : 0) + (colorAll ? 0 : 1) + (showOrgs ? 0 : 1) + (leanMode ? 1 : 0)}
        live={live}
        lastUpdated={lastUpdated}
      />

      {(fetchError || errors.length > 0 || graph.skipped.length > 0) && (
        <div className="banner" role="status">
          {fetchError && <div>Could not load data: {fetchError}</div>}
          {errors.map((e) => (
            <div key={e.file}>
              {e.file.startsWith('orgs/') ? `data/${e.file}` : `data/people/${e.file}`}: {e.message}
            </div>
          ))}
          {graph.skipped.map((s, i) => (
            <div key={i}>
              data/people/{s.file}: unknown relationship_type "{s.relationship_type}" for {s.name} (skipped)
            </div>
          ))}
        </div>
      )}

      <main className={`main layout-${layout}`}>
        <div className="graph" ref={graphWrapRef}>
          {!loaded ? (
            <div className="empty">
              <p>Loading the network…</p>
            </div>
          ) : empty ? (
            <div className="empty">
              <h2>No people yet</h2>
              <p>
                In Claude Code, run <code>/add-person &lt;name&gt; [context]</code>. New people appear here
                automatically.
              </p>
            </div>
          ) : (
            <GraphView
              nodes={visible.nodes}
              pairs={visible.pairs}
              selection={selection}
              query={query}
              colorAll={colorAll}
              showPhotos={showPhotos}
              radial={visible.radial}
              compass={visible.compass}
              clusters={visible.clusters}
              forces={forces}
              fitKey={fitKey}
              fgRef={fgRef}
              onSelect={setSelection}
            />
          )}

          {loaded && !empty && (
            <ViewChips
              view={view}
              years={years}
              nameOf={(id) => byId.get(id)?.name ?? id}
              onView={(v) => {
                if (v.kind !== 'world') setSelection(null);
                setView(v);
              }}
              onYears={setYears}
            />
          )}

          {menu && (
            <Menus
              menu={menu}
              onClose={() => setMenu(null)}
              view={view}
              onView={(v) => {
                setView(v);
                setSelection(null);
                setMenu(null);
              }}
              groupCounts={groupCounts}
              camps={camps}
              selectedNode={selectedNodeId ? (byId.get(selectedNodeId) ?? null) : null}
              onWorld={openWorld}
              counts={counts}
              hidden={hidden}
              onToggleFamily={(f) =>
                setHidden((h) => {
                  const next = new Set(h);
                  if (next.has(f)) next.delete(f);
                  else next.add(f);
                  return next;
                })
              }
              onAllFamilies={(v) => setHidden(v ? new Set() : new Set(EDGE_FAMILIES.map((f) => f.id)))}
              showSuggested={showSuggested}
              onShowSuggested={setShowSuggested}
              colorAll={colorAll}
              onColorAll={setColorAll}
              showPhotos={showPhotos}
              onShowPhotos={setShowPhotos}
              showOrgs={showOrgs}
              onShowOrgs={setShowOrgs}
              leanMode={leanMode}
              onLeanMode={setLeanMode}
              forces={forces}
              onForces={setForces}
              years={years}
              span={span}
              onYears={setYears}
              stats={stats}
              live={live}
              lastUpdated={lastUpdated}
              onFit={() => {
                fgRef.current?.zoomToFit(500, 50);
                setMenu(null);
              }}
              onExport={
                exportable
                  ? () =>
                      graphWrapRef.current &&
                      void exportGraphPng(graphWrapRef.current, { background: BACKGROUND, hidden, counts })
                  : undefined
              }
            />
          )}
        </div>

        <SidePanel
          layout={layout}
          selection={selection}
          nodes={graph.nodes}
          links={graph.links}
          onSelect={(s) => (s?.kind === 'node' ? focusNode(s.id) : setSelection(s))}
          onWorld={openWorld}
          comparison={comparison}
          onCompare={openCompare}
          onClose={() => (selection ? setSelection(null) : setView({ kind: 'all' }))}
        />
      </main>
    </div>
  );
}


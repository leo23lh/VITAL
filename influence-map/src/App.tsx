import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GraphView, { BACKGROUND, type GraphHandle } from './components/GraphView';
import Menus, { type MenuName } from './components/Menus';
import SidePanel from './components/SidePanel';
import Toolbar from './components/Toolbar';
import ViewChips from './components/ViewChips';
import { canExport, exportGraphPng } from './lib/exportPng';
import {
  activeInYear,
  buildGraph,
  familyOf,
  mergePairs,
  neighborhood,
  ringDistances,
  yearSpan,
  type GraphNode,
} from './lib/graph';
import { EDGE_FAMILIES, GROUPS, type EdgeFamily, type GroupId } from './lib/schema';
import { usePeople } from './lib/usePeople';

/** `id` of a link selection is a pair id ("a|b"): every link between the two people. */
export type Selection = { kind: 'node'; id: string } | { kind: 'link'; id: string } | null;

export type View =
  | { kind: 'all' }
  | { kind: 'group'; id: GroupId }
  | { kind: 'money' }
  | { kind: 'feuds' }
  | { kind: 'world'; id: string; depth: 1 | 2 };

export type Layout = 'wide' | 'card' | 'sheet';

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
  const { people, errors, loaded, fetchError, lastUpdated, live } = usePeople();
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<EdgeFamily>>(new Set());
  const [showSuggested, setShowSuggested] = useState(false);
  const [colorAll, setColorAll] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [view, setView] = useState<View>({ kind: 'all' });
  const [year, setYear] = useState<number | null>(null);
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
    const g = buildGraph(people);
    for (const n of g.nodes) {
      const prev = positions.current.get(n.id);
      if (prev) Object.assign(n, { x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy });
    }
    positions.current = new Map(g.nodes.map((n) => [n.id, n]));
    return g;
  }, [people]);

  const span = useMemo(() => yearSpan(graph.links), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  // Links that pass the family, year and view filters (before choosing which people show).
  const filteredLinks = useMemo(
    () =>
      graph.links.filter((l) => {
        const fam = familyOf(l);
        if (hidden.has(fam)) return false;
        if (year != null && !activeInYear(l, year)) return false;
        return true;
      }),
    [graph, hidden, year],
  );

  const selectedNodeId = selection?.kind === 'node' ? selection.id : null;

  const visible = useMemo(() => {
    const ids = new Set<string>();
    const touched = new Set<string>();
    for (const l of filteredLinks) {
      touched.add(l.sourceId);
      touched.add(l.targetId);
    }
    if (view.kind === 'world') {
      for (const id of neighborhood(view.id, filteredLinks, view.depth)) ids.add(id);
    } else {
      // Groups and lenses keep everyone on the map; the view's core people go in the middle.
      for (const n of graph.nodes) if (n.researched || (showSuggested && touched.has(n.id))) ids.add(n.id);
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
        view.kind === 'money' ? ['money'] : view.kind === 'feuds' ? ['rivalry', 'past-rivalry'] : null;
      if (view.kind === 'world') {
        core.add(view.id);
      } else if (view.kind === 'group') {
        for (const n of nodes) if (n.groups.includes(view.id)) core.add(n.id);
      } else {
        for (const l of links) {
          if (!lens?.includes(familyOf(l))) continue;
          core.add(l.sourceId);
          core.add(l.targetId);
        }
      }
      if (core.size) radial = { core, ...ringDistances(core, links, ids), emphasis: lens };
    }
    return { nodes, links, pairs: mergePairs(links), radial };
  }, [graph, byId, filteredLinks, view, showSuggested, selectedNodeId]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(EDGE_FAMILIES.map((f) => [f.id, 0])) as Record<EdgeFamily, number>;
    for (const l of graph.links) c[familyOf(l)]++;
    return c;
  }, [graph]);

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

  const fitKey = `${view.kind}:${'id' in view ? view.id : ''}:${'depth' in view ? view.depth : ''}:${year ?? ''}:${loaded}`;
  const empty = loaded && people.length === 0;

  const stats = {
    researched: graph.nodes.filter((n) => n.researched).length,
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
        filtersActive={hidden.size + (year != null ? 1 : 0) + (showSuggested ? 1 : 0) + (colorAll ? 1 : 0)}
        live={live}
        lastUpdated={lastUpdated}
      />

      {(fetchError || errors.length > 0 || graph.skipped.length > 0) && (
        <div className="banner" role="status">
          {fetchError && <div>Could not load data: {fetchError}</div>}
          {errors.map((e) => (
            <div key={e.file}>
              data/people/{e.file}: {e.message}
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
              fitKey={fitKey}
              fgRef={fgRef}
              onSelect={setSelection}
            />
          )}

          {loaded && !empty && (
            <ViewChips
              view={view}
              year={year}
              nameOf={(id) => byId.get(id)?.name ?? id}
              onView={(v) => {
                if (v.kind !== 'world') setSelection(null);
                setView(v);
              }}
              onYear={setYear}
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
              year={year}
              span={span}
              onYear={setYear}
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
          onClose={() => setSelection(null)}
        />
      </main>
    </div>
  );
}


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GraphView, { BACKGROUND, type GraphHandle } from './components/GraphView';
import Menus from './components/Menus';
import SidePanel from './components/SidePanel';
import Toolbar from './components/Toolbar';
import SpotlightBar from './components/SpotlightBar';
import TabBar from './components/TabBar';
import ViewChips from './components/ViewChips';
import { canExport, exportGraphPng } from './lib/exportPng';
import { buildGraph, yearSpan, workplaceIndex, type GraphNode, type YearRange } from './lib/graph';
import { EDGE_FAMILIES, type EdgeFamily } from './lib/schema';
import { useLayout, useMenus, useToggleSet } from './lib/useAppChrome';
import { usePeople } from './lib/usePeople';
import {
  DEFAULT_FORCES,
  activeFilterCount,
  campSizes,
  comparisonFor,
  familyCounts,
  filterLinks,
  fitKey,
  groupCounts,
  spotlightFor,
  viewKey,
  visibleGraph,
  type Forces,
  type Selection,
  type TimeMode,
  type View,
} from './lib/view';

export default function App() {
  const { people, orgs, errors, loaded, fetchError, lastUpdated, live, updates = [] } = usePeople();
  const layout = useLayout();
  const { menu, openMenu, unseen, unseenAtOpen } = useMenus(updates);
  const closeMenu = () => openMenu(null);

  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>({ kind: 'all' });

  // Filters menu.
  const [hidden, toggleFamily, setHidden] = useToggleSet<EdgeFamily>();
  const [showSuggested, setShowSuggested] = useState(false);
  const [colorAll, setColorAll] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showOrgs, setShowOrgs] = useState(true);
  // Main view: arrange left–right by political lean (off = clusters spread out freely).
  const [leanMode, setLeanMode] = useState(false);
  const [forces, setForces] = useState<Forces>(DEFAULT_FORCES);
  // Date range filter: only links active at some point in it. null = all years.
  const [years, setYears] = useState<YearRange | null>(null);
  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const filters = { hidden, years, timeMode, showOrgs, showSuggested, leanMode, colorAll };

  // Spotlight views: outsiders the reader chose to bring onto the map; cleared when the view changes.
  const [extras, toggleExtra, setExtras] = useToggleSet<string>();
  const vKey = viewKey(view);
  useEffect(() => setExtras(new Set()), [vKey, setExtras]);

  const fgRef = useRef<GraphHandle>(undefined);
  const graphWrapRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, GraphNode>());
  const [exportable, setExportable] = useState(false);
  useEffect(() => void canExport().then(setExportable), []);

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
  const workplaces = useMemo(() => workplaceIndex(graph.nodes), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const nameOf = useCallback((id: string) => byId.get(id)?.name ?? id, [byId]);
  const counts = useMemo(() => familyCounts(graph.links), [graph]);
  const camps = useMemo(() => campSizes(graph.nodes, byId), [graph, byId]);
  const groups = useMemo(() => groupCounts(graph.nodes), [graph]);

  const filteredLinks = useMemo(
    () => filterLinks(graph.links, byId, { hidden, years, timeMode, showOrgs }),
    [graph, byId, hidden, years, timeMode, showOrgs],
  );
  const selectedNodeId = selection?.kind === 'node' ? selection.id : null;
  const comparison = useMemo(() => comparisonFor(view, filteredLinks, byId), [view, filteredLinks, byId]);
  const spotlight = useMemo(
    () => spotlightFor(view, graph.nodes, byId, filteredLinks, { showOrgs, showSuggested }),
    [view, graph, byId, filteredLinks, showOrgs, showSuggested],
  );
  // Kept stable between renders: the map restarts its layout when this changes.
  const spotlightLens = useMemo(() => (spotlight ? { lens: spotlight.lens } : null), [spotlight]);
  const visible = useMemo(
    () =>
      visibleGraph({
        graph,
        byId,
        links: filteredLinks,
        view,
        comparison,
        spotlight,
        extras,
        selectedNodeId,
        workplaces,
        filters: { showOrgs, showSuggested, leanMode, years },
      }),
    [graph, byId, filteredLinks, view, comparison, spotlight, extras, selectedNodeId, workplaces, showOrgs, showSuggested, leanMode, years],
  );

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

  const empty = loaded && people.length === 0;
  const filtersActive = activeFilterCount(filters);
  const stats = {
    researched: graph.nodes.filter((n) => n.researched && !n.isOrg).length,
    orgs: graph.nodes.filter((n) => n.isOrg).length,
    suggested: graph.nodes.filter((n) => !n.researched).length,
    links: graph.links.length,
  };

  return (
    <div className={`app app-${layout}`}>
      <Toolbar
        nodes={graph.nodes}
        query={query}
        onQuery={setQuery}
        onPick={(id) => {
          focusNode(id);
          setQuery('');
        }}
        view={view}
        nameOf={nameOf}
        menu={menu}
        onMenu={openMenu}
        unseen={unseen}
        filtersActive={filtersActive}
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
              spotlight={spotlightLens}
              forces={forces}
              fitKey={fitKey(view, filters, loaded)}
              fgRef={fgRef}
              onSelect={setSelection}
            />
          )}

          {loaded && !empty && (
            <ViewChips
              view={view}
              years={years}
              timeMode={timeMode}
              onTimeMode={setTimeMode}
              nameOf={nameOf}
              onView={(v) => {
                if (v.kind !== 'world') setSelection(null);
                setView(v);
              }}
              onYears={setYears}
            />
          )}

          {loaded && !empty && spotlight && (
            <SpotlightBar members={spotlight.core.size} outsiders={spotlight.outsiders} added={extras} onToggle={toggleExtra} />
          )}

          {menu && (
            <Menus
              menu={menu}
              onClose={closeMenu}
              view={view}
              onView={(v) => {
                setView(v);
                setSelection(null);
                closeMenu();
              }}
              groupCounts={groups}
              camps={camps}
              selectedNode={selectedNodeId ? (byId.get(selectedNodeId) ?? null) : null}
              onWorld={openWorld}
              counts={counts}
              hidden={hidden}
              onToggleFamily={toggleFamily}
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
                closeMenu();
              }}
              updates={updates}
              unseen={unseenAtOpen}
              nameOf={nameOf}
              hasNode={(id) => byId.has(id)}
              onPickPerson={(id) => {
                closeMenu();
                focusNode(id);
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
          workplaces={workplaces}
          onClose={() => (selection ? setSelection(null) : setView({ kind: 'all' }))}
        />
      </main>

      {layout === 'sheet' && (
        <TabBar
          menu={menu}
          onMenu={openMenu}
          onMap={() => {
            closeMenu();
            setSelection(null);
          }}
          viewActive={view.kind !== 'all'}
          filtersActive={filtersActive}
          unseen={unseen}
        />
      )}
    </div>
  );
}

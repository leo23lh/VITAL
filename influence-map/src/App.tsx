import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GraphView, { BACKGROUND, type GraphHandle } from './components/GraphView';
import Legend from './components/Legend';
import SidePanel from './components/SidePanel';
import Toolbar from './components/Toolbar';
import { canExport, exportGraphPng } from './lib/exportPng';
import { buildGraph, linkEndId, type GraphNode } from './lib/graph';
import { EDGE_GROUPS, type EdgeGroup } from './lib/schema';
import { usePeople } from './lib/usePeople';

export type Selection = { kind: 'node'; id: string } | { kind: 'link'; id: string } | null;

export default function App() {
  const { people, errors, loaded, fetchError, lastUpdated, live } = usePeople();
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<EdgeGroup>>(new Set());
  const [showSuggested, setShowSuggested] = useState(true);
  const fgRef = useRef<GraphHandle>(undefined);
  const graphWrapRef = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, GraphNode>());
  const [exportable, setExportable] = useState(false);

  useEffect(() => {
    void canExport().then(setExportable);
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

  const visible = useMemo(() => {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const links = graph.links.filter((l) => {
      if (hidden.has(l.group)) return false;
      if (!showSuggested && l.touchesSuggested) return false;
      return true;
    });
    const linked = new Set<string>();
    for (const l of links) {
      linked.add(linkEndId(l.source));
      linked.add(linkEndId(l.target));
    }
    const nodes = graph.nodes.filter((n) => n.researched || (showSuggested && linked.has(n.id)));
    const nodeIds = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: links.filter((l) => nodeIds.has(linkEndId(l.source)) && nodeIds.has(linkEndId(l.target))),
      byId,
    };
  }, [graph, hidden, showSuggested]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(EDGE_GROUPS.map((g) => [g.id, 0])) as Record<EdgeGroup, number>;
    for (const l of graph.links) if (showSuggested || !l.touchesSuggested) c[l.group]++;
    return c;
  }, [graph, showSuggested]);

  const focusNode = useCallback(
    (id: string) => {
      setSelection({ kind: 'node', id });
      const n = visible.byId.get(id);
      const fg = fgRef.current;
      if (fg && n && n.x != null && n.y != null) {
        const k = Math.max(fg.zoom(), 2);
        // On narrow screens the panel covers the lower 60% of the graph, so aim for the space above it.
        const narrow = window.matchMedia('(max-width: 820px)').matches;
        const height = graphWrapRef.current?.clientHeight ?? 0;
        const shift = narrow ? (height * 0.3) / k : 0;
        fg.centerAt(n.x, n.y + shift, 600);
        fg.zoom(k, 600);
      }
    },
    [visible.byId],
  );

  const stats = {
    researched: graph.nodes.filter((n) => n.researched).length,
    suggested: graph.nodes.filter((n) => !n.researched).length,
    links: graph.links.length,
  };

  const empty = loaded && people.length === 0;

  return (
    <div className="app">
      <Toolbar
        nodes={visible.nodes}
        query={query}
        onQuery={setQuery}
        onPick={(id) => {
          focusNode(id);
          setQuery('');
        }}
        showSuggested={showSuggested}
        onToggleSuggested={setShowSuggested}
        onFit={() => fgRef.current?.zoomToFit(500, 60)}
        onExport={
          exportable
            ? () => graphWrapRef.current && void exportGraphPng(graphWrapRef.current, { background: BACKGROUND, hidden, counts })
            : undefined
        }
        stats={stats}
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

      <main className="main">
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
              links={visible.links}
              selection={selection}
              query={query}
              fgRef={fgRef}
              onSelect={setSelection}
            />
          )}
          {loaded && !empty && (
            <Legend
              counts={counts}
              hidden={hidden}
              onToggle={(g) =>
                setHidden((h) => {
                  const next = new Set(h);
                  if (next.has(g)) next.delete(g);
                  else next.add(g);
                  return next;
                })
              }
              onAll={(v) => setHidden(v ? new Set() : new Set(EDGE_GROUPS.map((g) => g.id)))}
            />
          )}
        </div>
        <SidePanel
          selection={selection}
          nodes={graph.nodes}
          links={graph.links}
          onSelect={(s) => (s?.kind === 'node' ? focusNode(s.id) : setSelection(s))}
          onClose={() => setSelection(null)}
        />
      </main>
    </div>
  );
}

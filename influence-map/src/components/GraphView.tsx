import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { describeLink, familyOf, linkEndId, matchesQuery, type GraphNode, type PairLink } from '../lib/graph';
import { EDGE_FAMILY_BY_ID, SECTOR_BY_ID } from '../lib/schema';
import type { Selection } from '../App';

export const BACKGROUND = '#0f1117';
const GREY = '#94a3b8';

export type GraphHandle = ForceGraphMethods<GraphNode, PairLink> | undefined;

interface Props {
  nodes: GraphNode[];
  pairs: PairLink[];
  selection: Selection;
  query: string;
  /** Color every line by family, not only the selected person's. */
  colorAll: boolean;
  /** Changes when the view changes; the map re-fits once it settles. */
  fitKey: string;
  fgRef: RefObject<GraphHandle>;
  onSelect: (s: Selection) => void;
}

export function nodeRadius(n: GraphNode): number {
  return n.researched ? 5 + 2.6 * Math.sqrt(n.degree) : 2.5 + 1.4 * Math.sqrt(n.degree);
}

export default function GraphView({ nodes, pairs, selection, query, colorAll, fitKey, fgRef, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPairId, setHoverPairId] = useState<string | null>(null);
  const needsFit = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.max(200, Math.floor(width)), height: Math.max(200, Math.floor(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    needsFit.current = true;
  }, [fitKey]);

  // Spread nodes out a little more than the defaults.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength?.(-280);
    fg.d3Force('link')?.distance?.((l: PairLink) => (l.touchesSuggested ? 55 : 100));
    fg.d3Force('tidy', tidyForce());
    fg.d3ReheatSimulation();
  }, [fgRef, nodes, pairs]);

  const graphData = useMemo(() => ({ nodes, links: pairs }), [nodes, pairs]);

  const nameOf = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.name]));
    return (id: string) => m.get(id) ?? id;
  }, [nodes]);

  // Names that always show: the best-connected researched people on screen.
  const labeled = useMemo(() => {
    const ranked = nodes.filter((n) => n.researched).sort((a, b) => b.degree - a.degree);
    // How many keep their name when zoomed out: roughly one per 55px of width.
    const count = Math.max(8, Math.round(size.width / 55));
    return new Set(ranked.slice(0, count).map((n) => n.id));
  }, [nodes, size.width]);

  // Highlight the hovered (or selected) node and its neighbours; dim the rest.
  const focusId = hoverId ?? (selection?.kind === 'node' ? selection.id : null);
  const focus = useMemo(() => {
    if (!focusId) return null;
    const ids = new Set<string>([focusId]);
    const pairIds = new Set<string>();
    for (const p of pairs) {
      const s = linkEndId(p.source);
      const t = linkEndId(p.target);
      if (s === focusId || t === focusId) {
        ids.add(s);
        ids.add(t);
        pairIds.add(p.id);
      }
    }
    return { ids, pairIds };
  }, [focusId, pairs]);

  const selectedPairId = selection?.kind === 'link' ? selection.id : null;
  const selectedNodeId = selection?.kind === 'node' ? selection.id : null;

  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = nodeRadius(node);
      const matched = query ? matchesQuery(node, query) : false;
      const inFocus = focus?.ids.has(node.id) ?? false;
      let alpha = 1;
      if (query && !matched) alpha = 0.15;
      else if (focus && !inFocus) alpha = 0.18;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      if (node.researched) {
        ctx.fillStyle = node.publicFigure
          ? node.sector
            ? SECTOR_BY_ID[node.sector]?.color ?? '#e6e9ef'
            : '#e6e9ef'
          : '#d6b76a';
        ctx.fill();
        // A thin dark ring keeps neighbouring dots apart.
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = BACKGROUND;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.fill();
        ctx.setLineDash([2 / scale, 2 / scale]);
        ctx.lineWidth = 1 / scale;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (node.id === selectedNodeId || matched) {
        ctx.beginPath();
        ctx.arc(x, y, r + 3 / scale, 0, 2 * Math.PI);
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = matched && node.id !== selectedNodeId ? '#f5c542' : '#4ea1ff';
        ctx.stroke();
      }

      const showLabel =
        node.id === hoverId ||
        node.id === selectedNodeId ||
        matched ||
        (focus ? inFocus : node.researched ? labeled.has(node.id) || scale > 1.5 : scale > 2.4);
      if (showLabel) {
        const fontSize = (node.researched ? 12 : 10.5) / scale;
        ctx.font = `${node.researched ? 600 : 400} ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ty = y + r + 3 / scale;
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = BACKGROUND;
        ctx.strokeText(node.name, x, ty);
        ctx.fillStyle = node.researched ? '#e6e9ef' : 'rgba(170, 180, 198, 0.9)';
        ctx.fillText(node.name, x, ty);
      }
      ctx.restore();
    },
    [focus, hoverId, labeled, query, selectedNodeId],
  );

  // Lines are quiet grey until they matter: the selected person's lines, a hovered or
  // selected line, or "color all lines" switch them to their family color.
  const linkColor = useCallback(
    (p: PairLink) => {
      const fam = EDGE_FAMILY_BY_ID[p.family].color;
      if (p.id === selectedPairId || p.id === hoverPairId) return withAlpha(fam, 1);
      if (focus) return focus.pairIds.has(p.id) ? withAlpha(fam, 0.95) : withAlpha(GREY, 0.05);
      if (query) return withAlpha(GREY, 0.12);
      if (colorAll) return withAlpha(fam, p.touchesSuggested ? 0.4 : 0.8);
      return withAlpha(GREY, p.touchesSuggested ? 0.14 : 0.3);
    },
    [colorAll, focus, hoverPairId, query, selectedPairId],
  );

  const colored = useCallback(
    (p: PairLink) =>
      p.id === selectedPairId || p.id === hoverPairId || (focus ? focus.pairIds.has(p.id) : colorAll && !query),
    [colorAll, focus, hoverPairId, query, selectedPairId],
  );

  const linkWidth = useCallback(
    (p: PairLink) => {
      const base = 0.5 + 1.6 * p.confidence;
      if (p.id === selectedPairId || p.id === hoverPairId) return base + 2;
      return focus?.pairIds.has(p.id) ? base + 0.6 : base;
    },
    [focus, hoverPairId, selectedPairId],
  );

  return (
    <div ref={containerRef} className="graph-canvas">
      <ForceGraph2D<GraphNode, PairLink>
        ref={fgRef as React.MutableRefObject<GraphHandle>}
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor={BACKGROUND}
        nodeId="id"
        nodeRelSize={1}
        nodeVal={(n) => nodeRadius(n) ** 2}
        nodeLabel={(n) => nodeTooltip(n)}
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={(p) => (p.confidence < 0.5 ? [4, 3] : null)}
        linkDirectionalArrowLength={(p) => (p.directed && colored(p) ? 6 : 0)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        linkLabel={(p) => pairTooltip(p, nameOf)}
        linkHoverPrecision={6}
        onNodeHover={(n) => setHoverId(n ? n.id : null)}
        onLinkHover={(p) => setHoverPairId(p ? p.id : null)}
        onNodeClick={(n) => onSelect({ kind: 'node', id: n.id })}
        onLinkClick={(p) => onSelect({ kind: 'link', id: p.id })}
        onBackgroundClick={() => onSelect(null)}
        onEngineStop={() => {
          if (!needsFit.current) return;
          needsFit.current = false;
          fgRef.current?.zoomToFit(400, 40);
        }}
        cooldownTicks={160}
        minZoom={0.2}
        maxZoom={8}
      />
    </div>
  );
}

/**
 * Keeps the map compact and readable: a gentle pull toward the middle (so people
 * with no visible links don't drift off-screen in filtered views) and a simple
 * collision that leaves room for each name under its dot.
 */
function tidyForce() {
  let nodes: GraphNode[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * 0.02 * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * 0.02 * alpha;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const min = nodeRadius(a) + nodeRadius(b) + (a.researched && b.researched ? 26 : 10);
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * alpha;
        a.vx = (a.vx ?? 0) - dx * push;
        a.vy = (a.vy ?? 0) - dy * push;
        b.vx = (b.vx ?? 0) + dx * push;
        b.vy = (b.vy ?? 0) + dy * push;
      }
    }
  };
  force.initialize = (ns: GraphNode[]) => {
    nodes = ns;
  };
  return force;
}

function nodeTooltip(n: GraphNode): string {
  const role = n.person?.current_role;
  const tag = n.researched ? '' : '<div class="tt-muted">Suggested — no file yet</div>';
  return `<div class="tt"><strong>${esc(n.name)}</strong>${role ? `<div>${esc(role)}</div>` : ''}${tag}<div class="tt-muted">${n.degree} connection${n.degree === 1 ? '' : 's'}</div></div>`;
}

function pairTooltip(p: PairLink, nameOf: (id: string) => string): string {
  const rows = p.links
    .map((l) => {
      const f = EDGE_FAMILY_BY_ID[familyOf(l)];
      return `<div><span class="tt-swatch" style="background:${f.color}"></span>${esc(describeLink(l, nameOf))}</div>`;
    })
    .join('');
  return `<div class="tt">${rows}<div class="tt-muted">Confidence up to ${Math.round(p.confidence * 100)}% · tap for sources</div></div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

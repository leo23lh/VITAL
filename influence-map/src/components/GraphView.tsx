import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { describeLink, linkEndId, matchesQuery, type GraphLink, type GraphNode } from '../lib/graph';
import { EDGE_GROUP_BY_ID } from '../lib/schema';
import type { Selection } from '../App';

export const BACKGROUND = '#0f1117';

export type GraphHandle = ForceGraphMethods<GraphNode, GraphLink> | undefined;

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  selection: Selection;
  query: string;
  fgRef: RefObject<GraphHandle>;
  onSelect: (s: Selection) => void;
}

export function nodeRadius(n: GraphNode): number {
  return n.researched ? 5 + 2.6 * Math.sqrt(n.degree) : 2.5 + 1.4 * Math.sqrt(n.degree);
}

export default function GraphView({ nodes, links, selection, query, fgRef, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null);

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

  // Spread nodes out a little more than the defaults.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength?.(-260);
    fg.d3Force('link')?.distance?.((l: GraphLink) => (l.touchesSuggested ? 55 : 95));
    fg.d3ReheatSimulation();
  }, [fgRef, nodes, links]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const nameOf = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.name]));
    return (id: string) => m.get(id) ?? id;
  }, [nodes]);

  // Highlight the hovered (or selected) node and its neighbours; dim the rest.
  const focusId = hoverId ?? (selection?.kind === 'node' ? selection.id : null);
  const focus = useMemo(() => {
    if (!focusId) return null;
    const ids = new Set<string>([focusId]);
    const linkIds = new Set<string>();
    for (const l of links) {
      const s = linkEndId(l.source);
      const t = linkEndId(l.target);
      if (s === focusId || t === focusId) {
        ids.add(s);
        ids.add(t);
        linkIds.add(l.id);
      }
    }
    return { ids, linkIds };
  }, [focusId, links]);

  const selectedLinkId = selection?.kind === 'link' ? selection.id : null;
  const selectedNodeId = selection?.kind === 'node' ? selection.id : null;

  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = nodeRadius(node);
      const matched = query ? matchesQuery(node, query) : false;
      let alpha = 1;
      if (query && !matched) alpha = 0.15;
      else if (focus && !focus.ids.has(node.id)) alpha = 0.2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      if (node.researched) {
        ctx.fillStyle = node.publicFigure ? '#e6e9ef' : '#d6b76a';
        ctx.fill();
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
        node.researched || scale > 1.6 || node.id === hoverId || node.id === selectedNodeId || matched;
      if (showLabel) {
        const fontSize = (node.researched ? 12 : 10) / scale;
        ctx.font = `${node.researched ? 600 : 400} ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ty = y + r + 3 / scale;
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = BACKGROUND;
        ctx.strokeText(node.name, x, ty);
        ctx.fillStyle = node.researched ? '#e6e9ef' : 'rgba(170, 180, 198, 0.85)';
        ctx.fillText(node.name, x, ty);
      }
      ctx.restore();
    },
    [focus, hoverId, query, selectedNodeId],
  );

  const linkAlpha = useCallback(
    (l: GraphLink) => {
      if (l.id === selectedLinkId || l.id === hoverLinkId) return 1;
      if (focus) return focus.linkIds.has(l.id) ? 0.95 : 0.06;
      if (query) return 0.25;
      return l.touchesSuggested ? 0.4 : 0.85;
    },
    [focus, hoverLinkId, query, selectedLinkId],
  );

  const linkColor = useCallback(
    (l: GraphLink) => withAlpha(EDGE_GROUP_BY_ID[l.group].color, linkAlpha(l)),
    [linkAlpha],
  );

  const linkWidth = useCallback(
    (l: GraphLink) => {
      const base = 0.6 + 2.4 * l.confidence;
      return l.id === selectedLinkId || l.id === hoverLinkId ? base + 2 : base;
    },
    [hoverLinkId, selectedLinkId],
  );

  return (
    <div ref={containerRef} className="graph-canvas">
      <ForceGraph2D<GraphNode, GraphLink>
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
        linkCurvature={(l) => l.curvature}
        linkLineDash={(l) => (l.confidence < 0.5 ? [4, 3] : null)}
        linkDirectionalArrowLength={(l) => (l.directed ? 6 : 0)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        linkLabel={(l) => linkTooltip(l, nameOf)}
        linkHoverPrecision={6}
        onNodeHover={(n) => setHoverId(n ? n.id : null)}
        onLinkHover={(l) => setHoverLinkId(l ? l.id : null)}
        onNodeClick={(n) => onSelect({ kind: 'node', id: n.id })}
        onLinkClick={(l) => onSelect({ kind: 'link', id: l.id })}
        onBackgroundClick={() => onSelect(null)}
        cooldownTicks={200}
        minZoom={0.2}
        maxZoom={8}
      />
    </div>
  );
}

function nodeTooltip(n: GraphNode): string {
  const role = n.person?.current_role;
  const tag = n.researched ? '' : '<div class="tt-muted">Suggested — no file yet</div>';
  return `<div class="tt"><strong>${esc(n.name)}</strong>${role ? `<div>${esc(role)}</div>` : ''}${tag}<div class="tt-muted">${n.degree} connection${n.degree === 1 ? '' : 's'}</div></div>`;
}

function linkTooltip(l: GraphLink, nameOf: (id: string) => string): string {
  const g = EDGE_GROUP_BY_ID[l.group];
  return `<div class="tt"><span class="tt-swatch" style="background:${g.color}"></span>${esc(
    describeLink(l, nameOf),
  )}<div class="tt-muted">Confidence ${Math.round(l.confidence * 100)}% · click for sources</div></div>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

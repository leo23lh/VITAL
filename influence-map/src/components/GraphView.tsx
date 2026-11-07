import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { describeLink, familyOf, linkEndId, matchesQuery, type GraphNode, type PairLink } from '../lib/graph';
import { EDGE_FAMILY_BY_ID, SECTOR_BY_ID } from '../lib/schema';
import type { Compass, RadialLayout, Selection } from '../App';

export const BACKGROUND = '#0f1117';
const GREY = '#94a3b8';
/** Radial views: distance between rings, and how much room the core gets per person. */
const RING_GAP = 130;
const coreRadius = (n: number) => 30 + 22 * Math.sqrt(n);
/** Main view: distance per lean step (left–right). */
const LEAN_STEP = 170;
/** How hard people are pulled to their compass spot. Low enough that links still shape the web. */
const COMPASS_PULL_X = 0.35;
/** Pull toward a lean estimated from linked people (no researched lean). */
const INFERRED_PULL_X = 0.06;

export type GraphHandle = ForceGraphMethods<GraphNode, PairLink> | undefined;

interface Props {
  nodes: GraphNode[];
  pairs: PairLink[];
  selection: Selection;
  query: string;
  /** Color every line by family, not only the selected person's. */
  colorAll: boolean;
  /** Draw people's portraits inside their dots. */
  showPhotos: boolean;
  /** Set in group and lens views: core people in the middle, everyone else on rings. */
  radial: RadialLayout | null;
  /** Set in the main view: left–right by lean, north–south by money vs politics. */
  compass: Compass | null;
  /** Changes when the view changes; the map re-fits once it settles. */
  fitKey: string;
  fgRef: RefObject<GraphHandle>;
  onSelect: (s: Selection) => void;
}

export function nodeRadius(n: GraphNode): number {
  return n.researched ? 5 + 2.6 * Math.sqrt(n.degree) : 2.5 + 1.4 * Math.sqrt(n.degree);
}

export default function GraphView({
  nodes,
  pairs,
  selection,
  query,
  colorAll,
  showPhotos,
  radial,
  compass,
  fitKey,
  fgRef,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPairId, setHoverPairId] = useState<string | null>(null);
  const needsFit = useRef(true);
  // The default centering force, kept so it can come back when leaving the compass view.
  const centerForce = useRef<unknown>(undefined);
  // Bumped when a portrait finishes loading, so the canvas repaints with it.
  const [photoTick, setPhotoTick] = useState(0);
  const photo = useCallback(
    (url: string) => loadPhoto(url, () => setPhotoTick((t) => t + 1)),
    [],
  );

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
    fg.d3Force('charge')?.strength?.(radial ? -180 : -280);
    const link = fg.d3Force('link');
    // Closer relationships (family, co-founders, bosses) sit nearer and pull harder; rivals barely pull.
    link?.distance?.((l: PairLink) => (l.touchesSuggested ? 45 : 60) + (1 - l.closeness) * (l.touchesSuggested ? 30 : 90));
    // In radial views, lines out of the core barely pull, so the rings decide where people sit.
    const deg = new Map<string, number>();
    for (const p of pairs)
      for (const e of [p.source, p.target]) deg.set(linkEndId(e), (deg.get(linkEndId(e)) ?? 0) + 1);
    const strength = (l: PairLink) => {
      const s = linkEndId(l.source);
      const t = linkEndId(l.target);
      const base = (0.3 + 1.1 * l.closeness) / Math.min(deg.get(s) ?? 1, deg.get(t) ?? 1);
      if (!radial) return Math.min(1, base);
      return radial.core.has(s) && radial.core.has(t) ? Math.min(1, base) : base * 0.15;
    };
    // Main view: the built-in link force is replaced by leanLinkForce, which lets lines move
    // people left–right only when their lean isn't researched. (The built-in force stays
    // registered at zero strength because the graph uses it to wire up line ends.)
    link?.strength?.(compass ? 0 : strength);
    fg.d3Force('leanLinks', compass ? leanLinkForce(pairs, compass, strength, link?.distance?.()) : null);
    fg.d3Force('tidy', tidyForce(!radial && !compass, radial ? 40 : 26));
    fg.d3Force('radial', radial ? radialForce(radial) : null);
    fg.d3Force('compass', compass ? compassForce(compass) : null);
    // The compass has fixed spots, so the usual re-centering would drag everyone toward the middle.
    if (centerForce.current === undefined) centerForce.current = fg.d3Force('center') ?? null;
    fg.d3Force('center', compass ? null : (centerForce.current as never));
    fg.d3ReheatSimulation();
  }, [fgRef, nodes, pairs, radial, compass]);

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
      const inCore = radial ? radial.core.has(node.id) : true;
      let alpha = 1;
      if (query && !matched) alpha = 0.15;
      else if (focus && !inFocus) alpha = 0.18;
      else if (!focus && !inCore) alpha = 0.5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      const tint = node.publicFigure
        ? node.sector
          ? SECTOR_BY_ID[node.sector]?.color ?? '#e6e9ef'
          : '#e6e9ef'
        : '#d6b76a';
      const img = showPhotos && node.photoUrl ? photo(node.photoUrl) : null;
      if (node.researched && img) {
        // Portrait cropped to the circle (faces sit high in most portraits), ringed in the sector color.
        ctx.fillStyle = tint;
        ctx.fill();
        ctx.save();
        ctx.clip();
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = Math.max(0, (img.naturalHeight - side) * 0.2);
        ctx.drawImage(img, sx, sy, side, side, x - r, y - r, 2 * r, 2 * r);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.lineWidth = Math.max(1.5 / scale, r * 0.16);
        ctx.strokeStyle = tint;
        ctx.stroke();
      } else if (node.researched) {
        ctx.fillStyle = tint;
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
        (focus
          ? inFocus
          : radial
            ? inCore || (labeled.has(node.id) && radial.rings.get(node.id) === 1) || (node.researched && scale > 1.5)
            : node.researched
              ? labeled.has(node.id) || scale > 1.5
              : scale > 2.4);
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
    [focus, hoverId, labeled, query, radial, selectedNodeId, showPhotos, photo, photoTick],
  );

  // Lines are quiet grey until they matter: the selected person's lines, a hovered or
  // selected line, or "color all lines" switch them to their family color.
  const linkColor = useCallback(
    (p: PairLink) => {
      const fam = EDGE_FAMILY_BY_ID[p.family].color;
      if (p.id === selectedPairId || p.id === hoverPairId) return withAlpha(fam, 1);
      if (focus) return focus.pairIds.has(p.id) ? withAlpha(fam, 0.95) : withAlpha(GREY, 0.05);
      if (query) return withAlpha(GREY, 0.12);
      if (radial) {
        const s = radial.core.has(linkEndId(p.source));
        const t = radial.core.has(linkEndId(p.target));
        if (radial.emphasis) {
          const hit = p.links.map(familyOf).find((f) => radial.emphasis!.includes(f));
          if (hit) return withAlpha(EDGE_FAMILY_BY_ID[hit].color, 0.9);
        } else if (s && t) return withAlpha(fam, 0.85);
        if (colorAll) return withAlpha(fam, s || t ? 0.45 : 0.25);
        return withAlpha(GREY, s && t ? 0.3 : s || t ? 0.16 : 0.07);
      }
      if (colorAll) return withAlpha(fam, p.touchesSuggested ? 0.4 : 0.8);
      return withAlpha(GREY, p.touchesSuggested ? 0.14 : 0.3);
    },
    [colorAll, focus, hoverPairId, query, radial, selectedPairId],
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
        linkLineDash={(p) => {
          const fam = lineFamily(p, radial);
          if (fam === 'past-rivalry' || fam === 'past-enmity') return [1.5, 3];
          return p.confidence < 0.5 ? [4, 3] : null;
        }}
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
          // Radial views fit the middle and the first ring; the outer rings stay just off-screen.
          fgRef.current?.zoomToFit(400, 40, radial ? (n: GraphNode) => (radial.rings.get(n.id) ?? 9) <= 1 : undefined);
        }}
        onRenderFramePre={
          radial
            ? (ctx, scale) => drawRings(ctx, scale, radial)
            : compass
              ? (ctx, scale) => drawCompass(ctx, scale)
              : undefined
        }
        cooldownTicks={200}
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
/** `gap`: extra room between two researched people (more in radial views, for the names). */
function tidyForce(centerPull: boolean, gap = 26) {
  let nodes: GraphNode[] = [];
  const force = (alpha: number) => {
    if (centerPull) for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * 0.02 * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * 0.02 * alpha;
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const min = nodeRadius(a) + nodeRadius(b) + (a.researched && b.researched ? gap : 10);
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

const photoCache = new Map<string, HTMLImageElement | null>();

/** The loaded portrait for `url`, or null while it loads (then `onLoad` fires once) or if it failed. */
function loadPhoto(url: string, onLoad: () => void): HTMLImageElement | null {
  const hit = photoCache.get(url);
  if (hit !== undefined) return hit?.complete && hit.naturalWidth ? hit : null;
  const img = new Image();
  photoCache.set(url, img);
  img.onload = onLoad;
  img.onerror = () => photoCache.set(url, null);
  img.src = url;
  return null;
}

/** Pulls core people into the middle and everyone else onto the ring for their distance. */
function radialForce({ core, rings }: RadialLayout) {
  let nodes: GraphNode[] = [];
  const inner = coreRadius(core.size);
  const force = (alpha: number) => {
    for (const n of nodes) {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const ring = rings.get(n.id) ?? 1;
      if (ring === 0) {
        n.vx = (n.vx ?? 0) - x * 0.12 * alpha;
        n.vy = (n.vy ?? 0) - y * 0.12 * alpha;
        continue;
      }
      const d = Math.hypot(x, y) || 1;
      const k = ((inner + ring * RING_GAP - d) / d) * 0.35 * alpha;
      n.vx = (n.vx ?? 0) + x * k;
      n.vy = (n.vy ?? 0) + y * k;
    }
  };
  force.initialize = (ns: GraphNode[]) => {
    nodes = ns;
  };
  return force;
}

/**
 * Line springs for the main view. Up–down they work as usual. Left–right they only
 * move people whose lean isn't researched (unknown or estimated from links), so a
 * researched lean is never dragged off by who someone is linked to.
 */
function leanLinkForce(
  pairs: PairLink[],
  compass: Compass,
  strength: (l: PairLink) => number,
  distance: ((l: PairLink) => number) | undefined,
) {
  const known = (id: string) => {
    const c = compass.get(id);
    return c?.x != null && !c.inferred;
  };
  const force = (alpha: number) => {
    for (const p of pairs) {
      const a = p.source;
      const b = p.target;
      if (typeof a !== 'object' || typeof b !== 'object') continue;
      const dx = (b.x ?? 0) + (b.vx ?? 0) - (a.x ?? 0) - (a.vx ?? 0) || 1e-6;
      const dy = (b.y ?? 0) + (b.vy ?? 0) - (a.y ?? 0) - (a.vy ?? 0) || 1e-6;
      const len = Math.sqrt(dx * dx + dy * dy);
      const k = ((len - (distance ? distance(p) : 80)) / len) * alpha * strength(p) * 0.5;
      const fx = dx * k;
      const fy = dy * k;
      if (!known(a.id)) a.vx = (a.vx ?? 0) + fx;
      if (!known(b.id)) b.vx = (b.vx ?? 0) - fx;
      a.vy = (a.vy ?? 0) + fy;
      b.vy = (b.vy ?? 0) - fy;
    }
  };
  force.initialize = () => {};
  return force;
}

/**
 * Pulls each person toward their left–right spot from their lean.
 * Inferred leans (from linked people) pull half as hard. Anyone with no lean at all
 * is drawn toward the center line rather than drifting to an edge that would
 * suggest a side.
 */
function compassForce(compass: Compass) {
  let nodes: GraphNode[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      const c = compass.get(n.id);
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const kx = c?.inferred ? INFERRED_PULL_X : COMPASS_PULL_X;
      n.vx = (n.vx ?? 0) + (c?.x != null ? (c.x * LEAN_STEP - x) * kx : -x * 0.05) * alpha;
      // Up–down only gets the usual gentle pull to the middle; links do the rest.
      n.vy = (n.vy ?? 0) - y * 0.05 * alpha;
    }
  };
  force.initialize = (ns: GraphNode[]) => {
    nodes = ns;
  };
  return force;
}

/** Faint center line behind the main view, with Left / Right labels at the screen edges. */
function drawCompass(ctx: CanvasRenderingContext2D, scale: number) {
  // Visible area in graph coordinates (the canvas is already transformed to them).
  const inv = ctx.getTransform().inverse();
  const tl = inv.transformPoint(new DOMPoint(0, 0));
  const br = inv.transformPoint(new DOMPoint(ctx.canvas.width, ctx.canvas.height));
  const pad = 8 / scale;
  ctx.save();
  ctx.lineWidth = 1 / scale;
  ctx.setLineDash([3 / scale, 6 / scale]);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.beginPath();
  ctx.moveTo(0, tl.y);
  ctx.lineTo(0, br.y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.font = `600 ${11 / scale}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  const labelY = br.y - pad;
  ctx.fillText('← LEFT', tl.x + pad, labelY);
  ctx.textAlign = 'right';
  ctx.fillText('RIGHT →', br.x - pad, labelY);
  ctx.restore();
}

/** Faint guide circles with "1 step", "2 steps"… labels behind the radial views. */
function drawRings(ctx: CanvasRenderingContext2D, scale: number, { core, rings, unlinked }: RadialLayout) {
  const inner = coreRadius(core.size);
  const used = new Set(rings.values());
  ctx.save();
  ctx.setLineDash([3 / scale, 5 / scale]);
  ctx.lineWidth = 1 / scale;
  ctx.font = `500 ${11 / scale}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const r of [...used].filter((r) => r > 0).sort((a, b) => a - b)) {
    const R = inner + r * RING_GAP;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.fillText(r === unlinked ? 'not linked' : `${r} step${r === 1 ? '' : 's'} out`, 0, -R - 4 / scale);
  }
  ctx.restore();
}

/** The family a line is drawn as: the lens family in Follow the money / Feuds, else the pair's. */
function lineFamily(p: PairLink, radial: RadialLayout | null) {
  const lens = radial?.emphasis;
  return (lens && p.links.map(familyOf).find((f) => lens.includes(f))) || p.family;
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

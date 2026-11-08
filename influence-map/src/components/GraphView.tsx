import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { describeLink, familyOf, linkEndId, matchesQuery, type GraphNode, type PairLink } from '../lib/graph';
import { EDGE_FAMILY_BY_ID, GROUPS, ORG_KIND_LABEL, SECTOR_BY_ID, orgSideColor, type EdgeFamily } from '../lib/schema';
import type { Compass, Forces, RadialLayout, Selection } from '../App';

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
  /** Set in the main view's lean mode: left–right by political lean. */
  compass: Compass | null;
  /** Set in the main view's free layout: cluster number per person; each cluster gets its own patch. */
  clusters: Map<string, number> | null;
  /** Set in spotlight views (groups, Follow the money, Feuds): only the view's own people are on the map. */
  spotlight: { lens: EdgeFamily[] | null } | null;
  /** Layout sliders, as multipliers on the defaults. */
  forces: Forces;
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
  clusters,
  spotlight,
  forces,
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
    const free = !radial && !compass;
    const sameCluster = (l: PairLink) =>
      !clusters || clusters.get(linkEndId(l.source)) === clusters.get(linkEndId(l.target));
    // Spotlight views have fewer people, so they push apart less.
    fg.d3Force('charge')?.strength?.((radial ? -180 : compass ? -280 : spotlight ? -220 : -380) * forces.repel);
    const link = fg.d3Force('link');
    // Closer relationships (family, co-founders, bosses) sit nearer and pull harder; rivals barely pull.
    // In the free layout, lines between clusters are longer so the clusters stay apart.
    link?.distance?.(
      (l: PairLink) =>
        ((l.touchesSuggested ? 45 : 60) +
          (1 - l.closeness) * (l.touchesSuggested ? 30 : 90) +
          (free && !sameCluster(l) ? (spotlight ? 30 : 90) : 0)) *
        (spotlight ? 0.85 : 1) *
        forces.distance,
    );
    // In radial views, lines out of the core barely pull, so the rings decide where people sit.
    const deg = new Map<string, number>();
    for (const p of pairs)
      for (const e of [p.source, p.target]) deg.set(linkEndId(e), (deg.get(linkEndId(e)) ?? 0) + 1);
    const strength = (l: PairLink) => {
      const s = linkEndId(l.source);
      const t = linkEndId(l.target);
      const base = (0.3 + 1.1 * l.closeness) / Math.min(deg.get(s) ?? 1, deg.get(t) ?? 1);
      // Free layout: lines between clusters barely pull, so hubs don't drag every cluster into one knot.
      if (!radial) return Math.min(1, free && !sameCluster(l) ? base * 0.06 : base);
      return radial.core.has(s) && radial.core.has(t) ? Math.min(1, base) : base * 0.15;
    };
    // Main view: the built-in link force is replaced by leanLinkForce, which lets lines move
    // people left–right only when their lean isn't researched. (The built-in force stays
    // registered at zero strength because the graph uses it to wire up line ends.)
    link?.strength?.(compass ? 0 : strength);
    fg.d3Force('leanLinks', compass ? leanLinkForce(pairs, compass, strength, link?.distance?.()) : null);
    // Spotlight views pull harder to the middle, so small separate groups (a lone donor and recipient) don't drift off-screen.
    fg.d3Force('tidy', tidyForce(free ? (spotlight ? 0.07 : 0.012) * forces.center : 0, radial ? 40 : free ? 34 : 26));
    fg.d3Force('cluster', free && clusters ? clusterForce(clusters, forces) : null);
    fg.d3Force('radial', radial ? radialForce(radial) : null);
    fg.d3Force('compass', compass ? compassForce(compass) : null);
    // The compass has fixed spots, so the usual re-centering would drag everyone toward the middle.
    if (centerForce.current === undefined) centerForce.current = fg.d3Force('center') ?? null;
    fg.d3Force('center', compass ? null : (centerForce.current as never));
    fg.d3ReheatSimulation();
  }, [fgRef, nodes, pairs, radial, compass, clusters, spotlight, forces]);

  // Best-connected first, so they claim their name's spot before smaller dots do (see drawNode).
  const graphData = useMemo(
    () => ({ nodes: [...nodes].sort((a, b) => Number(b.researched) - Number(a.researched) || b.degree - a.degree), links: pairs }),
    [nodes, pairs],
  );
  // Name boxes drawn so far this frame; a name that would overlap one is skipped.
  const labelBoxes = useRef<{ x0: number; y0: number; x1: number; y1: number }[]>([]);
  // Names are drawn after every dot (onRenderFramePost), so no dot covers one.
  const haloNames = useRef<HaloName[]>([]);
  const labelQueue = useRef<{ text: string; x: number; y: number; font: string; color: string; alpha: number; scale: number }[]>([]);

  const nameOf = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.id, n.name]));
    return (id: string) => m.get(id) ?? id;
  }, [nodes]);
  const isOrg = useMemo(() => {
    const orgs = new Set(nodes.filter((n) => n.isOrg).map((n) => n.id));
    return (id: string) => orgs.has(id);
  }, [nodes]);

  // Names that always show: the best-connected researched people on screen.
  const labeled = useMemo(() => {
    const ranked = nodes.filter((n) => n.researched).sort((a, b) => b.degree - a.degree);
    // How many keep their name when zoomed out: roughly one per 55px of width.
    // Spotlight views have few enough people to name them all (overlapping names still give way).
    const count = spotlight ? ranked.length : Math.max(8, Math.round(size.width / 55));
    return new Set(ranked.slice(0, count).map((n) => n.id));
  }, [nodes, size.width, spotlight]);

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

  // Free layout: each cluster of three or more gets a soft halo and a name.
  // (Not in spotlight views: everyone there shares the view's group, so the names would all match.)
  const halos = useMemo(
    () => (clusters && !radial && !compass && !spotlight ? clusterHalos(nodes, clusters) : []),
    [nodes, clusters, radial, compass, spotlight],
  );

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
      if (node.isOrg) {
        // Organizations: a rounded square, dark inside, bordered in the color of the side it helps.
        const h = r * 0.9;
        roundedSquare(ctx, x, y, h);
        ctx.fillStyle = '#1d2433';
        ctx.fill();
        ctx.lineWidth = Math.max(2 / scale, r * 0.2);
        ctx.strokeStyle = orgSideColor(node.org?.side);
        ctx.stroke();
      } else {
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
      }

      if (node.id === selectedNodeId || matched) {
        if (node.isOrg) roundedSquare(ctx, x, y, r * 0.9 + 3 / scale);
        else {
          ctx.beginPath();
          ctx.arc(x, y, r + 3 / scale, 0, 2 * Math.PI);
        }
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = matched && node.id !== selectedNodeId ? '#f5c542' : '#4ea1ff';
        ctx.stroke();
      }

      const mustLabel = node.id === hoverId || node.id === selectedNodeId || matched;
      const showLabel =
        mustLabel ||
        (focus
          ? inFocus
          : radial
            ? inCore ||
              (labeled.has(node.id) && (!!spotlight || radial.rings.get(node.id) === 1)) ||
              (node.researched && scale > 1.5)
            : node.researched
              ? labeled.has(node.id) || scale > 1.5
              : scale > 2.4);
      if (showLabel) {
        const fontSize = (node.researched ? 12 : 10.5) / scale;
        // Organization names are italic, so they read as groups rather than people.
        ctx.font = `${node.isOrg ? 'italic ' : ''}${node.researched ? 600 : 400} ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const ty = y + r + 3 / scale;
        // Skip a name that would land on one already drawn (unless hovered, selected or searched).
        const half = ctx.measureText(node.name).width / 2;
        const box = { x0: x - half, y0: ty, x1: x + half, y1: ty + fontSize * 1.2 };
        const pad = 2 / scale;
        const clash = labelBoxes.current.some(
          (b) => box.x0 < b.x1 + pad && box.x1 > b.x0 - pad && box.y0 < b.y1 + pad && box.y1 > b.y0 - pad,
        );
        if (clash && !mustLabel) {
          ctx.restore();
          return;
        }
        labelBoxes.current.push(box);
        labelQueue.current.push({
          text: node.name,
          x,
          y: ty,
          font: ctx.font,
          color: node.researched ? '#e6e9ef' : 'rgba(170, 180, 198, 0.9)',
          alpha,
          scale,
        });
      }
      ctx.restore();
    },
    [focus, hoverId, labeled, query, radial, spotlight, selectedNodeId, showPhotos, photo, photoTick],
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
      // Thicker = deeper bond (kind of tie, years, record); feud-only lines follow their confidence.
      const base = p.bond ? 0.35 + 2.6 * (p.bond / 100) : 0.4 + 1.2 * p.confidence;
      if (p.id === selectedPairId || p.id === hoverPairId) return base + 2;
      if (focus?.pairIds.has(p.id)) return base + 0.6;
      // Free layout: lines between clusters are thinner, so each cluster's own lines stand out.
      const across = clusters && clusters.get(linkEndId(p.source)) !== clusters.get(linkEndId(p.target));
      return across ? base * 0.45 : base;
    },
    [clusters, focus, hoverPairId, selectedPairId],
  );

  return (
    <div ref={containerRef} className="graph-canvas">
      <ForceGraph2D<GraphNode, PairLink>
        ref={fgRef as React.MutableRefObject<GraphHandle>}
        width={size.width}
        height={size.height}
        graphData={graphData}
        // Transparent, so the page's soft background glow (styles.css .graph-canvas) shows through.
        backgroundColor="rgba(0,0,0,0)"
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
        // Money moving: pulses run from giver to receiver along the money lines of the
        // tapped or hovered person (and every money line in Follow the money).
        linkDirectionalParticles={(p) => {
          if (!p.directed || p.links[0].group !== 'funding') return 0;
          const lit = p.id === selectedPairId || p.id === hoverPairId || focus?.pairIds.has(p.id) || radial?.emphasis?.includes('money') || spotlight?.lens?.includes('money');
          return lit ? 2 : 0;
        }}
        linkDirectionalParticleSpeed={(p) => 0.004 + 0.004 * p.confidence}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleColor={() => '#5cf08a'}
        linkLabel={(p) => pairTooltip(p, nameOf, isOrg)}
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
          // Spotlight views fit everyone, with room for the names at the edges.
          fgRef.current?.zoomToFit(
            400,
            spotlight ? 55 : 40,
            radial && !spotlight ? (n: GraphNode) => (radial.rings.get(n.id) ?? 9) <= 1 : undefined,
          );
          // With only a few dots on screen, fitting zooms in too far; settle back to a readable size.
          setTimeout(() => {
            const fg = fgRef.current;
            if (fg && fg.zoom() > MAX_FIT_ZOOM) fg.zoom(MAX_FIT_ZOOM, 300);
          }, 420);
        }}
        onRenderFramePost={(ctx, scale) => {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          for (const h of haloNames.current) {
            ctx.font = h.font;
            ctx.lineWidth = 4 / scale;
            ctx.strokeStyle = BACKGROUND;
            ctx.strokeText(h.text, h.x, h.y);
            ctx.fillStyle = h.color;
            ctx.fillText(h.text, h.x, h.y);
          }
          ctx.textBaseline = 'top';
          for (const l of labelQueue.current) {
            ctx.globalAlpha = l.alpha;
            ctx.font = l.font;
            ctx.lineWidth = 3 / l.scale;
            ctx.strokeStyle = BACKGROUND;
            ctx.strokeText(l.text, l.x, l.y);
            ctx.fillStyle = l.color;
            ctx.fillText(l.text, l.x, l.y);
          }
          ctx.restore();
        }}
        onRenderFramePre={(ctx, scale) => {
          labelBoxes.current = [];
          labelQueue.current = [];
          haloNames.current = halos.length ? drawHalos(ctx, scale, halos, hoverId ?? selectedNodeId) : [];
          // Cluster names claim their spot first, so people's names steer around them.
          for (const h of haloNames.current) labelBoxes.current.push(h.box);
          if (radial) drawRings(ctx, scale, radial);
          else if (compass) drawCompass(ctx, scale);
        }}
        cooldownTicks={200}
        minZoom={0.12}
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
/**
 * `centerPull`: strength of the pull to the middle (0 = none).
 * `gap`: extra room between two researched people (more in radial views, for the names).
 */
function tidyForce(centerPull: number, gap = 26) {
  let nodes: GraphNode[] = [];
  const force = (alpha: number) => {
    if (centerPull) for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * centerPull * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * centerPull * alpha;
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

/**
 * Free layout: gives each cluster its own spot, spiralling out from the middle
 * (biggest cluster in the center, the next ones around it, sized by how many
 * people they hold), and pulls each person gently toward their cluster's spot.
 * People with no links (clusters of one) get no spot and float to the edge.
 */
function clusterForce(clusters: Map<string, number>, forces: Forces) {
  let nodes: GraphNode[] = [];
  const spots = new Map<number, { x: number; y: number }>();
  const force = (alpha: number) => {
    const k = 0.08 * forces.cluster * alpha;
    if (!k) return;
    for (const n of nodes) {
      const spot = spots.get(clusters.get(n.id) ?? -1);
      if (!spot) continue;
      n.vx = (n.vx ?? 0) + (spot.x - (n.x ?? 0)) * k;
      n.vy = (n.vy ?? 0) + (spot.y - (n.y ?? 0)) * k;
    }
  };
  force.initialize = (ns: GraphNode[]) => {
    nodes = ns;
    const size = new Map<number, number>();
    for (const n of ns) {
      const c = clusters.get(n.id);
      if (c != null) size.set(c, (size.get(c) ?? 0) + 1);
    }
    spots.clear();
    let area = 0;
    [...size.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .forEach(([c, count], i) => {
        // Sunflower spiral: radius grows with the room the clusters before it take up.
        const r = i === 0 ? 0 : 62 * Math.sqrt(area + count / 2) * forces.distance;
        const angle = i * 2.39996;
        spots.set(c, { x: r * Math.cos(angle), y: r * Math.sin(angle) });
        area += count;
      });
  };
  return force;
}

/** Halo colors, one per cluster in size order; muted so the lines stay readable on top. */
const HALO_COLORS = ['#4ea1ff', '#e0605e', '#9085e9', '#2fbf8f', '#f0a640', '#d55181', '#4fc3d9', '#c7cf4a', '#b07ce8', '#8b95a8'];

interface Halo {
  cluster: number;
  name: string;
  color: string;
  members: GraphNode[];
}

/**
 * Names each cluster of three or more: after the group most of its members share
 * ("National conservatism"), or, when no group fits or the name is taken by a
 * bigger cluster, after its best-connected member ("Around Donald Trump").
 */
function clusterHalos(nodes: GraphNode[], clusters: Map<string, number>): Halo[] {
  const byCluster = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const c = clusters.get(n.id);
    if (c == null) continue;
    if (!byCluster.has(c)) byCluster.set(c, []);
    byCluster.get(c)!.push(n);
  }
  const used = new Set<string>();
  return [...byCluster.entries()]
    .filter(([, ms]) => ms.length >= 3)
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
    .map(([cluster, members], i) => {
      const count = new Map<string, number>();
      for (const m of members) for (const g of m.groups) count.set(g, (count.get(g) ?? 0) + 1);
      const [top, hits] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
      const label = top ? GROUPS.find((g) => g.id === top)?.label : undefined;
      const hub = [...members].sort((a, b) => Number(b.researched) - Number(a.researched) || b.degree - a.degree)[0];
      let name = label && hits >= Math.max(2, members.length * 0.35) && !used.has(label) ? label : `Around ${hub.name}`;
      if (used.has(name)) name = `Around ${hub.name}`;
      used.add(name);
      return { cluster, name, color: HALO_COLORS[i % HALO_COLORS.length], members };
    });
}

/**
 * Soft glow behind each cluster, with its name above it. The hovered person's
 * cluster glows a little brighter.
 */
interface HaloName {
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  box: { x0: number; y0: number; x1: number; y1: number };
}

function drawHalos(ctx: CanvasRenderingContext2D, scale: number, halos: Halo[], hoverId: string | null): HaloName[] {
  const names: HaloName[] = [];
  ctx.save();
  for (const h of halos) {
    const pts = h.members.filter((m) => m.x != null && m.y != null);
    if (pts.length < 3) continue;
    const cx = pts.reduce((s, m) => s + m.x!, 0) / pts.length;
    const cy = pts.reduce((s, m) => s + m.y!, 0) / pts.length;
    const d = pts.map((m) => Math.hypot(m.x! - cx, m.y! - cy)).sort((a, b) => a - b);
    // Most of the cluster, not its stragglers.
    const r = Math.max(45, d[Math.floor(d.length * 0.8)] + 35);
    const hot = hoverId != null && pts.some((m) => m.id === hoverId);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, withAlpha(h.color, hot ? 0.2 : 0.11));
    g.addColorStop(0.7, withAlpha(h.color, hot ? 0.1 : 0.05));
    g.addColorStop(1, withAlpha(h.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();
    const size = Math.min(15, Math.max(11, 9 + pts.length / 6)) / scale;
    const font = `700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.font = font;
    const text = h.name.toUpperCase();
    const half = ctx.measureText(text).width / 2;
    // Bigger clusters name first; a smaller one's name moves up a line if it would
    // land on one already placed, and is left off if it still collides.
    const clashes = (y: number) =>
      names.some((n) => cx - half < n.box.x1 && cx + half > n.box.x0 && y - size * 1.2 < n.box.y1 && y > n.box.y0);
    let y = cy - r * 0.85;
    if (clashes(y)) y -= size * 1.4;
    if (clashes(y)) continue;
    names.push({
      text,
      x: cx,
      y,
      font,
      color: withAlpha(h.color, hot ? 1 : 0.85),
      box: { x0: cx - half, y0: y - size * 1.2, x1: cx + half, y1: y },
    });
  }
  ctx.restore();
  return names;
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

/** The closest the automatic fit zooms in (people can still zoom further by hand). */
const MAX_FIT_ZOOM = 2.6;

/** Path for a rounded square centered on (x, y) with half-side h. */
function roundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const k = h * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - h + k, y - h);
  ctx.arcTo(x + h, y - h, x + h, y + h, k);
  ctx.arcTo(x + h, y + h, x - h, y + h, k);
  ctx.arcTo(x - h, y + h, x - h, y - h, k);
  ctx.arcTo(x - h, y - h, x + h, y - h, k);
  ctx.closePath();
}

function nodeTooltip(n: GraphNode): string {
  const role = n.org ? ORG_KIND_LABEL[n.org.kind] ?? 'Organization' : n.person?.current_role;
  const tag = n.researched ? '' : '<div class="tt-muted">Suggested — no file yet</div>';
  return `<div class="tt"><strong>${esc(n.name)}</strong>${role ? `<div>${esc(role)}</div>` : ''}${tag}<div class="tt-muted">${n.degree} connection${n.degree === 1 ? '' : 's'}</div></div>`;
}

function pairTooltip(p: PairLink, nameOf: (id: string) => string, isOrg: (id: string) => boolean): string {
  const rows = p.links
    .map((l) => {
      const f = EDGE_FAMILY_BY_ID[familyOf(l)];
      return `<div><span class="tt-swatch" style="background:${f.color}"></span>${esc(describeLink(l, nameOf, isOrg))}</div>`;
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

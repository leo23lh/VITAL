// Touch handling for the map. Phones have no hover, fingers wobble, and the map keeps moving,
// so on touch the map ignores its library's own clicks and decides taps here instead.

/** A finger that moves farther than this (screen pixels) is moving the map, not tapping. */
export const TAP_SLOP = 10;
/** A press held longer than this (ms) is not a tap. */
export const TAP_MS = 500;
/** How far from a dot's edge a finger still picks it (screen pixels). */
export const FINGER_REACH = 14;
/** A line is picked only when the tap is this close to it (screen pixels) and no dot is in reach. */
export const LINE_REACH = 7;

export interface Gesture {
  /** Fingers down at once, at most, during the gesture. */
  maxPointers: number;
  /** Farthest any finger got from where it went down (screen pixels). */
  travel: number;
  /** How long it lasted (ms). */
  ms: number;
}

/** One finger, barely moved, quickly lifted. Everything else is panning, pinching or dragging. */
export const isCleanTap = (g: Gesture) => g.maxPointers === 1 && g.travel <= TAP_SLOP && g.ms <= TAP_MS;

export interface Pt {
  x: number;
  y: number;
}

export type Pick<N, L> = { kind: 'node'; node: N } | { kind: 'link'; link: L } | null;

/** Distance from p to the segment a–b. */
export function toSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * What a tap at `at` (screen pixels) lands on, from where everything is drawn right now: the
 * nearest dot within finger reach of its edge; else, only if no dot is close, a line the tap
 * is right on; else nothing (the background).
 */
export function pickAt<N, L>(
  at: Pt,
  nodes: N[],
  links: L[],
  screenOf: (n: N) => Pt | null,
  radiusOf: (n: N) => number,
  endsOf: (l: L) => [Pt, Pt] | null,
): Pick<N, L> {
  let best: N | null = null;
  let bestGap = Infinity;
  for (const n of nodes) {
    const s = screenOf(n);
    if (!s) continue;
    const gap = Math.hypot(s.x - at.x, s.y - at.y) - radiusOf(n);
    if (gap <= FINGER_REACH && gap < bestGap) {
      best = n;
      bestGap = gap;
    }
  }
  if (best) return { kind: 'node', node: best };
  let line: L | null = null;
  let lineGap = Infinity;
  for (const l of links) {
    const ends = endsOf(l);
    if (!ends) continue;
    const d = toSegment(at, ends[0], ends[1]);
    if (d <= LINE_REACH && d < lineGap) {
      line = l;
      lineGap = d;
    }
  }
  return line ? { kind: 'link', link: line } : null;
}

// Trends: how someone's Pull has moved since an earlier monthly snapshot (data/history.json).
// See CLAUDE.md "Freshness".

/** One monthly snapshot: Pull by slug, and 2028 first choices [contender, score]. */
export interface Snapshot {
  /** YYYY-MM */
  month: string;
  /** YYYY-MM-DD the snapshot was taken. */
  date: string;
  pull: Record<string, number>;
  first?: Record<string, [string, number]>;
}

/** Moves smaller than this are noise (a new source or a tie's evidence grade). */
export const TREND_MIN = 3;

export interface Trend {
  delta: number;
  /** The snapshot compared against. */
  since: Snapshot;
}

/** Keeps well-formed snapshots only, oldest first. */
export function cleanHistory(raw: unknown): Snapshot[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.entries(raw).map(([month, v]) => ({ month, ...(v as object) })) : [];
  return list
    .filter(
      (s): s is Snapshot =>
        !!s && typeof s.month === 'string' && /^\d{4}-\d{2}$/.test(s.month) && typeof s.date === 'string' && !!s.pull && typeof s.pull === 'object',
    )
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** The latest snapshot from an earlier month than `now`'s, or null. */
export function baseline(history: Snapshot[], now = new Date()): Snapshot | null {
  const month = now.toISOString().slice(0, 7);
  const earlier = history.filter((s) => s.month < month);
  return earlier.length ? earlier[earlier.length - 1] : null;
}

/** How Pull moved since the baseline; null when there is none, the person wasn't in it, or the move is too small. */
export function pullTrend(id: string, score: number, base: Snapshot | null): Trend | null {
  if (!base || typeof base.pull[id] !== 'number') return null;
  const delta = score - base.pull[id];
  return Math.abs(delta) >= TREND_MIN ? { delta, since: base } : null;
}

/** "Nov 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
}

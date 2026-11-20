// Freshness: how long since each file was researched and each post was confirmed, and which to
// check first. See CLAUDE.md "Freshness".

import type { GraphNode } from './graph';

/** A file is aging after this many days without research, and stale after STALE_DAYS. */
export const AGING_DAYS = 45;
export const STALE_DAYS = 90;
/** Government posts change faster: a post is due for a check after this many days. */
export const OFFICE_DUE_DAYS = 30;

export type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';

const DAY = 86400000;
/** Whole days from a YYYY-MM-DD date to `now`; null when the date is missing or malformed. */
export function daysSince(date: string | undefined, now = new Date()): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}

export function freshnessOf(days: number | null): Freshness {
  if (days === null) return 'unknown';
  return days > STALE_DAYS ? 'stale' : days > AGING_DAYS ? 'aging' : 'fresh';
}

/** "today", "1 day ago", "3 weeks ago", "4 months ago". */
export function ago(days: number): string {
  if (days === 0) return 'today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** When the post was last confirmed: its own `verified` date, else the file's last research. */
export function officeChecked(n: GraphNode): string | undefined {
  return n.person?.office?.verified ?? n.person?.last_researched;
}

export interface QueueItem {
  id: string;
  /** Days since the file was researched (or the post confirmed, for `kind: 'office'`). */
  days: number;
  kind: 'office' | 'file';
  /** How much the person matters to the map, 0–1 (their post's weight, Pull, or connections). */
  weight: number;
  /** Order: weight × how overdue. */
  priority: number;
}

/**
 * What to check next: posts not confirmed in OFFICE_DUE_DAYS, and files not researched in
 * AGING_DAYS, most important and most overdue first. `weightOf` says how much each person matters.
 */
export function refreshQueue(nodes: GraphNode[], weightOf: (n: GraphNode) => number, now = new Date()): QueueItem[] {
  const out: QueueItem[] = [];
  for (const n of nodes) {
    if (!n.researched || n.isOrg || n.person?.public_figure === false || n.person?.died) continue;
    const w = Math.max(0.05, Math.min(1, weightOf(n)));
    const officeDays = n.person?.office ? daysSince(officeChecked(n), now) : null;
    if (officeDays !== null && officeDays > OFFICE_DUE_DAYS)
      out.push({ id: n.id, days: officeDays, kind: 'office', weight: w, priority: w * (officeDays / OFFICE_DUE_DAYS) * 1.5 });
    const fileDays = daysSince(n.person?.last_researched, now);
    if (fileDays === null || fileDays > AGING_DAYS) {
      const d = fileDays ?? STALE_DAYS * 2;
      out.push({ id: n.id, days: d, kind: 'file', weight: w, priority: w * (d / STALE_DAYS) });
    }
  }
  return out.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

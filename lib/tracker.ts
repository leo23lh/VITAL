import {
  bulkPutDoseLogs,
  getActiveProtocol,
  getDoseLogsInRange,
} from "./db";
import { mergeDayLogs, startOfDay } from "./schedule";
import type { DoseLog, Protocol } from "./types";

const DAY = 86_400_000;

/**
 * Ensure the given day's dose slots exist as DoseLog rows for the active
 * protocol, preserving any existing taken/skipped status. Returns the day's logs
 * sorted by time. Idempotent: safe to call on every tracker load.
 */
export async function ensureDayLogs(dayMs: number): Promise<{
  protocol: Protocol | undefined;
  logs: DoseLog[];
}> {
  const protocol = await getActiveProtocol();
  const day0 = startOfDay(dayMs);
  const existing = (await getDoseLogsInRange(day0, day0 + DAY - 1)).filter(
    (l) => !protocol || l.protocolId === protocol.id,
  );

  if (!protocol) {
    return { protocol: undefined, logs: existing.sort((a, b) => a.scheduledAt - b.scheduledAt) };
  }

  const merged = mergeDayLogs(protocol, day0, existing);
  await bulkPutDoseLogs(merged);
  return { protocol, logs: merged.sort((a, b) => a.scheduledAt - b.scheduledAt) };
}

export interface DayAdherence {
  dayMs: number;
  taken: number;
  total: number;
  pct: number;
}

/**
 * Adherence over the last `days` days (inclusive of today). Only counts days
 * that actually have scheduled doses. Percentage = taken / total scheduled.
 */
export async function getAdherence(days: number, todayMs: number): Promise<DayAdherence[]> {
  const today0 = startOfDay(todayMs);
  const start = today0 - (days - 1) * DAY;
  const logs = await getDoseLogsInRange(start, today0 + DAY - 1);

  const buckets = new Map<number, { taken: number; total: number }>();
  for (const l of logs) {
    const d = startOfDay(l.scheduledAt);
    const b = buckets.get(d) ?? { taken: 0, total: 0 };
    b.total += 1;
    if (l.status === "taken") b.taken += 1;
    buckets.set(d, b);
  }

  const out: DayAdherence[] = [];
  for (let i = 0; i < days; i++) {
    const d = start + i * DAY;
    const b = buckets.get(d);
    out.push({
      dayMs: d,
      taken: b?.taken ?? 0,
      total: b?.total ?? 0,
      pct: b && b.total > 0 ? Math.round((b.taken / b.total) * 100) : 0,
    });
  }
  return out;
}

/** Current streak of consecutive days (ending today) with 100% adherence. */
export function currentStreak(history: DayAdherence[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const d = history[i];
    if (d.total === 0) continue; // days with no doses don't break the streak
    if (d.taken === d.total) streak += 1;
    else break;
  }
  return streak;
}

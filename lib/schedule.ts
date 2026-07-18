import {
  DEFAULT_USER_ID,
  type DoseLog,
  type Frequency,
  type Protocol,
  type ProtocolItem,
  type Timing,
} from "./types";

/**
 * Turns an active protocol into concrete dose slots for a given day.
 * Pure functions (no DB access) so they are trivial to reason about and test.
 */

/** Hour of day used to anchor each timing bucket's notification/slot. */
const TIMING_HOUR: Record<Timing, number> = {
  morning: 8,
  midday: 12,
  evening: 20,
  "pre-workout": 16,
  "post-workout": 18,
  "with-food": 8,
  any: 9,
};

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** How many times per day this frequency fires, and on which days. */
function firesOnDay(frequency: Frequency, dayIndexFromStart: number): number {
  switch (frequency) {
    case "once-daily":
      return 1;
    case "twice-daily":
      return 2;
    case "every-other-day":
      return dayIndexFromStart % 2 === 0 ? 1 : 0;
    case "weekly":
      return dayIndexFromStart % 7 === 0 ? 1 : 0;
    case "as-needed":
      return 0; // never auto-scheduled
  }
}

function slotHoursFor(item: ProtocolItem, count: number): number[] {
  if (count <= 1) return [TIMING_HOUR[item.timing]];
  // twice-daily: morning + evening regardless of the stored timing bucket.
  return [TIMING_HOUR.morning, TIMING_HOUR.evening];
}

export interface ScheduledDose {
  id: string;
  compoundId: string;
  scheduledAt: number;
  dose: number;
  unit: string;
}

/**
 * Deterministic id so regenerating a day's schedule updates existing rows
 * instead of duplicating them.
 */
function doseId(protocolId: string, compoundId: string, scheduledAt: number): string {
  return `${protocolId}:${compoundId}:${scheduledAt}`;
}

/** Build the dose slots for a single day from a protocol. */
export function scheduleForDay(protocol: Protocol, dayMs: number): ScheduledDose[] {
  const day0 = startOfDay(dayMs);
  const createdDay0 = startOfDay(protocol.createdAt);
  const dayIndex = Math.round((day0 - createdDay0) / 86_400_000);
  if (dayIndex < 0) return [];

  const out: ScheduledDose[] = [];
  for (const item of protocol.items) {
    if (item.durationWeeks && dayIndex >= item.durationWeeks * 7) continue;
    const count = firesOnDay(item.frequency, dayIndex);
    if (count === 0) continue;
    const hours = slotHoursFor(item, count);
    for (const hour of hours) {
      const scheduledAt = day0 + hour * 3_600_000;
      out.push({
        id: doseId(protocol.id, item.compoundId, scheduledAt),
        compoundId: item.compoundId,
        scheduledAt,
        dose: item.dose,
        unit: item.unit,
      });
    }
  }
  return out.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/**
 * Merge freshly-computed slots with any existing logs, preserving taken/skipped
 * status. Returns the DoseLog rows to persist for the day.
 */
export function mergeDayLogs(
  protocol: Protocol,
  dayMs: number,
  existing: DoseLog[],
): DoseLog[] {
  const byId = new Map(existing.map((l) => [l.id, l]));
  return scheduleForDay(protocol, dayMs).map((slot) => {
    const prior = byId.get(slot.id);
    return {
      id: slot.id,
      userId: DEFAULT_USER_ID,
      protocolId: protocol.id,
      compoundId: slot.compoundId,
      scheduledAt: slot.scheduledAt,
      dose: slot.dose,
      unit: slot.unit,
      status: prior?.status ?? "pending",
      takenAt: prior?.takenAt,
    };
  });
}

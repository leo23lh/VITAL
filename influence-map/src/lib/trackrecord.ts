// Track record: what people asked of officials and how it turned out (each person's `asks`).
// It sits beside Pull and is used to test Pull's weights (scripts/tune-pull.mjs); it never
// lowers anyone's score. See CLAUDE.md "Track record".

import { pairKey, type GraphNode } from './graph';
import { accessDay, power, type BondIndex } from './pull';
import type { Ask, AskOutcome } from './schema';

export const OUTCOME_LABEL: Record<AskOutcome, string> = {
  granted: 'Granted',
  partial: 'Partly granted',
  denied: 'Denied',
  pending: 'Pending',
};

export interface AskRecord {
  granted: number;
  partial: number;
  denied: number;
  pending: number;
  /** Granted share of decided asks, partial counting half; null with none decided. */
  rate: number | null;
}

export function recordOf(asks: Ask[] | undefined): AskRecord {
  const r = { granted: 0, partial: 0, denied: 0, pending: 0 };
  for (const a of asks ?? []) r[a.outcome]++;
  const decided = r.granted + r.partial + r.denied;
  return { ...r, rate: decided ? (r.granted + r.partial / 2) / decided : null };
}

/**
 * How close the asker is to the officials who decided an ask, 0–100: their strongest bond with
 * any of them, raised by documented meetings in the year before the ask (as in Pull). Null when
 * no one on the map decided it.
 */
export function deciderAccess(
  asker: GraphNode,
  ask: Ask,
  byId: Map<string, GraphNode>,
  idx: BondIndex,
  accessBoost: number,
  metOnlyBond: number,
): number | null {
  if (!ask.with.length) return null;
  const day = accessDay(ask.date.length === 7 ? `${ask.date}-28` : ask.date);
  let best = 0;
  for (const id of ask.with) {
    if (!byId.has(id)) continue;
    const tie = idx.get(pairKey(asker.id, id));
    if (tie?.status === 'hostile') continue;
    const met = (asker.person?.access ?? []).filter((e) => {
      const d = accessDay(e.date);
      return e.with.includes(id) && d <= day && d > day - 365;
    }).length;
    const base = tie ? tie.score : met ? metOnlyBond : 0;
    best = Math.max(best, base + (100 - base) * accessBoost * Math.min(met, 3));
  }
  return Math.round(best);
}

/** The most powerful of the deciders' posts (0–1), so an ask to the President weighs more than one to a senator. */
export const deciderPower = (ask: Ask, byId: Map<string, GraphNode>) => Math.max(0, ...ask.with.map((id) => power(byId.get(id))));

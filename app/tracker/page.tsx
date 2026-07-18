"use client";

import { useCallback, useEffect, useState } from "react";
import DueDoses from "@/components/DueDoses";
import AdherenceChart from "@/components/AdherenceChart";
import { getAdherence, currentStreak, type DayAdherence } from "@/lib/tracker";

export default function TrackerPage() {
  const [history, setHistory] = useState<DayAdherence[] | null>(null);

  const loadHistory = useCallback(async () => {
    setHistory(await getAdherence(14, Date.now()));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const streak = history ? currentStreak(history) : 0;
  const daysWithDoses = history?.filter((d) => d.total > 0) ?? [];
  const avg =
    daysWithDoses.length > 0
      ? Math.round(daysWithDoses.reduce((s, d) => s + d.pct, 0) / daysWithDoses.length)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tracker</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          Log today&apos;s doses and keep an eye on your consistency over time.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Today</h2>
        <DueDoses onChange={loadHistory} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Adherence — last 14 days</h2>
          <div className="flex gap-4 text-sm">
            <span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{streak}</span>{" "}
              <span className="text-[var(--foreground)]/60">day streak</span>
            </span>
            <span>
              <span className="font-semibold">{avg}%</span>{" "}
              <span className="text-[var(--foreground)]/60">avg</span>
            </span>
          </div>
        </div>
        {history === null ? (
          <p className="text-sm text-[var(--foreground)]/50">Loading…</p>
        ) : daysWithDoses.length === 0 ? (
          <p className="text-sm text-[var(--foreground)]/50">
            No dose history yet. Log some doses above and your adherence will appear here.
          </p>
        ) : (
          <AdherenceChart history={history} />
        )}
      </section>
    </div>
  );
}

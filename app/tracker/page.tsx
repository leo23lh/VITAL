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
    <div>
      <p className="eyebrow">Tracker</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Today&apos;s Doses</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Log today&apos;s doses and keep an eye on your consistency over time.
      </p>

      <section className="mt-10">
        <p className="section-head">Today</p>
        <div className="mt-5">
          <DueDoses onChange={loadHistory} />
        </div>
      </section>

      <section className="mt-12">
        <p className="section-head">Adherence — last 14 days</p>

        <div className="mt-6 flex items-center gap-8">
          <div>
            <p className="font-serif text-[38px] font-bold leading-none text-ink">{streak}</p>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[1px] text-muted">
              Day streak
            </p>
          </div>
          <div className="h-11 w-px shrink-0 bg-rule" />
          <div>
            <p className="font-serif text-[38px] font-bold leading-none text-ink">{avg}%</p>
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[1px] text-muted">
              Average
            </p>
          </div>
        </div>

        <div className="mt-8">
          {history === null ? (
            <p className="font-sans text-[13px] text-muted">Loading…</p>
          ) : daysWithDoses.length === 0 ? (
            <p className="font-sans text-[13px] text-muted">
              No dose history yet. Log some doses above and your adherence will appear here.
            </p>
          ) : (
            <AdherenceChart history={history} />
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DoseLog, Protocol } from "@/lib/types";
import { getSettings, setDoseStatus } from "@/lib/db";
import { ensureDayLogs } from "@/lib/tracker";
import { scheduleDoseReminders } from "@/lib/notifications";
import { getCompound } from "@/content/compounds";

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Today's dose checklist. Used on both the home page (compact) and the tracker.
 * This is the reliable, always-visible fallback for reminders.
 */
export default function DueDoses({
  compact = false,
  onChange,
}: {
  compact?: boolean;
  onChange?: () => void;
}) {
  const [protocol, setProtocol] = useState<Protocol | undefined>(undefined);
  const [logs, setLogs] = useState<DoseLog[] | null>(null);

  const load = useCallback(async () => {
    const { protocol, logs } = await ensureDayLogs(Date.now());
    setProtocol(protocol);
    setLogs(logs);
    const settings = await getSettings();
    if (settings.notificationsEnabled) {
      void scheduleDoseReminders(logs, settings);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(id: string, status: DoseLog["status"]) {
    await setDoseStatus(id, status);
    await load();
    onChange?.();
  }

  if (logs === null) {
    return <p className="font-sans text-[13px] text-muted">Loading…</p>;
  }

  if (!protocol) {
    return (
      <div className="border border-dashed border-rule px-5 py-6 font-sans text-[13px] text-muted">
        No active protocol.{" "}
        <Link href="/protocols/new" className="text-rust hover:underline">
          Build one
        </Link>{" "}
        to start tracking doses.
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="font-sans text-[13px] text-muted">
        No doses scheduled today for <strong className="text-body">{protocol.name}</strong>.
      </p>
    );
  }

  const pending = logs.filter((l) => l.status === "pending").length;

  return (
    <div>
      {!compact && (
        <p className="mb-4 font-sans text-[13px] text-muted">
          {pending === 0
            ? "All doses logged for today. Nice."
            : `${pending} dose${pending === 1 ? "" : "s"} still due today.`}
        </p>
      )}
      <ul className="border-t border-rule-soft">
        {logs.map((l) => {
          const c = getCompound(l.compoundId);
          const taken = l.status === "taken";
          const skipped = l.status === "skipped";
          const done = l.status !== "pending";
          return (
            <li
              key={l.id}
              className={`flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft py-3 ${
                skipped ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`h-4 w-4 shrink-0 border border-ink ${taken ? "bg-ink" : "bg-transparent"}`}
                />
                <div>
                  <p className="font-serif text-[15px] text-ink">
                    {c?.name ?? l.compoundId}{" "}
                    <span className="font-sans text-[12px] font-normal text-muted">
                      · {l.dose} {l.unit}
                    </span>
                  </p>
                  <p className="mt-0.5 font-sans text-[12px] text-muted">
                    {timeLabel(l.scheduledAt)}
                    {taken && " · taken"}
                    {skipped && " · skipped"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!taken && (
                  <button
                    onClick={() => mark(l.id, "taken")}
                    className="border border-ink px-3 py-1.5 font-sans text-[11px] uppercase tracking-[.5px] text-ink hover:bg-ink hover:text-paper"
                  >
                    Take
                  </button>
                )}
                {done ? (
                  <button
                    onClick={() => mark(l.id, "pending")}
                    className="border-b border-rust font-sans text-[11px] uppercase tracking-[.5px] text-rust hover:opacity-70"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => mark(l.id, "skipped")}
                    className="border-b border-rust font-sans text-[11px] uppercase tracking-[.5px] text-rust hover:opacity-70"
                  >
                    Skip
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

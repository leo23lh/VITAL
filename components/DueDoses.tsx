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
    return <p className="text-sm text-[var(--foreground)]/50">Loading…</p>;
  }

  if (!protocol) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-5 text-sm text-[var(--foreground)]/60 dark:border-white/15">
        No active protocol.{" "}
        <Link href="/protocols/new" className="text-brand-600 hover:underline dark:text-brand-300">
          Build one
        </Link>{" "}
        to start tracking doses.
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-[var(--foreground)]/60">
        No doses scheduled today for <strong>{protocol.name}</strong>.
      </p>
    );
  }

  const pending = logs.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-sm text-[var(--foreground)]/60">
          {pending === 0
            ? "All doses logged for today. Nice."
            : `${pending} dose${pending === 1 ? "" : "s"} still due today.`}
        </p>
      )}
      <ul className="space-y-2">
        {logs.map((l) => {
          const c = getCompound(l.compoundId);
          const done = l.status !== "pending";
          return (
            <li
              key={l.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                l.status === "taken"
                  ? "border-emerald-300/50 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-900/15"
                  : l.status === "skipped"
                    ? "border-black/10 bg-black/[0.03] opacity-60 dark:border-white/10 dark:bg-white/[0.03]"
                    : "border-black/10 dark:border-white/10"
              }`}
            >
              <div>
                <p className="text-sm font-medium">
                  {c?.name ?? l.compoundId}{" "}
                  <span className="font-normal text-[var(--foreground)]/60">
                    · {l.dose} {l.unit}
                  </span>
                </p>
                <p className="text-xs text-[var(--foreground)]/50">
                  {timeLabel(l.scheduledAt)}
                  {l.status === "taken" && " · taken"}
                  {l.status === "skipped" && " · skipped"}
                </p>
              </div>
              <div className="flex gap-1.5">
                {l.status !== "taken" && (
                  <button
                    onClick={() => mark(l.id, "taken")}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                  >
                    Take
                  </button>
                )}
                {done ? (
                  <button
                    onClick={() => mark(l.id, "pending")}
                    className="rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]/60 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => mark(l.id, "skipped")}
                    className="rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]/60 hover:bg-black/5 dark:hover:bg-white/10"
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

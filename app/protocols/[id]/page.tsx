"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Protocol } from "@/lib/types";
import { deleteProtocol, getProtocol, setActiveProtocol } from "@/lib/db";
import { getCompound } from "@/content/compounds";

export default function ProtocolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [protocol, setProtocol] = useState<Protocol | null | undefined>(undefined);

  async function load() {
    setProtocol((await getProtocol(params.id)) ?? null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (protocol === undefined) {
    return <p className="text-sm text-[var(--foreground)]/50">Loading…</p>;
  }
  if (protocol === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--foreground)]/60">Protocol not found.</p>
        <Link href="/protocols" className="text-sm text-brand-600 hover:underline dark:text-brand-300">
          ← Back to protocols
        </Link>
      </div>
    );
  }

  async function activate() {
    await setActiveProtocol(protocol!.id);
    await load();
  }

  async function remove() {
    if (!confirm("Delete this protocol and its dose history?")) return;
    await deleteProtocol(protocol!.id);
    router.push("/protocols");
  }

  return (
    <article className="space-y-6">
      <Link href="/protocols" className="text-sm text-brand-600 hover:underline dark:text-brand-300">
        ← Back to protocols
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{protocol.name}</h1>
            {protocol.active && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--foreground)]/60">{protocol.goal}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {!protocol.active && (
            <button
              onClick={activate}
              className="rounded-lg border border-brand-400 px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/20"
            >
              Activate
            </button>
          )}
          <Link
            href="/tracker"
            className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
          >
            Go to tracker
          </Link>
          <button
            onClick={remove}
            className="rounded-lg px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
          >
            Delete
          </button>
        </div>
      </div>

      {protocol.notes && (
        <p className="rounded-xl bg-black/5 p-3 text-sm text-[var(--foreground)]/70 dark:bg-white/5">
          {protocol.notes}
        </p>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Regimen</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-[var(--foreground)]/50 dark:border-white/10">
                <th className="py-2 pr-4 font-semibold">Compound</th>
                <th className="py-2 pr-4 font-semibold">Dose</th>
                <th className="py-2 pr-4 font-semibold">Frequency</th>
                <th className="py-2 pr-4 font-semibold">Timing</th>
                <th className="py-2 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {protocol.items.map((it, i) => {
                const c = getCompound(it.compoundId);
                return (
                  <tr key={i} className="border-b border-black/5 dark:border-white/5">
                    <td className="py-3 pr-4 font-medium">
                      {c ? (
                        <Link
                          href={`/catalog/${c.id}`}
                          className="hover:text-brand-600 dark:hover:text-brand-300"
                        >
                          {c.name}
                        </Link>
                      ) : (
                        it.compoundId
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {it.dose} {it.unit}
                    </td>
                    <td className="py-3 pr-4">{it.frequency}</td>
                    <td className="py-3 pr-4">{it.timing}</td>
                    <td className="py-3">
                      {it.durationWeeks ? `${it.durationWeeks} wk` : "ongoing"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-100">
        Personal plan — not medical advice. Confirm doses against the catalog and a healthcare
        professional.
      </div>
    </article>
  );
}

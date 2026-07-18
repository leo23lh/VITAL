"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Protocol } from "@/lib/types";
import { deleteProtocol, listProtocols, setActiveProtocol } from "@/lib/db";

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[] | null>(null);

  const load = useCallback(async () => {
    setProtocols(await listProtocols());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(id: string) {
    await setActiveProtocol(id);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this protocol and its dose history?")) return;
    await deleteProtocol(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Protocols</h1>
        <Link
          href="/protocols/new"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + New protocol
        </Link>
      </div>

      {protocols === null ? (
        <p className="text-sm text-[var(--foreground)]/50">Loading…</p>
      ) : protocols.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-[var(--foreground)]/60">No protocols yet.</p>
          <Link
            href="/protocols/new"
            className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Build your first protocol
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {protocols.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/protocols/${p.id}`}
                      className="font-semibold hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {p.name}
                    </Link>
                    {p.active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--foreground)]/60">
                    {p.goal} · {p.items.length} {p.items.length === 1 ? "compound" : "compounds"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  {!p.active && (
                    <button
                      onClick={() => activate(p.id)}
                      className="rounded-lg border border-brand-400 px-3 py-1.5 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/20"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded-lg px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Protocol } from "@/lib/types";
import { deleteProtocol, listProtocols, setActiveProtocol } from "@/lib/db";
import ActiveBadge from "@/components/ActiveBadge";

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
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Protocols</p>
          <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Your protocols</h1>
        </div>
        <Link href="/protocols/new" className="btn">
          + New protocol
        </Link>
      </div>

      {protocols === null ? (
        <p className="mt-10 font-sans text-[13px] text-muted">Loading…</p>
      ) : protocols.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule px-10 py-16 text-center">
          <p className="font-serif text-[17px] text-body">No protocols yet.</p>
          <Link href="/protocols/new" className="btn mt-5 inline-block">
            Build your first protocol
          </Link>
        </div>
      ) : (
        <ul className="mt-10 border-t border-rule">
          {protocols.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-rule-soft py-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/protocols/${p.id}`}
                    className="font-serif text-[20px] font-bold text-ink hover:text-rust"
                  >
                    {p.name}
                  </Link>
                  {p.active && <ActiveBadge />}
                </div>
                <p className="mt-1 font-sans text-[12px] text-muted">
                  {p.goal} · {p.items.length} {p.items.length === 1 ? "compound" : "compounds"}
                </p>
              </div>
              <div className="flex items-center gap-5 font-sans text-[13px]">
                {!p.active && (
                  <button onClick={() => activate(p.id)} className="btn-secondary">
                    Activate
                  </button>
                )}
                <button onClick={() => remove(p.id)} className="btn-secondary">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

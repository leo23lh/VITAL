"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Protocol } from "@/lib/types";
import { deleteProtocol, getProtocol, setActiveProtocol } from "@/lib/db";
import { getCompound } from "@/content/compounds";
import { Disclaimer } from "@/components/Disclaimer";
import ActiveBadge from "@/components/ActiveBadge";

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
    return <p className="font-sans text-[13px] text-muted">Loading…</p>;
  }
  if (protocol === null) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-[13px] text-muted">Protocol not found.</p>
        <Link href="/protocols" className="btn-secondary">
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
    <article className="mx-auto w-full max-w-[900px] md:px-6">
      <Link href="/protocols" className="btn-secondary !py-0">
        ← Back to protocols
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[38px] font-bold leading-[1.05] text-ink">
              {protocol.name}
            </h1>
            {protocol.active && <ActiveBadge />}
          </div>
          <p className="mt-2 font-sans text-[13px] text-muted">{protocol.goal}</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 font-sans text-[13px]">
          {!protocol.active && (
            <button onClick={activate} className="btn-secondary">
              Activate
            </button>
          )}
          <Link href="/tracker" className="btn">
            Go to tracker
          </Link>
          <button onClick={remove} className="btn-secondary">
            Delete
          </button>
        </div>
      </div>

      {protocol.notes && (
        <p className="mt-6 max-w-[680px] font-serif text-[16px] italic leading-[1.6] text-body">
          {protocol.notes}
        </p>
      )}

      <section className="mt-10">
        <h2 className="section-head">Regimen</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse font-sans text-[13px]">
            <thead>
              <tr className="border-b-2 border-rule text-left text-[11px] uppercase tracking-wide text-muted">
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
                  <tr key={i} className="border-b border-rule-soft">
                    <td className="py-3 pr-4 font-serif text-[15px] font-bold text-ink">
                      {c ? (
                        <Link href={`/catalog/${c.id}`} className="hover:text-rust">
                          {c.name}
                        </Link>
                      ) : (
                        it.compoundId
                      )}
                    </td>
                    <td className="py-3 pr-4 text-body">
                      {it.dose} {it.unit}
                    </td>
                    <td className="py-3 pr-4 text-body">{it.frequency}</td>
                    <td className="py-3 pr-4 text-body">{it.timing}</td>
                    <td className="py-3 text-body">
                      {it.durationWeeks ? `${it.durationWeeks} wk` : "ongoing"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10">
        <Disclaimer title="Not medical advice">
          <p>
            Personal plan — not medical advice. Confirm doses against the catalog and a healthcare
            professional.
          </p>
        </Disclaimer>
      </div>
    </article>
  );
}

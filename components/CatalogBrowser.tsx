"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Compound, EvidenceLevel } from "@/lib/types";
import EvidenceBadge from "./EvidenceBadge";

type CatFilter = "all" | Category;

export default function CatalogBrowser({
  compounds,
  goals,
}: {
  compounds: Compound[];
  goals: string[];
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatFilter>("all");
  const [goal, setGoal] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return compounds.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (goal !== "all" && !c.goals.includes(goal)) return false;
      if (!needle) return true;
      const hay = [c.name, ...c.aka, c.summary].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [compounds, q, cat, goal]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search compounds…"
          className="w-full rounded-xl border border-black/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-brand-400 dark:border-white/15"
        />
        <div className="flex gap-2">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as CatFilter)}
            className="rounded-xl border border-black/15 bg-transparent px-3 py-2.5 text-sm dark:border-white/15"
          >
            <option value="all">All types</option>
            <option value="supplement">Supplements</option>
            <option value="peptide">Peptides</option>
            <option value="sarm">SARMs</option>
            <option value="hormone">Hormones / PEDs</option>
          </select>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="rounded-xl border border-black/15 bg-transparent px-3 py-2.5 text-sm dark:border-white/15"
          >
            <option value="all">All goals</option>
            {goals.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-[var(--foreground)]/50">
        {filtered.length} {filtered.length === 1 ? "compound" : "compounds"}
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link
              href={`/catalog/${c.id}`}
              className="group block h-full rounded-2xl border border-black/10 p-5 transition hover:border-brand-400 hover:shadow-sm dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-300">
                    {c.name}
                  </h3>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--foreground)]/40">
                    {c.category}
                  </p>
                </div>
                <EvidenceBadge level={c.evidenceLevel as EvidenceLevel} />
              </div>
              <p className="mt-3 text-sm text-[var(--foreground)]/70">{c.summary}</p>
              {c.goals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.goals.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-[var(--foreground)]/60 dark:bg-white/10"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--foreground)]/50">
          No compounds match your filters.
        </p>
      )}
    </div>
  );
}

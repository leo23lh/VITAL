"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Compound, EvidenceLevel } from "@/lib/types";
import EvidenceBadge from "./EvidenceBadge";

type CatFilter = "all" | Category;

const TYPE_CHIPS: { value: CatFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "supplement", label: "Supplements" },
  { value: "peptide", label: "Peptides" },
  { value: "sarm", label: "SARMs" },
  { value: "hormone", label: "Hormones" },
];

function chipClass(active: boolean) {
  return [
    "border px-3 py-[6px] font-sans text-[12px] uppercase tracking-[.3px] transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust",
    active
      ? "border-ink bg-ink text-paper"
      : "border-[rgba(22,19,17,.3)] text-body hover:border-ink",
  ].join(" ");
}

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
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search compounds…"
          aria-label="Search compounds"
          className="w-full border-0 border-b border-ink bg-transparent px-0 py-1.5 font-sans text-[14px] text-ink outline-none placeholder:text-muted sm:w-[260px]"
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setCat(chip.value)}
              aria-pressed={cat === chip.value}
              className={chipClass(cat === chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by goal">
          <button
            type="button"
            onClick={() => setGoal("all")}
            aria-pressed={goal === "all"}
            className={chipClass(goal === "all")}
          >
            All goals
          </button>
          {goals.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              aria-pressed={goal === g}
              className={chipClass(goal === g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <hr className="rule" />

      <p className="mt-4 font-sans text-[12px] text-muted">
        {filtered.length} {filtered.length === 1 ? "compound" : "compounds"}
      </p>

      <ul className="mt-2">
        {filtered.map((c) => (
          <li key={c.id} className="border-b border-rule-soft last:border-b-0">
            <Link href={`/catalog/${c.id}`} className="group flex items-start gap-4 py-5 sm:gap-5">
              <div className="hatch-thumb hidden h-16 w-16 flex-none sm:block" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[10.5px] uppercase tracking-[1px] text-muted">
                  {c.category}
                  {c.goals[0] ? ` · ${c.goals[0]}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-[22px] font-bold text-ink group-hover:text-rust">
                    {c.name}
                  </h3>
                  <EvidenceBadge level={c.evidenceLevel as EvidenceLevel} />
                </div>
                <p className="mt-2 max-w-[640px] text-[14px] leading-[1.5] text-body">
                  {c.summary}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="py-10 text-center font-sans text-sm text-muted">
          No compounds match your filters.
        </p>
      )}
    </div>
  );
}

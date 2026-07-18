"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Compound,
  Frequency,
  ProtocolItem,
  ProtocolTemplate,
  Timing,
} from "@/lib/types";
import { saveProtocol, setActiveProtocol } from "@/lib/db";
import { newId } from "@/lib/id";

const FREQUENCIES: Frequency[] = [
  "once-daily",
  "twice-daily",
  "every-other-day",
  "weekly",
  "as-needed",
];
const TIMINGS: Timing[] = [
  "morning",
  "midday",
  "evening",
  "pre-workout",
  "post-workout",
  "with-food",
  "any",
];

export default function ProtocolBuilder({
  compounds,
  templates,
}: {
  compounds: Compound[];
  templates: ProtocolTemplate[];
}) {
  const router = useRouter();
  const byId = new Map(compounds.map((c) => [c.id, c]));

  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ProtocolItem[]>([]);
  const [activate, setActivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addId, setAddId] = useState(compounds[0]?.id ?? "");

  function loadTemplate(t: ProtocolTemplate) {
    setName(t.name);
    setGoal(t.goal);
    setItems(t.items.map((i) => ({ ...i })));
    setStarted(true);
  }

  function startBlank() {
    setName("");
    setGoal("");
    setItems([]);
    setStarted(true);
  }

  function addCompound() {
    const c = byId.get(addId);
    if (!c) return;
    setItems((prev) => [
      ...prev,
      { compoundId: c.id, dose: 0, unit: "mg", frequency: "once-daily", timing: "any" },
    ]);
  }

  function updateItem(index: number, patch: Partial<ProtocolItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);
    const id = newId("protocol");
    await saveProtocol({
      id,
      name: name.trim(),
      goal: goal.trim() || "General",
      items,
      ancillaries: [],
      notes: notes.trim() || undefined,
      active: activate,
    });
    if (activate) await setActiveProtocol(id);
    router.push(`/protocols/${id}`);
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Start from a goal</h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/60">
            Pick a curated starting point, then adjust everything to fit you. Doses come from the
            cited literature — nothing is invented.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => loadTemplate(t)}
              className="rounded-2xl border border-black/10 p-5 text-left transition hover:border-brand-400 hover:shadow-sm dark:border-white/10"
            >
              <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300">
                {t.goal}
              </p>
              <h3 className="mt-1 font-semibold">{t.name}</h3>
              <p className="mt-2 text-sm text-[var(--foreground)]/70">{t.description}</p>
              <p className="mt-3 text-xs text-[var(--foreground)]/50">
                {t.items.length} {t.items.length === 1 ? "compound" : "compounds"}
              </p>
            </button>
          ))}
          <button
            onClick={startBlank}
            className="rounded-2xl border border-dashed border-black/20 p-5 text-left transition hover:border-brand-400 dark:border-white/20"
          >
            <h3 className="font-semibold">Start from scratch</h3>
            <p className="mt-2 text-sm text-[var(--foreground)]/70">
              Build your own from any compound in the catalog.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Protocol name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My wind-down stack"
            className="mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-white/15"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Goal</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Sleep & recovery"
            className="mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-white/15"
          />
        </label>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Compounds & dosing</h2>
        {items.length === 0 && (
          <p className="text-sm text-[var(--foreground)]/50">
            No compounds yet — add one below.
          </p>
        )}
        {items.map((it, i) => {
          const c = byId.get(it.compoundId);
          return (
            <div
              key={`${it.compoundId}-${i}`}
              className="rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{c?.name ?? it.compoundId}</h3>
                <button
                  onClick={() => removeItem(i)}
                  className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                >
                  Remove
                </button>
              </div>
              {c?.dosingNotes && (
                <p className="mt-1 text-xs text-[var(--foreground)]/50">{c.dosingNotes}</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <label className="block">
                  <span className="text-xs text-[var(--foreground)]/60">Dose</span>
                  <input
                    type="number"
                    min={0}
                    value={it.dose}
                    onChange={(e) => updateItem(i, { dose: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--foreground)]/60">Unit</span>
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--foreground)]/60">Frequency</span>
                  <select
                    value={it.frequency}
                    onChange={(e) => updateItem(i, { frequency: e.target.value as Frequency })}
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--foreground)]/60">Timing</span>
                  <select
                    value={it.timing}
                    onChange={(e) => updateItem(i, { timing: e.target.value as Timing })}
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                  >
                    {TIMINGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--foreground)]/60">Weeks (opt.)</span>
                  <input
                    type="number"
                    min={1}
                    value={it.durationWeeks ?? ""}
                    onChange={(e) =>
                      updateItem(i, {
                        durationWeeks: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
                  />
                </label>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          >
            {compounds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={addCompound}
            className="rounded-xl border border-brand-400 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/20"
          >
            + Add compound
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-white/15"
        />
      </label>

      <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-100">
        This is your personal plan, not medical advice. Review doses against the catalog and a
        healthcare professional before starting.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
          />
          Make this my active protocol
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setStarted(false)}
            className="rounded-xl px-4 py-2 text-sm text-[var(--foreground)]/60 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Back
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim() || items.length === 0}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save protocol"}
          </button>
        </div>
      </div>
    </div>
  );
}

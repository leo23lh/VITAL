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
import { Disclaimer } from "@/components/Disclaimer";

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

/** Sans 11px uppercase caption used above every field in the builder. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-[11px] uppercase tracking-wide text-muted">{children}</span>;
}

const fieldClasses =
  "mt-1 w-full border border-rule bg-transparent px-2.5 py-2 font-sans text-[13px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust";

const selectClasses = `${fieldClasses} appearance-none`;

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
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  function loadTemplate(t: ProtocolTemplate) {
    setName(t.name);
    setGoal(t.goal);
    setItems(t.items.map((i) => ({ ...i })));
    setAiRationale(null);
    setStarted(true);
  }

  function startBlank() {
    setName("");
    setGoal("");
    setItems([]);
    setAiRationale(null);
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

  async function generateWithAI() {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: aiGoal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Something went wrong generating a protocol.");
        return;
      }
      setName(data.name);
      setGoal(data.goal);
      setItems(data.items);
      setAiRationale(data.rationale);
      setStarted(true);
    } catch {
      setAiError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
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
      <div>
        <p className="max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
          Pick a curated starting point, then adjust everything to fit you. Doses come from the
          cited literature — nothing is invented.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => loadTemplate(t)}
              disabled={aiLoading}
              className="border border-rule p-6 text-left transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="eyebrow">{t.goal}</p>
              <h3 className="mt-2 font-serif text-[22px] font-bold text-ink">{t.name}</h3>
              <p className="mt-2 font-serif text-[15px] leading-[1.6] text-body">{t.description}</p>
              <p className="mt-4 font-sans text-[12px] text-muted">
                {t.items.length} {t.items.length === 1 ? "compound" : "compounds"}
              </p>
            </button>
          ))}
          <button
            onClick={startBlank}
            disabled={aiLoading}
            className="border border-dashed border-rule p-6 text-left transition-colors hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust disabled:cursor-not-allowed disabled:opacity-40"
          >
            <h3 className="font-serif text-[22px] font-bold text-ink">Start from scratch</h3>
            <p className="mt-2 font-serif text-[15px] leading-[1.6] text-body">
              Build your own from any compound in the catalog.
            </p>
          </button>
        </div>

        <div className="mt-10 border-t border-rule pt-8">
          <p className="eyebrow">Or describe your goal</p>
          <p className="mt-2 max-w-[560px] font-serif text-[15px] italic leading-[1.6] text-body">
            Tell the AI what you&apos;re after in your own words — it drafts a starting point from
            the same catalog above, which you then review and edit like any other protocol.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={aiGoal}
              onChange={(e) => setAiGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !aiLoading) generateWithAI();
              }}
              placeholder="e.g. help me recover from a shoulder injury, I lift 3x/week"
              className={`${fieldClasses} mt-0 sm:flex-1`}
            />
            <button
              onClick={generateWithAI}
              disabled={aiLoading || !aiGoal.trim()}
              className="btn whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
            >
              {aiLoading ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          {aiError && <p className="mt-3 font-sans text-[13px] text-rust">{aiError}</p>}
        </div>
      </div>
    );
  }

  const higherRiskItems = aiRationale
    ? items
        .map((it) => byId.get(it.compoundId))
        .filter(
          (c): c is Compound => !!c && (c.category === "sarm" || c.category === "hormone"),
        )
    : [];

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_340px]">
      {/* ---- Main column ---- */}
      <div className="space-y-10">
        {aiRationale && (
          <Disclaimer title="AI-suggested — review before saving">
            <p>{aiRationale}</p>
          </Disclaimer>
        )}
        {higherRiskItems.length > 0 && (
          <Disclaimer title="Higher-risk compounds included">
            <p>
              This protocol includes {higherRiskItems.map((c) => c.name).join(", ")} — review
              each compound&apos;s full catalog entry for risks, evidence, and legal status
              before using.
            </p>
          </Disclaimer>
        )}

        <section>
          <h2 className="section-head">1 · Protocol details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Protocol name</FieldLabel>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My wind-down stack"
                className={fieldClasses}
              />
            </label>
            <label className="block">
              <FieldLabel>Goal</FieldLabel>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Sleep & recovery"
                className={fieldClasses}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="section-head">2 · Compounds & dosing</h2>
          <div className="mt-5 space-y-4">
            {items.length === 0 && (
              <p className="font-sans text-[13px] text-muted">No compounds yet — add one below.</p>
            )}
            {items.map((it, i) => {
              const c = byId.get(it.compoundId);
              return (
                <div key={`${it.compoundId}-${i}`} className="border border-rule p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-[17px] font-bold text-ink">
                        {c?.name ?? it.compoundId}
                      </h3>
                      {c?.dosingNotes && (
                        <p className="mt-1 font-sans text-[12px] leading-[1.5] text-body">
                          {c.dosingNotes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(i)}
                      className="btn-secondary shrink-0 whitespace-nowrap !py-0 text-[12px]"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <label className="block">
                      <FieldLabel>Dose</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        value={it.dose}
                        onChange={(e) => updateItem(i, { dose: Number(e.target.value) })}
                        className={fieldClasses}
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Unit</FieldLabel>
                      <input
                        value={it.unit}
                        onChange={(e) => updateItem(i, { unit: e.target.value })}
                        className={fieldClasses}
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Frequency</FieldLabel>
                      <select
                        value={it.frequency}
                        onChange={(e) => updateItem(i, { frequency: e.target.value as Frequency })}
                        className={selectClasses}
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <FieldLabel>Timing</FieldLabel>
                      <select
                        value={it.timing}
                        onChange={(e) => updateItem(i, { timing: e.target.value as Timing })}
                        className={selectClasses}
                      >
                        {TIMINGS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <FieldLabel>Weeks (opt.)</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        value={it.durationWeeks ?? ""}
                        onChange={(e) =>
                          updateItem(i, {
                            durationWeeks: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className={fieldClasses}
                      />
                    </label>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
                className="appearance-none border border-rule bg-transparent px-3 py-2 font-sans text-[13px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
              >
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button onClick={addCompound} className="btn-secondary">
                + Add compound
              </button>
            </div>
          </div>
        </section>

        <label className="block">
          <FieldLabel>Notes (optional)</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={fieldClasses}
          />
        </label>

        <Disclaimer title="Not medical advice">
          <p>
            This is your personal plan, not medical advice. Review doses against the catalog and a
            healthcare professional before starting.
          </p>
        </Disclaimer>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <label className="flex items-center gap-2 font-sans text-[13px] text-body">
            <input
              type="checkbox"
              checked={activate}
              onChange={(e) => setActivate(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            Make this my active protocol
          </label>
          <button onClick={() => setStarted(false)} className="btn-secondary">
            ← Back
          </button>
        </div>
      </div>

      {/* ---- Summary rail ---- */}
      <aside className="mt-2 border-t border-rule pt-8 md:mt-0 md:border-l md:border-t-0 md:pl-8 md:pt-0">
        <p className="eyebrow eyebrow--muted">Summary</p>
        <h2 className="mt-2 font-serif text-[22px] font-bold leading-[1.2] text-ink">
          {name.trim() || "Untitled protocol"}
        </h2>
        <p className="mt-1 font-sans text-[12px] text-muted">
          {items.length} {items.length === 1 ? "compound" : "compounds"}
        </p>

        <ul className="mt-5 space-y-3 border-t border-rule-soft pt-4">
          {items.length === 0 ? (
            <li className="font-sans text-[12px] text-muted">No compounds added yet.</li>
          ) : (
            items.map((it, i) => {
              const c = byId.get(it.compoundId);
              return (
                <li key={i} className="border-b border-rule-soft pb-3 font-sans text-[13px] leading-[1.4]">
                  <span className="font-semibold text-ink">{c?.name ?? it.compoundId}</span>
                  <span className="text-muted">
                    {" "}
                    · {it.dose} {it.unit} · {it.frequency}
                  </span>
                </li>
              );
            })
          )}
        </ul>

        <button
          onClick={save}
          disabled={saving || !name.trim() || items.length === 0}
          className="btn mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save protocol"}
        </button>
      </aside>
    </div>
  );
}

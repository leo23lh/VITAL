import { z } from "zod";
import { ProtocolItem } from "@/lib/types";
import { COMPOUNDS, getCompound } from "@/content/compounds";
import { PROTOCOL_TEMPLATES } from "@/content/protocol-templates";

/**
 * Reduced compound projection sent to the model — enough to select and dose
 * correctly, not the full essay-length catalog entry (mechanism, citations,
 * community reports, vendors, etc. are omitted).
 */
export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  goals: string[];
  evidenceLevel: string;
  dosingNotes: string | null;
}

export function buildCatalogContext(): CatalogEntry[] {
  return COMPOUNDS.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    goals: c.goals,
    evidenceLevel: c.evidenceLevel,
    dosingNotes: c.dosingNotes ?? null,
  }));
}

/** Reduced few-shot examples of sound compound/dose combinations. */
export interface TemplateExample {
  goal: string;
  name: string;
  rationale: string;
  items: {
    compoundId: string;
    dose: number;
    unit: string;
    frequency: string;
    timing: string;
  }[];
}

export function buildTemplateExamples(): TemplateExample[] {
  return PROTOCOL_TEMPLATES.map((t) => ({
    goal: t.goal,
    name: t.name,
    rationale: t.evidenceSummary,
    items: t.items.map((i) => ({
      compoundId: i.compoundId,
      dose: i.dose,
      unit: i.unit,
      frequency: i.frequency,
      timing: i.timing,
    })),
  }));
}

/**
 * Hand-written few-shot examples for tiers the curated templates don't cover.
 * Internal to the AI prompt only — never rendered as a browsable template card.
 */
export const AI_FEWSHOT_EXAMPLES: TemplateExample[] = [
  {
    goal: "Building muscle, open to a mild SARM",
    name: "Ostarine (research dose) + training support",
    rationale:
      "Ostarine (MK-2866) has the closest thing to real human dosing data among SARMs: cancer-cachexia trials used 1-3 mg/day of pharmaceutical-grade enobosarm under medical supervision. That is not the same as a validated consumer 'cycle' dose, and gray-market product content varies widely — evidence here is rated 'limited', not 'strong'. Creatine monohydrate is included alongside it as a strongly-evidenced, low-risk complement.",
    items: [
      { compoundId: "ostarine", dose: 2, unit: "mg", frequency: "once-daily", timing: "any" },
      {
        compoundId: "creatine-monohydrate",
        dose: 5,
        unit: "g",
        frequency: "once-daily",
        timing: "any",
      },
    ],
  },
  {
    goal: "Recovery and body composition, interested in a GH-axis peptide",
    name: "Tesamorelin (off-label) + recovery basics",
    rationale:
      "Tesamorelin's only real dosing data is its approved regimen — 2 mg/day by subcutaneous injection, prescribed and monitored by a clinician for a specific approved indication. Using it here for a recovery/body-composition goal is off-label; the dose below reflects that approved regimen, not a validated protocol for this use. Evidence for tesamorelin overall is rated 'strong', but only for its approved use — that distinction should be stated plainly. Magnesium glycinate is included as a strongly-evidenced complement for recovery.",
    items: [
      {
        compoundId: "tesamorelin",
        dose: 2,
        unit: "mg",
        frequency: "once-daily",
        timing: "evening",
      },
      {
        compoundId: "magnesium-glycinate",
        dose: 300,
        unit: "mg elemental",
        frequency: "once-daily",
        timing: "evening",
      },
    ],
  },
  {
    goal: "I'm currently on TRT and want help with sleep and recovery",
    name: "Sleep & recovery support alongside TRT",
    rationale:
      "This protocol only includes compounds with real grounded dosing for sleep and recovery — magnesium glycinate and L-theanine. Testosterone itself is not included as a dosed item here: therapeutic replacement doses are individualized by a clinician with monitoring, and there is no safe way to estimate a number for supraphysiologic or performance-oriented dosing outside that supervision. Questions about the TRT dose itself belong with the prescribing clinician, not this tool.",
    items: [
      {
        compoundId: "magnesium-glycinate",
        dose: 300,
        unit: "mg elemental",
        frequency: "once-daily",
        timing: "evening",
      },
      {
        compoundId: "l-theanine",
        dose: 200,
        unit: "mg",
        frequency: "once-daily",
        timing: "evening",
      },
    ],
  },
];

export const SYSTEM_PROMPT = `You are assembling a supplement/peptide/SARM/hormone protocol for a harm-reduction reference app. You MUST follow these rules exactly:

1. Use ONLY the compounds listed in the CATALOG you are given. Never invent a compound, and never use a compoundId that is not in the CATALOG.
2. For dose, unit, frequency, and timing, stay consistent with each compound's own "dosingNotes" and the EXAMPLE PROTOCOLS you are given. Do not invent a dose that isn't grounded in the compound's dosingNotes — and this applies to the "rationale" text too: if a compound has no dose you can ground this way, you may name it in the rationale and point to its catalog entry, but never state a specific numeric dose for it in prose either.
3. Compounds with category "supplement", "peptide", or "sarm" are eligible for any goal, on equal footing with each other.
4. Compounds with category "hormone" (testosterone, anabolic steroids, HGH, EPO, insulin) are eligible ONLY when the user's own goal text names that specific compound or clearly signals they are already using or specifically planning to use that hormone tier. If the goal is generic, do not include any hormone-category compound at all — not as a dosed item, and not named in the rationale.
5. Mention evidence quality (the "evidenceLevel" field) honestly in the rationale, but never use weaker evidence as a reason to silently drop a compound that the goal actually calls for.
6. If the user's goal doesn't map well to anything in the catalog, choose the closest reasonable compounds and say so plainly in "rationale" — do not stretch the truth to force a fit.
7. Call the propose_protocol tool exactly once with your answer. Do not respond in plain text.`;

export function buildUserMessage(goal: string): string {
  return [
    `Goal: ${goal}`,
    "",
    "CATALOG:",
    JSON.stringify(buildCatalogContext()),
    "",
    "EXAMPLE PROTOCOLS:",
    JSON.stringify([...buildTemplateExamples(), ...AI_FEWSHOT_EXAMPLES]),
  ].join("\n");
}

export const PROPOSE_PROTOCOL_TOOL = {
  name: "propose_protocol",
  description:
    "Propose a protocol assembled ONLY from the given catalog of compounds, grounded in each compound's own dosing notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "A short, descriptive name for this protocol." },
      goal: { type: "string", description: "A short label for the goal this protocol targets." },
      rationale: {
        type: "string",
        description: "A brief, plain-language explanation of why these compounds and doses were chosen.",
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            compoundId: { type: "string", description: "Must exactly match an id from the CATALOG." },
            dose: { type: "number" },
            unit: { type: "string" },
            frequency: {
              type: "string",
              enum: ["once-daily", "twice-daily", "every-other-day", "weekly", "as-needed"],
            },
            timing: {
              type: "string",
              enum: ["morning", "midday", "evening", "pre-workout", "post-workout", "with-food", "any"],
            },
            durationWeeks: { type: "number" },
          },
          required: ["compoundId", "dose", "unit", "frequency", "timing"],
        },
      },
    },
    required: ["name", "goal", "rationale", "items"],
  },
};

/** Structured shape the model must return, before catalog cross-checking. */
export const AIProtocolResponse = z.object({
  name: z.string(),
  goal: z.string(),
  rationale: z.string(),
  items: z.array(ProtocolItem),
});
export type AIProtocolResponse = z.infer<typeof AIProtocolResponse>;

export interface ValidationResult {
  ok: boolean;
  data?: AIProtocolResponse;
  error?: string;
}

/**
 * Cross-checks the model's raw tool input against the real catalog and the
 * response schema. Any compoundId not in COMPOUNDS is dropped, never
 * rendered. If nothing valid remains, the whole response is rejected.
 */
export function validateProtocolResponse(raw: unknown): ValidationResult {
  const parsed = AIProtocolResponse.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "The AI's response didn't match the expected shape." };
  }
  const validItems = parsed.data.items.filter((item) => !!getCompound(item.compoundId));
  if (validItems.length === 0) {
    return {
      ok: false,
      error: "The AI didn't return any compounds that exist in the catalog. Try rephrasing your goal.",
    };
  }
  return { ok: true, data: { ...parsed.data, items: validItems } };
}

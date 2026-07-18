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
  goals: string[];
  evidenceLevel: string;
  dosingNotes: string | null;
}

export function buildCatalogContext(): CatalogEntry[] {
  return COMPOUNDS.map((c) => ({
    id: c.id,
    name: c.name,
    goals: c.goals,
    evidenceLevel: c.evidenceLevel,
    dosingNotes: c.dosingNotes ?? null,
  }));
}

/** Reduced few-shot examples of sound compound/dose combinations. */
export interface TemplateExample {
  goal: string;
  name: string;
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
    items: t.items.map((i) => ({
      compoundId: i.compoundId,
      dose: i.dose,
      unit: i.unit,
      frequency: i.frequency,
      timing: i.timing,
    })),
  }));
}

export const SYSTEM_PROMPT = `You are assembling a supplement/peptide protocol for a harm-reduction reference app. You MUST follow these rules exactly:

1. Use ONLY the compounds listed in the CATALOG you are given. Never invent a compound, and never use a compoundId that is not in the CATALOG.
2. For dose, unit, frequency, and timing, stay consistent with each compound's own "dosingNotes" and the EXAMPLE PROTOCOLS you are given. Do not invent a dose that isn't grounded in the compound's dosingNotes.
3. If the user's goal doesn't map well to anything in the catalog, choose the closest reasonable compounds and say so plainly in "rationale" — do not stretch the truth to force a fit.
4. Prefer compounds with a stronger evidenceLevel ("strong" or "moderate") over "limited" or "anecdotal" ones when there is a reasonable choice, and mention evidence quality briefly in the rationale.
5. Call the propose_protocol tool exactly once with your answer. Do not respond in plain text.`;

export function buildUserMessage(goal: string): string {
  return [
    `Goal: ${goal}`,
    "",
    "CATALOG:",
    JSON.stringify(buildCatalogContext()),
    "",
    "EXAMPLE PROTOCOLS:",
    JSON.stringify(buildTemplateExamples()),
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

import { ProtocolTemplate } from "@/lib/types";
import type { ProtocolTemplate as TTemplate } from "@/lib/types";

/**
 * Curated, goal-based starting points. Doses come straight from each compound's
 * cited dosing notes — the builder never invents a dose. Compounds without an
 * established human dose (e.g. BPC-157) are intentionally NOT templated.
 */
const RAW: TTemplate[] = [
  {
    id: "strength-muscle",
    goal: "Strength & muscle",
    name: "Foundational strength stack",
    description:
      "The simplest evidence-based starting point for building strength and muscle alongside resistance training.",
    items: [
      {
        compoundId: "creatine-monohydrate",
        dose: 5,
        unit: "g",
        frequency: "once-daily",
        timing: "any",
      },
    ],
    ancillaries: [],
    evidenceSummary:
      "Creatine monohydrate has strong, repeatedly-replicated human evidence for strength and hypertrophy when combined with training.",
    disclaimer:
      "Stay hydrated. If you have kidney disease or reduced kidney function, talk to a doctor before using creatine.",
  },
  {
    id: "sleep-recovery",
    goal: "Sleep & recovery",
    name: "Wind-down stack",
    description:
      "An evening routine aimed at sleep quality and relaxation using well-tolerated supplements.",
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
    ancillaries: [],
    evidenceSummary:
      "Magnesium and L-theanine each have some randomized human trial support for sleep quality and relaxation, though effects are modest.",
    disclaimer:
      "Keep supplemental magnesium at or below 350 mg/day unless a clinician directs otherwise. Avoid with significant kidney disease.",
  },
  {
    id: "calm-focus",
    goal: "Calm focus",
    name: "Daytime focus starter",
    description:
      "A single-ingredient starting point for calm, non-jittery focus. Often paired with caffeine.",
    items: [
      {
        compoundId: "l-theanine",
        dose: 200,
        unit: "mg",
        frequency: "once-daily",
        timing: "morning",
      },
    ],
    ancillaries: [],
    evidenceSummary:
      "Small human trials suggest L-theanine reduces stress markers and supports attention, especially combined with caffeine.",
    disclaimer:
      "Effects are subtle and vary between people. Check with a clinician if you take blood-pressure or anxiety medication.",
  },
];

export const PROTOCOL_TEMPLATES: TTemplate[] = RAW.map((t) => ProtocolTemplate.parse(t));

export function getTemplate(id: string): TTemplate | undefined {
  return PROTOCOL_TEMPLATES.find((t) => t.id === id);
}

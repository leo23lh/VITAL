import type { EvidenceLevel } from "./types";

/**
 * Presentation rules for evidence. `showAutoDisclaimer` drives the safety
 * requirement that limited/anecdotal claims always carry a visible warning.
 */
export const EVIDENCE_META: Record<
  EvidenceLevel,
  { label: string; blurb: string; classes: string; showAutoDisclaimer: boolean }
> = {
  strong: {
    label: "Strong evidence",
    blurb: "Supported by multiple human randomized controlled trials or meta-analyses.",
    classes: "border-ev-strong text-ev-strong",
    showAutoDisclaimer: false,
  },
  moderate: {
    label: "Moderate evidence",
    blurb: "Some human trials exist, but the evidence base is limited or mixed.",
    classes: "border-ev-moderate text-ev-moderate",
    showAutoDisclaimer: false,
  },
  limited: {
    label: "Limited evidence",
    blurb: "Mostly preclinical (animal/in-vitro) data or very small human studies.",
    classes: "border-ev-limited text-ev-limited",
    showAutoDisclaimer: true,
  },
  anecdotal: {
    label: "Anecdotal only",
    blurb: "No reliable human studies. Claims rest on user reports, not evidence.",
    classes: "border-ev-anecdotal text-ev-anecdotal",
    showAutoDisclaimer: true,
  },
};

export function evidenceMeta(level: EvidenceLevel) {
  return EVIDENCE_META[level];
}

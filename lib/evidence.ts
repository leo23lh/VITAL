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
    classes: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    showAutoDisclaimer: false,
  },
  moderate: {
    label: "Moderate evidence",
    blurb: "Some human trials exist, but the evidence base is limited or mixed.",
    classes: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    showAutoDisclaimer: false,
  },
  limited: {
    label: "Limited evidence",
    blurb: "Mostly preclinical (animal/in-vitro) data or very small human studies.",
    classes: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    showAutoDisclaimer: true,
  },
  anecdotal: {
    label: "Anecdotal only",
    blurb: "No reliable human studies. Claims rest on user reports, not evidence.",
    classes: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    showAutoDisclaimer: true,
  },
};

export function evidenceMeta(level: EvidenceLevel) {
  return EVIDENCE_META[level];
}

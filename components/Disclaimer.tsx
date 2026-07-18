import { evidenceMeta } from "@/lib/evidence";
import type { EvidenceLevel } from "@/lib/types";

/** Amber warning box used for auto-disclaimers and custom disclaimers. */
export function Disclaimer({
  children,
  title = "Important",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-100">
      <p className="font-semibold">⚠️ {title}</p>
      <div className="mt-1 space-y-1">{children}</div>
    </div>
  );
}

/** Auto-rendered whenever a compound's evidence is limited/anecdotal. */
export function AutoEvidenceDisclaimer({ level }: { level: EvidenceLevel }) {
  const meta = evidenceMeta(level);
  if (!meta.showAutoDisclaimer) return null;
  return (
    <Disclaimer title="Evidence is limited">
      <p>{meta.blurb}</p>
      <p>
        Treat any benefits below as unproven. Do not rely on this for medical decisions, and
        speak with a healthcare professional.
      </p>
    </Disclaimer>
  );
}

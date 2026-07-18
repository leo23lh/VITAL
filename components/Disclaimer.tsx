import { evidenceMeta } from "@/lib/evidence";
import type { EvidenceLevel } from "@/lib/types";

/** Safety callout used for auto-disclaimers and custom disclaimers. */
export function Disclaimer({
  children,
  title = "Important",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="safety-callout text-sm text-body">
      <p className="safety-callout-label">{title}</p>
      <div className="space-y-1 font-sans">{children}</div>
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

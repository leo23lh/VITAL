import { evidenceMeta } from "@/lib/evidence";
import type { EvidenceLevel } from "@/lib/types";

export default function EvidenceBadge({
  level,
  withBlurb = false,
}: {
  level: EvidenceLevel;
  withBlurb?: boolean;
}) {
  const meta = evidenceMeta(level);
  return (
    <span
      title={meta.blurb}
      className={`inline-flex items-center gap-1 border px-[7px] py-[2px] font-sans text-[10.5px] uppercase tracking-[.5px] ${meta.classes}`}
    >
      {meta.label}
      {withBlurb && (
        <span className="hidden font-sans font-normal normal-case tracking-normal text-body opacity-80 sm:inline">
          · {meta.blurb}
        </span>
      )}
    </span>
  );
}

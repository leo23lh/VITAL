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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.classes}`}
    >
      {meta.label}
      {withBlurb && <span className="hidden font-normal opacity-80 sm:inline">· {meta.blurb}</span>}
    </span>
  );
}

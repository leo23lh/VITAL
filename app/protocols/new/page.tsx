import { COMPOUNDS } from "@/content/compounds";
import { PROTOCOL_TEMPLATES } from "@/content/protocol-templates";
import ProtocolBuilder from "@/components/ProtocolBuilder";

export const metadata = { title: "Build a protocol · Companion" };

export default function NewProtocolPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Build a protocol</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          Start from a goal-based template or from scratch, then tune the dosing to fit you.
        </p>
      </div>
      <ProtocolBuilder compounds={COMPOUNDS} templates={PROTOCOL_TEMPLATES} />
    </div>
  );
}

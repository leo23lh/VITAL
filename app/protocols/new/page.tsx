import { COMPOUNDS } from "@/content/compounds";
import { PROTOCOL_TEMPLATES } from "@/content/protocol-templates";
import ProtocolBuilder from "@/components/ProtocolBuilder";

export const metadata = { title: "Build a protocol · Companion" };

export default function NewProtocolPage() {
  return (
    <div>
      <p className="eyebrow">Build</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Build a protocol</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Start from a goal-based template or from scratch, then tune the dosing to fit you.
      </p>

      <div className="mt-10">
        <ProtocolBuilder compounds={COMPOUNDS} templates={PROTOCOL_TEMPLATES} />
      </div>
    </div>
  );
}

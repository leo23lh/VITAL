import { Disclaimer } from "@/components/Disclaimer";

export default function LegalPage() {
  return (
    <div>
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Legal &amp; Disclaimer</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        The fuller version of the disclaimer you acknowledged when you first opened VitalPeps.
      </p>

      <section className="mt-10 max-w-[640px]">
        <Disclaimer title="Not medical advice">
          <p>
            VitalPeps is an educational reference and personal tracker. It is not medical advice
            and is not a substitute for a licensed healthcare professional.
          </p>
          <p>
            Nothing here is a recommendation to take any substance. Talk to a doctor before
            starting, stopping, or changing anything — especially if you are pregnant, nursing,
            under 18, or taking medication.
          </p>
          <p>
            Evidence is graded honestly. Where studies are thin, you&apos;ll see a warning, and
            any testimonials are clearly marked as anecdotal, not proof.
          </p>
        </Disclaimer>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Research chemical status</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Many peptides cataloged here are sold as research chemicals and are not approved for
          human use. Laws vary by country. Purity and contents of any product are the
          responsibility of the seller, not this app.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Your data</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Everything you enter into VitalPeps — catalog interactions, protocols, and tracker
          history — lives in your browser&apos;s local storage (IndexedDB) on your own device.
          Nothing is transmitted to any server, except the text you type into the AI protocol
          builder, described below.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">AI protocol builder</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          When you use &ldquo;Describe your goal,&rdquo; the text you type is sent to a VitalPeps
          server route, which calls Anthropic&apos;s API to generate a suggested protocol. Every
          compound the AI suggests is cross-checked against the real catalog before it ever
          reaches your screen — nothing invented makes it through. The suggestion only pre-fills
          the same customize screen a manual protocol uses, and nothing is saved anywhere until
          you explicitly choose to save it.
        </p>
      </section>
    </div>
  );
}

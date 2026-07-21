import Link from "next/link";

export default function FaqPage() {
  return (
    <div>
      <p className="eyebrow">FAQ</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Answers to the questions we get asked most.
      </p>

      <section className="mt-10 max-w-[640px]">
        <h2 className="section-head">Safety &amp; evidence</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Is this medical advice?</strong> No. VitalPeps is an educational reference and
          personal tracker, not a substitute for a licensed healthcare professional. Talk to a
          doctor before starting, stopping, or changing anything. See the{" "}
          <Link href="/legal" className="text-rust hover:underline">
            Legal page
          </Link>{" "}
          for the full disclaimer.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>How is evidence graded, and why do some compounds have no listed dose?</strong>{" "}
          Every compound is rated strong, moderate, limited, or anecdotal based on the quality of
          human evidence behind it. Where no validated human dosing exists — BPC-157 and TB-500,
          for example — VitalPeps shows that gap honestly instead of inventing a number.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>
            Why are high-risk compounds (SARMs, hormones, AAS) in the catalog at all?
          </strong>{" "}
          Because people already use them, and an honest, evidence-graded entry with real risks
          spelled out is safer than no information or a vendor&apos;s marketing copy. High-risk
          entries are info-only — VitalPeps doesn&apos;t link to buy pages for insulin, EPO, AAS,
          or HGH.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Data &amp; privacy</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Where does my data live?</strong> In your browser&apos;s local storage
          (IndexedDB), on your device only. There&apos;s no account and no server-side database
          of your protocols or tracker history.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>What does the AI protocol builder send anywhere?</strong> Only the goal text
          you type — for example, &ldquo;help me recover from a shoulder injury&rdquo; — is sent
          to Anthropic&apos;s API to generate a suggested protocol. The suggestion is checked
          against the real catalog before you see it, and nothing is saved anywhere until you
          explicitly tap &ldquo;Save protocol.&rdquo;
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Can I delete my data?</strong> There&apos;s no dedicated export or delete tool
          yet. Since everything lives in your browser&apos;s local storage, clearing this
          site&apos;s data (or using a private/incognito window) removes it completely.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Using the app</h2>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>
            What&apos;s the difference between a template, AI-generated, and from-scratch
            protocol?
          </strong>{" "}
          A template is a curated, goal-based starting point you tune yourself. &ldquo;Describe
          your goal&rdquo; asks the AI builder to suggest a starting point from the same catalog
          instead. From scratch skips both and starts empty. All three land on the same
          customize screen, and nothing saves until you choose to save it.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>How does the tracker work day-to-day?</strong> Your active protocol&apos;s
          doses show up as a due-today list; logging one marks it done and feeds your adherence
          history over time.
        </p>

        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          <strong>Why do some catalog entries have no vendor/buy links?</strong> High-risk
          entries (insulin, EPO, AAS, HGH) are info-only by design. Some other vendors are
          clinician-gated telehealth services with no public price, so VitalPeps links to them
          without listing a price it can&apos;t verify.
        </p>
      </section>
    </div>
  );
}

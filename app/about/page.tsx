import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <p className="eyebrow">About</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">About VitalPeps</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        An educational reference and personal tracker for peptides and supplements — not a
        recommendation to use anything.
      </p>

      <section className="mt-10 max-w-[640px]">
        <h2 className="section-head">What this is</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          VitalPeps is a catalog, protocol builder, and dose tracker for peptides, supplements,
          SARMs, and hormones. Every entry is graded on the actual evidence behind it and sourced
          to real citations, not marketing copy or forum consensus. Everything you enter — your
          protocols, your dose history — stays on your own device.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Who it&apos;s for</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          People who are already using, or seriously considering, one of these compounds and
          want better-sourced information than a forum thread or a vendor&apos;s product page.
          This is harm reduction, not encouragement: the goal is that if you&apos;re going to do
          this, you do it with your eyes open.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">How evidence is graded</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          Every compound is rated <strong>strong</strong>, <strong>moderate</strong>,{" "}
          <strong>limited</strong>, or <strong>anecdotal</strong> based on the quality of human
          evidence behind it — not on how popular or promising it is. Where the evidence is
          thin, you&apos;ll see a warning inline rather than a confident-sounding dose. Some
          compounds, like BPC-157 and TB-500, have no validated human dosing at all, so
          VitalPeps deliberately doesn&apos;t offer one — inventing a number would be worse than
          leaving it blank.
        </p>
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">What it isn&apos;t</h2>
        <p className="mt-5 font-serif text-[16px] leading-[1.75] text-body">
          VitalPeps is not medical advice, not a recommendation to use any substance, and not a
          vendor or marketplace. It doesn&apos;t sell anything, and any vendor links in the
          catalog are third-party — read the{" "}
          <Link href="/legal" className="text-rust hover:underline">
            Legal page
          </Link>{" "}
          for the full picture.
        </p>
      </section>
    </div>
  );
}

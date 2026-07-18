import Link from "next/link";
import DueDoses from "@/components/DueDoses";

const FEATURES = [
  {
    href: "/catalog",
    eyebrow: "01 — Reference",
    title: "Catalog",
    body: "Mechanisms, benefits, side effects, honest evidence grading, and citations for every compound.",
  },
  {
    href: "/protocols/new",
    eyebrow: "02 — Build",
    title: "Protocol Creator",
    body: "Choose a goal, assemble a regimen from curated data — never invented, never guessed.",
  },
  {
    href: "/tracker",
    eyebrow: "03 — Track",
    title: "Tracker",
    body: "Log doses, watch adherence over time, and stay consistent.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Cover story */}
      <section>
        <p className="eyebrow">Cover Story</p>
        <h1 className="mt-3 max-w-3xl font-serif text-[38px] font-bold leading-[1.05] text-ink sm:text-[52px]">
          The Careful Guide to Peptide Therapy
        </h1>
        <p className="mt-4 max-w-[760px] font-serif text-[19px] italic leading-[1.5] text-body">
          A plain-language catalog of what the research actually shows, a protocol builder grounded
          in it, and a tracker to keep you honest — not a recommendation to use anything.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link href="/catalog" className="btn">
            Explore the catalog
          </Link>
          <Link href="/protocols/new" className="btn-secondary">
            Build a protocol →
          </Link>
        </div>
      </section>

      <div className="my-10">
        <hr className="rule" />
      </div>

      {/* Photograph band */}
      <section className="hatch flex h-[230px] items-center justify-center">
        <p className="font-mono text-[11px] text-muted">
          PHOTOGRAPH — still life, vials and syringe on linen
        </p>
      </section>

      <div className="my-10">
        <hr className="rule" />
      </div>

      {/* Three numbered features */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Link
            key={f.href}
            href={f.href}
            className={`block ${i > 0 ? "md:border-l md:border-rule md:pl-8" : ""}`}
          >
            <p className="eyebrow eyebrow--muted">{f.eyebrow}</p>
            <h2 className="mt-2 font-serif text-[22px] font-bold text-ink">{f.title}</h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-body">{f.body}</p>
          </Link>
        ))}
      </section>

      <div className="my-10">
        <hr className="rule" />
      </div>

      {/* Today's doses */}
      <section>
        <div className="section-head flex items-end justify-between">
          <span>Today&apos;s Doses</span>
          <Link href="/tracker" className="normal-case tracking-normal text-rust">
            Open tracker →
          </Link>
        </div>
        <div className="mt-5">
          <DueDoses compact />
        </div>
      </section>
    </div>
  );
}

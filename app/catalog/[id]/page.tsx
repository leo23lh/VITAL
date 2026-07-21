import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPOUNDS, getCompound } from "@/content/compounds";
import EvidenceBadge from "@/components/EvidenceBadge";
import VendorTable from "@/components/VendorTable";
import { AutoEvidenceDisclaimer, Disclaimer } from "@/components/Disclaimer";
import { evidenceMeta } from "@/lib/evidence";
import type { ReportedExperience } from "@/lib/types";

export function generateStaticParams() {
  return COMPOUNDS.map((c) => ({ id: c.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const c = getCompound(params.id);
  return { title: c ? `${c.name} · VitalPeps` : "Not found" };
}

/**
 * Editorial section: `.section-head` title (sans 13px, uppercase, 2px rule) with
 * its body beneath. `scroll-mt-24` keeps the heading clear of page chrome when a
 * jump-nav anchor lands on it.
 */
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="section-head">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** List copy: serif 14px/1.5 in `body` (never `muted` — that is meta only). */
function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="font-sans text-[12px] text-muted">—</p>;
  return (
    <ul className="list-disc space-y-2 pl-5 font-serif text-[14px] leading-[1.5] text-body">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

const SENTIMENT_LABEL: Record<ReportedExperience["sentiment"], string> = {
  positive: "positive",
  mixed: "mixed",
  negative: "negative",
};

/** Anecdote rendered as an editorial pull-quote with muted sans attribution. */
function QuoteBlock({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <figure className="pull-quote">
      <p>{quote}</p>
      <figcaption className="mt-3 font-sans text-[12px] not-italic leading-[1.5] text-muted">
        {attribution}
      </figcaption>
    </figure>
  );
}

export default function CompoundPage({ params }: { params: { id: string } }) {
  const c = getCompound(params.id);
  if (!c) notFound();

  const meta = evidenceMeta(c.evidenceLevel);
  const hasMechanism = !!c.mechanism;
  const hasEffects = !!c.effects && c.effects.whatToExpect.length > 0;
  const hasBenefits = c.benefits.length > 0 || c.sideEffects.length > 0;
  const hasReports = c.reportedExperiences.length > 0 || c.testimonials.length > 0;

  // Mechanism is a single string in content; split on blank lines so a future
  // multi-paragraph entry still only drop-caps its opening paragraph.
  const mechanismParas = c.mechanism.split(/\n\s*\n/).filter(Boolean);

  // "On this page" is built from the sections that will actually render — an
  // anchor is never offered for a section this compound has no content for.
  const jump: { id: string; label: string }[] = [
    ...(hasMechanism ? [{ id: "how", label: "How it works" }] : []),
    ...(hasEffects ? [{ id: "expect", label: "What to expect" }] : []),
    ...(hasBenefits ? [{ id: "effects", label: "Benefits & side effects" }] : []),
    ...(c.contraindications.length > 0 ? [{ id: "cautions", label: "Cautions" }] : []),
    ...(c.dosingNotes ? [{ id: "dosing", label: "Dosing" }] : []),
    ...(hasReports ? [{ id: "reports", label: "Community reports" }] : []),
    { id: "buy", label: "Where to buy" },
    { id: "research", label: "Research" },
  ];

  // Detail column: max-width 900px centered, 64px side padding (20px under
  // 768px). The root layout already supplies 20px / 40px, so md:px-6 tops the
  // desktop gutter up to 64px while mobile stays at the specified 20px.
  return (
    <article className="mx-auto w-full max-w-[900px] md:px-6">
      {/* ---- Header ---- */}
      <header>
        <Link href="/catalog" className="btn-secondary !py-0">
          ← Back to catalog
        </Link>

        <p className="eyebrow mt-6">
          {[c.category, c.goals[0]].filter(Boolean).join(" · ")}
        </p>

        <h1 className="mt-2 font-serif text-[46px] font-bold leading-[1.05] text-ink">
          {c.name}
        </h1>

        {c.aka.length > 0 && (
          <p className="mt-3 font-sans text-[13px] leading-[1.5] text-muted">
            Also known as: {c.aka.join(", ")}
          </p>
        )}

        <p className="mt-4 max-w-[680px] font-serif text-[19px] italic leading-[1.6] text-body">
          {c.summary}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <EvidenceBadge level={c.evidenceLevel} />
          <span className="font-sans text-[12px] leading-[1.5] text-muted">{meta.blurb}</span>
        </div>
      </header>

      {/* ---- Safety callouts: auto-evidence trigger + curated disclaimers ---- */}
      <div className="mt-8 space-y-4">
        <AutoEvidenceDisclaimer level={c.evidenceLevel} />
        {c.disclaimers.map((d, i) => (
          <Disclaimer key={i}>
            <p>{d}</p>
          </Disclaimer>
        ))}
      </div>

      {/* ---- On this page ---- */}
      <nav
        aria-label="On this page"
        className="mt-10 flex flex-wrap items-center gap-2 border-y border-rule py-3"
      >
        <span className="eyebrow eyebrow--muted mr-1">On this page</span>
        {jump.map((j) => (
          <a
            key={j.id}
            href={`#${j.id}`}
            className="border border-[rgba(22,19,17,.25)] px-[10px] py-[5px] font-sans text-[12px] leading-none text-body transition-colors hover:border-rust hover:text-rust"
          >
            {j.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-12">
        {hasMechanism && (
          <Section id="how" title="How it works">
            <div className="after:block after:clear-both after:content-['']">
              {mechanismParas.map((p, i) => (
                <p
                  key={i}
                  className={`font-serif text-[16px] leading-[1.75] text-body ${i > 0 ? "mt-4" : ""}`}
                >
                  {i === 0 ? (
                    <>
                      <span className="dropcap">{p.charAt(0)}</span>
                      {p.slice(1)}
                    </>
                  ) : (
                    p
                  )}
                </p>
              ))}
            </div>
          </Section>
        )}

        {hasEffects && (
          <Section id="expect" title="What to expect">
            {(c.effects!.onset || c.effects!.duration) && (
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {c.effects!.onset && (
                  <div className="stat-box">
                    <span className="stat-box-label">Onset</span>
                    <span className="stat-box-value mt-1 block">{c.effects!.onset}</span>
                  </div>
                )}
                {c.effects!.duration && (
                  <div className="stat-box">
                    <span className="stat-box-label">Duration</span>
                    <span className="stat-box-value mt-1 block">{c.effects!.duration}</span>
                  </div>
                )}
              </div>
            )}
            <Bullets items={c.effects!.whatToExpect} />
            <p className="mt-4 font-sans text-[12px] leading-[1.5] text-muted">
              Effects vary by person, dose, and product quality. This describes commonly reported
              effects — not a guarantee, and not medical advice.
            </p>
          </Section>
        )}

        {hasBenefits && (
          <div id="effects" className="grid scroll-mt-24 gap-10 md:grid-cols-2">
            <Section title="Reported benefits">
              <Bullets items={c.benefits} />
            </Section>
            <Section title="Possible side effects">
              <Bullets items={c.sideEffects} />
            </Section>
          </div>
        )}

        {c.contraindications.length > 0 && (
          <Section id="cautions" title="Cautions & contraindications">
            <Bullets items={c.contraindications} />
          </Section>
        )}

        {c.dosingNotes && (
          <Section id="dosing" title="Dosing notes">
            <p className="font-serif text-[16px] leading-[1.75] text-body">{c.dosingNotes}</p>
            <p className="mt-4 font-sans text-[12px] leading-[1.5] text-muted">
              {c.citations.length > 0
                ? "Informational only, drawn from the cited literature — not a prescription."
                : "Informational only — not a prescription. No validated dosing is established for this compound."}
            </p>
          </Section>
        )}

        {hasReports && (
          <Section id="reports" title="Community reports">
            {/* The whole block sits under one prominent anecdotal label. */}
            <Disclaimer title="Anecdotal — not evidence">
              <p>
                Curated summaries of what users commonly report. Individual experiences, not proof
                of safety or effectiveness.
              </p>
            </Disclaimer>

            <div className="mt-6 space-y-5">
              {c.reportedExperiences.map((r, i) => (
                <QuoteBlock
                  key={i}
                  quote={r.summary}
                  attribution={`— Community report on ${r.theme}, ${SENTIMENT_LABEL[r.sentiment]} sentiment`}
                />
              ))}

              {c.testimonials.map((t, i) => (
                <QuoteBlock
                  key={`t-${i}`}
                  quote={`“${t.text}”`}
                  attribution={`— ${t.source ?? "Community report"}, anecdotal`}
                />
              ))}
            </div>
          </Section>
        )}

        <Section id="buy" title="Where to buy · pricing · COA">
          <VendorTable vendors={c.vendors} />
        </Section>

        <Section id="research" title="Research & citations">
          {c.citations.length === 0 ? (
            <Disclaimer title="No studies cited">
              <p>
                No authentic human studies are cited for this compound. Treat all claims as
                unproven and speak with a healthcare professional.
              </p>
            </Disclaimer>
          ) : (
            <ol className="list-decimal space-y-5 pl-6 marker:font-sans marker:text-[12px] marker:text-muted">
              {c.citations.map((cit, i) => (
                <li key={i}>
                  <a
                    href={cit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-[16px] font-bold leading-[1.4] text-rust no-underline hover:underline"
                  >
                    {cit.title} ↗
                  </a>
                  <p className="mt-1 font-sans text-[12px] leading-[1.5] text-muted">
                    {[cit.authors, cit.journal, cit.year].filter(Boolean).join(" · ")}
                    {cit.doi && <> · DOI: {cit.doi}</>}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-5 font-sans text-[12px] leading-[1.5] text-muted">
            Citations retrieved from PubMed. Follow each link to read the source.
          </p>
        </Section>
      </div>
    </article>
  );
}

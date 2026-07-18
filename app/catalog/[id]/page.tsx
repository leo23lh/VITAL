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
  return { title: c ? `${c.name} · Companion` : "Not found" };
}

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
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="border-b-2 border-ink/15 pb-1 text-lg font-semibold uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-body">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

const SENTIMENT: Record<
  ReportedExperience["sentiment"],
  { label: string; bar: string; chip: string }
> = {
  positive: { label: "Reported positive", bar: "border-l-4 border-l-emerald-600", chip: "bg-emerald-100 text-emerald-900" },
  mixed: { label: "Mixed reports", bar: "border-l-4 border-l-amber-500", chip: "bg-amber-100 text-amber-900" },
  negative: { label: "Reported negative", bar: "border-l-4 border-l-rust", chip: "bg-rust/15 text-rust-dark" },
};

export default function CompoundPage({ params }: { params: { id: string } }) {
  const c = getCompound(params.id);
  if (!c) notFound();

  const meta = evidenceMeta(c.evidenceLevel);
  const hasEffects = !!c.effects && c.effects.whatToExpect.length > 0;
  const hasReports = c.reportedExperiences.length > 0 || c.testimonials.length > 0;

  // Build the "on this page" jump list from the sections that will actually render.
  const jump: { id: string; label: string }[] = [
    { id: "how", label: "How it works" },
    ...(hasEffects ? [{ id: "expect", label: "What to expect" }] : []),
    { id: "effects", label: "Benefits & side effects" },
    ...(c.contraindications.length > 0 ? [{ id: "cautions", label: "Cautions" }] : []),
    ...(c.dosingNotes ? [{ id: "dosing", label: "Dosing" }] : []),
    ...(hasReports ? [{ id: "reports", label: "Community reports" }] : []),
    { id: "buy", label: "Where to buy" },
    { id: "research", label: "Research" },
  ];

  return (
    <article className="space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/catalog" className="text-sm font-semibold text-rust-dark hover:underline">
          ← Back to catalogue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold">{c.name}</h1>
          <EvidenceBadge level={c.evidenceLevel} />
          <span className="bg-ink px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-widest text-cream">
            {c.category}
          </span>
        </div>
        {c.aka.length > 0 && (
          <p className="text-sm text-muted">Also known as: {c.aka.join(", ")}</p>
        )}
        <p className="max-w-3xl text-lg text-body">{c.summary}</p>
        <p className="text-xs text-muted">{meta.blurb}</p>
      </div>

      {/* Safety banners */}
      <AutoEvidenceDisclaimer level={c.evidenceLevel} />
      {c.disclaimers.map((d, i) => (
        <Disclaimer key={i}>
          <p>{d}</p>
        </Disclaimer>
      ))}

      {/* On this page */}
      <nav className="flex flex-wrap gap-2 border-y-2 border-ink/15 py-3">
        <span className="eyebrow self-center">On this page</span>
        {jump.map((j) => (
          <a
            key={j.id}
            href={`#${j.id}`}
            className="border border-ink/20 px-2.5 py-1 text-xs text-body transition hover:border-rust hover:text-rust-dark"
          >
            {j.label}
          </a>
        ))}
      </nav>

      <Section id="how" title="How it works">
        <p className="text-sm leading-relaxed text-body">{c.mechanism}</p>
      </Section>

      {hasEffects && (
        <Section id="expect" title="What to expect">
          {(c.effects!.onset || c.effects!.duration) && (
            <div className="flex flex-wrap gap-3">
              {c.effects!.onset && (
                <div className="border-2 border-ink/85 px-4 py-2">
                  <div className="eyebrow">Onset</div>
                  <div className="mt-0.5 text-sm font-semibold text-ink">{c.effects!.onset}</div>
                </div>
              )}
              {c.effects!.duration && (
                <div className="border-2 border-ink/85 px-4 py-2">
                  <div className="eyebrow">Duration</div>
                  <div className="mt-0.5 text-sm font-semibold text-ink">{c.effects!.duration}</div>
                </div>
              )}
            </div>
          )}
          <Bullets items={c.effects!.whatToExpect} />
          <p className="text-xs text-muted">
            Effects vary by person, dose, and product quality. This describes commonly reported
            effects — not a guarantee, and not medical advice.
          </p>
        </Section>
      )}

      <div id="effects" className="grid scroll-mt-24 gap-8 sm:grid-cols-2">
        <Section title="Reported benefits">
          <Bullets items={c.benefits} />
        </Section>
        <Section title="Possible side effects">
          <Bullets items={c.sideEffects} />
        </Section>
      </div>

      {c.contraindications.length > 0 && (
        <Section id="cautions" title="Cautions & contraindications">
          <Bullets items={c.contraindications} />
        </Section>
      )}

      {c.dosingNotes && (
        <Section id="dosing" title="Dosing notes">
          <p className="text-sm leading-relaxed text-body">{c.dosingNotes}</p>
          <p className="text-xs text-muted">
            {c.citations.length > 0
              ? "Informational only, drawn from the cited literature — not a prescription."
              : "Informational only — not a prescription. No validated dosing is established for this compound."}
          </p>
        </Section>
      )}

      {hasReports && (
        <Section id="reports" title="Community reports">
          <div className="border-2 border-rust/60 bg-rust/5 px-4 py-2">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-rust-dark">
              Anecdotal — not evidence
            </p>
            <p className="mt-0.5 text-xs text-body">
              Curated summaries of what users commonly report. Individual experiences, not proof of
              safety or effectiveness.
            </p>
          </div>

          <div className="space-y-3">
            {c.reportedExperiences.map((r, i) => {
              const s = SENTIMENT[r.sentiment];
              return (
                <div key={i} className={`bg-cream/40 py-2 pl-4 pr-3 ${s.bar}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
                      {r.theme}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.chip}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-body">{r.summary}</p>
                </div>
              );
            })}

            {c.testimonials.map((t, i) => (
              <div key={`t-${i}`} className="border-l-4 border-l-ink/30 bg-cream/40 py-2 pl-4 pr-3">
                <p className="text-sm italic text-body">
                  “{t.text}”{t.source && <span className="not-italic text-muted"> — {t.source}</span>}
                </p>
              </div>
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
          <ol className="space-y-3">
            {c.citations.map((cit, i) => (
              <li key={i} className="text-sm">
                <a
                  href={cit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-rust-dark hover:underline"
                >
                  {cit.title} ↗
                </a>
                <div className="text-xs text-muted">
                  {[cit.authors, cit.journal, cit.year].filter(Boolean).join(" · ")}
                  {cit.doi && <> · DOI: {cit.doi}</>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-muted">
          Citations retrieved from PubMed. Follow each link to read the source.
        </p>
      </Section>
    </article>
  );
}

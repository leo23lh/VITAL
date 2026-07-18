import Link from "next/link";
import DueDoses from "@/components/DueDoses";

const CARDS = [
  {
    href: "/catalog",
    title: "Catalog",
    body: "Browse peptides and supplements with mechanisms, benefits, side effects, honest evidence grading, citations, and vendor COAs.",
  },
  {
    href: "/protocols/new",
    title: "Build a protocol",
    body: "Pick a goal and assemble a dosing regimen with ancillary supplements — grounded in curated data, never invented.",
  },
  {
    href: "/tracker",
    title: "Track doses",
    body: "Log doses over time, see your adherence, and get reminders so you stay on track and stay safe.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Use supplements &amp; peptides more safely</h1>
        <p className="mt-2 max-w-2xl text-white/85">
          An educational reference and personal tracker. Understand what a compound does, what the
          evidence actually shows, where to check purity, and how to keep a consistent, careful
          routine.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/catalog"
            className="rounded-xl bg-white px-4 py-2 font-medium text-brand-700 transition hover:bg-white/90"
          >
            Explore the catalog
          </Link>
          <Link
            href="/protocols/new"
            className="rounded-xl border border-white/40 px-4 py-2 font-medium text-white transition hover:bg-white/10"
          >
            Build a protocol
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s doses</h2>
          <Link href="/tracker" className="text-sm text-brand-600 hover:underline dark:text-brand-300">
            Open tracker →
          </Link>
        </div>
        <DueDoses compact />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-black/10 p-5 transition hover:border-brand-400 hover:shadow-sm dark:border-white/10"
          >
            <h2 className="font-semibold text-brand-700 group-hover:text-brand-600 dark:text-brand-300">
              {c.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--foreground)]/70">{c.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

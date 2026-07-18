"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/catalog", label: "Catalogue" },
  { href: "/protocols", label: "Protocols" },
  { href: "/tracker", label: "Tracker" },
  { href: "/settings", label: "Settings" },
];

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display text-xl font-bold uppercase leading-none tracking-wide ${className}`}
    >
      Peptide<span className="text-rust">Co</span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: fixed dark sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-ink py-7 text-cream md:flex">
        <div className="px-6 pb-8">
          <Wordmark className="text-cream" />
        </div>
        <nav className="flex flex-col">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-6 py-3 font-display text-xs font-semibold uppercase tracking-widest transition ${
                  active ? "bg-rust text-cream" : "text-sage hover:text-cream"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: dark top bar with horizontal nav */}
      <header className="sticky top-0 z-40 bg-ink text-cream md:hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <Wordmark className="text-cream" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 pt-3">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-widest transition ${
                  active ? "bg-rust text-cream" : "text-sage"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}

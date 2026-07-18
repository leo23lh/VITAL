"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/protocols", label: "Protocols" },
  { href: "/tracker", label: "Tracker" },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Masthead strip: thin meta line above the main masthead */}
      <div className="masthead-strip px-5 md:px-10">
        <span>VitalPeps &middot; Vol. I</span>
        <span className="hidden md:inline">An educational reference — not medical advice</span>
        <span className="md:hidden">Not medical advice</span>
      </div>

      {/* Masthead: wordmark + primary nav */}
      <header className="flex items-center justify-between border-b-2 border-ink px-5 py-4 md:px-10">
        <Link href="/" className="font-serif text-[30px] font-bold leading-none text-ink">
          VitalPeps
        </Link>
        <nav className="hidden gap-6 md:flex">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`border-b-2 pb-1 font-sans text-[13px] uppercase tracking-wide ${
                  active ? "border-rust text-rust" : "border-transparent text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile: fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule bg-surface md:hidden">
        {LINKS.map((l) => {
          const active = isActive(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 border-t-2 py-3 text-center font-sans text-[11px] uppercase tracking-wide ${
                active ? "border-rust text-rust" : "border-transparent text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Nav from "@/components/Nav";
import DisclaimerGate from "@/components/DisclaimerGate";

export const metadata: Metadata = {
  title: "VitalPeps",
  description:
    "VitalPeps — an educational reference and personal tracker for peptides and supplements. Not medical advice.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VitalPeps" },
};

export const viewport: Viewport = {
  themeColor: "#161311",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <DisclaimerGate>
          <Nav />
          <main className="mx-auto max-w-[1200px] px-5 pb-24 pt-8 md:px-10 md:pb-12 md:pt-12">
            {children}
          </main>
          <footer className="border-t-2 border-rule pb-24 md:pb-0">
            <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10">
              <p className="max-w-3xl font-serif text-sm leading-relaxed text-body">
                Educational reference and personal tracker — <strong>not medical advice</strong>.
                Many peptides are unapproved research chemicals; consult a healthcare
                professional before use.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link href="/settings" className="btn-secondary inline-block">
                  Settings
                </Link>
                <Link href="/about" className="btn-secondary inline-block">
                  About
                </Link>
                <Link href="/faq" className="btn-secondary inline-block">
                  FAQ
                </Link>
                <Link href="/legal" className="btn-secondary inline-block">
                  Legal
                </Link>
              </div>
            </div>
          </footer>
        </DisclaimerGate>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function(){}); }); }`,
          }}
        />
      </body>
    </html>
  );
}

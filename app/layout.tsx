import type { Metadata, Viewport } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import DisclaimerGate from "@/components/DisclaimerGate";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peptide & Supplement Companion",
  description:
    "An educational catalog and personal tracker for peptides and supplements. Not medical advice.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Companion" },
};

export const viewport: Viewport = {
  themeColor: "#1a1613",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen font-sans">
        <DisclaimerGate>
          <div className="md:flex">
            <Nav />
            <div className="min-w-0 flex-1">
              <main className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">{children}</main>
              <footer className="mx-auto max-w-5xl border-t-2 border-ink/15 px-5 py-8 md:px-10">
                <p className="max-w-3xl text-xs leading-relaxed text-muted">
                  Educational reference and personal tracker — <strong>not medical advice</strong>.
                  Many peptides are unapproved research chemicals; consult a healthcare
                  professional before use.
                </p>
              </footer>
            </div>
          </div>
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

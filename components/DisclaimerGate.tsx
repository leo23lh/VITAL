"use client";

import { useEffect, useState } from "react";
import { acknowledgeDisclaimer, getSettings } from "@/lib/db";

/**
 * One-time "educational, not medical advice" gate. Blocks the app until the
 * user acknowledges. Acknowledgement is stored in Settings (IndexedDB).
 */
export default function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "blocked" | "ok">("loading");

  useEffect(() => {
    getSettings()
      .then((s) => setStatus(s.acknowledgedDisclaimerAt ? "ok" : "blocked"))
      .catch(() => setStatus("blocked"));
  }, []);

  async function accept() {
    await acknowledgeDisclaimer();
    setStatus("ok");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-ink bg-surface p-6">
          <h2 className="font-serif text-xl font-bold text-ink">Read this first</h2>
          <div className="mt-4 space-y-3 font-serif text-[16px] leading-[1.75] text-body">
            <p>
              This app is an <strong>educational reference and personal tracker</strong>. It is{" "}
              <strong>not medical advice</strong> and is not a substitute for a licensed
              healthcare professional.
            </p>
            <p>
              Many peptides are sold as <em>research chemicals</em> and are{" "}
              <strong>not approved for human use</strong>. Laws vary by country. Purity and
              contents of any product are the responsibility of the seller, not this app.
            </p>
            <p>
              Nothing here is a recommendation to take any substance. Talk to a doctor before
              starting, stopping, or changing anything — especially if you are pregnant,
              nursing, under 18, or taking medication.
            </p>
            <p>
              Evidence is graded honestly. Where studies are thin, you&apos;ll see a warning and
              any testimonials are clearly marked as <strong>anecdotal, not proof</strong>.
            </p>
          </div>
          <button onClick={accept} className="btn mt-6 w-full">
            I understand — this is not medical advice
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import type { Vendor } from "@/lib/types";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

/**
 * Shows where to buy — with price snapshots (retail) or a "priced after medical
 * evaluation" note (clinician-gated) — plus the COA link for each vendor. Vendor
 * links are third-party and open in a new tab; the app makes no purity guarantee.
 */
export default function VendorTable({ vendors }: { vendors: Vendor[] }) {
  if (vendors.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/25 p-4 text-sm text-muted">
        <p className="font-semibold text-ink">No buy links for this compound.</p>
        <p className="mt-1">
          Either no trusted vendor applies, or this is a widely available shelf supplement. When a
          seller you trust is listed here, its <strong>Certificate of Analysis (COA)</strong> and
          current pricing appear so you can check third-party purity before buying.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vendors.map((v) => (
        <div key={v.url} className="border-2 border-ink/85 bg-cream/40">
          {/* Vendor header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/85 bg-ink px-4 py-2.5 text-cream">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold uppercase tracking-wide">
                {v.name}
              </span>
              {v.pricingModel === "clinician-gated" && (
                <span className="bg-rust px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-widest text-cream">
                  Clinician-gated
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {v.coaUrl ? (
                <a
                  href={v.coaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-cream px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-wide text-ink hover:bg-white"
                >
                  View COA ↗
                </a>
              ) : (
                <span className="text-[11px] text-sage">No COA listed</span>
              )}
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[11px] font-semibold uppercase tracking-wide text-rust-dark underline decoration-rust/60 underline-offset-2 hover:text-cream"
                style={{ color: "#e0a184" }}
              >
                Visit ↗
              </a>
            </div>
          </div>

          {/* Body: prices or clinician note */}
          <div className="px-4 py-3">
            {v.pricingModel === "clinician-gated" ? (
              <p className="text-sm text-body">
                Priced after a medical evaluation, via licensed pharmacies — no fixed retail price.
                {v.notes ? ` ${v.notes}` : ""}
              </p>
            ) : v.products.length > 0 ? (
              <>
                <ul className="divide-y divide-ink/10">
                  {v.products.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="text-body">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-ink/30 underline-offset-2 hover:decoration-rust"
                          >
                            {p.label}
                          </a>
                        ) : (
                          p.label
                        )}
                      </span>
                      <span className="whitespace-nowrap font-display text-base font-semibold text-ink">
                        {formatPrice(p.price, p.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                {v.notes && <p className="mt-2 text-xs text-muted">{v.notes}</p>}
                {v.pricesCheckedAt && (
                  <p className="mt-1 text-xs text-muted">
                    Prices approximate · checked {v.pricesCheckedAt}. Confirm on the vendor site.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-body">
                Carried by this vendor — check the site for current pricing.
                {v.notes ? ` ${v.notes}` : ""}
              </p>
            )}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted">
        Vendor links are third-party. This app does not sell products and makes no purity
        guarantee — always confirm the COA matches your exact product and batch, and that a
        purchase is legal where you live.
      </p>
    </div>
  );
}

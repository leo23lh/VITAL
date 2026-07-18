import type { Vendor } from "@/lib/types";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

/** Sans 11px uppercase column label (also used as the stacked mobile label). */
function ColLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`block font-sans text-[11px] uppercase leading-[1.4] tracking-[1px] text-muted ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Shows where to buy — with price snapshots (retail) or a "priced after medical
 * evaluation" note (clinician-gated) — plus the COA link for each vendor. Vendor
 * links are third-party and open in a new tab; the app makes no purity guarantee.
 *
 * Editorial treatment: hairline `rule-soft` row separators, sans uppercase muted
 * column labels, serif vendor names, sans prices, rust COA links. Compounds with
 * no vendors (high-risk entries such as insulin, EPO, anabolic steroids) render
 * the explanatory empty state and never a buy link or price.
 */
export default function VendorTable({ vendors }: { vendors: Vendor[] }) {
  if (vendors.length === 0) {
    return (
      <div className="border border-rule bg-surface px-5 py-4">
        <ColLabel>No buy links for this compound</ColLabel>
        <p className="mt-2 font-serif text-[14px] leading-[1.6] text-body">
          Either no trusted vendor applies, or this is a widely available shelf supplement. When a
          seller you trust is listed here, its <strong>Certificate of Analysis (COA)</strong> and
          current pricing appear so you can check third-party purity before buying.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border-y border-rule-soft">
        {/* Column header row (desktop only — stacked rows carry inline labels) */}
        <div className="hidden gap-6 border-b border-rule-soft py-2 md:grid md:grid-cols-[1fr_1.5fr_auto]">
          <ColLabel>Vendor</ColLabel>
          <ColLabel>Product &amp; price</ColLabel>
          <ColLabel>Purity</ColLabel>
        </div>

        {vendors.map((v) => (
          <div
            key={v.url}
            className="grid gap-4 border-b border-rule-soft py-5 last:border-b-0 md:grid-cols-[1fr_1.5fr_auto] md:gap-6"
          >
            {/* Vendor */}
            <div>
              <ColLabel className="md:hidden">Vendor</ColLabel>
              <p className="mt-1 font-serif text-[18px] leading-[1.3] text-ink md:mt-0">{v.name}</p>
              {v.pricingModel === "clinician-gated" && (
                <span className="mt-1 inline-block font-sans text-[11px] uppercase tracking-[1px] text-rust">
                  Clinician-gated
                </span>
              )}
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block font-sans text-[12px] text-rust no-underline hover:underline"
              >
                Visit site ↗
              </a>
            </div>

            {/* Product & price */}
            <div>
              <ColLabel className="md:hidden">Product &amp; price</ColLabel>
              {v.pricingModel === "clinician-gated" ? (
                <p className="mt-1 font-serif text-[14px] leading-[1.6] text-body md:mt-0">
                  Priced after a medical evaluation, via licensed pharmacies — no fixed retail
                  price.
                  {v.notes ? ` ${v.notes}` : ""}
                </p>
              ) : v.products.length > 0 ? (
                <>
                  <ul className="mt-1 md:mt-0">
                    {v.products.map((p, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-soft py-2 first:pt-0 last:border-b-0 last:pb-0"
                      >
                        <span className="font-serif text-[14px] leading-[1.5] text-body">
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rust no-underline hover:underline"
                            >
                              {p.label}
                            </a>
                          ) : (
                            p.label
                          )}
                        </span>
                        <span className="whitespace-nowrap font-sans text-[14px] font-bold text-ink">
                          {formatPrice(p.price, p.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {v.notes && (
                    <p className="mt-2 font-sans text-[12px] leading-[1.5] text-muted">{v.notes}</p>
                  )}
                  {v.pricesCheckedAt && (
                    <p className="mt-1 font-sans text-[12px] leading-[1.5] text-muted">
                      Prices approximate · checked {v.pricesCheckedAt}. Confirm on the vendor site.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 font-serif text-[14px] leading-[1.6] text-body md:mt-0">
                  Carried by this vendor — check the site for current pricing.
                  {v.notes ? ` ${v.notes}` : ""}
                </p>
              )}
            </div>

            {/* Purity / COA */}
            <div>
              <ColLabel className="md:hidden">Purity</ColLabel>
              {v.coaUrl ? (
                <a
                  href={v.coaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block whitespace-nowrap font-sans text-[12px] text-rust no-underline hover:underline md:mt-0"
                >
                  View COA ↗
                </a>
              ) : (
                <span className="mt-1 block whitespace-nowrap font-sans text-[12px] text-muted md:mt-0">
                  No COA listed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 font-sans text-[12px] leading-[1.5] text-body">
        Vendor links are third-party. This app does not sell products and makes no purity
        guarantee — always confirm the COA matches your exact product and batch, and that a
        purchase is legal where you live.
      </p>
    </div>
  );
}

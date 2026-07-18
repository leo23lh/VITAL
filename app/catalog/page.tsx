import { COMPOUNDS, allGoals } from "@/content/compounds";
import CatalogBrowser from "@/components/CatalogBrowser";

export const metadata = { title: "Catalog · Peptide & Supplement Companion" };

export default function CatalogPage() {
  return (
    <div>
      <p className="eyebrow">Catalog</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Compounds, A&ndash;Z</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Search or filter by goal. Every entry carries an honest evidence grade — strong,
        moderate, limited, or anecdotal only.
      </p>

      <div className="mt-10">
        <CatalogBrowser compounds={COMPOUNDS} goals={allGoals()} />
      </div>
    </div>
  );
}

import { COMPOUNDS, allGoals } from "@/content/compounds";
import CatalogBrowser from "@/components/CatalogBrowser";

export const metadata = { title: "Catalog · Peptide & Supplement Companion" };

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catalog</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          Browse compounds with mechanisms, benefits, side effects, honest evidence grading,
          citations, and vendor COAs. Search or filter by type and goal.
        </p>
      </div>
      <CatalogBrowser compounds={COMPOUNDS} goals={allGoals()} />
    </div>
  );
}

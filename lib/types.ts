import { z } from "zod";

/**
 * Domain types for the catalog (curated, version-controlled seed content) and
 * for user data (protocols, dose logs, settings) persisted locally in IndexedDB.
 *
 * Every user-owned record carries a `userId` (default "local") so that moving to
 * a real multi-user backend later is an additive change, not a rewrite.
 */

export const DEFAULT_USER_ID = "local";

// ---------------------------------------------------------------------------
// Catalog content (seed data)
// ---------------------------------------------------------------------------

export const EvidenceLevel = z.enum(["strong", "moderate", "limited", "anecdotal"]);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

export const Category = z.enum(["peptide", "supplement", "sarm", "hormone"]);
export type Category = z.infer<typeof Category>;

export const Citation = z.object({
  title: z.string(),
  authors: z.string().optional(),
  year: z.number().int().optional(),
  journal: z.string().optional(),
  url: z.string().url(),
  pmid: z.string().optional(),
  doi: z.string().optional(),
});
export type Citation = z.infer<typeof Citation>;

export const Testimonial = z.object({
  text: z.string(),
  source: z.string().optional(),
  /** Always true in v1: renders the "anecdotal, not evidence" label. */
  disclaimerFlag: z.literal(true).default(true),
});
export type Testimonial = z.infer<typeof Testimonial>;

/** A specific purchasable SKU + its price snapshot. */
export const VendorProduct = z.object({
  /** e.g. "10mg/capsule × 60 caps" or "5mg vial". */
  label: z.string(),
  price: z.number().nonnegative(),
  currency: z.string().default("USD"),
  /** Direct product link, if different from the vendor's homepage. */
  url: z.string().url().optional(),
});
export type VendorProduct = z.infer<typeof VendorProduct>;

export const Vendor = z.object({
  name: z.string(),
  url: z.string().url(),
  /** Link to the vendor-published Certificate of Analysis, if available. */
  coaUrl: z.string().url().optional(),
  notes: z.string().optional(),
  /**
   * "retail" vendors list public prices in `products`. "clinician-gated"
   * vendors (e.g. Enhanced) price only after a medical evaluation, so they
   * carry no `products` and render a "price after eval" note instead.
   */
  pricingModel: z.enum(["retail", "clinician-gated"]).default("retail"),
  products: z.array(VendorProduct).default([]),
  /** Month the prices were last verified, e.g. "2026-07". */
  pricesCheckedAt: z.string().optional(),
});
export type Vendor = z.infer<typeof Vendor>;

/** Structured "what to expect" — physical/subjective effects people report. */
export const Effects = z.object({
  /** e.g. "Acute (within 30–60 min)" or "Builds over 2–4 weeks". */
  onset: z.string().optional(),
  /** How long a dose's effect lasts, if meaningful. */
  duration: z.string().optional(),
  /** Common physical and subjective effects, each evidence-caveated in text. */
  whatToExpect: z.array(z.string()).default([]),
});
export type Effects = z.infer<typeof Effects>;

/** A curated, organized theme of anecdotal user reports — never scraped quotes. */
export const ReportedExperience = z.object({
  theme: z.string(),
  sentiment: z.enum(["positive", "mixed", "negative"]),
  summary: z.string(),
});
export type ReportedExperience = z.infer<typeof ReportedExperience>;

export const Compound = z.object({
  id: z.string(),
  name: z.string(),
  aka: z.array(z.string()).default([]),
  category: Category,
  /** One-line summary shown in the catalog list. */
  summary: z.string(),
  mechanism: z.string(),
  /** Structured onset/timeline + common real-world effects. */
  effects: Effects.optional(),
  /** Organized anecdotal report themes (positive/mixed/negative). */
  reportedExperiences: z.array(ReportedExperience).default([]),
  benefits: z.array(z.string()).default([]),
  sideEffects: z.array(z.string()).default([]),
  contraindications: z.array(z.string()).default([]),
  /** Free-text dosing notes drawn from the cited literature — never invented. */
  dosingNotes: z.string().optional(),
  /** Goal tags used by the catalog filter and protocol builder. */
  goals: z.array(z.string()).default([]),
  evidenceLevel: EvidenceLevel,
  citations: z.array(Citation).default([]),
  disclaimers: z.array(z.string()).default([]),
  testimonials: z.array(Testimonial).default([]),
  vendors: z.array(Vendor).default([]),
});
export type Compound = z.infer<typeof Compound>;

// ---------------------------------------------------------------------------
// Protocol templates (curated) + user protocols
// ---------------------------------------------------------------------------

export const Frequency = z.enum([
  "once-daily",
  "twice-daily",
  "every-other-day",
  "weekly",
  "as-needed",
]);
export type Frequency = z.infer<typeof Frequency>;

export const Timing = z.enum([
  "morning",
  "midday",
  "evening",
  "pre-workout",
  "post-workout",
  "with-food",
  "any",
]);
export type Timing = z.infer<typeof Timing>;

export const ProtocolItem = z.object({
  compoundId: z.string(),
  dose: z.number().nonnegative(),
  unit: z.string(),
  frequency: Frequency,
  timing: Timing.default("any"),
  durationWeeks: z.number().int().positive().optional(),
});
export type ProtocolItem = z.infer<typeof ProtocolItem>;

export const Ancillary = z.object({
  compoundId: z.string(),
  reason: z.string(),
});
export type Ancillary = z.infer<typeof Ancillary>;

export const ProtocolTemplate = z.object({
  id: z.string(),
  goal: z.string(),
  name: z.string(),
  description: z.string(),
  items: z.array(ProtocolItem).default([]),
  ancillaries: z.array(Ancillary).default([]),
  evidenceSummary: z.string(),
  disclaimer: z.string(),
});
export type ProtocolTemplate = z.infer<typeof ProtocolTemplate>;

/** A user-created protocol, stored in IndexedDB. */
export interface Protocol {
  id: string;
  userId: string;
  name: string;
  goal: string;
  items: ProtocolItem[];
  ancillaries: Ancillary[];
  notes?: string;
  active: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Dose logging + settings (user data)
// ---------------------------------------------------------------------------

export type DoseStatus = "pending" | "taken" | "skipped";

export interface DoseLog {
  id: string;
  userId: string;
  protocolId: string;
  compoundId: string;
  /** Epoch ms for the scheduled dose slot (start of the day + timing offset). */
  scheduledAt: number;
  takenAt?: number;
  dose: number;
  unit: string;
  status: DoseStatus;
}

export interface QuietHours {
  start: string; // "22:00"
  end: string; // "07:00"
}

export interface Settings {
  userId: string;
  acknowledgedDisclaimerAt?: number;
  notificationsEnabled: boolean;
  quietHours?: QuietHours;
}

// Data model for data/people/<slug>.json. See CLAUDE.md for the full rules.

export const RELATIONSHIP_TYPES = [
  'mentor',
  'protégé',
  'employer',
  'employee',
  'colleague',
  'ally',
  'rival',
  'enemy',
  'donor',
  'funded_by',
  'co-founder',
  'family',
  'friend',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

/**
 * relationship_type describes what the CONNECTED person is to the file's subject.
 * In stephen-miller.json, {name: "Jeff Sessions", relationship_type: "employer"}
 * means "Jeff Sessions employed Stephen Miller". The reciprocal record in
 * jeff-sessions.json uses the inverse type ("employee").
 */
export const INVERSE_TYPE: Record<RelationshipType, RelationshipType> = {
  mentor: 'protégé',
  'protégé': 'mentor',
  employer: 'employee',
  employee: 'employer',
  donor: 'funded_by',
  funded_by: 'donor',
  colleague: 'colleague',
  ally: 'ally',
  rival: 'rival',
  enemy: 'enemy',
  'co-founder': 'co-founder',
  family: 'family',
  friend: 'friend',
};

/** Edge groups drive color, the legend and filtering. Inverse pairs share a group. */
export type EdgeGroup =
  | 'mentorship'
  | 'employment'
  | 'funding'
  | 'colleague'
  | 'ally'
  | 'rival'
  | 'enemy'
  | 'co-founder'
  | 'family'
  | 'friend';

/** Relationship families: the colors and filters in the viewer. Fine types stay in the details. */
export type EdgeFamily =
  | 'work'
  | 'money'
  | 'alliance'
  | 'rivalry'
  | 'past-rivalry'
  | 'enmity'
  | 'past-enmity'
  | 'personal';

export interface EdgeFamilyInfo {
  id: EdgeFamily;
  label: string;
  /** Validated as a set against the dark background; see CLAUDE.md "Colors". */
  color: string;
  hint: string;
  /** Dotted lines tell past rivalries and enmities from current ones without relying on color. */
  dotted?: boolean;
}

export const EDGE_FAMILIES: EdgeFamilyInfo[] = [
  { id: 'work', label: 'Work', color: '#8b95a8', hint: 'employer, colleague, co-founder' },
  { id: 'money', label: 'Money', color: '#008300', hint: 'donor → recipient' },
  { id: 'alliance', label: 'Alliance', color: '#9085e9', hint: 'ally' },
  { id: 'rivalry', label: 'Current rivalry', color: '#f0e442', hint: 'rivals: peers competing, ongoing' },
  { id: 'past-rivalry', label: 'Past rivalry', color: '#f0e442', hint: 'rivals, ended', dotted: true },
  { id: 'enmity', label: 'Current enemy', color: '#d55181', hint: 'enemy: one opposes the other, ongoing' },
  { id: 'past-enmity', label: 'Past enemy', color: '#d55181', hint: 'enemies, ended', dotted: true },
  { id: 'personal', label: 'Personal', color: '#c98500', hint: 'mentor, family, friend' },
];

export const EDGE_FAMILY_BY_ID: Record<EdgeFamily, EdgeFamilyInfo> = Object.fromEntries(
  EDGE_FAMILIES.map((f) => [f.id, f]),
) as Record<EdgeFamily, EdgeFamilyInfo>;

export interface EdgeGroupInfo {
  id: EdgeGroup;
  label: string;
  family: EdgeFamily;
  color: string;
  directed: boolean;
}

const G = (id: EdgeGroup, label: string, family: EdgeFamily, directed: boolean): EdgeGroupInfo => ({
  id,
  label,
  family,
  color: EDGE_FAMILY_BY_ID[family].color,
  directed,
});

export const EDGE_GROUPS: EdgeGroupInfo[] = [
  G('employment', 'Employer → employee', 'work', true),
  G('colleague', 'Colleague', 'work', false),
  G('co-founder', 'Co-founder', 'work', false),
  G('funding', 'Donor → recipient', 'money', true),
  G('ally', 'Ally', 'alliance', false),
  G('rival', 'Rival', 'rivalry', false),
  G('enemy', 'Enemy', 'enmity', false),
  G('mentorship', 'Mentor → protégé', 'personal', true),
  G('family', 'Family', 'personal', false),
  G('friend', 'Friend', 'personal', false),
];

export const EDGE_GROUP_BY_ID: Record<EdgeGroup, EdgeGroupInfo> = Object.fromEntries(
  EDGE_GROUPS.map((g) => [g.id, g]),
) as Record<EdgeGroup, EdgeGroupInfo>;

/** Which line wins the color when two people share several kinds of link. */
// A past rivalry or enmity only colors the line when nothing current links the pair.
export const FAMILY_PRIORITY: EdgeFamily[] = [
  'enmity',
  'rivalry',
  'money',
  'personal',
  'alliance',
  'work',
  'past-enmity',
  'past-rivalry',
];

/** Sector: one per person, tints their dot. Keep in sync with scripts/validate.mjs. */
export const SECTORS = [
  { id: 'politics', label: 'Government & politics', color: '#3987e5' },
  { id: 'tech', label: 'Tech & VC', color: '#e6e9ef' },
  { id: 'ai-defense', label: 'AI & defense', color: '#d95926' },
  { id: 'business', label: 'Business & donors', color: '#199e70' },
] as const;

export type Sector = (typeof SECTORS)[number]['id'];

export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<
  Sector,
  (typeof SECTORS)[number]
>;

/** Preset-view groups. A person can be in several. Keep in sync with scripts/validate.mjs. */
export const GROUPS = [
  { id: 'trump-circle', label: "Trump's inner circle" },
  { id: 'paypal-mafia', label: 'PayPal Mafia' },
  { id: 'tech-right', label: 'The Tech Right' },
  { id: 'ai-race', label: 'AI race' },
  { id: 'defense-tech', label: 'New defense primes' },
  { id: 'middle-east', label: 'Middle East dealmakers' },
  { id: 'media', label: 'Media & platforms' },
  { id: 'critics', label: 'Critics & opponents' },
  { id: '2028-race', label: '2028 race' },
  { id: 'natcon', label: 'National conservatism' },
] as const;

export type GroupId = (typeof GROUPS)[number]['id'];

/**
 * How a record in subject S's file about other person O maps to a graph edge.
 * `otherIsSource` = the edge arrow starts at O (e.g. O mentored S).
 */
export const TYPE_TO_EDGE: Record<RelationshipType, { group: EdgeGroup; otherIsSource: boolean }> = {
  mentor: { group: 'mentorship', otherIsSource: true },
  'protégé': { group: 'mentorship', otherIsSource: false },
  employer: { group: 'employment', otherIsSource: true },
  employee: { group: 'employment', otherIsSource: false },
  donor: { group: 'funding', otherIsSource: true },
  funded_by: { group: 'funding', otherIsSource: false },
  colleague: { group: 'colleague', otherIsSource: false },
  ally: { group: 'ally', otherIsSource: false },
  rival: { group: 'rival', otherIsSource: false },
  enemy: { group: 'enemy', otherIsSource: false },
  'co-founder': { group: 'co-founder', otherIsSource: false },
  family: { group: 'family', otherIsSource: false },
  friend: { group: 'friend', otherIsSource: false },
};

export interface Source {
  url: string;
  title?: string;
}

/** A URL string or {url, title}. Files for non-public people may use "user-provided". */
export type SourceRef = string | Source;

export interface TimelineEntry {
  year: number | null;
  end_year?: number | null;
  role: string;
  org: string;
  sources?: SourceRef[];
}

export interface Affiliation {
  name: string;
  role?: string;
  start_year?: number | null;
  end_year?: number | null;
  sources?: SourceRef[];
}

export interface Connection {
  name: string;
  slug: string;
  relationship_type: string;
  description?: string;
  start_year?: number | null;
  end_year?: number | null;
  confidence?: number;
  sources?: SourceRef[];
}

/** A freely licensed portrait saved in public/photos (see scripts/fetch-photos.mjs). */
export interface Photo {
  /** File name inside public/photos. */
  file: string;
  /** Photographer or rights holder, for the attribution the license requires. */
  credit: string;
  license: string;
  /** The image's Wikimedia Commons page. */
  source: Source;
}

/**
 * Political lean over one period: -3 far left … 0 centrist … +3 far right.
 * A person can have several periods (leans change); see CLAUDE.md "Political lean".
 */
export interface LeanPeriod {
  value: number;
  /** First year of this period; null or left out = since the start of their public record. */
  start_year?: number | null;
  /** Last year; null or left out = still current. */
  end_year?: number | null;
  /** The documented record behind the value: party, offices, donations, endorsements, self-description. */
  basis: string;
  sources: SourceRef[];
}

export const LEAN_LABELS: Record<number, string> = {
  [-3]: 'Far left',
  [-2]: 'Left',
  [-1]: 'Center-left',
  0: 'Centrist / nonpartisan',
  1: 'Center-right',
  2: 'Right',
  3: 'Far right',
};

export function leanLabel(value: number): string {
  return LEAN_LABELS[value] ?? `${value}`;
}

/**
 * The 2028 presidential race. A contender is someone reliable reporting or polling
 * treats as a likely 2028 candidate; a camp member is a close adviser, donor or
 * ally of one or more contenders (each listed contender must also be a connection).
 */
export interface Race2028 {
  role: 'contender' | 'camp';
  /** For camp members: the contenders' slugs. */
  contenders?: string[];
  basis: string;
  sources: SourceRef[];
}

/**
 * Government org chart: where a person sits. Units are listed in display order
 * (executive departments in order of presidential succession). Keep in sync with
 * scripts/validate.mjs (a test checks this). See CLAUDE.md "Office".
 */
export const OFFICE_UNITS = [
  { id: 'white-house', label: 'White House', branch: 'executive' },
  { id: 'eop', label: 'Executive Office of the President', branch: 'executive' },
  { id: 'state', label: 'State', branch: 'executive' },
  { id: 'treasury', label: 'Treasury', branch: 'executive' },
  { id: 'war', label: 'War (Defense)', branch: 'executive' },
  { id: 'justice', label: 'Justice', branch: 'executive' },
  { id: 'interior', label: 'Interior', branch: 'executive' },
  { id: 'agriculture', label: 'Agriculture', branch: 'executive' },
  { id: 'commerce', label: 'Commerce', branch: 'executive' },
  { id: 'labor', label: 'Labor', branch: 'executive' },
  { id: 'hhs', label: 'Health and Human Services', branch: 'executive' },
  { id: 'hud', label: 'Housing and Urban Development', branch: 'executive' },
  { id: 'transportation', label: 'Transportation', branch: 'executive' },
  { id: 'energy', label: 'Energy', branch: 'executive' },
  { id: 'education', label: 'Education', branch: 'executive' },
  { id: 'va', label: 'Veterans Affairs', branch: 'executive' },
  { id: 'dhs', label: 'Homeland Security', branch: 'executive' },
  { id: 'agencies', label: 'Agencies', branch: 'executive' },
  { id: 'envoys', label: 'Ambassadors and envoys', branch: 'executive' },
  { id: 'senate', label: 'Senate', branch: 'legislative' },
  { id: 'house', label: 'House', branch: 'legislative' },
] as const;
export type OfficeUnit = (typeof OFFICE_UNITS)[number]['id'];
export const OFFICE_UNIT_BY_ID = Object.fromEntries(OFFICE_UNITS.map((u) => [u.id, u])) as Record<
  OfficeUnit,
  (typeof OFFICE_UNITS)[number]
>;

/**
 * Rank inside a unit: 1 = head (secretary, chief of staff, party leader), 2 = deputy
 * (deputy secretary, whip), 3 = senior official (under secretary, department chief of
 * staff, committee chair), 4 = other appointee (assistant secretary, adviser, member).
 */
export type OfficeRank = 1 | 2 | 3 | 4;

/** A current government post (one per person: the main one). */
export interface Office {
  title: string;
  unit: OfficeUnit;
  rank: OfficeRank;
  /** Slug of the person they report to (must have a file). Omit when not documented. */
  reports_to?: string;
  /** YYYY, YYYY-MM or YYYY-MM-DD. */
  since?: string;
  acting?: boolean;
  sources: SourceRef[];
}

/**
 * What someone controls that people in power need: companies, deals, media, money,
 * voters. 1 = notable, 2 = major, 3 = systemic. See CLAUDE.md "Pull".
 */
export interface Leverage {
  level: 1 | 2 | 3;
  basis: string;
  sources: SourceRef[];
}

/** A documented meeting, call or deal with officials. Recent ones (last 12 months) raise pull. */
export interface AccessEvent {
  /** YYYY-MM-DD or YYYY-MM. */
  date: string;
  /** Slugs of the officials involved (must have files). */
  with: string[];
  what: string;
  sources: SourceRef[];
}

/** Political giving: what a donor gave, cycle by cycle, and a sourced outlook. See CLAUDE.md "Giving". */
export const RECIPIENT_KINDS = [
  { id: 'super-pac', label: 'Super PAC' },
  { id: 'dark-money', label: 'Dark-money group' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'party', label: 'Party committee' },
  { id: 'pac', label: 'PAC' },
  { id: 'ballot-measure', label: 'Ballot measure' },
  { id: 'other', label: 'Other' },
] as const;

export type RecipientKind = (typeof RECIPIENT_KINDS)[number]['id'];

/** Which side the money helps. "both" = gives to both parties (e.g. industry PACs). */
export const GIVING_SIDES = ['D', 'R', 'both', 'nonpartisan'] as const;
export type GivingSide = (typeof GIVING_SIDES)[number];

export interface GivingRecipient {
  /** A committee, group or candidate. */
  name: string;
  /** When the recipient is (or is run by) someone in the map, their slug. */
  slug?: string;
  /** When the recipient has its own file in data/orgs/, its slug. */
  org?: string;
  kind: RecipientKind;
  side?: GivingSide;
  /** Whole dollars, as reported. Leave out when no source gives a figure. */
  amount_usd?: number;
  description?: string;
  sources: SourceRef[];
}

export interface GivingCycle {
  /** Federal election cycle: the even year it ends in (2024, 2026). */
  cycle: number;
  /** Total given that cycle, as the cited ranking reports it. */
  total_usd?: number;
  /** Place on the cited ranking of top donors. */
  rank?: number;
  /** Which ranking total_usd and rank come from, e.g. "OpenSecrets, via Newsweek". */
  ranking?: string;
  description?: string;
  recipients?: GivingRecipient[];
  sources: SourceRef[];
}

/** A likely recipient next cycle. It must rest on reporting (stated plans, a long pattern), never a guess. */
export interface GivingProspect {
  name: string;
  slug?: string;
  org?: string;
  kind: RecipientKind;
  side?: GivingSide;
  basis: string;
  confidence: number;
  sources: SourceRef[];
}

export interface GivingOutlook {
  cycle: number;
  summary: string;
  likely?: GivingProspect[];
  sources?: SourceRef[];
}

export interface Giving {
  cycles?: GivingCycle[];
  outlook?: GivingOutlook;
}

export const RECIPIENT_KIND_LABEL = Object.fromEntries(RECIPIENT_KINDS.map((k) => [k.id, k.label])) as Record<
  RecipientKind,
  string
>;

/** $445.5M, $16M, $500K. */
export function formatUsd(n: number): string {
  const short = (v: number) => String(Number(v.toFixed(1)));
  if (n >= 1e9) return `$${short(n / 1e9)}B`;
  if (n >= 1e6) return `$${short(n / 1e6)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
}

export interface SourceConflict {
  topic: string;
  details: string;
  sources?: SourceRef[];
}

export interface Person {
  name: string;
  aliases?: string[];
  public_figure: boolean;
  /** The map owner's own file (public_figure false, user-provided details). */
  self_added?: boolean;
  /** One of SECTORS; tints the person's dot. */
  sector?: Sector;
  /** Any of GROUPS; drives the preset views. */
  groups?: GroupId[];
  photo?: Photo;
  /** Political lean by period; places the person left–right on the main map. */
  lean?: LeanPeriod[];
  /** Role in the 2028 presidential race, if any. */
  race_2028?: Race2028;
  /** Political giving by cycle, and who they are likely to fund next. */
  giving?: Giving;
  /** Year of death, for someone who has died: they keep their ties but hold no Pull and back no one. */
  died?: number;
  /** Current government post, for the org chart. */
  office?: Office;
  /** Junior official: shown in the org chart and Pull, kept off the main web unless searched for. */
  org_chart_only?: boolean;
  /** What they control that people in power need (raises Pull). */
  leverage?: Leverage;
  /** Documented meetings, calls and deals with officials (recent ones raise Pull). */
  access?: AccessEvent[];
  current_role?: string;
  summary?: string;
  /** Sources backing summary and current_role. */
  sources?: SourceRef[];
  timeline?: TimelineEntry[];
  affiliations?: (string | Affiliation)[];
  connections?: Connection[];
  /** Places where sources disagree. */
  source_conflicts?: SourceConflict[];
  notes?: string;
  last_researched?: string;
}

/** One file as served by the dev server. */
export interface PersonFile {
  slug: string;
  file: string;
  data: Person;
}

/**
 * Organizations: committees, think tanks, firms and movements that money and people
 * flow through. One file per organization in data/orgs/; see CLAUDE.md "Organizations".
 * Keep ORG_KINDS in sync with scripts/validate.mjs (a test checks this).
 */
export const ORG_KINDS = [
  { id: 'super-pac', label: 'Super PAC' },
  { id: 'dark-money', label: 'Dark-money group' },
  { id: 'pac', label: 'PAC' },
  { id: 'party', label: 'Party committee' },
  { id: 'think-tank', label: 'Think tank' },
  { id: 'advocacy', label: 'Advocacy group' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'investment-firm', label: 'Investment firm' },
  { id: 'company', label: 'Company' },
  { id: 'media', label: 'Media outlet' },
  { id: 'other', label: 'Organization' },
] as const;

export type OrgKind = (typeof ORG_KINDS)[number]['id'];

/** Border color of an organization's square, by the side it helps. */
export function orgSideColor(side: GivingSide | undefined): string {
  return side === 'R' ? '#e0605e' : side === 'D' ? '#4f8fe8' : '#a0a8b8';
}

export const ORG_KIND_LABEL = Object.fromEntries(ORG_KINDS.map((k) => [k.id, k.label])) as Record<OrgKind, string>;

/** Money in and out over one election cycle, as reported (FEC filings or reporting on them). */
export interface OrgFinance {
  cycle: number;
  raised_usd?: number;
  spent_usd?: number;
  description?: string;
  sources: SourceRef[];
}

/** Relationship types an organization can take part in (no mentors, family or friends). */
export const ORG_RELATIONSHIP_TYPES: RelationshipType[] = [
  'employer',
  'employee',
  'donor',
  'funded_by',
  'co-founder',
  'colleague',
  'ally',
  'rival',
  'enemy',
];

export interface Org {
  name: string;
  aliases?: string[];
  kind: OrgKind;
  /** Which side its money or work helps. */
  side?: GivingSide;
  founded?: number | null;
  /** Year it closed or stopped operating; left out while active. */
  dissolved?: number | null;
  groups?: GroupId[];
  summary?: string;
  sources?: SourceRef[];
  finances?: OrgFinance[];
  /** Same format and rules as a person's connections; the types read the same way. */
  connections?: Connection[];
  source_conflicts?: SourceConflict[];
  notes?: string;
  last_researched?: string;
}

export interface OrgFile {
  slug: string;
  file: string;
  data: Org;
}

export interface LoadError {
  file: string;
  message: string;
}

/** One entry in the Updates feed (data/updates.json): what changed on the map, and who it's about. */
export interface MapUpdate {
  /** Stable: the date plus a short label ("2026-11-08-hegseth-refresh"); the phone page's doc id. */
  id?: string;
  /** YYYY-MM-DD */
  date: string;
  text: string;
  /** Slugs of the people or organizations it's about. */
  people: string[];
}

export interface PeoplePayload {
  people: PersonFile[];
  orgs: OrgFile[];
  errors: LoadError[];
  /** Newest first. */
  updates?: MapUpdate[];
}

/** Accepts "protege"/"Protégé"/"funded by" etc. Returns null for unknown types. */
export function normalizeType(raw: string | undefined | null): RelationshipType | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/^protege$/, 'protégé')
    .replace(/^co_?founder$/, 'co-founder');
  return (RELATIONSHIP_TYPES as readonly string[]).includes(t) ? (t as RelationshipType) : null;
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sourceUrl(s: SourceRef): string {
  return typeof s === 'string' ? s : s.url;
}

export function sourceLabel(s: SourceRef): string {
  if (typeof s !== 'string' && s.title) return s.title;
  const url = sourceUrl(s);
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url);
}

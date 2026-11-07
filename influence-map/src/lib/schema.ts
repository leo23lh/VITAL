// Data model for data/people/<slug>.json. See CLAUDE.md for the full rules.

export const RELATIONSHIP_TYPES = [
  'mentor',
  'protégé',
  'employer',
  'employee',
  'colleague',
  'ally',
  'rival',
  'donor',
  'funded_by',
  'co-founder',
  'family',
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
  'co-founder': 'co-founder',
  family: 'family',
};

/** Edge groups drive color, the legend and filtering. Inverse pairs share a group. */
export type EdgeGroup =
  | 'mentorship'
  | 'employment'
  | 'funding'
  | 'colleague'
  | 'ally'
  | 'rival'
  | 'co-founder'
  | 'family';

/** Relationship families: the colors and filters in the viewer. Fine types stay in the details. */
export type EdgeFamily = 'work' | 'money' | 'alliance' | 'rivalry' | 'past-rivalry' | 'personal';

export interface EdgeFamilyInfo {
  id: EdgeFamily;
  label: string;
  /** Validated as a set against the dark background; see CLAUDE.md "Colors". */
  color: string;
  hint: string;
  /** Dotted lines tell past rivalries from current ones without relying on color. */
  dotted?: boolean;
}

export const EDGE_FAMILIES: EdgeFamilyInfo[] = [
  { id: 'work', label: 'Work', color: '#8b95a8', hint: 'employer, colleague, co-founder' },
  { id: 'money', label: 'Money', color: '#008300', hint: 'donor → recipient' },
  { id: 'alliance', label: 'Alliance', color: '#9085e9', hint: 'ally' },
  { id: 'rivalry', label: 'Current rivalry', color: '#d55181', hint: 'rival, ongoing' },
  { id: 'past-rivalry', label: 'Past rivalry', color: '#d55181', hint: 'rival, ended', dotted: true },
  { id: 'personal', label: 'Personal', color: '#c98500', hint: 'mentor, family' },
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
  G('mentorship', 'Mentor → protégé', 'personal', true),
  G('family', 'Family', 'personal', false),
];

export const EDGE_GROUP_BY_ID: Record<EdgeGroup, EdgeGroupInfo> = Object.fromEntries(
  EDGE_GROUPS.map((g) => [g.id, g]),
) as Record<EdgeGroup, EdgeGroupInfo>;

/** Which line wins the color when two people share several kinds of link. */
// A past rivalry only colors the line when nothing current links the pair.
export const FAMILY_PRIORITY: EdgeFamily[] = ['rivalry', 'money', 'personal', 'alliance', 'work', 'past-rivalry'];

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
  'co-founder': { group: 'co-founder', otherIsSource: false },
  family: { group: 'family', otherIsSource: false },
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

export interface SourceConflict {
  topic: string;
  details: string;
  sources?: SourceRef[];
}

export interface Person {
  name: string;
  aliases?: string[];
  public_figure: boolean;
  /** One of SECTORS; tints the person's dot. */
  sector?: Sector;
  /** Any of GROUPS; drives the preset views. */
  groups?: GroupId[];
  photo?: Photo;
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

export interface LoadError {
  file: string;
  message: string;
}

export interface PeoplePayload {
  people: PersonFile[];
  errors: LoadError[];
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

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

export interface EdgeGroupInfo {
  id: EdgeGroup;
  label: string;
  color: string;
  directed: boolean;
}

export const EDGE_GROUPS: EdgeGroupInfo[] = [
  { id: 'mentorship', label: 'Mentor → protégé', color: '#f5c542', directed: true },
  { id: 'employment', label: 'Employer → employee', color: '#4ea1ff', directed: true },
  { id: 'funding', label: 'Donor → recipient', color: '#34d399', directed: true },
  { id: 'co-founder', label: 'Co-founder', color: '#fb923c', directed: false },
  { id: 'colleague', label: 'Colleague', color: '#94a3b8', directed: false },
  { id: 'ally', label: 'Ally', color: '#a78bfa', directed: false },
  { id: 'rival', label: 'Rival', color: '#f87171', directed: false },
  { id: 'family', label: 'Family', color: '#f472b6', directed: false },
];

export const EDGE_GROUP_BY_ID: Record<EdgeGroup, EdgeGroupInfo> = Object.fromEntries(
  EDGE_GROUPS.map((g) => [g.id, g]),
) as Record<EdgeGroup, EdgeGroupInfo>;

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

export interface SourceConflict {
  topic: string;
  details: string;
  sources?: SourceRef[];
}

export interface Person {
  name: string;
  aliases?: string[];
  public_figure: boolean;
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

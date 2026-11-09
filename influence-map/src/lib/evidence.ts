// How well a tie is documented. Certainty is earned from the sources behind a record, not
// asserted: one news story can't carry a 95% tie. See CLAUDE.md "Evidence".

import { sourceUrl, type SourceRef } from './schema';

/**
 * record: official records and pages (government sites, filings), and the owner's own account of themselves.
 * news: news outlets (the default for a host that is in no list).
 * reference: encyclopedias and almanacs, which summarize other sources.
 * other: advocacy groups, think tanks, organizations' own pages, press-release wires, social media, personal sites.
 */
export type SourceTier = 'record' | 'news' | 'reference' | 'other';

/** How far one source of each tier goes toward establishing a fact on its own (0–1). */
export const TIER_WEIGHT: Record<SourceTier, number> = { record: 0.9, news: 0.7, reference: 0.6, other: 0.5 };

export const TIER_LABEL: Record<SourceTier, string> = {
  record: 'official record',
  news: 'news outlet',
  reference: 'reference work',
  other: 'other site',
};

/** Outlets under one owner or brand count once. Keys and values are registrable domains. */
const SAME_PUBLISHER: Record<string, string> = {
  'go.com': 'abcnews.com',
  'bnnbloomberg.ca': 'bloomberg.com',
  'bloombergquint.com': 'bloomberg.com',
  'bloomberglaw.com': 'bloomberg.com',
  'bgov.com': 'bloomberg.com',
  'wikiwand.com': 'wikipedia.org',
  'politicopro.com': 'politico.com',
  'huffingtonpost.co.uk': 'huffpost.com',
  'huffingtonpost.com': 'huffpost.com',
  'fb.com': 'facebook.com',
  'twitter.com': 'x.com',
};

const REFERENCE = new Set([
  'wikipedia.org',
  'britannica.com',
  'ballotpedia.org',
  'encyclopedia.com',
  'jewishvirtuallibrary.org',
  'millercenter.org',
]);

/** Not news: advocacy groups, think tanks, organizations' own pages, wires for press releases, social and personal sites. */
const OTHER = new Set([
  '45books.com', 'a16z.com', 'aacom.org', 'acquired.fm', 'afsa.org', 'aha.org', 'allsides.com', 'americafirstpolicy.com',
  'americancompass.org', 'article3project.org', 'astho.org', 'blackstone.com', 'blog.youtube', 'blumbergcapital.com',
  'brennancenter.org', 'businesswire.com', 'buzzsprout.com', 'carnegie.org', 'cato.org', 'chathamhouse.org', 'citizen.org',
  'claremont.org', 'commonwealthclub.org', 'contrary.com', 'cpi.org', 'danubeinstitute.hu', 'defensepriorities.org',
  'democracydocket.com', 'desmog.com', 'directemployers.org', 'electionlawblog.org', 'facebook.com', 'fedsoc.org',
  'followthecrypto.org', 'generalist.com', 'globenewswire.com', 'harbour.space', 'heritage.org', 'hopenothate.org.uk',
  'independent.org', 'influencewatch.org', 'instagram.com', 'isi.org', 'issueone.org', 'jakechampion.name', 'legis1.com',
  'linkedin.com', 'littlesis.org', 'mba.org', 'mcc.hu', 'mediamatters.org', 'medium.com', 'megynkelly.com',
  'militarist-monitor.org', 'nationalconservatism.org', 'niskanencenter.org', 'openai.com', 'openphilanthropy.org',
  'opensocietyfoundations.org', 'orrick.com', 'politicalwire.com', 'prnewswire.com', 'rebuilding.tech', 'scaruffi.com',
  'shrm.org', 'sourcewatch.org', 'splcenter.org', 'substack.com', 'therevolvingdoorproject.org', 'truthsocial.com',
  'vator.tv', 'wexnerfoundation.org', 'x.com', 'yoramhazony.org', 'youtube.com',
]);

/** Second-level suffixes where the registrable domain has three labels (bbc.co.uk). */
const TWO_LABEL_SUFFIX = /\.(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/;

export interface Publisher {
  /** Registrable domain after merging brands: "thehill.com", "state.gov". */
  domain: string;
  tier: SourceTier;
}

/** The publisher behind a source, or null when it isn't a usable source. */
export function publisherOf(source: SourceRef, ownSlugs: string[] = []): Publisher | null {
  const raw = sourceUrl(source);
  if (raw === 'user-provided') return { domain: 'user-provided', tier: 'record' };
  let host: string;
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    host = u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  const labels = host.split('.');
  const keep = TWO_LABEL_SUFFIX.test(host) ? 3 : 2;
  let domain = OTHER.has(host) ? host : labels.slice(-keep).join('.');
  domain = SAME_PUBLISHER[domain] ?? domain;

  let tier: SourceTier = 'news';
  if (/\.(gov|mil)(\.[a-z]{2})?$/.test(domain) || /^gov\.[a-z]{2}$/.test(labels.slice(-2).join('.'))) tier = 'record';
  else if (REFERENCE.has(domain)) tier = 'reference';
  else if (OTHER.has(domain) || /\.edu$/.test(domain)) tier = 'other';
  // An organization's own page is the record for its own people and money (openai.com on a tie to OpenAI).
  const brand = domain.split('.')[0];
  if (tier !== 'record' && ownSlugs.some((s) => s.replace(/-/g, '') === brand.replace(/-/g, ''))) tier = 'record';
  return { domain, tier };
}

export type EvidenceGrade = 'strong' | 'solid' | 'thin' | 'none';

export const GRADE_LABEL: Record<EvidenceGrade, string> = {
  strong: 'Strong',
  solid: 'Solid',
  thin: 'Thin',
  none: 'Unsourced',
};

export interface Evidence {
  /** 0–1: the chance-like weight of the independent publishers combined (1 − Π(1 − weight)). */
  score: number;
  grade: EvidenceGrade;
  /** Independent publishers, strongest tier first. */
  publishers: Publisher[];
  /** The most confidence this much evidence can carry. */
  cap: number;
  /** "2 independent sources (1 official record)". */
  note: string;
}

const TIER_ORDER: SourceTier[] = ['record', 'news', 'reference', 'other'];

/** Confidence a single source can carry, by tier; an official record carries full confidence. */
const SINGLE_CAP: Record<SourceTier, number> = { record: 1, news: 0.8, reference: 0.75, other: 0.7 };
const SOLID_CAP = 0.9;
const NONE_CAP = 0.5;

/**
 * Grades the sources behind one tie. Strong: an official record, or two independent news outlets
 * (or better). Solid: two independent sources where one is a reference work or a minor site.
 * Thin: a single source that isn't an official record. Sources from one publisher count once.
 * `ownSlugs`: the two ends of the tie, so an organization's own site counts as its record.
 */
export function evidenceOf(sources: SourceRef[] | undefined, ownSlugs: string[] = []): Evidence {
  const byDomain = new Map<string, Publisher>();
  for (const s of sources ?? []) {
    const p = publisherOf(s, ownSlugs);
    if (!p) continue;
    const seen = byDomain.get(p.domain);
    if (!seen || TIER_ORDER.indexOf(p.tier) < TIER_ORDER.indexOf(seen.tier)) byDomain.set(p.domain, p);
  }
  const publishers = [...byDomain.values()].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.domain.localeCompare(b.domain),
  );
  const score = 1 - publishers.reduce((miss, p) => miss * (1 - TIER_WEIGHT[p.tier]), 1);
  const grade: EvidenceGrade = !publishers.length ? 'none' : score >= 0.9 - 1e-9 ? 'strong' : score >= 0.75 - 1e-9 ? 'solid' : 'thin';
  const cap =
    grade === 'strong' ? 1 : grade === 'solid' ? SOLID_CAP : grade === 'thin' ? SINGLE_CAP[publishers[0].tier] : NONE_CAP;

  const records = publishers.filter((p) => p.tier === 'record').length;
  const n = publishers.length;
  const note = !n
    ? 'No usable source'
    : n === 1
      ? `1 source (${TIER_LABEL[publishers[0].tier]})`
      : `${n} independent sources${records ? ` (${records} official record${records > 1 ? 's' : ''})` : ''}`;
  return { score, grade, publishers, cap, note };
}

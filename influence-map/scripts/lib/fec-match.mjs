// Deciding whether an FEC receipt belongs to a person on the map. Names repeat across the
// country, so a record counts only when the name matches AND the employer or occupation on the
// filing matches something from the person's public record (or a rule in data/fec.json says so).
// Nothing from the filing's address fields is read or kept.

export const norm = (s) =>
  (s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'MR', 'MRS', 'MS', 'DR', 'HON', 'ESQ']);
/** Words too common in employer names to identify anyone. */
const GENERIC = new Set(
  `THE AND FOR INC LLC LLP CORP CORPORATION COMPANY GROUP HOLDINGS PARTNERS PARTNER CAPITAL MANAGEMENT VENTURES VENTURE FUND FUNDS
   TECHNOLOGIES TECHNOLOGY INDUSTRIES GLOBAL INTERNATIONAL AMERICA AMERICAN AMERICANS NATIONAL UNITED STATES STATE DEPARTMENT OFFICE HOUSE
   SENATE WHITE CAMPAIGN COMMITTEE INSTITUTE FOUNDATION UNIVERSITY COLLEGE SCHOOL CENTER ASSOCIATION COUNCIL BOARD PROJECT ACTION POLICY
   FIRST NEW GREAT FREEDOM LIBERTY FUTURE PAC SUPER PRESIDENT PRESIDENTIAL ADMINISTRATION GOVERNMENT FEDERAL PUBLIC SERVICE SERVICES
   NEWS MEDIA NETWORK SHOW HOST LABS LAB RESEARCH SYSTEMS SOLUTIONS ENTERPRISES INVESTMENTS INVESTMENT EQUITY ADVISORS ASSOCIATES
   BANK TRUST FINANCIAL WORLD CITY COUNTY PARTY DEMOCRATIC REPUBLICAN TRANSITION TEAM STAFF SENATOR REPRESENTATIVE CONGRESS CONGRESSIONAL
   SELF EMPLOYED RETIRED NONE NOT INFORMATION REQUESTED HOMEMAKER`.split(/\s+/),
);

/** "Benjamin A. Horowitz Jr." → { last: "HOROWITZ", first: "BENJAMIN" }. */
export function nameParts(name) {
  const t = norm(name).split(' ').filter((x) => !SUFFIXES.has(x));
  return { last: t[t.length - 1], first: t[0] };
}

/** Distinctive words from a person's own record (employers, organizations, role) to look for on a filing. */
export function autoKeywords(person, orgNames = []) {
  const texts = [
    ...(person.timeline ?? []).map((e) => e.org),
    ...(person.affiliations ?? []).map((a) => (typeof a === 'string' ? a : a.name)),
    ...orgNames,
  ];
  const words = new Set();
  for (const t of texts) for (const w of norm(t).split(' ')) if (w.length >= 4 && !GENERIC.has(w) && !/^\d+$/.test(w)) words.add(w);
  const { last, first } = nameParts(person.name);
  // Their own surname in an employer name is fine ("Soros Fund Management"); a first name alone is not.
  words.delete(first);
  words.add(last);
  return [...words].sort();
}

/**
 * Whether one schedule A record belongs to the donor. `rule` is the donor's entry in data/fec.json:
 * { first: [accepted first names], employers: [words or phrases], large_usd: accept a name match of at
 * least this size whatever the employer says, also: [exact contributor names, e.g. a trust] }.
 * Returns 'yes', or the reason it was turned away ('name' or 'employer').
 */
export function matches(record, person, rule) {
  const raw = record.contributor_name ?? '';
  if ((rule.also ?? []).some((n) => norm(n) === norm(raw))) return 'yes';
  const [lastPart, rest = ''] = raw.split(',');
  const { last, first } = nameParts(person.name);
  if (norm(lastPart) !== last) return 'name';
  const firstOnRecord = norm(rest).split(' ').filter((x) => !SUFFIXES.has(x))[0] ?? '';
  const firsts = [first, ...(rule.first ?? []).map(norm)];
  if (!firsts.includes(firstOnRecord)) return 'name';
  const employer = ` ${norm(record.contributor_employer)} ${norm(record.contributor_occupation)} `;
  if ((rule.employers ?? []).some((k) => employer.includes(` ${norm(k)} `) || (norm(k).length >= 6 && employer.includes(norm(k))))) return 'yes';
  if (rule.large_usd && Math.abs(record.contribution_receipt_amount ?? 0) >= rule.large_usd) return 'yes';
  return 'employer';
}

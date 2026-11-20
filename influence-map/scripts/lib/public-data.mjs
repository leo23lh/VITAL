// The public copy of the map's data, for the public web build (scripts/build-web.mjs).
// It leaves out every file that is not a public figure's (the owner's own file included),
// every link to those files, and any sentence in a remaining file's notes that names them.
// `leaks()` then checks the result, so a slip fails the build instead of reaching the site.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const readDir = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => ({ slug: f.replace(/\.json$/, ''), file: f, data: JSON.parse(readFileSync(join(dir, f), 'utf8')) }))
    : [];
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);

/** Files that stay off the public site. */
export const isPrivate = (data) => data.public_figure === false || data.self_added === true;

/** { payload, dropped } — payload in the shape the viewer loads; dropped = [{ slug, names }]. */
export function publicPayload(root) {
  const people = readDir(join(root, 'data', 'people'));
  const orgs = readDir(join(root, 'data', 'orgs'));
  const dropped = people.filter((f) => isPrivate(f.data)).map((f) => ({ slug: f.slug, names: [f.data.name, ...(f.data.aliases ?? [])].filter(Boolean) }));
  const gone = new Set(dropped.map((d) => d.slug));
  const names = dropped.flatMap((d) => d.names);
  const mentions = (s) => typeof s === 'string' && names.some((n) => s.includes(n));
  // Notes are free text: drop just the sentences that name someone left out.
  const scrubNotes = (notes) =>
    typeof notes === 'string'
      ? notes
          .split(/(?<=[.!?])\s+/)
          .filter((s) => !mentions(s))
          .join(' ')
      : notes;
  const clean = (f) => {
    const data = { ...f.data };
    data.connections = (data.connections ?? []).filter((c) => !gone.has(c.slug));
    if (data.notes !== undefined) data.notes = scrubNotes(data.notes);
    if (data.race_2028?.contenders) data.race_2028 = { ...data.race_2028, contenders: data.race_2028.contenders.filter((s) => !gone.has(s)) };
    if (data.office?.reports_to && gone.has(data.office.reports_to)) data.office = { ...data.office, reports_to: undefined };
    if (data.access) data.access = data.access.map((a) => ({ ...a, with: a.with.filter((s) => !gone.has(s)) })).filter((a) => a.with.length);
    if (data.asks) data.asks = data.asks.map((a) => ({ ...a, with: a.with.filter((s) => !gone.has(s)) }));
    return { slug: f.slug, file: f.file, data };
  };
  const updates = readJson(join(root, 'data', 'updates.json'), [])
    .filter((u) => !mentions(u.text))
    .map((u) => ({ ...u, people: (u.people ?? []).filter((s) => !gone.has(s)) }));
  const months = readJson(join(root, 'data', 'history.json'), { months: {} }).months ?? {};
  const history = Object.fromEntries(
    Object.entries(months).map(([m, snap]) => [
      m,
      {
        ...snap,
        pull: Object.fromEntries(Object.entries(snap.pull ?? {}).filter(([s]) => !gone.has(s))),
        first: Object.fromEntries(Object.entries(snap.first ?? {}).filter(([s]) => !gone.has(s))),
      },
    ]),
  );
  return {
    payload: {
      people: people.filter((f) => !gone.has(f.slug)).map(clean),
      orgs: orgs.map(clean),
      updates,
      history,
      errors: [],
    },
    dropped,
  };
}

/** Everything in the payload that still points at a left-out file: [] when clean. */
export function leaks(payload, dropped) {
  const text = JSON.stringify(payload);
  const found = [];
  for (const d of dropped) {
    if (new RegExp(`"${d.slug}"`).test(text)) found.push(`slug ${d.slug}`);
    for (const n of d.names) if (n.split(/\s+/).length > 1 && text.includes(n) && !aliasOfKept(payload, n)) found.push(`name "${n}"`);
  }
  if (text.includes('user-provided')) found.push('a "user-provided" source');
  return found;
}

// A left-out person's full name can be part of a kept person's own recorded alias
// (a married name, say); that is the kept person's public record, not a leak.
function aliasOfKept(payload, name) {
  return payload.people.some((f) => (f.data.aliases ?? []).some((a) => a.includes(name)));
}

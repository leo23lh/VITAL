// Drafts a short "what changed" note from the map's own records, for a newsletter or a post.
//   node influence-map/scripts/briefing.mjs                    the past 7 days
//   node influence-map/scripts/briefing.mjs --since 2026-11-01
//   node influence-map/scripts/briefing.mjs --save             also write briefings/<today>.md
// It only restates what the files say (each item points to the person, whose file cites the
// sources). Private files are left out, as on the public site. Edit the draft before sending.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPrivate } from './lib/public-data.mjs';
import { ROOT, readData, withLib } from './lib/load.mjs';

const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const REPO = join(ROOT, '..');
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 64e6 }).trim();

// The people files as they stood at the start of the period.
const rev = git('rev-list', '-1', `--before=${since}T00:00:00`, 'HEAD');
const before = new Map();
if (rev)
  for (const path of git('ls-tree', '-r', '--name-only', rev, 'influence-map/data/people').split('\n').filter((p) => p.endsWith('.json')))
    before.set(path.split('/').pop().replace(/\.json$/, ''), JSON.parse(git('show', `${rev}:${path}`)));

const { people, orgs } = readData();
const now = new Map(people.map((f) => [f.slug, f.data]));
const hidden = new Set([...now].filter(([, d]) => isPrivate(d)).map(([s]) => s));
const nameOf = (s) => now.get(s)?.name ?? orgs.find((o) => o.slug === s)?.data.name ?? before.get(s)?.name ?? s;
const shown = (...slugs) => slugs.every((s) => !hidden.has(s));

// Ties: one record per pair and type, read from the file whose slug sorts first.
const ties = (files) => {
  const out = new Map();
  for (const [slug, d] of files)
    for (const c of d.connections ?? [])
      if (slug < c.slug || !files.has(c.slug)) out.set(`${slug}>${c.slug}>${c.relationship_type}`, { a: slug, b: c.slug, type: c.relationship_type, end: c.end_year, text: c.description });
  return out;
};
const was = ties(before);
const is = ties(now);
const added = [...is].filter(([k]) => !was.has(k)).map(([, t]) => t).filter((t) => shown(t.a, t.b));
const ended = [...is].filter(([k, t]) => was.has(k) && typeof t.end === 'number' && was.get(k).end == null).map(([, t]) => t).filter((t) => shown(t.a, t.b));
const feuds = added.filter((t) => t.type === 'rival' || t.type === 'enemy');
const friendly = added.filter((t) => t.type !== 'rival' && t.type !== 'enemy');
const newPeople = [...now.keys()].filter((s) => !before.has(s) && shown(s) && now.get(s).public_figure !== false);

const updates = JSON.parse(readFileSync(join(ROOT, 'data', 'updates.json'), 'utf8')).filter((u) => u.date >= since && u.people.every((s) => shown(s)));

await withLib(async (lib) => {
  const { buildGraph, mergePairs, workplaceIndex } = await lib('graph');
  const { bondIndex, rankPull } = await lib('pull');
  const { findFactions } = await lib('factions');
  const { riftWatch, describeReason } = await lib('rifts');
  const visible = people.filter((f) => shown(f.slug));
  const g = buildGraph(visible, orgs);
  const pull = new Map(rankPull(g.nodes, bondIndex(g.nodes, g.links, workplaceIndex(g.nodes))).map((r) => [r.id, r.score]));
  const history = existsSync(join(ROOT, 'data', 'history.json')) ? JSON.parse(readFileSync(join(ROOT, 'data', 'history.json'), 'utf8')).months : {};
  const base = Object.entries(history).filter(([, m]) => m.date < today).sort(([a], [b]) => a.localeCompare(b)).at(-1)?.[1];
  const movers = base
    ? [...pull]
        .filter(([s]) => typeof base.pull[s] === 'number')
        .map(([s, v]) => [s, v - base.pull[s]])
        .filter(([, d]) => Math.abs(d) >= 5)
        .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
        .slice(0, 8)
    : [];
  const pairs = mergePairs(g.links);
  const rifts = riftWatch(g.nodes, pairs, findFactions(g.nodes, pairs)).slice(0, 5);

  const L = [];
  const line = (t) => `- **${nameOf(t.a)}** and **${nameOf(t.b)}** (${t.type}): ${t.text ?? ''}`.trim();
  L.push(`# The week on the map: ${since} to ${today}`, '');
  if (updates.length) {
    L.push('## What changed', '');
    for (const u of updates) L.push(`- ${u.text}`);
    L.push('');
  }
  if (newPeople.length) L.push('## New on the map', '', newPeople.map((s) => `- **${nameOf(s)}**: ${now.get(s).current_role ?? ''}`).join('\n'), '');
  if (feuds.length) L.push('## New rivalries and feuds', '', ...feuds.map(line), '');
  if (ended.length) L.push('## Ties that ended', '', ...ended.map((t) => `- **${nameOf(t.a)}** and **${nameOf(t.b)}** (${t.type}, ended ${t.end})`), '');
  if (friendly.length) L.push(`## New ties (${friendly.length})`, '', ...friendly.slice(0, 12).map(line), ...(friendly.length > 12 ? [`- and ${friendly.length - 12} more`] : []), '');
  if (movers.length) L.push(`## Pull: biggest moves since ${base.date}`, '', ...movers.map(([s, d]) => `- **${nameOf(s)}** ${d > 0 ? '▲' : '▼'} ${Math.abs(d)} to ${pull.get(s)}`), '');
  if (rifts.length)
    L.push('## Rift watch: friendly ties under the most strain', '', ...rifts.map((w) => `- **${nameOf(w.a)}** and **${nameOf(w.b)}** (${w.score}, ${w.label}): ${describeReason(w.reasons[0], nameOf)}`), '');
  L.push('_Every item comes from the map\'s sourced files; scores are estimates, not forecasts._');
  const text = L.join('\n');
  console.log(text);
  if (args.includes('--save')) {
    mkdirSync(join(ROOT, 'briefings'), { recursive: true });
    writeFileSync(join(ROOT, 'briefings', `${today}.md`), text + '\n');
    console.log(`\nSaved briefings/${today}.md`);
  }
});

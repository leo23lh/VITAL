#!/usr/bin/env node
// Builds the public site into dist-web/:
//   index.html     the landing page (scripts/lib/landing.mjs), with live readings from the map
//   map/           the viewer (vite --mode web) plus data.json, the public copy of the data
//                  (scripts/lib/public-data.mjs), and its photos
//   p/<slug>/      a share page per person and organization, with link-preview tags
//                  (scripts/lib/share-pages.mjs), forwarding to map/?p=<slug>
// Fails if anything private got through.
//   npm run build:web            (SITE_URL=https://… to build for another address)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { landingPage } from './lib/landing.mjs';
import { withLib } from './lib/load.mjs';
import { leaks, publicPayload } from './lib/public-data.mjs';
import { SITE_DESCRIPTION, SITE_TITLE, metaTags, previewOf, sharePage } from './lib/share-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-web');
const app = path.join(out, 'map');
// Link previews need absolute addresses.
const site = (process.env.SITE_URL ?? 'https://leo23lh.github.io/INFLUENCE-MAP/').replace(/\/?$/, '/');

const { payload, dropped } = publicPayload(root);
const found = leaks(payload, dropped);
if (found.length) {
  console.error(`Not building: private data would reach the public site (${found.join(', ')}).`);
  process.exit(1);
}

// The viewer, under map/.
fs.rmSync(out, { recursive: true, force: true });
await build({ root, mode: 'web', configFile: path.join(root, 'vite.config.ts'), logLevel: 'warn', build: { outDir: app, emptyOutDir: true } });
fs.writeFileSync(path.join(app, 'data.json'), JSON.stringify(payload));
// Photos of people left out never ship (there are none today, but a file could gain one).
for (const d of dropped) for (const f of fs.readdirSync(path.join(app, 'photos')).filter((f) => f.startsWith(`${d.slug}.`))) fs.rmSync(path.join(app, 'photos', f));
const appIndex = path.join(app, 'index.html');
const appMeta = metaTags({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: `${site}map/`, image: `${site}og.png`, imageAlt: SITE_TITLE, large: true });
fs.writeFileSync(appIndex, fs.readFileSync(appIndex, 'utf8').replace('</title>', `</title>\n    ${appMeta}`));

// The preview card and icon at the root, for the landing page and the share pages.
if (!fs.existsSync(path.join(app, 'og.png'))) console.warn('No og.png: run `npm run og-image` for the link preview card.');
for (const f of ['og.png', 'favicon.svg']) if (fs.existsSync(path.join(app, f))) fs.copyFileSync(path.join(app, f), path.join(out, f));
// GitHub Pages: serve files as they are (no Jekyll processing).
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// Share pages: only for files in the public payload, so nobody left out gets one.
const shared = [...payload.people, ...payload.orgs];
for (const f of shared) {
  const dir = path.join(out, 'p', f.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), sharePage(previewOf(f, site)));
}
const strays = dropped.filter((d) => fs.existsSync(path.join(out, 'p', d.slug)));
if (strays.length) {
  console.error(`Not publishing: share pages for left-out files (${strays.map((d) => d.slug).join(', ')}).`);
  process.exit(1);
}

// The landing page, from the same public payload and the viewer's own scoring code.
const landing = landingPage(await readings());
const leaked = dropped.filter((d) => landing.includes(d.slug) || d.names.some((nm) => nm.split(/\s+/).length > 1 && landing.includes(nm)));
if (leaked.length || landing.includes('user-provided')) {
  console.error('Not publishing: the landing page names a left-out file.');
  process.exit(1);
}
fs.writeFileSync(path.join(out, 'index.html'), landing);

const mb = (p) => (fs.statSync(p).size / 1e6).toFixed(1);
console.log(
  `dist-web/: landing page, map/ with ${payload.people.length} people, ${payload.orgs.length} organizations, data.json ${mb(path.join(app, 'data.json'))} MB, ${shared.length} share pages; left out: ${dropped.map((d) => d.slug).join(', ') || 'none'}`,
);

/** The landing page's live readings: counts, the top of Pull, the 2028 board, blocs, a rift, donors, updates. */
async function readings() {
  return withLib(async (lib) => {
    const { buildGraph, mergePairs, workplaceIndex } = await lib('graph');
    const { bondIndex, rankPull } = await lib('pull');
    const { backingBoard } = await lib('backing');
    const { findFactions } = await lib('factions');
    const { riftWatch, describeReason } = await lib('rifts');
    const g = buildGraph(payload.people, payload.orgs);
    const byId = new Map(g.nodes.map((nd) => [nd.id, nd]));
    const nameOf = (id) => byId.get(id)?.name ?? id;
    const pairs = mergePairs(g.links);
    const filed = (id) => byId.get(id)?.researched;
    const ends = (p) => [typeof p.source === 'object' ? p.source.id : p.source, typeof p.target === 'object' ? p.target.id : p.target];

    // Every distinct source address cited anywhere in the public files.
    const urls = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) k === 'url' && typeof x === 'string' ? urls.add(x) : walk(x);
    };
    walk([...payload.people, ...payload.orgs].map((f) => f.data));

    const pull = rankPull(g.nodes, bondIndex(g.nodes, g.links, workplaceIndex(g.nodes)))
      .slice(0, 4)
      .map((r) => {
        const p = byId.get(r.id)?.person;
        return { slug: r.id, name: nameOf(r.id), role: p?.office?.title ?? p?.current_role ?? '', score: r.score };
      });

    const contenders = backingBoard(g.nodes, g.links)
      .contenders.map((c) => ({ slug: c.id, name: nameOf(c.id), side: c.side, camp: c.declared, leaning: c.predicted }))
      .sort((a, b) => b.camp + b.leaning - (a.camp + a.leaning))
      .slice(0, 4);

    const factions = findFactions(g.nodes, pairs);
    const top = riftWatch(g.nodes, pairs, factions)[0];
    const rift = top
      ? { a: { slug: top.a, name: nameOf(top.a) }, b: { slug: top.b, name: nameOf(top.b) }, score: top.score, label: top.label, reason: describeReason(top.reasons[0], nameOf) }
      : null;

    const donors = g.nodes
      .filter((nd) => nd.researched && !nd.isOrg && !nd.person?.died)
      .map((nd) => {
        const cycles = (nd.person?.giving?.cycles ?? []).filter((c) => typeof c.total_usd === 'number' && c.total_usd > 0);
        const last = cycles.reduce((a, b) => (!a || b.cycle > a.cycle ? b : a), null);
        return last ? { slug: nd.id, name: nd.name, usd: last.total_usd, cycle: last.cycle } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 4);

    return {
      site,
      updated: payload.updates[0]?.date ?? new Date().toISOString().slice(0, 10),
      counts: {
        people: payload.people.length,
        ties: pairs.filter((p) => ends(p).every(filed)).length,
        sources: urls.size,
        orgs: payload.orgs.length,
      },
      pull,
      contenders,
      factions: { count: factions.length, names: factions.slice(0, 4).map((f) => f.label) },
      rift,
      donors,
      updates: payload.updates.slice(0, 3).map((u) => ({ date: u.date, text: u.text, people: u.people.filter(filed).map((s) => ({ slug: s, name: nameOf(s) })) })),
    };
  });
}

#!/usr/bin/env node
// Builds the public site into dist-web/: the viewer (vite --mode web) plus data.json, the
// public copy of the data (scripts/lib/public-data.mjs). Fails if anything private got through.
//   npm run build:web
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { leaks, publicPayload } from './lib/public-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-web');

const { payload, dropped } = publicPayload(root);
const found = leaks(payload, dropped);
if (found.length) {
  console.error(`Not building: private data would reach the public site (${found.join(', ')}).`);
  process.exit(1);
}

await build({ root, mode: 'web', configFile: path.join(root, 'vite.config.ts'), logLevel: 'warn' });
fs.writeFileSync(path.join(out, 'data.json'), JSON.stringify(payload));
// Photos of people left out never ship (there are none today, but a file could gain one).
for (const d of dropped) for (const f of fs.readdirSync(path.join(out, 'photos')).filter((f) => f.startsWith(`${d.slug}.`))) fs.rmSync(path.join(out, 'photos', f));
// GitHub Pages: serve files as they are (no Jekyll processing).
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const mb = (p) => (fs.statSync(p).size / 1e6).toFixed(1);
console.log(
  `dist-web/: ${payload.people.length} people, ${payload.orgs.length} organizations, data.json ${mb(path.join(out, 'data.json'))} MB; left out: ${dropped.map((d) => d.slug).join(', ') || 'none'}`,
);

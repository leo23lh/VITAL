#!/usr/bin/env node
// Builds the claude.ai Artifact version of the viewer into dist-artifact/:
//   page.html  the page to publish (title + inlined styles + script tag)
//   app.js     the app bundle, published alongside the page
// See "Phone page" in CLAUDE.md for how to publish it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist-artifact');

await build({ root, mode: 'artifact', configFile: path.join(root, 'vite.config.ts'), logLevel: 'warn' });

const css = fs.readFileSync(path.join(out, 'app.css'), 'utf8');
// The Artifact host wraps this file in its own <html>/<head>/<body>, so no document tags here.
const page = `<title>Influence Map</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script src="app.js"></script>
`;
fs.writeFileSync(path.join(out, 'page.html'), page);
fs.rmSync(path.join(out, 'app.css'));
const kb = (f) => (fs.statSync(path.join(out, f)).size / 1024).toFixed(0);
console.log(`dist-artifact/page.html (${kb('page.html')} KB) + dist-artifact/app.js (${kb('app.js')} KB)`);

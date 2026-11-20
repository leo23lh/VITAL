#!/usr/bin/env node
// Draws public/og.png, the 1200×630 card chat apps and social sites show for a link to the
// public site's front page (and for organizations, which have no photo). The network in it
// is decorative (seeded, not the real map), and the words carry no counts, so it stays true
// as the map grows. Needs Playwright's Chromium.
//   npm run og-image
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Playwright is installed globally in the cloud sessions, so load it the CommonJS way (as touch-check does).
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'og.png');

// Seeded random numbers, so the picture is the same on every run.
let seed = 20261120;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const SECTOR = ['#3987e5', '#3987e5', '#3987e5', '#e6e9ef', '#d95926', '#199e70'];
const LINE = ['#8b95a8', '#8b95a8', '#008300', '#9085e9', '#c98500', '#f0e442', '#d55181'];
const clusters = [
  [790, 170, 95],
  [1010, 210, 85],
  [880, 420, 105],
  [1090, 470, 75],
  [700, 520, 60],
];
const dots = [];
for (const [cx, cy, r] of clusters) {
  const n = Math.round(r / 6);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    dots.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, c: clusters.indexOf(clusters.find((k) => k[0] === cx)), size: 3 + rand() * 6, color: SECTOR[Math.floor(rand() * SECTOR.length)] });
  }
}
const lines = [];
for (let i = 0; i < dots.length; i++) {
  for (let j = i + 1; j < dots.length; j++) {
    const same = dots[i].c === dots[j].c;
    if (rand() < (same ? 0.16 : 0.012)) lines.push([dots[i], dots[j], LINE[Math.floor(rand() * LINE.length)], same ? 0.55 : 0.3]);
  }
}
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  ${clusters.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 1.25}" fill="#eceef0" opacity="0.035"/>`).join('')}
  ${lines.map(([a, b, c, o]) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${c}" stroke-width="1.4" opacity="${o}"/>`).join('')}
  ${dots.map((d) => `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.size.toFixed(1)}" fill="${d.color}" stroke="#08090b" stroke-width="1.5"/>`).join('')}
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=block">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#08090b}
  .art{position:absolute;inset:0}
  .fade{position:absolute;inset:0;background:linear-gradient(90deg,#08090b 0%,#08090b 38%,rgba(8,9,11,0.55) 58%,rgba(8,9,11,0) 75%)}
  .text{position:absolute;left:72px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;color:#eceef0;font-family:'Geist',system-ui,sans-serif}
  .rule{width:14px;height:14px;background:#ffb21a;margin-bottom:30px}
  h1{font-family:'Geist',system-ui,sans-serif;font-weight:500;font-size:96px;line-height:0.95;letter-spacing:-0.035em;margin:0 0 28px;color:#eceef0}
  p{font-size:28px;line-height:1.3;margin:0 0 32px;color:rgba(236,238,240,0.78)}
  .tags{font-family:'Geist Mono',ui-monospace,monospace;font-size:17px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(236,238,240,0.6)}
</style></head><body>
<div class="art">${svg}</div><div class="fade"></div>
<div class="text"><div class="rule"></div><h1>Influence<br>Map</h1>
<p>Who is tied to whom in American power, with a source for every link.</p>
<div class="tags">Pull · 2028 backing · Factions &amp; rifts · Follow the money</div></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]));
await page.screenshot({ path: out, type: 'png' });
await browser.close();
console.log(`Wrote ${path.relative(process.cwd(), out)}`);

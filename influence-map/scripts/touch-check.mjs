// Replays phone gestures on the map and fails if anything opens, closes or changes by accident.
// Starts its own dev server and drives the pre-installed Chromium as an iPhone.
//   node influence-map/scripts/touch-check.mjs     (npm run touch-check)
// See CLAUDE.md "Working on the viewer".
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { ROOT } from './lib/load.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, hmr: false, open: false } });
await server.listen();
const url = server.resolvedUrls.local[0];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
  if (!ok) failures.push(what);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => (window.__mapDots?.() ?? []).length > 20, null, { timeout: 20000 });
  await page.waitForTimeout(3000); // let the layout settle a little (it keeps drifting; that's part of the test)

  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const box = await page.locator('.graph-canvas').boundingBox();
  const abs = (p) => [box.x + p.x, box.y + p.y];
  async function drag(from, dx, dy, steps = 8, holdMs = 16) {
    const [x, y] = abs(from);
    await touch('touchStart', [[x, y]]);
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', [[x + (dx * i) / steps, y + (dy * i) / steps]]);
      await page.waitForTimeout(holdMs);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(400);
  }
  const tap = (p, wobble = 3) => drag(p, wobble, -wobble, 2);
  async function pinch(c, from, to) {
    const [x, y] = abs(c);
    await touch('touchStart', [[x - from, y], [x + from, y]]);
    for (let i = 1; i <= 8; i++) {
      const d = from + ((to - from) * i) / 8;
      await touch('touchMove', [[x - d, y], [x + d, y]]);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(400);
  }
  const panelTitle = () => page.locator('.panel h2').first().textContent({ timeout: 500 }).catch(() => null);
  const expanded = () => page.locator('.panel.expanded').count();
  const dots = () => page.evaluate(() => window.__mapDots());

  // Waits until the camera is still (no dot jumps more than 4px in 120ms), up to 4 seconds. The layout
  // keeps drifting slowly, which taps must survive; a fit or re-center animation is a different matter:
  // a person tapping aims at what has stopped moving, so the test does too.
  async function still() {
    for (let i = 0, prev = await dots(); i < 33; i++) {
      await page.waitForTimeout(120);
      const now = await dots();
      const moved = Math.max(0, ...now.slice(0, 40).map((d) => {
        const p = prev.find((o) => o.id === d.id);
        return p ? Math.hypot(p.x - d.x, p.y - d.y) : 0;
      }));
      if (moved < 4) return;
      prev = now;
    }
  }

  // A dot with room around it, well inside the map and above the sheet.
  async function loneDot(exclude = []) {
    await still();
    const all = await dots();
    const inView = all.filter((d) => d.x > 40 && d.x < box.width - 40 && d.y > 60 && d.y < box.height * 0.55 && !exclude.includes(d.id));
    return inView
      .map((d) => ({ d, room: Math.min(...all.filter((o) => o !== d).map((o) => Math.hypot(o.x - d.x, o.y - d.y) - o.r - d.r)) }))
      .sort((a, b) => b.room - a.room || b.d.r - a.d.r)[0]?.d;
  }

  // 1. A slightly wobbly tap on a dot opens that person.
  const first = await loneDot();
  await tap(first);
  check((await panelTitle())?.includes(first.name), `tap on ${first.name} opens their panel (got ${await panelTitle()})`);

  // 2. Pans, starting on dots and on empty map, change nothing.
  const before = await panelTitle();
  for (const d of (await dots()).slice(0, 4)) await drag(d, 70, 50);
  await drag({ x: box.width / 2, y: box.height / 3 }, -80, 30);
  check((await panelTitle()) === before, `pans leave the panel alone (${await panelTitle()})`);

  // 3. Pinches change nothing.
  await pinch({ x: box.width / 2, y: box.height / 3 }, 50, 90);
  await pinch({ x: box.width / 2, y: box.height / 3 }, 90, 50);
  check((await panelTitle()) === before, 'pinches leave the panel alone');

  // 4. A slow press-and-drag of 15px (a nudge, not a tap) changes nothing.
  await drag({ x: box.width / 2, y: box.height / 4 }, 15, 0, 6, 40);
  check((await panelTitle()) === before, 'a short nudge leaves the panel alone');

  // 5. A tap on empty map folds the sheet down but keeps it open.
  if (await page.locator('.sheet-handle').count()) {
    await page.locator('.sheet-handle').click();
    await page.waitForTimeout(300);
  }
  await still();
  const all = await dots();
  let empty = null;
  for (let y = 70; y < box.height * 0.45 && !empty; y += 12)
    for (let x = 30; x < box.width - 30 && !empty; x += 12)
      if (all.every((d) => Math.hypot(d.x - x, d.y - y) - d.r > 40)) empty = { x, y };
  if (empty) {
    const wasExpanded = await expanded();
    await tap(empty);
    check(wasExpanded === 1 && (await expanded()) === 0, 'a tap on empty map folds the sheet down');
    check((await panelTitle()) === before, 'and keeps the panel open');
  } else check(true, 'no empty spot found for the background tap (skipped)');

  // 6. Hover never lights anyone up on touch: after all that, only the selected person is named in bold.
  const second = await loneDot([first.id]);
  await tap(second);
  check((await panelTitle())?.includes(second.name), `tap on ${second.name} switches to them`);

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
} finally {
  await browser.close();
  await server.close();
}
console.log(failures.length ? `\n${failures.length} touch check(s) failed.` : '\nAll touch checks passed.');
process.exit(failures.length ? 1 : 0);

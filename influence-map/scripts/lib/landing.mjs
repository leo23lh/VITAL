// The public site's front page: a static, console-style landing that says what the map is,
// shows a few live readings from it (who has the most pull, the 2028 front-runners, the blocs,
// the biggest donors), the latest updates, and sends people into the map at map/.
// Written by scripts/build-web.mjs from the public payload only, so nothing left out of the
// public site can reach it; the build checks the result as well.
import { SITE_DESCRIPTION, SITE_TITLE, metaTags } from './share-pages.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (x) => Number(x).toLocaleString('en-US');

function clip(s, max) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function usd(x) {
  if (x >= 1e9) return `$${(x / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (x >= 1e3) return `$${Math.round(x / 1e3)}K`;
  return `$${n(x)}`;
}

function longDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function shortDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

/** The hero's decorative network: seeded, so the page is the same on every build. */
function heroNetwork() {
  let seed = 20261120;
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const colors = ['#3987e5', '#3987e5', '#3987e5', '#e6e9ef', '#d95926', '#199e70'];
  const lines = ['#8b95a8', '#8b95a8', '#008300', '#9085e9', '#c98500'];
  const clusters = [
    [690, 150, 110],
    [930, 210, 95],
    [800, 420, 120],
    [1060, 440, 85],
    [560, 380, 70],
  ];
  const dots = [];
  clusters.forEach(([cx, cy, r], c) => {
    for (let i = 0; i < Math.round(r / 5.5); i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      dots.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, c, r: 2 + rand() * 4.5, color: colors[Math.floor(rand() * colors.length)] });
    }
  });
  const edges = [];
  for (let i = 0; i < dots.length; i++)
    for (let j = i + 1; j < dots.length; j++)
      if (rand() < (dots[i].c === dots[j].c ? 0.13 : 0.01)) edges.push([dots[i], dots[j], lines[Math.floor(rand() * lines.length)]]);
  const f = (v) => v.toFixed(1);
  return `<svg class="hero-net" viewBox="0 0 1200 600" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
${clusters.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 1.2}" fill="none" stroke="#eceef0" stroke-opacity="0.08" stroke-dasharray="2 5"/>`).join('')}
${edges.map(([a, b, c]) => `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke="${c}" stroke-opacity="0.35"/>`).join('')}
${dots.map((d, i) => `<circle class="${i % 9 === 0 ? 'blink' : ''}" style="animation-delay:${(i % 7) * 0.6}s" cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="${d.color}" stroke="#08090b" stroke-width="1.5"/>`).join('')}
<g stroke="#ffb21a" stroke-width="1.6" fill="none">${(() => {
    const t = dots[Math.floor(dots.length * 0.42)];
    const h = t.r + 7;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `<path d="M${f(t.x + sx * h)} ${f(t.y + sy * h - sy * 6)}V${f(t.y + sy * h)}H${f(t.x + sx * h - sx * 6)}"/>`).join('');
  })()}</g>
</svg>`;
}

/**
 * `d`: { site, updated, counts: { people, ties, sources, orgs }, pull: [{ slug, name, role, score }],
 * contenders: [{ slug, name, side, camp, leaning }], factions: { count, names: [] },
 * rift: { a, b, score, label, reason } | null, donors: [{ slug, name, usd, cycle }],
 * updates: [{ date, text, people: [{ slug, name }] }] }
 */
export function landingPage(d) {
  const person = (slug, name) => `<a href="map/?p=${encodeURIComponent(slug)}">${esc(name)}</a>`;
  const meta = metaTags({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: d.site, image: `${d.site}og.png`, imageAlt: SITE_TITLE, large: true });
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${SITE_TITLE}</title>
    ${meta}
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap" />
    <script>
      // Old links (?p=…, ?pair=…, ?view=…) opened the map at the site root; send them on to it.
      if (/[?&](p|pair|view)=/.test(location.search)) location.replace('map/' + location.search + location.hash);
    </script>
    <style>${CSS}</style>
  </head>
  <body>
    <header class="top">
      <a class="brand" href="./">
        <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true"><g stroke="#eceef0" stroke-opacity=".45" stroke-width="1.6"><line x1="9" y1="10" x2="22" y2="8"/><line x1="9" y1="10" x2="16" y2="23"/><line x1="22" y1="8" x2="16" y2="23"/></g><rect x="5.5" y="6.5" width="7" height="7" fill="#ffb21a"/><rect x="19.5" y="5.5" width="5" height="5" fill="#eceef0"/><rect x="12" y="19" width="8" height="8" fill="#eceef0"/></svg>
        <span>Influence Map</span>
      </a>
      <a class="btn btn-sm" href="map/">Open the map <span aria-hidden="true">→</span></a>
    </header>

    <main>
      <section class="hero">
        ${heroNetwork()}
        <div class="hero-text">
          <p class="kicker"><span class="live"></span>Live · updated ${esc(longDate(d.updated))}</p>
          <h1>Who is tied to whom in American power.</h1>
          <p class="lede">A sourced map of ${n(d.counts.people)} officials, donors, founders and media figures and the ${n(d.counts.ties)} ties between them. Every tie links to the pages that report it.</p>
          <div class="cta">
            <a class="btn btn-primary" href="map/">Open the map</a>
            <a class="btn" href="#how">How it works</a>
          </div>
        </div>
      </section>

      <dl class="readouts">
        <div><dt>People</dt><dd>${n(d.counts.people)}</dd></div>
        <div><dt>Ties</dt><dd>${n(d.counts.ties)}</dd></div>
        <div><dt>Sources cited</dt><dd>${n(d.counts.sources)}</dd></div>
        <div><dt>Organizations</dt><dd>${n(d.counts.orgs)}</dd></div>
      </dl>

      <section class="tiles">
        <article class="tile">
          <h2><span class="num">01</span>Pull</h2>
          <p class="sub">Who has the most access to people in power, 0–100.</p>
          <ol class="rows">
            ${d.pull
              .map(
                (r) => `<li><span class="who">${person(r.slug, r.name)}<small>${esc(clip(r.role, 60))}</small></span><span class="val">${r.score}<i style="width:${r.score}%"></i></span></li>`,
              )
              .join('\n            ')}
          </ol>
          <a class="more" href="map/?view=pull">Full ranking →</a>
        </article>

        <article class="tile">
          <h2><span class="num">02</span>2028 backing</h2>
          <p class="sub">The contenders with the most people in their camp or leaning their way.</p>
          <ol class="rows">
            ${d.contenders
              .map(
                (c) => `<li><span class="who">${person(c.slug, c.name)}<small>${c.camp} in camp · ${c.leaning} leaning</small></span><span class="tag tag-${c.side === 'R' ? 'r' : c.side === 'D' ? 'd' : 'x'}">${esc(c.side ?? '–')}</span></li>`,
              )
              .join('\n            ')}
          </ol>
          <a class="more" href="map/?view=backing">The whole board →</a>
        </article>

        <article class="tile">
          <h2><span class="num">03</span>Factions &amp; rifts</h2>
          <p class="sub">The blocs the ties divide into, and the ties under the most strain.</p>
          <p class="big">${d.factions.count}<small>blocs</small></p>
          <p class="list">${d.factions.names.map(esc).join(' · ')}</p>
          ${
            d.rift
              ? `<p class="rift"><span class="label">Under strain</span>${person(d.rift.a.slug, d.rift.a.name)} &amp; ${person(d.rift.b.slug, d.rift.b.name)} <span class="mono">${d.rift.score}</span><small>${esc(clip(d.rift.reason, 110))}</small></p>`
              : ''
          }
          <a class="more" href="map/?view=factions">See the blocs →</a>
        </article>

        <article class="tile">
          <h2><span class="num">04</span>Follow the money</h2>
          <p class="sub">The biggest donors on the map, by their latest reported cycle.</p>
          <ol class="rows">
            ${d.donors.map((r) => `<li><span class="who">${person(r.slug, r.name)}<small>${r.cycle} cycle</small></span><span class="val">${usd(r.usd)}</span></li>`).join('\n            ')}
          </ol>
          <a class="more" href="map/?view=money">Money lines →</a>
        </article>
      </section>

      <section class="updates">
        <h2><span class="num">05</span>Latest</h2>
        <ol>
          ${d.updates
            .map(
              (u) => `<li><time>${shortDate(u.date)}</time><div><p>${esc(clip(u.text, 260))}</p>${
                u.people.length ? `<p class="chips">${u.people.slice(0, 6).map((p) => person(p.slug, p.name)).join('')}</p>` : ''
              }</div></li>`,
            )
            .join('\n          ')}
        </ol>
      </section>

      <section class="how" id="how">
        <h2><span class="num">06</span>How it works</h2>
        <div class="cols">
          <div>
            <h3>Sourced</h3>
            <p>Every person and tie cites the pages that state it: official records first, then news outlets across the spectrum. Ties that rest on a single source are drawn dashed and count for less.</p>
          </div>
          <div>
            <h3>Scored</h3>
            <p>Pull measures access to people in power. Bond measures how deep one tie runs. 2028 backing estimates who is likely to back whom, from ties, politics and what people have said.</p>
          </div>
          <div>
            <h3>Checked</h3>
            <p>Scores are reasons to look, not facts or forecasts, and each one shows its reasons. They are tested against what happened later: who went on to donate to whom, and which alliances broke.</p>
          </div>
        </div>
        <a class="btn" href="map/?view=about">About this map</a>
      </section>
    </main>

    <footer>
      <span>Public records only. Not affiliated with any campaign, party or company.</span>
      <a href="map/">Open the map →</a>
    </footer>
  </body>
</html>
`;
}

const CSS = `
:root{--ink:#08090b;--ink-2:#0f1114;--ink-3:#171a1f;--line:#262a31;--fg:#eceef0;--fg-dim:rgba(236,238,240,.58);--signal:#ffb21a;--on-signal:#08090b;--r:#e0605e;--d:#4ea1ff;--sans:'Geist',system-ui,-apple-system,'Segoe UI',sans-serif;--mono:'Geist Mono',ui-monospace,'SF Mono',Menlo,monospace;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--ink);color:var(--fg);font:15px/1.55 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}
.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px max(16px,4vw);background:rgba(8,9,11,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border:1px solid var(--fg-dim);color:var(--fg);text-decoration:none;font-size:11.5px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;transition:border-color .15s,background .15s}
.btn:hover{border-color:var(--fg)}
.btn-primary{background:var(--signal);border-color:var(--signal);color:var(--on-signal)}
.btn-primary:hover{background:#ffc24d;border-color:#ffc24d}
.btn-sm{padding:8px 12px}
.hero{position:relative;overflow:hidden;min-height:min(78vh,640px);display:flex;align-items:flex-end;padding:0 max(16px,4vw) 56px;border-bottom:1px solid var(--line);background:linear-gradient(rgba(236,238,240,.03) 1px,transparent 1px) 0 0/56px 56px,linear-gradient(90deg,rgba(236,238,240,.03) 1px,transparent 1px) 0 0/56px 56px,var(--ink)}
.hero-net{position:absolute;inset:0;width:100%;height:100%}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--ink) 0%,rgba(8,9,11,.85) 38%,rgba(8,9,11,.15) 75%),linear-gradient(0deg,var(--ink) 0%,transparent 45%);pointer-events:none}
.hero-text{position:relative;z-index:1;max-width:680px}
.kicker{display:flex;align-items:center;gap:10px;margin:0 0 22px;font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-dim)}
.live{width:7px;height:7px;background:var(--signal);box-shadow:0 0 8px var(--signal);animation:pulse 2s ease-in-out infinite}
h1{margin:0 0 20px;font-weight:500;font-size:clamp(38px,7vw,76px);line-height:1;letter-spacing:-.035em}
.lede{margin:0 0 30px;max-width:560px;font-size:clamp(16px,2vw,19px);color:rgba(236,238,240,.78)}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.readouts{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border-bottom:1px solid var(--line)}
.readouts div{padding:20px max(16px,2vw);border-left:1px solid var(--line)}
.readouts div:first-child{border-left:none}
dt{font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--fg-dim)}
dd{margin:6px 0 0;font:400 clamp(26px,4vw,40px)/1 var(--mono);letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);border-bottom:1px solid var(--line)}
.tile{display:flex;flex-direction:column;padding:32px max(16px,3vw);border-left:1px solid var(--line);border-top:1px solid var(--line)}
.tile:nth-child(odd){border-left:none}
.tile:nth-child(-n+2){border-top:none}
h2{display:flex;align-items:baseline;gap:12px;margin:0;font-size:11px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--fg-dim)}
.num{font:500 11px var(--mono);letter-spacing:.04em;color:var(--signal)}
.tile h2{color:var(--fg);font-size:12px}
.sub{margin:8px 0 18px;color:var(--fg-dim);font-size:14px}
.rows{list-style:none;margin:0 0 18px;padding:0}
.rows li{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px solid var(--line)}
.rows li:last-child{border-bottom:1px solid var(--line)}
.who{min-width:0}
.who a{text-decoration:none;font-weight:500}
.who a:hover,.chips a:hover,.rift a:hover{color:var(--signal)}
.who small,.rift small{display:block;color:var(--fg-dim);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.val{flex:none;position:relative;min-width:56px;padding-bottom:6px;text-align:right;font:400 20px var(--mono);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.val i{position:absolute;right:0;bottom:0;height:2px;background:var(--signal)}
.tag{flex:none;padding:2px 7px;border:1px solid currentColor;font:500 11px var(--mono);letter-spacing:.1em}
.tag-r{color:var(--r)}.tag-d{color:var(--d)}.tag-x{color:var(--fg-dim)}
.big{margin:0;font:400 54px/1 var(--mono);letter-spacing:-.05em}
.big small{margin-left:10px;font:600 11px var(--sans);letter-spacing:.22em;text-transform:uppercase;color:var(--fg-dim)}
.list{margin:12px 0 18px;color:var(--fg-dim);font-size:14px}
.rift{margin:0 0 18px;padding:12px 14px;border:1px solid var(--line);border-left:2px solid var(--signal)}
.rift a{text-decoration:none;font-weight:500}
.rift .label{display:block;margin-bottom:4px;font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--fg-dim)}
.mono{margin-left:6px;font-family:var(--mono);color:var(--signal)}
.more{margin-top:auto;align-self:flex-start;font-size:11.5px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;color:var(--fg);border-bottom:1px solid var(--signal);padding-bottom:3px}
.updates,.how{padding:40px max(16px,4vw);border-bottom:1px solid var(--line)}
.updates ol{list-style:none;margin:20px 0 0;padding:0;max-width:900px}
.updates li{display:grid;grid-template-columns:76px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
time{font:500 12px var(--mono);letter-spacing:.06em;color:var(--signal);padding-top:2px}
.updates p{margin:0}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px!important}
.chips a{padding:3px 8px;border:1px solid var(--line);text-decoration:none;font-size:12.5px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin:22px 0 28px}
h3{margin:0 0 8px;font-size:16px;font-weight:500}
.cols p{margin:0;color:var(--fg-dim);font-size:14.5px}
footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:24px max(16px,4vw) 40px;font-size:12.5px;color:var(--fg-dim)}
footer a{color:var(--fg);text-decoration:none}
.blink{animation:pulse 3.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.blink,.live{animation:none}html{scroll-behavior:auto}}
@media (max-width:820px){.tiles{grid-template-columns:1fr}.tile{border-left:none!important;border-top:1px solid var(--line)!important}.tile:first-child{border-top:none!important}.cols{grid-template-columns:1fr;gap:20px}.readouts{grid-template-columns:repeat(2,1fr)}.readouts div:nth-child(3){border-left:none}.readouts div:nth-child(n+3){border-top:1px solid var(--line)}}
@media (max-width:520px){.hero{display:block;min-height:auto;padding-top:250px;padding-bottom:40px}.hero-net{height:300px;bottom:auto}.hero::after{background:linear-gradient(180deg,rgba(8,9,11,.05) 0,rgba(8,9,11,.35) 170px,var(--ink) 290px)}.kicker{flex-wrap:wrap}.btn-sm span{display:none}}
`;

# Influence Map

A local network graph of public figures and their documented relationships.
The app makes no AI or API calls. Claude Code is the research engine, through
the slash commands in the repo root's `.claude/commands/`:

- `/add-person <name> [context]` — research someone new and link them into the network
- `/refresh-person <name>` — re-research someone already in the network
- `/add-org <name> [context]` — research an organization (super PAC, think tank, firm) and link it in
- `/sync-map` — copy every file to the phone page (see "Phone page" below)

## Layout

| Path | What it is |
| --- | --- |
| `data/people/<slug>.json` | One file per person. The only source of truth. |
| `data/orgs/<slug>.json` | One file per organization (see "Organizations" below). |
| `data/updates.json` | The Updates feed: dated one-line summaries of what changed, newest first (see "Updates feed"). |
| `public/photos/<slug>.jpg` | Portraits shown in the dots (freely licensed, from Wikimedia Commons). |
| `scripts/fetch-photos.mjs` | Downloads a person's Wikipedia lead photo if its license is free and records the credit. |
| `scripts/validate.mjs` | Checks every file against the rules below. No install needed: `node influence-map/scripts/validate.mjs` from the repo root. |
| `scripts/evidence-report.mjs` | How well ties are documented, and the research queue of thin ties (`npm run evidence`). See "Evidence". |
| `scripts/scorecard.mjs` | Freezes the map at a past year and scores its predictions (`npm run scorecard`). See "Scorecard". |
| `data/scorecard.json` | The scorecard's saved runs, newest first (`npm run scorecard -- --save`). |
| `scripts/predict.mjs` | Today's 2028 backing predictions, and how earlier runs are holding up (`npm run predict`). See "Backing". |
| `data/predictions.json` | The prediction log: dated runs of `[person, contender, score, basis]` (`npm run predict -- --save`). |
| `scripts/fec-import.mjs` | Imports donors' campaign finance filings from the FEC (`npm run fec`). See "FEC import". |
| `data/fec.json` | Settings for the import: politicians' FEC candidate ids, which committees belong to whom, and matching rules per donor. |
| `scripts/freshness.mjs` | What to check next (unconfirmed posts, old files) and when the recurring jobs last ran (`npm run freshness`). See "Freshness". |
| `data/history.json` | Monthly snapshots of Pull and 2028 first choices, for trends (`npm run freshness -- --snapshot`). |
| `scripts/tune-pull.mjs` | Tests Pull's weights against the track record of asks (`npm run tune-pull`). See "Track record". |
| `src/` | Vite + React + TypeScript viewer (`npm run dev`). Reads the data folder and live-reloads. |

## Research rules

These apply to every command and every edit to `data/people/` and `data/orgs/`. They are not optional.

1. **Public figures only.** A public figure has a substantial public record in a
   public role: elected or appointed officials and their senior staff, executives
   and founders of notable organizations, prominent commentators, authors,
   activists, and donors whose giving is publicly reported. If someone has no
   substantial public record, set `"public_figure": false`, save only what the
   user provided (sources: `["user-provided"]`), and do **no** web research on
   them — not even a search to check. If you can't tell whether someone is a
   public figure from your own knowledge and the user's context, ask the user
   instead of searching.
2. **Public-role information only.** Never collect home addresses, phone numbers,
   personal email addresses, ID numbers (SSN, passport, driver's license, etc.),
   health information, or details about private relatives or minors. `family`
   connections are allowed only when the relationship is publicly documented and
   the relative is a public figure in their own right; the same goes for
   `friend` connections. Never name children.
   **One exception:** the map's owner may add themselves. Their file has
   `"public_figure": false` and `"self_added": true`, holds only what they
   provide (sources `["user-provided"]`), gets no web research and no photo, and
   may carry a family link they choose to share; the relative's file may link
   back with a `"user-provided"` source. Only the owner's own file may use
   `self_added` (currently `leo-halperin.json`).
3. **Every fact and connection needs a source URL.** The URL must be a page that
   states the fact. Drop anything you cannot source. Don't fill gaps from memory.
4. **Note when sources disagree.** For facts about the person, add a
   `source_conflicts` entry. For a connection, say so in its `description` and
   lower its `confidence`. Attribute contested claims ("Spencer said…; Miller's
   spokesperson denied…") rather than picking a side.
5. Prefer primary and official sources (government bios, congressional records,
   court filings, organization pages), then major news outlets. Wikipedia is a
   fine starting point; cite the underlying reporting where you can. Use neutral,
   factual language.

6. **Balance the sourcing.** Right-of-center outlets are welcome sources for the
   facts they report, alongside mainstream and left-leaning ones: Fox News, Fox
   Business, Washington Examiner, Washington Times, New York Post, National
   Review, The American Conservative, Daily Signal, Daily Wire, Daily Caller,
   Washington Free Beacon, The Federalist, Breitbart, Compact, The American Mind
   and the Wall Street Journal. When a claim is contested along partisan lines,
   look for a right-leaning outlet's account as well as a mainstream one and
   attribute both.
7. **Breaking-news feeds are leads, not sources.** Aggregators such as Rerum
   Novarum (Telegram and X) are good for spotting news fast. Follow each item to
   the original report or document it relays and cite that; if no original can
   be found, leave it out.
8. **Not used as a source:** The Unz Review (deprecated by Wikipedia in 2021 for
   antisemitic, racist and conspiracy content). Its articles may point to a lead,
   which then needs an independent source like any other.

`scripts/validate.mjs` enforces the mechanical parts (sources on everything,
URL format, two-way links, valid types, no email/phone/ID/street-address
patterns). Passing it does not mean the rules are met; it only catches slips.

## File format

`data/people/stephen-miller.json` (abridged):

```json
{
  "name": "Stephen Miller",
  "aliases": [],
  "public_figure": true,
  "sector": "politics",
  "groups": ["trump-circle"],
  "current_role": "White House Deputy Chief of Staff for Policy",
  "summary": "Two or three neutral sentences on who they are and why they matter.",
  "sources": [{ "url": "https://…", "title": "Page title" }],
  "timeline": [
    { "year": 2009, "end_year": 2016, "role": "Communications director", "org": "Office of Sen. Jeff Sessions",
      "sources": [{ "url": "https://…", "title": "…" }] }
  ],
  "affiliations": [
    { "name": "America First Legal", "role": "Founder", "start_year": 2021, "end_year": 2024,
      "sources": [{ "url": "https://…", "title": "…" }] }
  ],
  "connections": [
    {
      "name": "Jeff Sessions",
      "slug": "jeff-sessions",
      "relationship_type": "employer",
      "description": "Miller was Sessions's Senate communications director from 2009 to 2016.",
      "start_year": 2009,
      "end_year": 2016,
      "confidence": 0.95,
      "sources": [{ "url": "https://…", "title": "…" }]
    }
  ],
  "source_conflicts": [
    { "topic": "…", "details": "Source A says X; source B says Y.", "sources": [{ "url": "https://…" }, { "url": "https://…" }] }
  ],
  "notes": "Optional. Research caveats.",
  "last_researched": "2026-11-07"
}
```

- **slug**: lowercase, ASCII, hyphens: `slugify(name)` ("Jeff Sessions" → `jeff-sessions`).
  If two people share a name, add a short qualifier: `john-smith-ohio-senator`.
  A connection's `slug` must equal the other person's file name when they have one.
- **years**: integers. `end_year: null` means ongoing; leave `end_year` out when the end isn't known.
  `start_year: null` (or leaving it out) means the start isn't known.
- **sources**: objects `{ "url", "title" }` (a bare URL string also works).
- **affiliations**: objects, not strings, so each can carry sources.
- **sector** and **groups**: see "Sectors and groups" below.
- **photo** (optional): written by `node influence-map/scripts/fetch-photos.mjs <slug>`,
  never by hand. It downloads the person's Wikipedia lead image only if it is on
  Wikimedia Commons under a free license (Creative Commons BY / BY-SA, CC0 or
  public domain), saves a 250px copy to `public/photos/`, and records `file`,
  `credit` (photographer), `license` and `source` (the Commons page). The viewer
  shows the credit with the photo, as the licenses require. Public figures only;
  no photos of people with `"public_figure": false`. The script needs network
  access to en.wikipedia.org and upload.wikimedia.org (the "VITAL" cloud
  environment allows them); if they're blocked, skip the photo and say so.
- **lean** (public figures): political lean by period. See "Political lean" below.
- **died** (optional): the year of death, for someone who has died and stays on
  the map for their ties (David Horowitz, Jeffrey Epstein). They keep their
  links but are left out of the Pull ranking and of 2028 backing, and can't
  hold an `office`. The death itself is stated, with sources, in the summary.
- **last_researched**: date the person was last researched (YYYY-MM-DD). Don't
  change it when you only add a reciprocal link to their file.

## Sectors and groups

These are classifications for the viewer, not facts, so they carry no sources of
their own. Choose them from what the file's own sourced role, timeline and
connections show. The validator rejects names not listed here; keep the lists in
`src/lib/schema.ts` and `scripts/validate.mjs` in sync (a test checks this).

**`sector`** (one per person; tints their dot): pick by the person's main public role today.

| Value | Who |
| --- | --- |
| `politics` | Elected and appointed officials, their staff, diplomats, party figures, activists and commentators (US or foreign) |
| `tech` | Tech founders and executives, venture capitalists |
| `ai-defense` | Leaders of AI labs and defense-technology companies |
| `business` | Other business owners and megadonors whose influence is mainly money |

**`groups`** (any number, may be empty; drives the preset views):

| Value | View | Who belongs |
| --- | --- | --- |
| `trump-circle` | Trump's inner circle | Trump, his senior White House staff and cabinet, and close advisers with a formal role |
| `paypal-mafia` | PayPal Mafia | The 13 in Fortune's 2007 photo plus Musk, Hurley and Chen (has the "PayPal Mafia" affiliation) |
| `tech-right` | The Tech Right | Tech figures who publicly backed or funded Trump, or serve in his administration |
| `ai-race` | AI race | Leaders of frontier AI labs and the people shaping AI policy and money |
| `defense-tech` | New defense primes | Founders, leaders and main backers of the new defense-tech companies |
| `middle-east` | Middle East dealmakers | People with a documented role in Israel / Gaza / Gulf diplomacy or funding |
| `media` | Media & platforms | Owners or leaders of news outlets, social platforms and major podcasts |
| `critics` | Critics & opponents | Prominent opponents of Trump or his administration |
| `2028-race` | 2028 race | Likely 2028 presidential contenders and their camps (see "2028 race" below) |
| `natcon` | National conservatism | Founders, organizers and leading thinkers of the National Conservatism movement (the Edmund Burke Foundation's NatCon conferences), its main funders, and politicians who have spoken at NatCon or are documented allies of it |

## Political lean

The main view has two layouts. By default it is a **cluster map**: the viewer
finds clusters of people who are linked more to each other than to everyone
else (Louvain modularity, weighted by how close each link is), gives each
cluster its own patch of the map, and draws the lines between clusters thinner
so each cluster's own lines stand out. Filters → Forces has sliders for spread,
line length, clustering and center pull. Names that would overlap a
better-connected person's name are hidden until you zoom in or hover. Each
cluster of three or more gets a soft colored glow and a name: the group most of
its people share ("National conservatism"), or "Around [best-connected
member]" when no group fits. Money lines of the tapped person (and all of them
in Follow the money) carry green pulses moving from giver to receiver.

Filters → Display → **Left–right by political lean** switches to the lean
layout: left–right is political lean; up–down is left to the links. Left–right
comes from `lean`:

```json
"lean": [
  { "value": -1, "start_year": null, "end_year": 2016,
    "basis": "Gave mainly to Democrats; endorsed Hillary Clinton in 2016.",
    "sources": [{ "url": "https://…", "title": "…" }] },
  { "value": 2, "start_year": 2017, "end_year": null,
    "basis": "Republican since 2017; campaigned for Trump in 2024.",
    "sources": [{ "url": "https://…", "title": "…" }] }
]
```

| Value | Label | Use when the documented record shows |
| --- | --- | --- |
| -3 | Far left | Reliable outlets widely describe them as far left (socialist/communist movements, etc.) |
| -2 | Left | Democratic or left-party officials and operatives; consistent, major Democratic funding or campaigning |
| -1 | Center-left | Leans Democratic or center-left (Third Way, mostly-Democratic giving, Democratic endorsements with a centrist record) |
| 0 | Centrist / nonpartisan | Gives to both sides, or publicly says they are nonpartisan or apolitical, with sources |
| 1 | Center-right | Leans Republican or center-right, libertarian-leaning, or recently moved right without a party role |
| 2 | Right | Republican or right-party officials and operatives; consistent, major Republican funding or campaigning |
| 3 | Far right | Reliable outlets widely describe them as far right, white nationalist or similar |

- Periods are in order and don't overlap; only the last may be open-ended
  (`end_year: null`). With a date range set (Filters → Timeline), people move
  to their lean in the range's last year (before the first period, the first
  applies; after the last, the last).
- `basis` names the documented record: party, offices held, campaign donations
  (FEC filings), endorsements, and self-description. Every period needs sources.
- The value is a classification, but it must rest on that sourced record, plus
  who the person works with and funds. If sources disagree (they call
  themselves a Democrat but fund Republicans), pick the value the record
  supports, say so in `basis`, and add a `source_conflicts` entry.
- Leave `lean` out when there is no public political record. The person is then
  placed left–right only by their links. No lean for `"public_figure": false`.
- Links also pull people together: the closer the relationship (family,
  co-founder, mentor, employer, friend, then donor and ally, then colleague), and the
  higher its confidence, the harder it pulls. Rivals barely pull.
- A researched lean holds firm: links never move that person left or right,
  only up or down. People without a lean are placed left–right by their links,
  near the closeness-weighted average lean of the people they're linked to.
- The left–right pull is only for the main view in lean mode.

## 2028 race

People in the 2028 presidential race carry a `race_2028` field and the
`2028-race` group:

```json
"race_2028": { "role": "contender", "basis": "Second in most 2028 Democratic primary polls.",
               "sources": [{ "url": "https://…", "title": "…" }] }
"race_2028": { "role": "camp", "contenders": ["jd-vance"],
               "basis": "Longtime donor and adviser.", "sources": [{ "url": "https://…" }] }
```

- **Contender:** reliable polling or reporting treats them as a likely 2028
  candidate (declared, exploring, or consistently polled near the top).
- **Camp:** a close adviser, strategist, major donor, family member who is a
  public figure, or key ally of one or more contenders. The validator requires
  a connection to each listed contender (or to someone already in that camp)
  and that contender's own `race_2028`. If the owner places someone in a camp
  that the sources don't show, say so in `basis` and cite what the sources do say.
- **Views:** besides the "2028 race" group, Views lists one "2028 camps" entry
  per contender (built from `race_2028`, no extra tagging), which puts the
  contender and their camp in the middle.
- Update these as candidates declare or drop out (`/refresh-person`).

The viewer also has three views that need no tagging: **Follow the money**
(people with donor links), **Feuds** (people with rival or enemy links), and
**[Person]'s world** (anyone plus everyone within one or two links).

**Compare** (a person's details → Compare, or "How close are they?" on a
line) scores how closely two people are tied, 0–100, without counting degrees
of separation (everyone is one or two steps apart). It shows:

- **Strongest chain**: the path (at most 4 links) whose links' closeness,
  multiplied together, is highest. Closeness is the `CLOSENESS` weight of the
  link's kind times its confidence. Rivalries and enmities never count; a tie
  that has ended counts 0.6; friendly ties between two people who are rivals
  or enemies now count half.
- **Shared circle**: people and organizations tied to both, each scored by the
  weaker of the two ties.
- **Score**: combines the chain, the shared circle and shared groups. Passing
  through someone with a large network counts for less (×√(12 / their
  connections) past 12, so everyone isn't close through Trump). A current
  direct rivalry or enmity multiplies the score by 0.6 (0.85 if it's past).
  Labels: 75+ very close, 55+ close, 35+ connected, 15+ loosely connected.
  With a date range set, only links active in it count.
- The map shows just the two, the chain and the shared circle. Logic:
  `compare()` in `src/lib/graph.ts`.

**Bond** (tap a line, or Compare two people who are directly tied) is a
friend / loyalty meter, 0–100, for the pair's own relationship only. How many
connections either person has never counts. It has three parts (`bond()` in
`src/lib/graph.ts`):

- **Depth (half):** the kinds of friendly tie between them, each weighted by
  `CLOSENESS` × confidence and combined so a second kind adds less than the first.
  A current government job between two officials counts by how far apart they
  sit in the org chart (`orgDistanceFactor`): a direct report in full, two
  levels 0.85, three 0.7, further or no recorded reporting line 0.6. A donation
  counts by its size from `giving`, matched by the recipient's `slug` or `org`
  (`moneyFactor`: 0.35 at $1,000, 0.45 at $10,000, 0.55 at $100k, up to 1 at
  about $3B; 0.65 when no amount is reported, and never less when part of it
  went unreported). Only a job
  recorded as ongoing (`end_year: null`) gets the org-chart distance.
- **Years together (30%):** the years their dated ties cover, plus years both
  worked at the same small workplace (from timelines; workplaces with more than
  five people in the map, like the White House or Senate, don't count). A tie
  with a start but no end counts as continuing; a donation counts for its year
  only, plus each two-year cycle in which `giving` shows money to that person or
  organization (gaps between cycles add nothing); family counts as lifelong. Ties with no start year add no years, and the
  meter says so: give links a `start_year` whenever a source has one.
- **On the record (20%):** distinct sources (capped at five, so heavily
  researched files don't win on volume) plus shared workplaces.
- **Status:** ongoing; ended (×0.7); mended, an old feud with friendly ties now
  (×0.85); broken, friendly ties plus a current rivalry or enmity (×0.3); or
  hostile, only a current feud (0). Labels: 80+ inner circle, 60+ strong bond,
  40+ solid, 20+ working tie, else thin.

**Pull** (Views → Pull, and a Pull tab on each person) scores 0–100 how
close someone is to people in power (`src/lib/pull.ts`):

- Each post has a weight (`power()`): the President 1; VP and chief of staff
  0.8; White House senior staff 0.5; cabinet secretaries 0.7, deputies 0.45,
  under secretaries and department chiefs of staff 0.3, others 0.2; agency
  heads 0.6; congressional leaders 0.6–0.65, chairs 0.4, members 0.25.
- **Access:** each tie to an official adds post weight × Bond / 100; ties to
  people junior to the person count a quarter. Each documented meeting, call or
  deal with that official in the last 12 months (`access`) closes 15% of the gap
  to a full bond (up to three); a meeting with no tie in the map starts from a
  bond of 20. A current feud (hostile bond) gives no access, whatever the meetings. The strongest tie counts in full, the next
  half, the next a quarter, combined so it stays under 100.
- **Leverage** (`leverage`, level 1–3) then closes 15%, 30% or 45% of what's
  left: what the person controls that people in power need (companies,
  contracts, media, money, voters).
- **No setbacks:** firings, court rulings, investigations and stalled
  nominations never lower Pull; it counts documented access and leverage only.
  Denied asks don't lower it either (see "Track record").
- Labels: 75+ inner-circle access, 55+ strong, 35+ real, 15+ some, else little.

```json
"leverage": { "level": 3, "basis": "Oracle holds 15% of the TikTok U.S. venture; son's Paramount owns CBS and CNN.",
              "sources": [{ "url": "https://…", "title": "…" }] },
"access": [ { "date": "2026-09-29", "with": ["donald-trump"], "what": "Attended the White House AI lunch.",
              "sources": [{ "url": "https://…" }] } ]
```

  Leverage levels: 1 notable (a top donor, a sizable firm), 2 major (a leading
  company, contractor or donor the administration depends on), 3 systemic
  (several of these at national scale). `basis` names what they control, from
  the sources. `access` events need a date, the officials' slugs and sources;
  they are about contact, not opinions of it.
- "Whose ear" ranks everyone by Bond with one official instead. The President
  is left out of the overall ranking (pull is measured against him), as is
  anyone with `died` set.

Group views, 2028 camps, Follow the money and Feuds are **spotlight** views:
only the view's own people are on the map, every name shown, with only the
lines between them (in Follow the money and Feuds, only money or feud lines).
A 2028 camp puts the contender in the middle with the camp around them. A row
of chips under the view's label lists the outsiders tied to the most of the
view's people (most members first, then the closest ties); tapping one adds
them to the map, tapping again removes them. Tapping a person still shows all
of their own lines. "[Person]'s world" and Compare keep the ring layout
("1 step out", "2 steps out").

## Office (org chart)

Current government officials carry an `office` field, which places them in
**Views → Org chart** (a hierarchy instead of the web):

```json
"office": { "title": "Deputy Secretary of State", "unit": "state", "rank": 2,
            "reports_to": "marco-rubio", "since": "2025-03-25", "acting": false,
            "sources": [{ "url": "https://…", "title": "…" }] }
```

- **unit**: `white-house`, `eop`, `state`, `treasury`, `war`, `justice`,
  `interior`, `agriculture`, `commerce`, `labor`, `hhs`, `hud`,
  `transportation`, `energy`, `education`, `va`, `dhs`, `agencies` (CIA, DNI,
  USAGM…), `envoys` (ambassadors and special envoys), `senate`, `house`.
  Keep the list in `src/lib/schema.ts` and `scripts/validate.mjs` in sync.
- **rank**: 1 head, 2 deputy, 3 senior (under secretary, chief of staff,
  committee chair), 4 other appointee or member. Sorts people within a unit.
- **reports_to**: the boss's slug (must have a file). The chart nests people
  under their boss within a unit and shows "Reports to …" when the boss is in
  another unit (secretaries → the President). It also shows each person's Bond
  score with their boss, or "no tie on record" when the map has no link
  between them, so give officials a sourced link to their boss.
- One office per person: the main current post. Remove it when they leave
  (and move the post into `timeline`). Only current officeholders; note
  pending changes in the title ("until January 2027").
- Senior staff of officials (chiefs of staff, deputy chiefs, agency heads)
  count as public figures for their public role (research rule 1); record only
  their posts and public record.
- **verified** (optional, YYYY-MM-DD): the day someone last confirmed the
  person still holds the post. Set it whenever a refresh confirms a post, even
  if nothing else changed. Without it, the file's `last_researched` stands in.
  The org chart flags posts not confirmed in 30 days (see "Freshness").
- **`org_chart_only: true`** (needs an `office`): junior officials (department
  chiefs of staff, deputy chiefs, assistant secretaries, deputies) live in the
  org chart and Pull but stay off the main web and group views, unless
  searched for or tapped (their boss's ties still bring them in when the boss
  is selected).

## Giving

Donors (anyone whose political giving is publicly reported) can carry a `giving`
field. It shows as a "Giving" section in the person's details. Committees and
groups (super PACs, dark-money groups) are not people, so they live here as
recipients, not as files. Money to or from someone in the map is also recorded
as a `donor` / `funded_by` connection, so it shows as a Money line.

```json
"giving": {
  "cycles": [
    { "cycle": 2026, "total_usd": 445500000, "rank": 1,
      "ranking": "OpenSecrets, as reported by Newsweek",
      "description": "Optional one-line summary of the cycle.",
      "sources": [{ "url": "https://…", "title": "…" }],
      "recipients": [
        { "name": "America PAC", "kind": "super-pac", "side": "R", "amount_usd": 216000000,
          "description": "Musk's own super PAC.", "sources": [{ "url": "https://…" }] },
        { "name": "Donald Trump", "slug": "donald-trump", "kind": "candidate", "side": "R", "sources": [ … ] }
      ] }
  ],
  "outlook": {
    "cycle": 2028,
    "summary": "What reporting says about their plans, in one or two sentences.",
    "sources": [ … ],
    "likely": [
      { "name": "Marco Rubio", "slug": "marco-rubio", "kind": "candidate", "side": "R",
        "basis": "Told Axios in July 2026 he would back Rubio over Vance.",
        "confidence": 0.8, "sources": [ … ] }
    ]
  }
}
```

- `cycle`: the even year a federal cycle ends in. One entry per cycle.
- `total_usd` / `rank`: from a named ranking (`ranking`), e.g. OpenSecrets'
  top donors. Rankings differ by method (all giving vs outside spending; which
  filing date). Give the figure the cited source states, and put other figures
  in `source_conflicts`.
- `kind`: `super-pac`, `dark-money`, `candidate`, `party`, `pac`, `ballot-measure`, `other`.
  `side`: `D`, `R`, `both` (gives to both parties, e.g. industry PACs) or `nonpartisan`.
- `amount_usd`: whole dollars as reported. Leave it out when no source gives a figure.
- `fec_usd` / `fec_ids`: written by the FEC import, never by hand: what itemized
  filings show for that recipient in the cycle, and the committees behind it. A
  figure from reporting stays in `amount_usd`; when the two differ by more than
  5% the Money tab shows both (rankings count affiliates and non-federal money,
  and filings lag by a quarter).
- `slug`: when the recipient is, or is run by, someone in the map (MAGA Inc. → `donald-trump`).
- `org`: when the recipient has its own file in `data/orgs/` (MAGA Inc. → `maga-inc`).
  The details panel then links to the organization. The validator checks the file exists.
- **Outlook** is a forecast, so it rests only on reporting: a stated plan or
  preference ("would back Rubio"), a pledge, or a long documented pattern (gave to
  the same committees every cycle). Say which in `basis`. Confidence uses the
  scale below: 0.8+ for a stated plan, 0.6–0.75 for a pattern across several
  cycles, 0.4–0.55 for thin or denied reports. Nothing below 0.3; no guesses.
- Spouses who give jointly are usually counted together by the rankings. Keep the
  main donor's file and say "with [spouse]" in the description.

## FEC import

`npm run fec` (`scripts/fec-import.mjs`) reads the Federal Election
Commission's itemized receipts (schedule A, through api.open.fec.gov) for the
map's donors and writes what it finds into their files. A dry run by default;
`-- --write` saves. It is safe to re-run: a second run changes nothing.

- **Who:** living public figures on the main web who already have `giving` or
  whose sector is business, tech or AI and defense, for the cycles listed in
  `data/fec.json` (2016–2026).
- **Whose record is it?** Names repeat, so a filing counts only when the name
  matches *and* its employer or occupation field matches a word from the
  person's own file (timeline, affiliations, their organizations), or a rule in
  `data/fec.json` → `donors` says so: other first names on filings (`first`),
  extra employer words including misspellings (`employers`), a size above
  which a name match is enough for a distinctive name (`large_usd`), exact
  other contributor names such as a trust (`also`), extra searches
  (`queries`), or `skip` for a name too common to trust. The dry run lists
  what was turned away with the same name, largest first; add a rule only when
  it is plainly them. When unsure, leave it out.
- **Privacy:** filings carry contributors' addresses. The import never reads
  or keeps them, and its cache of raw responses lives outside the repo (the
  system temp folder, or `--cache <dir>`). Cached responses expire after 12
  hours: the FEC loads filings in batches (the 2026 pre-general reports
  arrived on Nov. 10), and an older cache silently misses them. Only committee names, amounts,
  years and fec.gov links are written (research rule 2).
- **What it writes.** Per cycle, a `giving` recipient for every person or
  organization on the map that got $1,000 or more (all their committees
  together), plus the ten largest other committees at $25,000 or more, each
  with `fec_usd`, `fec_ids` and fec.gov links. A cycle with no ranking gets
  its FEC total. A gift of $10,000 or more in all to someone on the map also
  becomes a `donor` / `funded_by` link in both files (or adds the filings to
  an existing one), with confidence 0.95 and an official-record source.
- **Which committee is whose:** `data/fec.json` → `committees` maps FEC
  committee ids to a person (`slug`) or organization (`org`): campaign
  committees, leadership PACs, joint fundraising committees named for one
  person on the map, and the super PACs formed to back them. `from` is the day
  a committee became theirs (Biden's committees count for Harris from July 21,
  2024). `candidates` holds each politician's FEC candidate ids. When adding a
  politician or a PAC, add their committees here.
- **Limits:** federal committees only (no state races, no dark money, nothing
  under the $200 itemizing threshold), and the current cycle is incomplete
  until the post-election reports are filed. The scorecard chose the $10,000
  line: a $2,500 cutoff predicted no better and drew twice the lines; weighting
  closeness by gift size did not help either, so a money link counts the same
  whatever its size (Bond still counts size).
- **Access:** the "VITAL" cloud environment allows api.open.fec.gov and adds
  the API key to requests. Elsewhere, set `FEC_API_KEY` (free from api.data.gov).

## Organizations

Committees and groups that money and people flow through get their own file in
`data/orgs/<slug>.json` and show on the map as **squares**, bordered red
(Republican side), blue (Democratic side) or grey (both or neither). They make
paths visible: Musk → Senate Leadership Fund → Ken Paxton. Add an organization
when several people in the map give to it, run it or work for it; one-off
recipients stay as `giving` entries. Companies and media that employ several
people in the map get a square too (Palantir, Anduril, OpenAI, Fox News,
PayPal), linked from each person's own sourced timeline entry, so a shared
employer shows as one hub instead of many colleague lines. `/add-org` researches one.

```json
{
  "name": "MAGA Inc.",
  "aliases": [],
  "kind": "super-pac",
  "side": "R",
  "founded": 2022,
  "groups": [],
  "summary": "Two or three neutral sentences: what it is, who runs and funds it, what it spends on.",
  "sources": [{ "url": "https://…", "title": "…" }],
  "finances": [
    { "cycle": 2024, "raised_usd": 410500000, "spent_usd": 456800000,
      "description": "Optional.", "sources": [{ "url": "https://…" }] }
  ],
  "connections": [
    { "name": "Timothy Mellon", "slug": "timothy-mellon", "relationship_type": "donor",
      "description": "About $150 million in the 2024 cycle.", "start_year": 2024, "end_year": 2025,
      "confidence": 0.95, "sources": [{ "url": "https://…" }] }
  ],
  "source_conflicts": [],
  "notes": "Optional.",
  "last_researched": "2026-11-08"
}
```

- **kind**: `super-pac`, `dark-money`, `pac`, `party`, `think-tank`, `advocacy`,
  `foundation`, `investment-firm`, `company`, `media`, `other`.
- **side** (optional): who its money or work helps: `R`, `D`, `both` (spends in
  both parties, e.g. industry PACs) or `nonpartisan`. On the main map an R or D
  side places the square gently right or left; links do the rest.
- **founded** / **dissolved**: years. **groups**: same list as people (e.g.
  `natcon`, `ai-race`), for the preset views.
- **finances** (optional): money raised and spent per cycle, from FEC filings
  or reporting on them. Leave a figure out when no source gives one.
- **connections** use the person format and the same relationship types, read
  the same way: the type is what the connected person (or organization) is *to
  the file's subject*. In `maga-inc.json`, `donor` = they gave to MAGA Inc.;
  `funded_by` = MAGA Inc. spent for them; `employee` = they lead, staff or sit
  on the board of it (say which in the description); `co-founder` = they
  founded it; `enemy` = it spent against them or they against it. `mentor`,
  `protégé`, `family` and `friend` don't apply to organizations.
- **Two-way links** apply as for people: the person's file gets the inverse
  record (`funded_by` MAGA Inc. for a donor, `donor` MAGA Inc. for a candidate it
  backed, `employer` for its staff and board).
- Organizations have no `public_figure`, `photo`, `lean`, `giving`, `sector` or
  `race_2028`. The research rules apply in full: every fact and link sourced.
- Money that passes through an organization can also stay as a direct
  person-to-person `donor` link where reporting describes it that way
  ("Mellon gave $150M to the pro-Trump MAGA Inc."); the organization's file is
  where the amounts per donor live.

## Relationship types

`relationship_type` says **what the connected person is to the file's subject**.
In Stephen Miller's file, `{"name": "Jeff Sessions", "relationship_type": "employer"}`
means "Jeff Sessions employed Stephen Miller".

| Type in S's file about O | Meaning | Inverse (goes in O's file about S) |
| --- | --- | --- |
| `mentor` | O mentored S | `protégé` |
| `protégé` | S mentored O | `mentor` |
| `employer` | O employed S (S worked for O or O's office) | `employee` |
| `employee` | S employed O | `employer` |
| `donor` | O gave money to S, S's campaign or S's organization | `funded_by` |
| `funded_by` | O was funded by S | `donor` |
| `colleague` | worked alongside each other | `colleague` |
| `ally` | publicly documented political or professional alliance | `ally` |
| `rival` | peers at the same level competing for the same prize: rival candidates in an election or primary, rivals for the same post, competing companies or founders, a power struggle between equals (set `end_year: null` if ongoing, the year it ended if it's over) | `rival` |
| `enemy` | publicly documented opposition where one side works against or attacks the other rather than competing with them as an equal: critics, campaigns to defeat or prosecute someone, a boss turning on a subordinate, a feud between people in different arenas (`end_year` as for `rival`) | `enemy` |
| `co-founder` | founded something together | `co-founder` |
| `family` | relatives — only if documented and both are public figures | `family` |
| `friend` | a publicly documented personal tie between two public figures: one officiated or was best man at the other's wedding, godparent, longtime friends by their own public account or reliable reporting, vacations or holidays together reported by major outlets. Record the tie itself, not private details (no locations, guests, children or health) | `friend` |

Two people can have more than one record (e.g. `employer` and later `enemy`).
Rival or enemy? Ask whether they are competing for the same thing as equals (rival) or whether one is simply opposing the other (enemy). Trump vs Biden in 2020 is a rivalry; Trump vs Soros is enmity.
Use one record per type per pair; put the whole story in its description.

## Confidence

| Range | Use when |
| --- | --- |
| 0.90–1.00 | Stated by an official or primary source, or by several independent reliable outlets. Undisputed. |
| 0.70–0.89 | Stated by one reliable source, or several with gaps (e.g. dates unclear). |
| 0.50–0.69 | Thin: one secondary source, one side's own account, or inferred from documented overlap (same office at the same time) with no direct evidence of a working relationship. |
| 0.30–0.49 | Contested: one side claims it and the other denies it, or sources conflict. Explain in the description. |
| below 0.30 | Don't record it. |

## Evidence

Stated confidence is a claim; what the map counts is held to what the sources
can carry (`src/lib/evidence.ts`). Each link's sources, pooled from both files,
are grouped by **independent publisher** (one outlet cited twice, or two
sister brands, count once) and each publisher has a tier:

| Tier | What | Weight |
| --- | --- | --- |
| Official record | Government sites (`.gov`, `.mil`), filings, an organization's own site for ties to that organization, the owner's own account | 0.9 |
| News outlet | Any news organization, of any leaning (the default for a host in no list) | 0.7 |
| Reference work | Wikipedia, Britannica, Ballotpedia | 0.6 |
| Other site | Advocacy groups, think tanks, companies' own pages, press-release wires, social media, personal sites (`OTHER` in `evidence.ts`) | 0.5 |

The weights combine as 1 − Π(1 − weight), which gives three grades:

| Grade | Means | Confidence counts up to |
| --- | --- | --- |
| **Strong** | An official record, or two independent news outlets, or better | the stated value |
| **Solid** | Two independent sources, one of them a reference work or other site | 0.90 |
| **Thin** | One source that isn't an official record | 0.80 (news), 0.75 (reference), 0.70 (other) |

- A link's `confidence` everywhere in the viewer (lines, Bond, Pull, Compare)
  is `min(stated, cap)`. The details panel shows the grade, and says when a
  stated value is being held down. A pair whose every link is thin is drawn
  **dashed**.
- For a job under a current boss (directly, or up the reporting line to the
  President), the employee's `office.sources` count as evidence too.
- **When researching, give every connection two independent sources, or one
  official record.** Wikipedia plus the news story it cites is fine. Sources
  must still state the fact (rule 3); never add a source just to raise a grade.
- `npm run evidence` prints the counts, what the cap does to Pull, and the
  **research queue**: thin links ranked by how much they matter (kind of tie ×
  the power or Pull of the stronger end × how much is being held back). Work
  from the top.
- New non-news hosts (an advocacy group, a think tank, a company site) go in
  `OTHER`; sister brands in `SAME_PUBLISHER`. News outlets need no entry, and
  there is no ranking of outlets by leaning (rule 6).

## Scorecard

`npm run scorecard` measures whether the map predicts anything
(`src/lib/backtest.ts`). It freezes the map at the end of a past year
(`freeze()`: ties, jobs, gifts and meetings that started later are dropped,
ones that ended later reopen, and hindsight fields such as groups, the 2028
race, leverage and giving outlooks are stripped), then scores the frozen map
against what the files now record:

- **New ties:** among pairs with no friendly tie at the cutoff, do the ones
  `compare()` rates closest go on to form one? Reported as AUC (0.50 is a coin
  flip, 1.00 perfect) next to two simple baselines (shared friends; how well
  connected both are), and as hits among the 100 closest pairs against chance.
- **Backing:** for each donor, does the frozen map pick out whom they fund in
  the next cycle? Reported for the backing score (closeness plus political fit;
  see "Backing"), for closeness alone, and for the "same as last time"
  baseline; separately for first-time recipients, where repeating the past
  can't help; and as how often pairs in each label's band went on to give.

Cutoffs are the ends of 2022 and 2024. **Run it before and after any change to
the scoring rules** (`graph.ts`, `pull.ts`, `evidence.ts`): a change that
lowers these numbers needs a reason. `-- --save` records the run in
`data/scorecard.json` (one entry per day). Limits to keep in mind: the files
were written with hindsight (older ties were recorded because they matter
now), undated ties count as already standing, and the samples are modest
(100 to 200 new ties and about 100 gifts per cutoff since the FEC import), so
differences of a point or two mean nothing.

## Backing

**Views → 2028 backing**, and a **2028** tab on each person, score 0–100 how
likely someone is to back each 2028 contender (`src/lib/backing.ts`). It is
a prediction, built in two layers:

- **What the map can be tested on** (`structuralBacking`): closeness
  (`compare()`: the strongest chain and the shared circle) combined with
  **political fit** so that either can carry the score:
  `1 − (1 − closeness) × (1 − 0.3 × fit)`. Fit comes from the two leans (an
  organization's side counts as ±2): the same lean 1, one step apart 0.9, two
  0.6, three 0.3, opposite sides 0.08, and 0.6 when either lean is missing. So
  someone on the same side with no tie scores 30, and a close tie can still
  carry across sides (on past donations it did: the tech donors who changed
  sides). A current feud with the contender multiplies it by 0.1.
- **What is declared** sits on top: a camp (`race_2028`) counts 0.9 and a
  reported plan to give (`giving.outlook.likely` naming the contender) counts
  its confidence, combined the same way. Someone in the camp of a rival on the
  same side has their score for the others multiplied by 0.6.
- **Labels:** 85+ very likely, 65+ likely, 45+ leaning, 30+ possible, else
  unlikely. On past donations (the scorecard, both cutoffs pooled: 214 gifts
  from FEC filings), about 6 in 10 pairs rated likely or better went on to
  give, 1 in 8 leaning, 1 in 14 possible and 1 in 50 unlikely. The viewer quotes this
  (`BACKING_TRACK_RECORD` in `BackingView.tsx`); update it when the scorecard
  moves.
- **Who is scored:** living, researched public figures on the main web. Not
  organizations, org-chart-only officials, or the contenders themselves.
- **The board** lists each contender with the people in their camp, the people
  who would pick them first without being in it (a first choice needs 45), and
  what the donors among both gave in their latest reported cycle. "Up for
  grabs" lists donors with no camp whose two best same-side choices are within
  8 points.
- **Honest limits.** The 0.3 weight was chosen on the same past donations the
  scorecard reports, so the score's own numbers flatter it a little. Donations
  are not endorsements, and no primary has been backtested. Foreign figures
  are scored like anyone else. Treat a score as "worth watching", and the
  reasons line as the thing to check.
- **The prediction log.** `npm run predict -- --save` records every pair rated
  45 or higher (for people in nobody's camp on that side) in
  `data/predictions.json` with the date and who was in which camp that day.
  `npm run predict` then says how each earlier run is holding up: a pick has
  come true when the files later put the person in that contender's camp or
  record a 2028-cycle gift to them, and has missed when they join only a
  same-side rival's camp. Save a run after any big change to the map or the
  rules; never edit old runs.

## Track record

People can carry `asks`: requests they made of officials (an appointment, a
pardon, a policy, a ruling, a contract, a deal or disaster aid) and how each
turned out. They show in the Pull tab under **Track record**.

```json
"asks": [
  { "date": "2025-04", "with": ["donald-trump"], "kind": "policy", "outcome": "denied",
    "decided": "2025-04-07", "what": "Flew to Washington to seek relief from the 17% tariff on Israel; Trump gave none.",
    "sources": [{ "url": "https://…" }, { "url": "https://…" }] }
]
```

- `date`: when the ask became public. `with`: the officials on the map who
  decided it (empty when an agency, a court or someone off the map did).
  `kind`: `appointment`, `pardon`, `policy`, `regulatory`, `contract`, `deal`,
  `aid` or `other`. `outcome`: `granted`, `partial`, `denied` or `pending`;
  `decided` is the date of the outcome (none while pending).
- Record only asks the sources show: a stated request, a reported lobbying
  push, a formal application. Public advocacy counts when it was aimed at a
  decision then pending. Where accounts differ on whether someone asked, say
  so in `what` (rule 4). Two sources each, as for connections.
- **The track record never changes anyone's score.** It is there to see, and
  to test Pull. `npm run tune-pull` freezes the map at each ask's date (posts
  and meetings to the day, ties to the year, leverage kept), scores the asker,
  and asks whether higher scores went with granted asks. On the first 28
  asks (12 granted, 13 denied, 3 partly granted), overall Pull did not
  (AUC 0.48, and no weight setting helped on held-out asks); the asker's bond
  with the official who decided did, modestly (0.66 held out). So Pull's
  weights stay as they are: Pull measures access, not success. For a
  particular ask, "Whose ear" (Bond with one official) is the better guide.
- Pull's weights live in `DEFAULT_PULL` (`src/lib/pull.ts`). Change them only
  when `npm run tune-pull` supports it on held-out asks, and re-run it as asks
  are added; the sample is small, so a few points of AUC mean nothing.
- Known limit: ties are dated by year, so a tie that started later in the
  same year as an ask still counts (Musk's 2025 feud with Trump lowers his
  bond for his April 2025 ask).

## Freshness

Every file has `last_researched`, and every post can have `office.verified`.
`src/lib/freshness.ts` turns them into ages: a file is **aging** after 45 days
and **stale** after 90; a post is **due** for a check after 30. The Record tab
shows how old the research is, and the org chart marks posts not confirmed
in 30 days ("checked 2 months ago").

- `npm run freshness` lists what to check first: unconfirmed posts and old
  files, ordered by how much the person matters (their post's weight, their
  Pull, or their connections) times how overdue they are. It also says when
  the FEC import, the prediction log, the scorecard and the monthly snapshot
  last ran.
- `npm run freshness -- --snapshot` records this month's Pull scores and 2028
  first choices in `data/history.json` (one entry a month; a later run in the
  same month replaces it).
- **Trend arrows.** The Pull ranking and each person's Pull tab show ▲ or ▼
  with the change since the latest snapshot from an earlier month, when it is
  3 points or more (`src/lib/trends.ts`). The first arrows appear in December,
  once there is a November snapshot to compare against. The phone page reads
  the snapshots from its `history` collection (one document per month,
  `doc_id` YYYY-MM); `/sync-map` copies them.
- The weekly refresh (see "Updates feed") works from this list: it confirms
  the posts that are due (setting `office.verified`), refreshes the people
  who made news and the most overdue files, re-runs the FEC import, saves a
  prediction run and a scorecard run, and takes the monthly snapshot.

## Two-way links

Every connection between two people who both have files must be recorded in
both files, with inverse types. `/add-person` writes the new file and then adds
the inverse records to the existing files. The validator fails if a back-link is
missing or uses the wrong type. Connections to people without a file show in
the viewer as faint "suggested" nodes.

## Updates feed

`data/updates.json` lists what changed on the map, newest first, and the viewer
shows it under **Updates** (header button; on a folded phone, the bottom tab
bar), with a badge for entries this device hasn't seen. Each entry:

```json
{ "id": "2026-11-08-hegseth-refresh", "date": "2026-11-08",
  "text": "Pete Hegseth refreshed: Massie's impeachment articles, …",
  "people": ["pete-hegseth", "thomas-massie"] }
```

`/add-person`, `/refresh-person` and `/add-org` add an entry for each run.
A scheduled task ("Influence Map weekly refresh", Sundays 5:34 PM Arizona time)
starts a fresh cloud session each week that confirms the posts due for a
check, refreshes up to 8 people who made news or are most overdue, re-runs
the FEC import, saves prediction and scorecard runs and the monthly snapshot
(see "Freshness"), adds a `YYYY-MM-DD-weekly-refresh` entry, pushes and syncs
the phone page. The
text only summarizes what the files say (no new facts, so no sources of its
own); `people` must be slugs with files, and the chips jump to them. The
validator checks ids (date plus a short label, unique), dates and slugs.

## Phone page

The viewer is also published as a private claude.ai Artifact so it can be opened
on a phone. Its link is in `artifact.json`.

- **Data:** the page reads its Artifact database, collection `people`: one
  document per person, `doc_id` = slug, body = the file's JSON, unchanged.
  Organizations go in collection `orgs` the same way, the Updates feed in
  collection `updates` (`doc_id` = the entry's `id`), and the monthly
  snapshots in collection `history` (`doc_id` = the month). `/add-person`,
  `/refresh-person` and `/add-org` copy the files they change; `/sync-map`
  copies everything and removes documents whose file is gone. The files stay the
  source of truth; never edit the database by hand.
- **Access:** only the owner can write the database; anyone the owner shares
  the page with can read it. Sharing is done from the page's Share menu.
- **Photos:** published as files next to the page, at `photos/<file>`. After
  fetching a new photo, publish it: Artifact `read` the URL from `artifact.json`,
  then `publish` with that `url`, `file_path: influence-map/dist-artifact/page.html`
  (run `npm run build:artifact` first if `dist-artifact/` is missing) and
  `files: {"photos/<file>": "influence-map/public/photos/<file>"}`. Files left out
  of a publish are kept.
- **Viewer code changes:** run `npm run build:artifact` (writes
  `dist-artifact/page.html` and `dist-artifact/app.js`), then republish: Artifact
  `read` the URL from `artifact.json` first, then `publish` with that `url`,
  `file_path: influence-map/dist-artifact/page.html` and
  `files: {"app.js": "influence-map/dist-artifact/app.js"}`. Leave out
  `capabilities` and `icon` so the page keeps its stored settings (the
  database rule above, and `downloads` for PNG export).
- The same source builds both versions; `src/lib/platform.ts` switches data
  loading and PNG saving on `import.meta.env.MODE === 'artifact'`.

## Working on the viewer

- `npm install` once, then `npm run dev` (opens http://127.0.0.1:5173).
- `npm test` runs unit tests; `npm run typecheck`; `npm run validate` checks data;
  `npm run evidence`, `npm run scorecard` and `npm run tune-pull` report on
  sourcing and predictive power; `npm run freshness` on what is out of date.
- **Code layout.** `src/lib/graph.ts` turns files into nodes and links and
  scores them (compare, bond, clusters). `src/lib/evidence.ts` grades each
  link's sources; `src/lib/backing.ts` scores 2028 backing; `src/lib/backtest.ts` is the scorecard (not part of the app
  bundle; `scripts/lib/load.mjs` runs `src/lib` code from scripts through Vite). `src/lib/view.ts` decides what the map
  shows for a view and filters (`filterLinks`, `spotlightFor`, `visibleGraph`),
  as pure functions with tests in `view.test.ts`. `src/lib/useAppChrome.ts`
  holds the screen-layout and Updates-badge hooks. `src/App.tsx` only wires
  state to components. The details panel is `src/components/SidePanel.tsx`
  plus `src/components/panel/` (NodePanel, PairPanel, ComparePanel, parts).
- The dev server serves the data folders at `/api/people` (people and orgs) and
  pushes a reload event when a file changes (`vite-plugin-people.ts`). There is no backend
  beyond that and no network access from the app.
- **Now / All time.** A switch on the map (top left) defaults to **Now**: ties
  whose `end_year` is a past year are hidden, and people with no tie left drop
  off the map until searched for. **All time** shows every tie. A date range
  (below) overrides the switch. Line thickness follows each pair's Bond score
  (deeper bond, thicker line); feud-only lines follow their confidence.
- **Phone tab bar.** On a folded phone (narrow screens), Map, Views, Filters and
  Updates sit in a bottom tab bar instead of the header.
- **Person panel.** Tabs: **Overview** (summary and the five closest ties by
  Bond score), **Ties** (everyone, strongest bond first), **Pull** (with the
  track record of asks), **2028**
  (whom they are likely to back, or for a contender their likely backers), **Money** (giving or
  an organization's finances; only when there is some) and **Record** (lean,
  timeline, affiliations, disagreements, notes and file).
- **Timeline.** Filters → Timeline → "Show links active in a date range" has
  From and To sliders; a link shows if any part of it falls inside the range
  (undated links always show; a link with no recorded end counts from its start
  onward).
- **Colors.** Relationship lines are colored by family from the start ("Color
  all lines" is on by default; turned off, lines stay grey until a person is
  selected). Families: Work, Money, Alliance, Current rivalry (yellow), Past
  rivalry, Current enemy (pink), Past enemy, Personal (mentor, family, friend). A rivalry or enmity is
  past when its `end_year` is a year; ongoing or undated ones count as current.
  Past ones share their family's color but are drawn dotted (dashed means the
  pair rests on a single source, or confidence under 50%; see "Evidence"). Dots are tinted by sector; organizations are squares
  bordered by side. Both color sets were checked for
  color-blind separation against the dark background; the viewer always pairs
  color with text (legend, tooltips, details), so keep it that way.
- **Chrome theme.** Everything around the map (header, menus, chips, tooltips,
  details panel) uses a navy, cream and deep-red palette with Instrument Serif
  titles and Instrument Sans text, after the 2026 whitehouse.gov look. The
  tokens are in the "Theme" block at the end of `src/styles.css`; the fonts load
  from Google Fonts (`index.html` and `scripts/build-artifact.mjs`). It borrows
  the look only: no seals, logos or official names. The map keeps its own colors
  (`--map-bg`, sector and family colors).
- If you add a sector or group, update `src/lib/schema.ts`, `scripts/validate.mjs`,
  the "Sectors and groups" table above, and both commands.
- If you add an organization kind, update `ORG_KINDS` in `src/lib/schema.ts` and
  `scripts/validate.mjs` (a test checks they match) and the list above.
- If you add a relationship type, update `src/lib/schema.ts`,
  `scripts/validate.mjs` (a test checks they match), this file, and both commands.

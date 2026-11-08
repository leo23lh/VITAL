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
| `public/photos/<slug>.jpg` | Portraits shown in the dots (freely licensed, from Wikimedia Commons). |
| `scripts/fetch-photos.mjs` | Downloads a person's Wikipedia lead photo if its license is free and records the credit. |
| `scripts/validate.mjs` | Checks every file against the rules below. No install needed: `node influence-map/scripts/validate.mjs` from the repo root. |
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
   the relative is a public figure in their own right. Never name children.
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
better-connected person's name are hidden until you zoom in or hover.

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
  (`end_year: null`). The year slider moves people to their lean for that year
  (before the first period, the first applies; after the last, the last).
- `basis` names the documented record: party, offices held, campaign donations
  (FEC filings), endorsements, and self-description. Every period needs sources.
- The value is a classification, but it must rest on that sourced record, plus
  who the person works with and funds. If sources disagree (they call
  themselves a Democrat but fund Republicans), pick the value the record
  supports, say so in `basis`, and add a `source_conflicts` entry.
- Leave `lean` out when there is no public political record. The person is then
  placed left–right only by their links. No lean for `"public_figure": false`.
- Links also pull people together: the closer the relationship (family,
  co-founder, mentor, employer, then donor and ally, then colleague), and the
  higher its confidence, the harder it pulls. Rivals barely pull.
- A researched lean holds firm: links never move that person left or right,
  only up or down. People without a lean are placed left–right by their links,
  near the closeness-weighted average lean of the people they're linked to.
- Group and lens views keep their radial layout; the left–right pull is only
  for the main view in lean mode.

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

Group and lens views use a radial layout: the view's people sit in the middle,
and everyone else sits on faint rings by how many links away they are
("1 step out", "2 steps out", "not linked"). The whole network stays visible.

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

## Organizations

Committees and groups that money and people flow through get their own file in
`data/orgs/<slug>.json` and show on the map as **squares**, bordered red
(Republican side), blue (Democratic side) or grey (both or neither). They make
paths visible: Musk → Senate Leadership Fund → Ken Paxton. Add an organization
when several people in the map give to it, run it or work for it; one-off
recipients stay as `giving` entries. `/add-org` researches one.

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
  `protégé` and `family` don't apply to organizations.
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

## Two-way links

Every connection between two people who both have files must be recorded in
both files, with inverse types. `/add-person` writes the new file and then adds
the inverse records to the existing files. The validator fails if a back-link is
missing or uses the wrong type. Connections to people without a file show in
the viewer as faint "suggested" nodes.

## Phone page

The viewer is also published as a private claude.ai Artifact so it can be opened
on a phone. Its link is in `artifact.json`.

- **Data:** the page reads its Artifact database, collection `people`: one
  document per person, `doc_id` = slug, body = the file's JSON, unchanged.
  Organizations go in collection `orgs` the same way. `/add-person`,
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
- `npm test` runs unit tests; `npm run typecheck`; `npm run validate` checks data.
- The dev server serves the data folders at `/api/people` (people and orgs) and
  pushes a reload event when a file changes (`vite-plugin-people.ts`). There is no backend
  beyond that and no network access from the app.
- **Colors.** Relationship lines are colored by family from the start ("Color
  all lines" is on by default; turned off, lines stay grey until a person is
  selected). Families: Work, Money, Alliance, Current rivalry (yellow), Past
  rivalry, Current enemy (pink), Past enemy, Personal. A rivalry or enmity is
  past when its `end_year` is a year; ongoing or undated ones count as current.
  Past ones share their family's color but are drawn dotted (dashed still means
  confidence under 50%). Dots are tinted by sector; organizations are squares
  bordered by side. Both color sets were checked for
  color-blind separation against the dark background; the viewer always pairs
  color with text (legend, tooltips, details), so keep it that way.
- If you add a sector or group, update `src/lib/schema.ts`, `scripts/validate.mjs`,
  the "Sectors and groups" table above, and both commands.
- If you add an organization kind, update `ORG_KINDS` in `src/lib/schema.ts` and
  `scripts/validate.mjs` (a test checks they match) and the list above.
- If you add a relationship type, update `src/lib/schema.ts`,
  `scripts/validate.mjs` (a test checks they match), this file, and both commands.

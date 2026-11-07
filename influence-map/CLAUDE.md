# Influence Map

A local network graph of public figures and their documented relationships.
The app makes no AI or API calls. Claude Code is the research engine, through
two slash commands in the repo root's `.claude/commands/`:

- `/add-person <name> [context]` — research someone new and link them into the network
- `/refresh-person <name>` — re-research someone already in the network
- `/sync-map` — copy every file to the phone page (see "Phone page" below)

## Layout

| Path | What it is |
| --- | --- |
| `data/people/<slug>.json` | One file per person. The only source of truth. |
| `public/photos/<slug>.jpg` | Portraits shown in the dots (freely licensed, from Wikimedia Commons). |
| `scripts/fetch-photos.mjs` | Downloads a person's Wikipedia lead photo if its license is free and records the credit. |
| `scripts/validate.mjs` | Checks every file against the rules below. No install needed: `node influence-map/scripts/validate.mjs` from the repo root. |
| `src/` | Vite + React + TypeScript viewer (`npm run dev`). Reads the data folder and live-reloads. |

## Research rules

These apply to every command and every edit to `data/people/`. They are not optional.

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

The viewer also has three views that need no tagging: **Follow the money**
(people with donor links), **Feuds** (people with rival links), and
**[Person]'s world** (anyone plus everyone within one or two links).

Group and lens views use a radial layout: the view's people sit in the middle,
and everyone else sits on faint rings by how many links away they are
("1 step out", "2 steps out", "not linked"). The whole network stays visible.

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
| `rival` | publicly documented opposition or feud (set `end_year: null` if ongoing, the year it ended if it's over) | `rival` |
| `co-founder` | founded something together | `co-founder` |
| `family` | relatives — only if documented and both are public figures | `family` |

Two people can have more than one record (e.g. `employer` and later `rival`).
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
  `/add-person` and `/refresh-person` copy the files they change; `/sync-map`
  copies everything and removes people whose file is gone. The files stay the
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
- The dev server serves the data folder at `/api/people` and pushes a reload
  event when a file changes (`vite-plugin-people.ts`). There is no backend
  beyond that and no network access from the app.
- **Colors.** Relationship lines are grey until a person is selected (or "Color
  all lines" is on), then colored by family (Work, Money, Alliance, Current
  rivalry, Past rivalry, Personal). A rivalry is past when its `end_year` is a
  year; ongoing or undated rivalries count as current. Past rivalries share the
  rivalry color but are drawn dotted (dashed still means confidence under 50%). Dots are tinted by sector. Both color sets were checked for
  color-blind separation against the dark background; the viewer always pairs
  color with text (legend, tooltips, details), so keep it that way.
- If you add a sector or group, update `src/lib/schema.ts`, `scripts/validate.mjs`,
  the "Sectors and groups" table above, and both commands.
- If you add a relationship type, update `src/lib/schema.ts`,
  `scripts/validate.mjs` (a test checks they match), this file, and both commands.

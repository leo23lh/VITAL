---
description: Research a public figure and add them, with two-way links, to the Influence Map
argument-hint: <name> [context]
---

# /add-person

Input: `$ARGUMENTS`

The input is a person's name, optionally followed by context from the user (their
role, organization, why they matter, or how to tell them apart from someone with
the same name). If it isn't clear where the name ends, take the longest opening
part that reads as a person's name and treat the rest as context.

## Before you start

- **Data folder:** `influence-map/data/people/` (relative to the repo root). If the
  current directory is `influence-map/` itself, it is `data/people/`. Below this is
  called DATA_DIR.
- **Read `influence-map/CLAUDE.md`.** It has the file format, the relationship-type
  table (what each type means and its inverse) and the confidence scale. If
  anything below seems to conflict with it, CLAUDE.md wins.

## Research rules — follow exactly

1. **Public figures only.** If the person has no substantial public record, set
   `"public_figure": false`, save only what the user provided (sources
   `["user-provided"]`), and do **no** web research — not even one search to check.
2. **Public-role information only.** Never collect home addresses, phone numbers,
   personal emails, ID numbers, health information, or details about private
   relatives or minors. `family` links only when publicly documented and the
   relative is a public figure in their own right.
3. **Every fact and connection needs a source URL** for a page that states it.
   Drop anything unsourced. Don't fill gaps from memory.
4. **Note when sources disagree:** `source_conflicts` for facts about the person;
   the connection's `description` plus a lower `confidence` for connections.

## Steps

### 1. Identify the person and check for duplicates

- Work out the slug (`slugify(name)`: lowercase ASCII with hyphens).
- List DATA_DIR. If a file already exists for this person — same slug, or a file
  whose `name` or `aliases` match — stop and tell the user to run
  `/refresh-person <name>` instead. If it is a *different* person with the same
  name, use a qualified slug such as `john-smith-ohio-senator`.

### 2. Public-figure gate (before any search)

Decide from your own knowledge and the user's context whether this is a public
figure as CLAUDE.md defines it. If you can't tell, ask the user. Do not search
to find out.

If the person is **not** a public figure: write a file with
`"public_figure": false`, the name, only the details the user gave you,
`connections` only to people the user named (sources `["user-provided"]`, with a
confidence that reflects the user's wording), and today's date as
`last_researched`. Don't edit other people's files. Run the validator (step 7),
report what you saved, and stop.

### 3. Research the person's public role and record

Use WebSearch, and open pages (WebFetch, or a web-fetch agent if that's what you
have) when a search snippet isn't enough to confirm a fact. Record the URL of
the page that actually states each fact. Cover:

- current role, and a 2–3 sentence neutral summary of who they are
- career timeline: positions with organization and years
- affiliations: boards, organizations, think tanks, campaigns, publications
- documented relationships: who hired, mentored, funded, allied with or opposed them
- political record: party, offices, campaign donations (FEC), endorsements,
  self-description, and when any of it changed (for `lean`)
- anything where reliable sources disagree (dates, titles, nature of a relationship)

Prefer primary/official sources, then major news outlets. Wikipedia is a fine
starting point; cite the underlying reporting where you can.

If pages can't be opened (fetching is blocked in some environments), confirm
each fact with a WebSearch restricted to the source's domain (`allowed_domains`)
and cite only URLs whose result states the fact. Say so in the file's `notes`.

### 4. Look for connections to people already in the network

This is the most important step.

a. Read every file in DATA_DIR. For each person note name, aliases, current
   role, timeline organizations and years, affiliations and connections.

b. Find people who already mention the new person: search the files for the new
   person's slug, name and aliases (Grep). Each hit is a candidate — verify it
   with sources and record the inverse in the new file. If an existing file
   points at this person with a different slug, fix that slug to the new one.

c. For every existing person (or, in a network of more than about 25 people,
   at least everyone with an overlapping organization or period plus anyone
   who came up in step 3), run a targeted search for both names together. Check
   overlapping employers, offices, campaigns, organizations and years.

d. Check the organizations in `influence-map/data/orgs/` too. If the person
   gives to, founded, runs or works for one of them, or it spent for or against
   them, link the person to the organization (types as CLAUDE.md
   "Organizations" describes) and point any matching `giving` entry at it with
   `org`.

e. Record a connection only if a source documents it. Shared employer at the
   same time with no evidence of direct work together → `colleague` at
   confidence 0.5 or lower, and say that's the basis in the description.

### 5. Record notable outside connections too

Also record the most significant connections to people not yet in the network
(typically 5–15: bosses, mentors, protégés, co-founders, major funders, notable
allies, rivals and enemies). They appear in the viewer as "suggested" nodes. Apply the
same sourcing rules. Check the type table: the type is what the *other* person is
to this person (their boss is `employer`, their staffer is `employee`).

### 6. Write the files

a. Write `DATA_DIR/<slug>.json` in the CLAUDE.md format, with `last_researched`
   set to today's date. Set `sector` and `groups` from the "Sectors and groups"
   tables in CLAUDE.md, based on what the file's sourced facts show. For every
   `rival` or `enemy` record, set `end_year: null` if it is ongoing or the year it ended
   (the viewer draws ended ones as dotted lines). Use `rival` only for peers
   competing for the same thing as equals; use `enemy` when one side is opposing
   or attacking the other (see CLAUDE.md "Relationship types").
   Research and set `lean` as CLAUDE.md "Political lean" describes: one period
   per documented shift, each with a `basis` and sources. Leave it out if the
   person has no public political record.
   If they are a political donor, add `giving` as CLAUDE.md "Giving" describes:
   totals and main recipients per cycle (latest two cycles at least), and an
   `outlook` for the next cycle that rests only on reporting.

b. **Reciprocal links.** For every connection whose `slug` has a file in DATA_DIR
   (or in `influence-map/data/orgs/` for an organization),
   open that file and add the inverse record to its `connections` (inverse type
   from the table; same years, sources and confidence; description written from
   that person's side). If a record of that type for this pair already exists,
   merge: combine sources, keep the better-supported dates, note disagreement.
   Only touch `connections` in the other file. Don't delete anything there and
   don't change its `last_researched`.

### 6c. Photo

For a public figure, run `node influence-map/scripts/fetch-photos.mjs <slug>`. It
saves a freely licensed Wikipedia lead photo and writes the `photo` field, or
explains why it skipped (no image, or not a free license). If the network blocks
Wikipedia, skip this and say so in the report. Never add a photo by hand or for
someone with `"public_figure": false`.

### 7. Validate

Run `node influence-map/scripts/validate.mjs` (or `node scripts/validate.mjs`
from inside `influence-map/`). Fix every error and run it again until it passes.
Read the warnings and fix what applies.

### 8. Update the phone page

If `influence-map/artifact.json` exists, copy every file you created or changed
in this run (the new person and everyone who got a back-link) into that page's
database, so the graph on the user's phone updates:

1. ArtifactData `list` with the `url` from artifact.json and collection
   `people`, to get each stored person's `version`.
2. One ArtifactData `batch` of `set` writes (up to 50 per batch): collection
   `people`, `doc_id` = the slug, `file_path` = the person's JSON file, and
   `if_version` = the version from step 1 (leave it out for someone not stored yet).
   Organization files that got a back-link go to collection `orgs` the same way
   (list that collection for their versions).

3. If step 6c saved a photo, publish it next to the page as CLAUDE.md "Phone
   page → Photos" describes.

If this fails (for example, ArtifactData isn't available in this session), say
so in the report and suggest running `/sync-map` later. The files stay the
source of truth.

### 9. Report

Reply with:

1. One line: who was added, their current role, and the file path.
2. **Links to people already in the map** (both files updated) — a table:
   person, relationship (plain English, e.g. "Sessions employed Miller"), years,
   confidence, and the main source.
3. **Other connections** (suggested nodes) — the same table, shorter.
4. **Dropped** — anything you found but left out (unsourced, private, or failed
   the rules), and why. Say "none" if none.
5. **Sources disagree** — each conflict in one line. Say "none" if none.
6. One line: whether the phone page was updated (with its link from
   artifact.json), and that a running `npm run dev` viewer has already updated.

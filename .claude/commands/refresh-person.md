---
description: Re-research someone already in the Influence Map and update their links
argument-hint: <name>
---

# /refresh-person

Input: `$ARGUMENTS` — the name (or slug) of someone already in the network,
optionally followed by context about what to focus on.

## Before you start

- **Data folder:** `influence-map/data/people/` (relative to the repo root), or
  `data/people/` if the current directory is `influence-map/`. Called DATA_DIR below.
- **Read `influence-map/CLAUDE.md`** for the file format, relationship-type table
  and confidence scale. It wins over anything below.

## Research rules — follow exactly

1. **Public figures only.** If the file has `"public_figure": false`, do no web
   research. Only apply changes the user gives you, then validate and stop.
2. **Public-role information only.** Never collect home addresses, phone numbers,
   personal emails, ID numbers, health information, or details about private
   relatives or minors. `family` links only when publicly documented and the
   relative is a public figure in their own right.
3. **Every fact and connection needs a source URL** for a page that states it.
   Drop anything unsourced. Don't fill gaps from memory.
4. **Note when sources disagree:** `source_conflicts` for facts about the person;
   the connection's `description` plus a lower `confidence` for connections.

## Steps

1. **Find the file.** Match `$ARGUMENTS` against file names, `name` and `aliases`
   in DATA_DIR. If nothing matches, say so and suggest `/add-person`. If several
   match, ask which one.

2. **Read the current file** and note `last_researched`. Keep anything sourced
   `user-provided` and any `notes` unless the user asked you to change them.

3. **Re-research** the person's public role and record as in `/add-person`
   step 3, focusing on what changed since `last_researched`: new roles, departures,
   new organizations, new relationships, and corrections. Re-check every existing
   source URL you can; replace dead or weak sources with better ones. If pages
   can't be opened, confirm facts with WebSearch restricted to the source's
   domain (`allowed_domains`) and cite only URLs whose result states the fact.

4. **Re-check every connection.** Update years, description and confidence from
   current sources. Remove a connection only if sources now show it was wrong or
   you can no longer find any source for it — list every removal in the report.

5. **Scan the network again** (`/add-person` step 4): read every file in
   DATA_DIR, look for files that mention this person, and run targeted searches
   for this person with each existing person — especially people added since
   `last_researched`.

6. **Write the files.**
   - Update `DATA_DIR/<slug>.json` and set `last_researched` to today.
     Re-check `sector` and `groups` against the CLAUDE.md tables (roles change),
     and whether each `rival` or `enemy` record is still ongoing (`end_year: null`) or has ended,
     and still the right type (rival = equals competing; enemy = one opposing the other).
     Re-check `lean` (CLAUDE.md "Political lean"): add a new period if their
     politics shifted since `last_researched`, closing the previous one.
     For donors, update `giving` (CLAUDE.md "Giving"): add the latest cycle's
     totals and recipients and refresh the `outlook`.
   - For each connection to someone with a file (a person in DATA_DIR or an
     organization in `influence-map/data/orgs/`): add or update the inverse
     record in their file (inverse type, same years, sources and confidence).
     Check the organizations as `/add-person` step 4d describes.
   - For each connection you removed: remove the matching inverse record from the
     other person's file, if there is one.
   - In other people's files, only touch `connections`; don't change their
     `last_researched`.

7. **Validate:** run `node influence-map/scripts/validate.mjs` (or
   `node scripts/validate.mjs` from inside `influence-map/`) and fix every error.

7b. **Photo.** If the person has no `photo`, run
   `node influence-map/scripts/fetch-photos.mjs <slug>` (see `/add-person` step 6c);
   publish any new photo with the phone-page update below.

8. **Update the phone page.** If `influence-map/artifact.json` exists, copy every
   file you changed into that page's database: ArtifactData `list` (its `url`,
   collection `people`, and `orgs` for organization files) for the current
   versions, then one `batch` of `set` writes with the matching collection,
   `doc_id` = slug, `file_path` = the JSON file and `if_version` = the listed
   version. If this fails, say so and suggest `/sync-map` later.

9. **Report** what changed:
   - **Profile changes** — new or corrected roles, timeline entries, affiliations.
   - **Connections added / updated / removed** — a table with person,
     relationship, years, old → new confidence, and the main source. Mark which
     links are to people already in the map (both files updated).
   - **Sources disagree** — one line each, or "none".
   - One line: whether the phone page was updated, and that a running
     `npm run dev` viewer has already updated.

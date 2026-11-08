---
description: Research an organization (super PAC, think tank, firm) and link it into the Influence Map
argument-hint: <name> [context]
---

# /add-org

Input: `$ARGUMENTS`

The input is an organization's name, optionally followed by context from the
user (what it is, who runs it, why it matters). If the organization already has
a file, update it instead of creating a second one.

## Before you start

- **Folders:** organizations live in `influence-map/data/orgs/` (ORG_DIR),
  people in `influence-map/data/people/` (DATA_DIR), relative to the repo root.
- **Read `influence-map/CLAUDE.md`**, especially "Organizations", "Relationship
  types", "Confidence" and the research rules. If anything below seems to
  conflict with it, CLAUDE.md wins.

## Research rules — follow exactly

The CLAUDE.md research rules apply in full. Every fact, figure and link needs a
source URL for a page that states it; drop anything you can't source. Balance the sourcing: right-of-center outlets are welcome for the facts they report; breaking-news feeds such as Rerum Novarum are leads to trace to the original report; don't cite The Unz Review (CLAUDE.md rules 6–8). Note
disagreements in `source_conflicts` (facts about the organization) or in a
link's description with lower confidence. Record only the public roles of the
people it links to.

## Steps

1. **Identify it and check for duplicates.** Slug = `slugify(name)`
   (`Senate Leadership Fund` → `senate-leadership-fund`). Look in ORG_DIR for the
   slug, name and aliases, and in DATA_DIR for a person with the same slug (the
   validator rejects a clash; add a qualifier such as `-pac`).

2. **Start from what the map already knows.** Search DATA_DIR (Grep) for the
   name and aliases: `giving` recipients and outlook entries, affiliations,
   timelines and connection descriptions. Each is a lead with sources already
   attached; verify it still holds and reuse its source.

3. **Research the organization:** what it is (`kind`), which side its money or
   work helps (`side`), founding year, who leads it, who funds it (with amounts
   per donor where reported), who it spends for or against, and money raised and
   spent per cycle (`finances`). Prefer FEC filings and reporting on them,
   official pages, and major outlets.

4. **Find its links to people in the map.** For everyone in DATA_DIR who came
   up in steps 2–3, record the link with the type it takes in the organization's
   file (CLAUDE.md "Organizations"): `donor` (gave to it), `funded_by` (it spent
   for them), `employee` (leads, staffs or sits on its board), `co-founder`
   (founded it), `enemy` (it spent against them), `ally` or `colleague` where
   reporting shows that. Also link other organizations in ORG_DIR it funds or
   is funded by. Notable people not in the map can be recorded too; they show as
   suggested dots.

5. **Write the files.**
   - `ORG_DIR/<slug>.json` in the CLAUDE.md format, `last_researched` = today.
   - The inverse record in every linked person's or organization's file (inverse
     type, same years, sources and confidence; description from their side).
     Only touch `connections` there and don't change their `last_researched`.
   - Point matching `giving` entries in people's files at it with `"org": "<slug>"`.

6. **Validate:** `node influence-map/scripts/validate.mjs`. Fix every error and
   run it again until it passes.

7. **Update the phone page.** If `influence-map/artifact.json` exists: ArtifactData
   `list` the `orgs` and `people` collections for versions, then `batch` `set`
   writes (up to 50 per batch): the organization to `orgs`, every changed person
   to `people`, each with `doc_id` = slug, `file_path` = the file and `if_version`
   = the listed version (left out for a new document). If this fails, say so and
   suggest `/sync-map` later.

8. **Report:** one line on what the organization is and its file path; a table of
   links (name, relationship, years, amount if any, confidence, main source),
   marking which go to people already in the map; anything dropped as
   unsourced; "Sources disagree" items; and whether the phone page was updated.

**Updates feed.** Add one entry at the top of `influence-map/data/updates.json`:
`{ "id": "<today>-<short-label>", "date": "<today>", "text": "<one or two plain
sentences on what changed>", "people": ["<slug>", …] }`. The text only
summarizes what the files now say (no new facts), and `people` lists the slugs it
is about (each must have a file). On the phone page, also `set` it in collection
`updates` with `doc_id` = its `id` and `data` = the entry.

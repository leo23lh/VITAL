---
description: Copy every Influence Map person into the phone page so it matches data/people/
---

# /sync-map

Makes the Influence Map phone page match the files exactly. Use it after
editing files by hand, or when `/add-person` or `/refresh-person` couldn't update
the page.

1. Read `influence-map/artifact.json` for the page `url` (collection `people`).
   If the file doesn't exist, say there is no phone page yet and stop.
2. Run `node influence-map/scripts/validate.mjs`. If it reports errors, list
   them and ask the user whether to sync anyway.
3. ArtifactData `list` the `people` collection (page through with `cursor` until
   there is no `next_cursor`) and note each document's `version`.
4. Write in batches of up to 50 with ArtifactData `batch`:
   - for every file in `influence-map/data/people/`: `set`, collection `people`,
     `doc_id` = the file name without `.json`, `file_path` = the file, and
     `if_version` = its listed version (leave it out if it isn't stored yet);
   - for every stored document with no matching file: `delete` with its
     `if_version`.
5. Photos: Artifact `list` with `scope: "files"` and the page `url`. If any file in
   `influence-map/public/photos/` isn't published as `photos/<file>`, publish the
   missing ones as CLAUDE.md "Phone page → Photos" describes.
6. Report how many people were added, updated and removed, how many photos were
   published, and give the page link.

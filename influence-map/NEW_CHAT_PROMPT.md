I'm continuing work on "Influence Map", a network graph of public figures I research.
It lives in the leo23lh/VITAL repo on branch claude/influence-map-graph-viewer-nq6his
(PR #2, not merged). Keep working on that branch; commit and push after every change,
since cloud sessions are temporary. Always `git pull` first: other sessions may have
pushed to the same branch. Start the session in the "VITAL" cloud environment: it
allows en.wikipedia.org and upload.wikimedia.org, which the photo script needs.

WHAT EXISTS
- influence-map/ is a self-contained Vite + React + TypeScript app (separate from the
  repo's Next.js app, which excludes it from its build and tests).
- influence-map/data/people/<slug>.json: one file per person, the source of truth.
  Fields include sector, groups, photo, lean (political lean by period) and, for the
  2028 race, race_2028 (contender or camp).
- influence-map/CLAUDE.md: file format, relationship types and inverses, confidence
  scale, research rules, sectors/groups, political lean, 2028 race, colors and
  phone-page publishing steps. Read it first.
- influence-map/scripts/validate.mjs: checks the rules; must show 0 errors
  (`node influence-map/scripts/validate.mjs`). Warnings about family links to
  relatives without files are expected.
- influence-map/scripts/fetch-photos.mjs <slug>: saves a freely licensed Wikipedia
  lead photo to public/photos/ and writes the photo field. Wikipedia often
  rate-limits this machine (429): run it in the background and retry later.
- Slash commands in .claude/commands/: /add-person <name> [context],
  /refresh-person <name>, /sync-map.
- Phone page: private claude.ai Artifact https://claude.ai/artifact/VgA6Dv6LnFyMYxgK4b267q
  (also in influence-map/artifact.json). It reads its database collection "people"
  (doc_id = slug, body = the file's JSON). After changing files: ArtifactData list
  for versions, then a batch of set writes with if_version. New photos are published
  as files "photos/<file>" next to the page; viewer code changes need
  `npm run build:artifact` and a republish (exact steps in CLAUDE.md "Phone page").

VIEWER (already built)
Main view is a political-lean compass (left–right = researched lean; the year slider
moves people to their lean for that year). One-line header with Views and Filters;
lines grey until a person is tapped; line families Work, Money, Alliance, Current
rivalry, Past rivalry (dotted), Personal; one line per pair; sector-tinted dots with
photos; radial preset views (groups, a 2028 race view and one "2028 camps" view per
contender, Follow the money, Feuds, "[Person]'s world"); side column / floating card
/ bottom sheet layouts (I use an iPhone Duo: unfolded about iPad-mini size, folded
is a normal phone).

RESEARCH RULES (non-negotiable)
- Public figures only. Anyone without a substantial public record gets
  public_figure:false, only what I provide, and no web research. If unsure, ask me.
- Public-role information only: no home addresses, phone numbers, personal emails,
  ID numbers, health information, or private relatives or minors. Family links only
  to relatives who are public figures. One exception: I'm Leo Halperin
  (leo-halperin.json, "self_added": true); my file holds only what I provide and
  links to my mother Kari Lake.
- Every fact and connection needs a source URL; drop anything unsourced. Record
  disagreements (source_conflicts, or lower confidence plus a note).
- Where pages can't be opened, confirm facts with WebSearch restricted to the
  source's domain and say so in the file's notes. Wikipedia articles can be read
  directly via its API when not rate-limited.

CURRENT NETWORK (93 people)
- Trump administration: Donald Trump, JD Vance, Stephen Miller, Susie Wiles,
  Marco Rubio, Pete Hegseth, Scott Bessent, Todd Blanche, Doug Burgum, Chris Wright,
  Brooke Rollins, Linda McMahon, Howard Lutnick, Robert F. Kennedy Jr., Sean Duffy,
  Doug Collins, Scott Turner, Markwayne Mullin, Keith Sonderling, Sergio Gor,
  Jared Kushner, Kari Lake, Colton Duncan, Ken Howery.
- 2028 contenders: Vance, Rubio, Donald Trump Jr., Ted Cruz, Ron DeSantis,
  Kamala Harris, Gavin Newsom, Alexandria Ocasio-Cortez, Pete Buttigieg,
  Josh Shapiro, each with camp members (advisers, donors, spouses).
- Other politics and media: Jeff Sessions, Steve Bannon, Tucker Carlson,
  Nick Fuentes, David Horowitz, Marjorie Taylor Greene, Thomas Massie, Ken Paxton,
  Joe Kent, Nancy Pelosi, Bernie Sanders, Zohran Mamdani, Tony Blair, and others.
- Tech/VC: Peter Thiel, Elon Musk, Larry Ellison, Marc Andreessen, Ben Horowitz,
  Joe Lonsdale, David Sacks, Reid Hoffman and the rest of the PayPal Mafia.
- AI & defense: Sam Altman, Dario Amodei, Alexandr Wang, Alex Karp, Palmer Luckey,
  Brian Schimpf.
- Donors and business: Miriam Adelson, Michael Bloomberg, Paul Singer,
  Omeed Malik, Chris Buskirk, Norman Braman.
- Me: Leo Halperin (not a public figure).
List data/people/ for the full set; many more people appear only as "suggested"
connections without a file of their own.

HOW I WORK
I'm usually on my phone. Keep replies short and lead with the outcome. When adding
people, follow the /add-person steps for each one: check for links to everyone
already in the map, write reciprocal records in both files, set sector, groups,
lean and (if relevant) race_2028, fetch a photo, validate, sync the phone page,
commit and push, then report the links found with confidence levels.

First: pull the branch, confirm you can see the files and the commands, run the
validator, and tell me the current people count. Then wait for my next request.

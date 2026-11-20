# Influence Map

A local network graph of the public figures you research. Each person is a JSON
file in `data/people/`, and each organization that money and people flow
through (super PACs, think tanks, firms) is one in `data/orgs/`; the viewer
draws them (organizations as squares) and their documented relationships as a
force-directed graph and updates live as files change.

The app makes no AI or API calls. Research is done by Claude Code through the
`/add-person`, `/refresh-person` and `/add-org` slash commands (in `../.claude/commands/`),
which follow the research rules in [`CLAUDE.md`](./CLAUDE.md).

## Run the viewer

Needs Node 20.19+ or 22.12+.

```sh
cd influence-map
npm install     # first time only
npm run dev
```

It opens http://127.0.0.1:5173. The server only listens on your own machine.

- **Click a person** for their summary, timeline, affiliations and connections, each with source links.
- **Click a line** for the relationship's description, dates, confidence and sources.
- **Search** (top bar) jumps to a person. The **legend** filters by relationship type.
- **Suggested nodes** (faint, dashed) are people someone is connected to who don't have a file yet. Toggle them in the top bar.
- **Export PNG** saves the current view with a legend.
- Node size = number of connections. Arrows run from mentor, employer or donor. Dashed lines are under 50% confidence.

## On your phone

The same viewer is published as a private claude.ai page (link in
[`artifact.json`](./artifact.json)). Open it in the Claude app or any browser where
you're signed in to claude.ai. Tap a person or a line for details, pinch to zoom,
drag to move around.

The page reads its own copy of the data. `/add-person` and `/refresh-person`
update it as they run, so you can research from a Claude Code session on your
phone and watch the graph change. `/sync-map` re-copies everything if the page
ever falls out of step with the files.

## Add people

Open Claude Code at the repo root and run:

```
/add-person Jeff Sessions
/add-person Jane Doe, city council member in Springfield, OR
/refresh-person Stephen Miller
/add-org Senate Leadership Fund
```

`/add-person` researches the person, looks for links to everyone already in the
map, writes their file, adds the matching back-links to the other people's
files, runs the validator, and reports what it found with confidence levels.
If `npm run dev` is running, the graph updates as the files are written.

## Other commands

```sh
npm run validate    # check data files against the research rules
npm test            # unit tests
npm run typecheck
```

To view a different folder of people files (for example a test copy), set
`INFLUENCE_MAP_DATA=/path/to/folder npm run dev`.

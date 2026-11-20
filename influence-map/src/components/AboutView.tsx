// About this map: what it is, where its facts come from, and what the scores mean, in plain words.

interface Props {
  people: number;
  orgs: number;
  links: number;
  /** Date of the newest Updates entry (YYYY-MM-DD). */
  updated?: string;
}

export default function AboutView({ people, orgs, links, updated }: Props) {
  return (
    <div className="orgchart pullview about">
      <h2>About this map</h2>
      <p>
        A map of the documented relationships among people with power in American politics, tech and money: who works
        for whom, who funds whom, who is allied and who is feuding. It covers {people} people and {orgs} organizations,
        joined by {links.toLocaleString()} recorded ties{updated ? `, last updated ${updated}` : ''}.
      </p>

      <h3>Getting around</h3>
      <ul>
        <li>Tap a person for their ties, money, track record and more. Tap a line to see what joins two people.</li>
        <li>
          <strong>Views</strong> has the preset maps: groups, 2028 camps, follow the money, feuds, the org chart, Pull,
          2028 backing, and factions and rifts.
        </li>
        <li>
          <strong>Filters</strong> hides kinds of ties, or shows only the ties active in a range of years.
        </li>
        <li>The address bar always links to what you have open, so you can share it.</li>
      </ul>

      <h3>Where the facts come from</h3>
      <ul>
        <li>Every fact and every tie cites a source you can open, on the person's Record tab or the tie's panel.</li>
        <li>Public figures only, and only their public roles: no home addresses, family members who aren't public figures, or health details.</li>
        <li>
          Each tie is graded by its sources: <strong>Strong</strong> (an official record, or two independent news
          outlets), <strong>Solid</strong> (two independent sources) or <strong>Thin</strong> (one). Dashed lines rest
          on thin evidence.
        </li>
        <li>When sources disagree, the map says so rather than picking a side.</li>
        <li>
          The research is done with an AI assistant (Claude) working to written rules, and checked by automated tests.
          It can still be wrong.
        </li>
      </ul>

      <h3>What the scores mean</h3>
      <ul>
        <li>
          <strong>Bond</strong>: how deep one pair's relationship runs, from the kinds of tie, the years they cover and
          how well documented they are.
        </li>
        <li>
          <strong>Pull</strong>: how close someone is to people in power, from their ties to officials, recent meetings
          and what they control. It measures access, not success.
        </li>
        <li>
          <strong>2028 backing</strong>: how likely someone is to back each 2028 contender, from closeness and political
          fit plus what has been reported.
        </li>
        <li>
          <strong>Factions and rifts</strong>: the blocs the ties divide into, and friendly ties showing the strains that
          came before past breaks.
        </li>
        <li>These are estimates to look into, not facts and not forecasts. Each one shows its reasons.</li>
      </ul>

      <h3>Spot a mistake?</h3>
      <p>
        Every fact links to its source, so you can check it. If one doesn't say what the map says, tell whoever shared
        this map with you, with a link to a better source, and it will be checked and corrected.
      </p>
    </div>
  );
}

// Compare view panel: how closely two people are tied, their chain and shared circle.
import { useState } from 'react';
import { describeLink, familyOf, isPastRivalry, type Comparison, type PairLink, pairKey, type GraphLink } from '../../lib/graph';
import { EDGE_FAMILY_BY_ID, GROUPS } from '../../lib/schema';
import type { Selection } from '../../lib/view';

function bestTie(pair: PairLink): GraphLink {
  const friendly = pair.links.filter((l) => l.group !== 'rival' && l.group !== 'enemy');
  return [...(friendly.length ? friendly : pair.links)].sort((x, y) => y.confidence - x.confidence)[0];
}

/** "ally of", "donor to"…: how the other end of `link` relates to `anchor`. */
function tieLabel(link: GraphLink, anchor: string, isOrg: (id: string) => boolean): string {
  const otherIsSource = link.sourceId !== anchor;
  const other = otherIsSource ? link.sourceId : link.targetId;
  switch (link.group) {
    case 'mentorship':
      return otherIsSource ? 'mentor of' : 'protégé of';
    case 'employment':
      return otherIsSource ? 'employer of' : 'worked for';
    case 'funding':
      return otherIsSource ? 'donor to' : 'funded by';
    case 'co-founder':
      if (isOrg(other) !== isOrg(anchor)) return isOrg(other) ? 'founded by' : 'founder of';
      return 'co-founder with';
    case 'colleague':
      return 'colleague of';
    case 'ally':
      return 'ally of';
    case 'family':
      return 'family of';
    case 'friend':
      return 'friend of';
    case 'rival':
      return 'rival of';
    case 'enemy':
      return 'enemy of';
  }
}

/** A colored chip like "ally of JD Vance". */
function TieChip({
  pair,
  anchor,
  nameOf,
  isOrg,
}: {
  pair: PairLink;
  anchor: string;
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
}) {
  const l = bestTie(pair);
  return (
    <span className="type-chip">
      <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(l)].color }} />
      {tieLabel(l, anchor, isOrg)} {nameOf(anchor)}
    </span>
  );
}

export function ComparePanel({
  c,
  nameOf,
  isOrg,
  onSelect,
  meter,
}: {
  c: Comparison;
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
  onSelect: (s: Selection) => void;
  /** The bond meter, when the two are directly tied. */
  meter: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const person = (id: string) => (
    <button className="link-button" onClick={() => onSelect({ kind: 'node', id })}>
      {nameOf(id)}
    </button>
  );
  const via = c.chain && c.chain.length > 2 ? c.chain.slice(1, -1) : [];
  const why: string[] = [];
  if (c.chain?.length === 2) why.push('directly tied');
  else if (via.length) why.push(`strongest chain runs through ${via.map(nameOf).join(' → ')}`);
  else why.push('no friendly chain within 4 links');
  why.push(c.shared.length ? `${c.shared.length} in common` : 'no one in common');
  if (c.sharedGroups.length)
    why.push(`both in ${c.sharedGroups.map((g) => GROUPS.find((x) => x.id === g)?.label ?? g).join(', ')}`);
  if (c.tension) why.push(`${c.tension.group === 'enemy' ? 'enemies' : 'rivals'}${isPastRivalry(c.tension) ? ' in the past' : ''}`);
  const shared = showAll ? c.shared : c.shared.slice(0, 8);

  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>
          {person(c.a)}
          <span className="muted"> &amp; </span>
          {person(c.b)}
        </h2>
        <div className="closeness">
          <div className="closeness-top">
            <strong className="closeness-score">{c.score}</strong>
            <span>
              <strong>{c.label}</strong>
              <span className="muted small"> · closeness out of 100</span>
            </span>
          </div>
          <div className="closeness-bar" aria-hidden="true">
            <span style={{ width: `${c.score}%` }} />
          </div>
          <p className="small">{why.join(' · ').replace(/^./, (x) => x.toUpperCase())}.</p>
        </div>
      </header>

      {meter}

      {c.direct.length > 0 && (
        <section>
          <h3>Between them</h3>
          <ul className="plain-list">
            {c.direct.map((l) => (
              <li key={l.id}>
                <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(l)].color }} />{' '}
                {describeLink(l, nameOf, isOrg)}
                <span className="muted small"> · {Math.round(l.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
          <button className="link-button small" onClick={() => onSelect({ kind: 'link', id: pairKey(c.a, c.b) })}>
            details and sources
          </button>
        </section>
      )}

      {c.chain && c.chain.length > 2 && (
        <section>
          <h3>Strongest chain</h3>
          <p className="muted small">
            The path through the closest, best-sourced links that still hold. Rivalries don't count.
          </p>
          <ol className="chain">
            {c.chain.map((id, i) => (
              <li key={id}>
                {person(id)}
                {i < c.chainPairs.length && (
                  <div className="chain-step">
                    <span className="swatch" style={{ background: EDGE_FAMILY_BY_ID[familyOf(bestTie(c.chainPairs[i]))].color }} />
                    <span className="small">{describeLink(bestTie(c.chainPairs[i]), nameOf, isOrg)}</span>
                    <button
                      className="link-button small"
                      onClick={() => onSelect({ kind: 'link', id: c.chainPairs[i].id })}
                    >
                      sources
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h3>Shared circle ({c.shared.length})</h3>
        {c.shared.length === 0 && <p className="muted">No one is tied to both.</p>}
        <ul className="connections">
          {shared.map((t) => (
            <li key={t.id} className="connection">
              <div className="conn-head">{person(t.id)}</div>
              <div className="conn-types">
                <TieChip pair={t.viaA} anchor={c.a} nameOf={nameOf} isOrg={isOrg} />
                <TieChip pair={t.viaB} anchor={c.b} nameOf={nameOf} isOrg={isOrg} />
              </div>
            </li>
          ))}
        </ul>
        {c.shared.length > 8 && (
          <button className="link-button small" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${c.shared.length}`}
          </button>
        )}
      </section>

      <footer className="panel-footer muted small">
        The score combines the strongest chain (closer kinds of link and higher confidence count more), how many
        people and organizations they share, and shared groups. Ties that run through someone with a huge network
        (like Trump) count for less, ties that have ended count a bit over half, and a direct rivalry or enmity lowers
        the score. With a date range set, only links active in that range count.
      </footer>
    </div>
  );
}

/** Friend / loyalty meter: how deep the pair's own relationship runs. */

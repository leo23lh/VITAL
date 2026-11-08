// Details panel for the links between two people.
import { describeLink, familyOf, yearRange, type GraphLink } from '../../lib/graph';
import { EDGE_FAMILY_BY_ID, EDGE_GROUP_BY_ID } from '../../lib/schema';
import type { Selection } from '../../lib/view';
import { Confidence, SourceList } from './parts';

export function PairPanel({
  links,
  nameOf,
  isOrg,
  onSelect,
  onCompare,
  meter,
}: {
  links: GraphLink[];
  nameOf: (id: string) => string;
  isOrg: (id: string) => boolean;
  onSelect: (s: Selection) => void;
  onCompare: (a: string, b: string) => void;
  meter: React.ReactNode;
}) {
  const [a, b] = [links[0].sourceId, links[0].targetId].sort((x, y) => nameOf(x).localeCompare(nameOf(y)));
  return (
    <div className="panel-body">
      <header className="panel-header">
        <h2>
          <button className="link-button big" onClick={() => onSelect({ kind: 'node', id: a })}>
            {nameOf(a)}
          </button>
          <span className="muted"> &amp; </span>
          <button className="link-button big" onClick={() => onSelect({ kind: 'node', id: b })}>
            {nameOf(b)}
          </button>
        </h2>
        <div className="panel-actions">
          <button onClick={() => onCompare(a, b)}>How close are they?</button>
          <span className="muted small">
            {links.length} kind{links.length === 1 ? '' : 's'} of link
          </span>
        </div>
      </header>

      {meter}

      {links.map((link) => {
        const g = EDGE_GROUP_BY_ID[link.group];
        const f = EDGE_FAMILY_BY_ID[familyOf(link)];
        return (
          <section key={link.id} className="pair-link">
            <div className="edge-kind">
              <span className="swatch" style={{ background: f.color }} /> {g.label}
              <span className="muted"> · {f.label}</span>
            </div>
            <h3 className="edge-sentence">{describeLink(link, nameOf, isOrg)}</h3>
            <div className="edge-facts">
              <div>
                <span className="muted">Dates</span>
                <div>{yearRange(link.startYear, link.endYear) || 'Not recorded'}</div>
              </div>
              <div>
                <span className="muted">Confidence</span>
                <Confidence value={link.confidence} />
              </div>
            </div>

            {link.disagreements.length > 0 && (
              <div className="conflicts">
                <h3>Files disagree</h3>
                <ul>
                  {link.disagreements.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {link.records.map((r, i) => (
              <div key={i} className="record">
                <h4>As recorded in {r.fromName}'s file</h4>
                {r.connection.description && <p>{r.connection.description}</p>}
                <div className="conn-meta">
                  <span>Type: {r.type}</span>
                  {yearRange(r.connection.start_year, r.connection.end_year) && (
                    <span>{yearRange(r.connection.start_year, r.connection.end_year)}</span>
                  )}
                  {typeof r.connection.confidence === 'number' && <Confidence value={r.connection.confidence} />}
                </div>
                <SourceList sources={r.connection.sources} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** Search box for the second person in a comparison. */

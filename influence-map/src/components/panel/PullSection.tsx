// Pull tab in the person panel: their access to people in power and who has their ear.
import { pairKey, type GraphNode } from '../../lib/graph';
import { earOf, power, pullOf, type BondIndex } from '../../lib/pull';
import type { Selection } from '../../lib/view';

export interface PullTools {
  nodes: GraphNode[];
  bonds: BondIndex;
  onPullOf: (id: string) => void;
}

function TieList({
  rows,
  anchor,
  nameOf,
  roleOf,
  onSelect,
}: {
  rows: { id: string; bond: number }[];
  anchor: string;
  nameOf: (id: string) => string;
  roleOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  return (
    <ul className="closest">
      {rows.map((r) => (
        <li key={r.id}>
          <button className="closest-row" onClick={() => onSelect({ kind: 'link', id: pairKey(anchor, r.id) })}>
            <span className="closest-name">{nameOf(r.id)}</span>
            <span className="closest-roles muted small">{roleOf(r.id)}</span>
            <span className="closest-score" title={`Bond ${r.bond}`}>
              <span className="bond-mini" aria-hidden="true">
                <span style={{ width: `${r.bond}%` }} />
              </span>
              <strong>{r.bond}</strong>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PullSection({
  node,
  tools,
  nameOf,
  onSelect,
}: {
  node: GraphNode;
  tools: PullTools;
  nameOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  const { nodes, bonds, onPullOf } = tools;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roleOf = (id: string) => byId.get(id)?.person?.office?.title ?? '';
  const pull = pullOf(node.id, nodes, bonds);
  const own = power(node);
  const powerful = own > 0;
  // Access means upward: list the ties to people at or above their level (juniors still count a little in the score).
  const upward = pull.via.filter((v) => v.power >= own);
  const ear = powerful ? earOf(node.id, nodes, bonds) : [];
  return (
    <>
      <section className="bond">
        <h3>Pull</h3>
        <div className="closeness-top">
          <strong className="closeness-score">{pull.score}</strong>
          <span>
            <strong>{pull.label}</strong>
            <span className="muted small"> · out of 100</span>
          </span>
        </div>
        <div className="closeness-bar" aria-hidden="true">
          <span style={{ width: `${pull.score}%` }} />
        </div>
        <p className="muted small bond-note">
          Their bond with each official, weighted by the post. The strongest tie counts in full, each further one half
          as much; ties to people junior to them count a quarter.
        </p>
      </section>

      <section>
        <h3>Access to power</h3>
        {upward.length === 0 ? (
          <p className="muted">{powerful ? 'No recorded tie to anyone at or above their level.' : 'No recorded tie to anyone in government.'}</p>
        ) : (
          <TieList rows={upward.slice(0, 6)} anchor={node.id} nameOf={nameOf} roleOf={roleOf} onSelect={onSelect} />
        )}
      </section>

      {powerful && (
        <section>
          <h3>Who has their ear</h3>
          {ear.length === 0 ? (
            <p className="muted">No recorded ties yet.</p>
          ) : (
            <TieList rows={ear.slice(0, 6)} anchor={node.id} nameOf={nameOf} roleOf={roleOf} onSelect={onSelect} />
          )}
          {ear.length > 6 && (
            <button className="link-button small" onClick={() => onPullOf(node.id)}>
              Full ranking →
            </button>
          )}
        </section>
      )}
    </>
  );
}

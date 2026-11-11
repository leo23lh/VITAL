// Pull tab in the person panel: their access to people in power and who has their ear.
import { useMemo } from 'react';
import { pairKey, type GraphNode } from '../../lib/graph';
import { DEFAULT_PULL, earOf, LEVERAGE_LABELS, power, pullOf, type BondIndex } from '../../lib/pull';
import { deciderAccess, OUTCOME_LABEL, recordOf } from '../../lib/trackrecord';
import type { Selection } from '../../lib/view';
import { SourceList } from './parts';

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
  /** `linked: false` = met recently, but no tie in the map (tapping opens the person instead). */
  rows: { id: string; bond: number; linked?: boolean; recent?: number }[];
  anchor: string;
  nameOf: (id: string) => string;
  roleOf: (id: string) => string;
  onSelect: (s: Selection) => void;
}) {
  return (
    <ul className="closest">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            className="closest-row"
            onClick={() => onSelect(r.linked === false ? { kind: 'node', id: r.id } : { kind: 'link', id: pairKey(anchor, r.id) })}
          >
            <span className="closest-name">{nameOf(r.id)}</span>
            <span className="closest-roles muted small">
              {roleOf(r.id)}
              {r.recent ? ` · met ${r.recent}× this year` : ''}
            </span>
            <span className="closest-score" title={r.linked === false ? 'No tie on record; met recently' : `Bond ${r.bond}`}>
              <span className="bond-mini" aria-hidden="true">
                <span style={{ width: `${r.bond}%` }} />
              </span>
              <strong>{r.linked === false ? 'met' : r.bond}</strong>
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
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const roleOf = (id: string) => byId.get(id)?.person?.office?.title ?? '';
  const pull = useMemo(() => pullOf(node.id, nodes, bonds, new Date(), node), [node, nodes, bonds]);
  const own = power(node);
  const powerful = own > 0;
  // Access means upward: list the ties to people at or above their level (juniors still count a little in the score).
  const upward = pull.via.filter((v) => v.power >= own);
  const ear = useMemo(() => (powerful ? earOf(node.id, nodes, bonds) : []), [powerful, node.id, nodes, bonds]);
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
          Access ({pull.access}): their bond with each official, weighted by the post; recent documented meetings or
          deals strengthen a tie. The strongest tie counts in full, each further one half as much; ties to people junior
          to them count a quarter. Leverage then adds to it. Setbacks don’t lower it.
        </p>
      </section>

      {node.person?.leverage && (
        <section>
          <h3>Leverage · {LEVERAGE_LABELS[node.person.leverage.level]}</h3>
          <p>{node.person.leverage.basis}</p>
          <SourceList sources={node.person.leverage.sources} />
        </section>
      )}

      {(node.person?.access?.length ?? 0) > 0 && (
        <section>
          <h3>Recent access</h3>
          <ul className="access-list">
            {[...node.person!.access!]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((e, i) => (
                <li key={i}>
                  <span className="muted small">{e.date}</span> {e.what}
                  <SourceList sources={e.sources} compact />
                </li>
              ))}
          </ul>
        </section>
      )}

      {(node.person?.asks?.length ?? 0) > 0 && (
        <TrackRecord node={node} byId={byId} bonds={bonds} nameOf={nameOf} />
      )}

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

/** What they asked of officials and how it went. Shown beside Pull; it never changes the score. */
function TrackRecord({
  node,
  byId,
  bonds,
  nameOf,
}: {
  node: GraphNode;
  byId: Map<string, GraphNode>;
  bonds: BondIndex;
  nameOf: (id: string) => string;
}) {
  const asks = [...(node.person?.asks ?? [])].sort((a, b) => (b.decided ?? b.date).localeCompare(a.decided ?? a.date));
  const r = recordOf(asks);
  const parts = [
    r.granted && `${r.granted} granted`,
    r.partial && `${r.partial} partly granted`,
    r.denied && `${r.denied} denied`,
    r.pending && `${r.pending} pending`,
  ].filter(Boolean);
  return (
    <section>
      <h3>Track record</h3>
      <p className="muted small">
        {parts.join(' · ')}. What they asked of officials and how it turned out. It doesn’t change Pull: on the map’s
        whole record, overall Pull hasn’t predicted which asks get granted; closeness to the official who decided has,
        somewhat.
      </p>
      <ul className="access-list">
        {asks.map((a, i) => {
          // Today's bond with whoever decided (the history test uses the bond as it stood then).
          const near = deciderAccess(node, a, byId, bonds, DEFAULT_PULL.accessBoost, DEFAULT_PULL.metOnlyBond);
          return (
            <li key={i}>
              <span className={`outcome outcome-${a.outcome}`}>{OUTCOME_LABEL[a.outcome]}</span>{' '}
              <span className="muted small">{a.decided ?? a.date}</span> {a.what}
              {a.with.length > 0 && (
                <div className="muted small">
                  Decided by {a.with.map(nameOf).join(', ')}
                  {near !== null && ` · bond with them now ${near}`}
                </div>
              )}
              <SourceList sources={a.sources} compact />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

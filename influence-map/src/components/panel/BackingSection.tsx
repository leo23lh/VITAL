// 2028 tab in the person panel: whom this person is likely to back, or who backs this contender.
import { useMemo } from 'react';
import { backingReason, isContender, type BackingBoard } from '../../lib/backing';
import type { GraphNode } from '../../lib/graph';
import { BACKING_TRACK_RECORD } from '../BackingView';

export interface BackingTools {
  /** Built on first use: scoring everyone against every contender takes a moment. */
  getBoard: () => BackingBoard;
  onBackingOf: (id: string) => void;
}

/** Whether the 2028 tab applies: contenders, and the living public figures on the main web who could back one. */
export function hasBackingTab(node: GraphNode): boolean {
  const p = node.person;
  return !!p && node.researched && node.publicFigure && !p.died && (isContender(node) || !p.org_chart_only);
}

export function BackingSection({
  node,
  tools,
  nameOf,
  onCompare,
}: {
  node: GraphNode;
  tools: BackingTools;
  nameOf: (id: string) => string;
  onCompare: (a: string, b: string) => void;
}) {
  const board = useMemo(() => tools.getBoard(), [tools]);

  if (isContender(node)) {
    const c = board.contenders.find((x) => x.id === node.id);
    const top = (c?.backers ?? []).filter((b) => b.score >= 45).slice(0, 8);
    return (
      <section>
        <h3>Likely backers</h3>
        <p className="muted small">
          {c?.declared ?? 0} in the camp and {c?.predicted ?? 0} more the map predicts would pick {node.name} first.{' '}
          {BACKING_TRACK_RECORD}
        </p>
        <ul className="closest">
          {top.map((b) => (
            <li key={b.person}>
              <button className="closest-row" onClick={() => onCompare(b.person, node.id)}>
                <span className="closest-name">{nameOf(b.person)}</span>
                <span className="closest-roles muted small">{backingReason(b, nameOf)}</span>
                <span className="closest-score" title={b.label}>
                  <span className="bond-mini" aria-hidden="true">
                    <span style={{ width: `${b.score}%` }} />
                  </span>
                  <strong>{b.score}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {top.length === 0 && <p className="muted">No one rated Leaning or higher yet.</p>}
        <button className="link-button small" onClick={() => tools.onBackingOf(node.id)}>
          Full list →
        </button>
      </section>
    );
  }

  const rows = (board.byPerson.get(node.id) ?? []).filter((b) => b.score >= 30).slice(0, 6);
  return (
    <section>
      <h3>Likely to back in 2028</h3>
      {rows.length === 0 ? (
        <p className="muted">No contender rated Possible or higher: no close ties to any of them and no clear political fit.</p>
      ) : (
        <>
          <ul className="closest">
            {rows.map((b) => (
              <li key={b.contender}>
                <button className="closest-row" onClick={() => onCompare(node.id, b.contender)}>
                  <span className="closest-name">
                    {nameOf(b.contender)} <span className="muted small">· {b.basis === 'camp' ? 'In camp' : b.label}</span>
                  </span>
                  <span className="closest-roles muted small">{backingReason(b, nameOf)}</span>
                  <span className="closest-score" title={b.label}>
                    <span className="bond-mini" aria-hidden="true">
                      <span style={{ width: `${b.score}%` }} />
                    </span>
                    <strong>{b.score}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small bond-note">
            A prediction, not a report: how close {node.name} is to each contender plus how well their politics fit,
            raised by a declared camp or a reported plan to give. Tap a row to see the ties behind it.{' '}
            {BACKING_TRACK_RECORD}
          </p>
        </>
      )}
    </section>
  );
}

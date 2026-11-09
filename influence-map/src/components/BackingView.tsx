// 2028 backing view: who is likely to back each contender, overall or for one contender.
import { useMemo, useState } from 'react';
import { backingReason, lastCycleUsd, type Backing, type BackingBoard, type ContenderSummary } from '../lib/backing';
import type { GraphNode } from '../lib/graph';
import { formatUsd } from '../lib/schema';
import Avatar from './Avatar';

interface Props {
  nodes: GraphNode[];
  board: BackingBoard;
  /** One contender's backers; unset = the overview. */
  of?: string;
  onOf: (id: string | undefined) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Scope = 'all' | 'camp' | 'predicted' | 'donors';

const roleOf = (n?: GraphNode) => n?.person?.office?.title ?? n?.person?.current_role ?? '';
const SIDES = [
  ['R', 'Republicans'],
  ['D', 'Democrats'],
  [null, 'Others'],
] as const;

/** What the labels have meant on past donations (see the scorecard). */
export const BACKING_TRACK_RECORD =
  'Tested on past donations: about 6 in 10 pairs rated Likely or better went on to give, about 1 in 7 rated Leaning, 1 in 10 rated Possible and 1 in 50 rated Unlikely.';

export default function BackingView({ nodes, board, of, onOf, selectedId, onSelect }: Props) {
  const [scope, setScope] = useState<Scope>('all');
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const name = (id: string) => byId.get(id)?.name ?? id;
  const one = of ? board.contenders.find((c) => c.id === of) : undefined;

  if (one) {
    const inScope = (b: Backing) =>
      scope === 'all' ||
      (scope === 'camp' && b.basis === 'camp') ||
      (scope === 'predicted' && b.basis !== 'camp') ||
      (scope === 'donors' && lastCycleUsd(byId.get(b.person)) > 0);
    const rows = one.backers.filter((b) => b.score >= 30 && inScope(b)).slice(0, 60);
    return (
      <div className="orgchart pullview">
        <h2>Who backs {name(one.id)}</h2>
        <p className="org-key muted small">
          Everyone rated Possible (30) or higher, strongest first. People in the camp are there by reporting; the rest
          are the map’s prediction from how close they are to {name(one.id)} and how well their politics fit.{' '}
          {BACKING_TRACK_RECORD}
        </p>
        <div className="pull-controls">
          <button className="org-jump-chip" onClick={() => onOf(undefined)}>
            ← All contenders
          </button>
          <span className="chip-seg" role="group" aria-label="Who to show">
            {(
              [
                ['all', 'All'],
                ['camp', 'In camp'],
                ['predicted', 'Predicted'],
                ['donors', 'Donors'],
              ] as const
            ).map(([s, label]) => (
              <button key={s} className={scope === s ? 'on' : ''} aria-pressed={scope === s} onClick={() => setScope(s)}>
                {label}
              </button>
            ))}
          </span>
        </div>
        <ol className="pull-list">
          {rows.map((b, i) => {
            const n = byId.get(b.person);
            const usd = lastCycleUsd(n);
            return (
              <li key={b.person}>
                <button className={`org-row${b.person === selectedId ? ' selected' : ''}`} onClick={() => onSelect(b.person)}>
                  <span className="pull-rank">{i + 1}</span>
                  <Avatar name={name(b.person)} photoUrl={n?.photoUrl} />
                  <span className="org-text">
                    <span className="org-name">{name(b.person)}</span>
                    <span className="org-title">{roleOf(n)}</span>
                    <span className="org-boss">
                      {usd > 0 && <span className="lev-chip">Gave {formatUsd(usd)}</span>}
                      {backingReason(b, name)}
                    </span>
                  </span>
                  <span className="pull-score backing-score" title={b.label}>
                    {b.score}
                    <span className="backing-label">{b.basis === 'camp' ? 'In camp' : b.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {rows.length === 0 && <p className="muted">No one on record.</p>}
      </div>
    );
  }

  const row = (c: ContenderSummary) => {
    const n = byId.get(c.id);
    const next = c.backers.filter((b) => b.basis !== 'camp' && b.score >= 45).slice(0, 3);
    return (
      <li key={c.id}>
        <button className="org-row" onClick={() => onOf(c.id)}>
          <Avatar name={name(c.id)} photoUrl={n?.photoUrl} />
          <span className="org-text">
            <span className="org-name">{name(c.id)}</span>
            <span className="org-title">
              {c.declared} in camp · {c.predicted} more predicted
              {c.donorMoney > 0 ? ` · their donors gave ${formatUsd(c.donorMoney)} last cycle` : ''}
            </span>
            <span className="org-boss">
              {next.length ? `Predicted: ${next.map((b) => `${name(b.person)} ${b.score}`).join(' · ')}` : 'No one predicted beyond the camp yet'}
            </span>
          </span>
          <span className="pull-score" title="In camp plus predicted first choices">
            {c.declared + c.predicted}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="orgchart pullview">
      <h2>2028 backing</h2>
      <p className="org-key muted small">
        Who is likely to back each 2028 contender. The number beside each is the people in their camp (from reporting)
        plus those the map predicts would pick them first. A prediction combines how close someone is to the contender
        with how well their politics fit; a camp or a reported plan to give raises it, and a camp with a rival on the
        same side lowers it. {BACKING_TRACK_RECORD}
      </p>
      {SIDES.map(([side, label]) => {
        const list = board.contenders.filter((c) => c.side === side);
        if (!list.length) return null;
        return (
          <section key={label}>
            <h2 className="backing-side">{label}</h2>
            <ul className="pull-list">{list.map(row)}</ul>
          </section>
        );
      })}
      {board.contested.length > 0 && (
        <section>
          <h2 className="backing-side">Up for grabs</h2>
          <p className="org-key muted small">Donors with no camp whose two best choices on one side are within 8 points.</p>
          <ul className="pull-list">
            {board.contested.slice(0, 12).map((x) => (
              <li key={x.person}>
                <button className={`org-row${x.person === selectedId ? ' selected' : ''}`} onClick={() => onSelect(x.person)}>
                  <Avatar name={name(x.person)} photoUrl={byId.get(x.person)?.photoUrl} />
                  <span className="org-text">
                    <span className="org-name">{name(x.person)}</span>
                    <span className="org-title">Gave {formatUsd(x.lastCycleUsd)} last cycle</span>
                    <span className="org-boss">
                      {name(x.first.contender)} {x.first.score} · {name(x.second.contender)} {x.second.score}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

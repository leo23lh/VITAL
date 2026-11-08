// Pull view: who has the most access to people in power, overall or with one person.
import { useMemo, useState } from 'react';
import type { GraphNode } from '../lib/graph';
import { earOf, power, rankPull, type BondIndex } from '../lib/pull';

interface Props {
  nodes: GraphNode[];
  bonds: BondIndex;
  /** Whose ear: unset = anyone in power. */
  of?: string;
  onOf: (id: string | undefined) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type Scope = 'all' | 'inside' | 'outside';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

function Avatar({ n }: { n?: GraphNode }) {
  return n?.photoUrl ? (
    <img className="org-photo" src={n.photoUrl} alt="" loading="lazy" />
  ) : (
    <span className="org-photo org-initials" aria-hidden="true">
      {initials(n?.name ?? '')}
    </span>
  );
}

const roleOf = (n?: GraphNode) => n?.person?.office?.title ?? n?.person?.current_role ?? '';

export default function PullView({ nodes, bonds, of, onOf, selectedId, onSelect }: Props) {
  const [scope, setScope] = useState<Scope>('all');
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const name = (id: string) => byId.get(id)?.name ?? id;

  // People in power, most powerful first, for "whose ear".
  const powerful = useMemo(
    () =>
      nodes
        .filter((n) => power(n) >= 0.6)
        .sort((a, b) => power(b) - power(a) || a.name.localeCompare(b.name)),
    [nodes],
  );
  const overall = useMemo(() => (of ? null : rankPull(nodes, bonds)), [of, nodes, bonds]);
  const ear = useMemo(() => (of ? earOf(of, nodes, bonds) : null), [of, nodes, bonds]);

  const inScope = (id: string) => {
    if (scope === 'all') return true;
    const inside = !!byId.get(id)?.person?.office;
    return scope === 'inside' ? inside : !inside;
  };
  return (
    <div className="orgchart pullview">
      <h2>{of ? `Who has ${name(of)}’s ear` : 'Pull'}</h2>
      <p className="org-key muted small">
        {of
          ? `Everyone with a recorded tie to ${name(of)}, strongest bond first.`
          : 'How close each person is to people in power: their bond with each official, weighted by the post (the President counts most, then the White House senior staff, the cabinet, congressional leaders and deputies). The strongest tie counts in full, each further one half as much; ties to people junior to them count a quarter.'}
      </p>

      <div className="pull-controls">
        <label className="pull-of">
          <span className="muted small">Whose ear</span>
          <select value={of ?? ''} onChange={(e) => onOf(e.target.value || undefined)}>
            <option value="">Anyone in power</option>
            {powerful.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <span className="chip-seg" role="group" aria-label="Who to show">
          {(
            [
              ['all', 'All'],
              ['inside', 'In government'],
              ['outside', 'Outside'],
            ] as const
          ).map(([s, label]) => (
            <button key={s} className={scope === s ? 'on' : ''} aria-pressed={scope === s} onClick={() => setScope(s)}>
              {label}
            </button>
          ))}
        </span>
      </div>

      <ol className="pull-list">
        {(overall ?? [])
          .filter((r) => inScope(r.id))
          .slice(0, 50)
          .map((r, i) => (
            <li key={r.id}>
              <button className={`org-row${r.id === selectedId ? ' selected' : ''}`} onClick={() => onSelect(r.id)}>
                <span className="pull-rank">{i + 1}</span>
                <Avatar n={byId.get(r.id)} />
                <span className="org-text">
                  <span className="org-name">{name(r.id)}</span>
                  <span className="org-title">{roleOf(byId.get(r.id))}</span>
                  <span className="org-boss">
                    via {r.via
                      .slice(0, 3)
                      .map((v) => `${name(v.id)} ${v.bond}`)
                      .join(' · ')}
                  </span>
                </span>
                <span className="pull-score" title={r.label}>
                  {r.score}
                </span>
              </button>
            </li>
          ))}
        {(ear ?? [])
          .filter((e) => inScope(e.id))
          .slice(0, 50)
          .map((e, i) => (
            <li key={e.id}>
              <button className={`org-row${e.id === selectedId ? ' selected' : ''}`} onClick={() => onSelect(e.id)}>
                <span className="pull-rank">{i + 1}</span>
                <Avatar n={byId.get(e.id)} />
                <span className="org-text">
                  <span className="org-name">{name(e.id)}</span>
                  <span className="org-title">{roleOf(byId.get(e.id))}</span>
                  <span className="org-boss">{e.label}</span>
                </span>
                <span className="pull-score" title={`Bond ${e.bond}`}>
                  {e.bond}
                </span>
              </button>
            </li>
          ))}
      </ol>
      {(overall ?? ear ?? []).filter((r) => inScope(r.id)).length === 0 && <p className="muted">No one on record.</p>}
    </div>
  );
}

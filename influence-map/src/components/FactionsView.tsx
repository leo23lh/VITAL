// Factions & rifts: the blocs the map's ties divide into, and the friendly ties most at risk of breaking.
import { useMemo } from 'react';
import type { Faction } from '../lib/factions';
import type { GraphNode } from '../lib/graph';
import { describeReason, type RiftWarning } from '../lib/rifts';
import Avatar from './Avatar';

export type FactionsTab = 'factions' | 'rifts';

interface Props {
  nodes: GraphNode[];
  factions: Faction[];
  rifts: RiftWarning[];
  tab: FactionsTab;
  onTab: (t: FactionsTab) => void;
  /** Show one faction on the map. */
  onShow: (f: Faction) => void;
  onSelect: (id: string) => void;
  onPair: (a: string, b: string) => void;
}

/** What the rift scores have meant on past breaks (scripts/rift-check.mjs). */
export const RIFT_TRACK_RECORD =
  'Tested by freezing the map at the end of 2020, 2022 and 2024: the five friendly ties that later broke (among them Trump and DeSantis, and Trump and Musk) scored higher than 82% of the ties that held. Five breaks is a small test, so read the scores as a reason to look, not a forecast.';

const leanText = (v: number | null) =>
  v === null ? '' : Math.abs(v) < 0.5 ? 'centrist' : `${v < 0 ? 'left' : 'right'} ${Math.abs(v).toFixed(1)}`;

export default function FactionsView({ nodes, factions, rifts, tab, onTab, onShow, onSelect, onPair }: Props) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const name = (id: string) => byId.get(id)?.name ?? id;
  const labelOf = useMemo(() => new Map(factions.map((f) => [f.id, f.label])), [factions]);

  return (
    <div className="orgchart pullview">
      <h2>Factions &amp; rifts</h2>
      <div className="pull-controls">
        <span className="chip-seg" role="group" aria-label="What to show">
          {(
            [
              ['factions', 'Factions'],
              ['rifts', 'Rift watch'],
            ] as const
          ).map(([t, label]) => (
            <button key={t} className={tab === t ? 'on' : ''} aria-pressed={tab === t} onClick={() => onTab(t)}>
              {label}
            </button>
          ))}
        </span>
      </div>

      {tab === 'factions' ? (
        <>
          <p className="org-key muted small">
            The blocs the map’s current ties divide into: friendly ties pull people into the same faction and feuds push
            them apart. Only ties standing today count. Each faction is named for the group most of its people share, or
            for a 2028 contender or the best-tied person near its center. Loyalty is the share of a member’s friendly
            ties that stay inside; cohesion is the same for the whole faction.
          </p>
          <ul className="pull-list faction-list">
            {factions.map((f) => {
              const people = f.members.filter((m) => !byId.get(m.id)?.isOrg);
              return (
                <li key={f.id} className="faction-card">
                  <div className="faction-head">
                    <h3>{f.label}</h3>
                    <span className="muted small">
                      {f.members.length} members · cohesion {Math.round(f.cohesion * 100)}%
                      {f.lean !== null ? ` · ${leanText(f.lean)}` : ''}
                    </span>
                    <button className="org-jump-chip" onClick={() => onShow(f)}>
                      Show on map
                    </button>
                  </div>
                  <div className="faction-faces">
                    {people.slice(0, 12).map((m) => (
                      <button key={m.id} className="faction-face" onClick={() => onSelect(m.id)} title={`${name(m.id)} · loyalty ${Math.round(m.loyalty * 100)}%`}>
                        <Avatar name={name(m.id)} photoUrl={byId.get(m.id)?.photoUrl} />
                        <span>{name(m.id)}</span>
                      </button>
                    ))}
                    {people.length > 12 && <span className="muted small">+{people.length - 12} more</span>}
                  </div>
                  {f.opponents.length > 0 && (
                    <p className="small">
                      <span className="muted">At odds with: </span>
                      {f.opponents
                        .slice(0, 3)
                        .map((o) => `${labelOf.get(o.id) ?? name(o.id)} (${o.feuds} feud${o.feuds === 1 ? '' : 's'})`)
                        .join(' · ')}
                    </p>
                  )}
                  {f.innerFeuds.length > 0 && (
                    <p className="small">
                      <span className="muted">Feuds inside: </span>
                      {f.innerFeuds.slice(0, 3).map(([a, b], i) => (
                        <span key={`${a}|${b}`}>
                          {i > 0 && ' · '}
                          <button className="link-button" onClick={() => onPair(a, b)}>
                            {name(a)} – {name(b)}
                          </button>
                        </span>
                      ))}
                    </p>
                  )}
                  {f.bridges.length > 0 && (
                    <p className="small">
                      <span className="muted">Bridges: </span>
                      {f.bridges
                        .slice(0, 3)
                        .map((b) => `${name(b.id)} → ${labelOf.get(b.to) ?? name(b.to)} (${Math.round(b.share * 100)}% of ties)`)
                        .join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="org-key muted small">
            Friendly ties showing the strains that have come before public breaks: a close friend of one feuding with the
            other, sitting in feuding factions, chasing the same 2028 prize, a recent ask turned down, politics far apart,
            or an old feud since mended. Each strain adds less than the one before. {RIFT_TRACK_RECORD}
          </p>
          <ol className="pull-list">
            {rifts.slice(0, 60).map((w, i) => (
              <li key={`${w.a}|${w.b}`}>
                <button className="org-row" onClick={() => onPair(w.a, w.b)}>
                  <span className="pull-rank">{i + 1}</span>
                  <span className="rift-faces">
                    <Avatar name={name(w.a)} photoUrl={byId.get(w.a)?.photoUrl} />
                    <Avatar name={name(w.b)} photoUrl={byId.get(w.b)?.photoUrl} />
                  </span>
                  <span className="org-text">
                    <span className="org-name">
                      {name(w.a)} – {name(w.b)}
                    </span>
                    {w.reasons.slice(0, 3).map((r, j) => (
                      <span key={j} className="org-boss">
                        {describeReason(r, name)}
                      </span>
                    ))}
                    {w.reasons.length > 3 && <span className="org-boss muted">and {w.reasons.length - 3} more</span>}
                  </span>
                  <span className="pull-score backing-score" title={w.label}>
                    {w.score}
                    <span className="backing-label">{w.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {rifts.length === 0 && <p className="muted">No strained ties on record.</p>}
        </>
      )}
    </div>
  );
}

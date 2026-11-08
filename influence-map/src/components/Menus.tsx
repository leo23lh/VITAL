import { useEffect } from 'react';
import { DEFAULT_FORCES, type Forces, type View } from '../lib/view';
import type { GraphNode, YearRange } from '../lib/graph';
import { EDGE_FAMILIES, GROUPS, SECTORS, type EdgeFamily, type GroupId, type MapUpdate } from '../lib/schema';

export type MenuName = 'views' | 'filters' | 'updates';

interface Props {
  menu: MenuName;
  onClose: () => void;
  view: View;
  onView: (v: View) => void;
  groupCounts: Record<GroupId, number>;
  /** 2028 contenders and how many people are in each camp. */
  camps: { id: string; name: string; count: number }[];
  selectedNode: GraphNode | null;
  onWorld: (id: string) => void;
  counts: Record<EdgeFamily, number>;
  hidden: Set<EdgeFamily>;
  onToggleFamily: (f: EdgeFamily) => void;
  onAllFamilies: (visible: boolean) => void;
  showSuggested: boolean;
  onShowSuggested: (v: boolean) => void;
  colorAll: boolean;
  onColorAll: (v: boolean) => void;
  showPhotos: boolean;
  onShowPhotos: (v: boolean) => void;
  showOrgs: boolean;
  onShowOrgs: (v: boolean) => void;
  leanMode: boolean;
  onLeanMode: (v: boolean) => void;
  forces: Forces;
  onForces: (f: Forces) => void;
  years: YearRange | null;
  span: [number, number];
  onYears: (r: YearRange | null) => void;
  stats: { researched: number; orgs: number; suggested: number; links: number };
  live: boolean;
  lastUpdated: Date | null;
  onFit: () => void;
  /** Omitted when this view can't save files. */
  onExport?: () => void;
  /** The Updates feed, newest first. */
  updates: MapUpdate[];
  /** How many of the newest updates are unread (marked with a dot). */
  unseen: number;
  nameOf: (id: string) => string;
  /** Whether a slug is on the map (people and organizations with files). */
  hasNode: (id: string) => boolean;
  onPickPerson: (id: string) => void;
}

export default function Menus(props: Props) {
  const { menu, onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <div
        className={`menu menu-${menu}`}
        role="dialog"
        aria-label={menu === 'views' ? 'Preset views' : menu === 'updates' ? 'Updates' : 'Filters'}
      >
        {menu === 'views' ? (
          <ViewsMenu {...props} />
        ) : menu === 'updates' ? (
          <UpdatesMenu {...props} />
        ) : (
          <FiltersMenu {...props} />
        )}
      </div>
    </>
  );
}

function ViewsMenu({ view, onView, groupCounts, camps, selectedNode, onWorld }: Props) {
  const is = (v: View) =>
    v.kind === view.kind && (!('id' in v) || ('id' in view && v.id === view.id)) ? ' current' : '';
  return (
    <>
      <button className={`menu-item${is({ kind: 'all' })}`} onClick={() => onView({ kind: 'all' })}>
        <span>Whole network</span>
      </button>

      <h4>Groups</h4>
      {GROUPS.map((g) => (
        <button
          key={g.id}
          className={`menu-item${is({ kind: 'group', id: g.id })}`}
          onClick={() => onView({ kind: 'group', id: g.id })}
        >
          <span>{g.label}</span>
          <span className="muted">{groupCounts[g.id]}</span>
        </button>
      ))}

      {camps.length > 0 && (
        <>
          <h4>2028 camps</h4>
          {camps.map((c) => (
            <button
              key={c.id}
              className={`menu-item${is({ kind: 'camp', id: c.id })}`}
              onClick={() => onView({ kind: 'camp', id: c.id })}
            >
              <span>{c.name}</span>
              <span className="muted">{c.count === 0 ? 'no camp yet' : `+${c.count}`}</span>
            </button>
          ))}
        </>
      )}

      <h4>Lenses</h4>
      <button className={`menu-item${is({ kind: 'money' })}`} onClick={() => onView({ kind: 'money' })}>
        <span>Follow the money</span>
        <span className="muted">donor links</span>
      </button>
      <button className={`menu-item${is({ kind: 'feuds' })}`} onClick={() => onView({ kind: 'feuds' })}>
        <span>Feuds</span>
        <span className="muted">rival and enemy links</span>
      </button>
      {selectedNode ? (
        <button
          className={`menu-item${view.kind === 'world' && view.id === selectedNode.id ? ' current' : ''}`}
          onClick={() => onWorld(selectedNode.id)}
        >
          <span>{selectedNode.name}'s world</span>
          <span className="muted">focus</span>
        </button>
      ) : (
        <p className="menu-hint muted">Tap a person, then Focus, to see just their world.</p>
      )}
    </>
  );
}

/** What changed on the map, newest first, grouped by day. Tapping a name jumps to them. */
function UpdatesMenu({ updates, unseen, nameOf, hasNode, onPickPerson }: Props) {
  const byDay: [string, { u: MapUpdate; i: number }[]][] = [];
  updates.forEach((u, i) => {
    const last = byDay[byDay.length - 1];
    if (last && last[0] === u.date) last[1].push({ u, i });
    else byDay.push([u.date, [{ u, i }]]);
  });
  const dayLabel = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <>
      <div className="menu-head">
        <h4>Updates</h4>
      </div>
      {updates.length === 0 && <p className="menu-hint muted">Nothing yet.</p>}
      {byDay.map(([day, items]) => (
        <section key={day} className="updates-day">
          <h4>{dayLabel(day)}</h4>
          <ul className="updates-list">
            {items.map(({ u, i }) => (
              <li key={i} className={i < unseen ? 'unseen' : ''}>
                <p>{u.text}</p>
                <div className="updates-people">
                  {u.people.filter(hasNode).map((id) => (
                    <button key={id} className="update-chip" onClick={() => onPickPerson(id)}>
                      {nameOf(id)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function FiltersMenu(props: Props) {
  const { counts, hidden, years, span } = props;
  return (
    <>
      <div className="menu-head">
        <h4>Relationships</h4>
        <span className="menu-head-actions">
          <button onClick={() => props.onAllFamilies(true)}>all</button>
          <button onClick={() => props.onAllFamilies(false)}>none</button>
        </span>
      </div>
      {EDGE_FAMILIES.map((f) => (
        <label key={f.id} className={`check-row${hidden.has(f.id) ? ' off' : ''}`}>
          <input type="checkbox" checked={!hidden.has(f.id)} onChange={() => props.onToggleFamily(f.id)} />
          <span className={`family-line${f.dotted ? ' dotted' : ''}`} style={{ color: f.color, background: f.dotted ? undefined : f.color }} />
          <span className="check-label">
            {f.label} <span className="muted">· {f.hint}</span>
          </span>
          <span className="muted num">{counts[f.id]}</span>
        </label>
      ))}

      <h4>Timeline</h4>
      <label className="check-row">
        <input
          type="checkbox"
          checked={!!years}
          // Start with the last five years, a useful window that's easy to widen.
          onChange={(e) => props.onYears(e.target.checked ? { from: Math.max(span[0], span[1] - 5), to: span[1] } : null)}
        />
        <span className="check-label">
          Show links active in a date range <span className="muted">· any overlap with the range counts</span>
        </span>
      </label>
      {years && (
        <>
          <div className="year-row">
            <span className="year-label muted">From</span>
            <input
              type="range"
              min={span[0]}
              max={span[1]}
              value={years.from}
              onChange={(e) => {
                const from = Number(e.target.value);
                props.onYears({ from, to: Math.max(from, years.to) });
              }}
              aria-label="From year"
            />
            <span className="year-value">{years.from}</span>
          </div>
          <div className="year-row">
            <span className="year-label muted">To</span>
            <input
              type="range"
              min={span[0]}
              max={span[1]}
              value={years.to}
              onChange={(e) => {
                const to = Number(e.target.value);
                props.onYears({ from: Math.min(years.from, to), to });
              }}
              aria-label="To year"
            />
            <span className="year-value">{years.to}</span>
          </div>
        </>
      )}

      <h4>Display</h4>
      <label className="check-row">
        <input type="checkbox" checked={props.leanMode} onChange={(e) => props.onLeanMode(e.target.checked)} />
        <span className="check-label">
          Left–right by political lean <span className="muted">· main view only; off = clusters spread out</span>
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={props.showPhotos} onChange={(e) => props.onShowPhotos(e.target.checked)} />
        <span className="check-label">
          Show photos <span className="muted">· in each person's circle, ringed in their sector color</span>
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={props.showOrgs} onChange={(e) => props.onShowOrgs(e.target.checked)} />
        <span className="check-label">
          Show organizations <span className="muted">· super PACs, think tanks and firms, drawn as squares</span>
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={props.showSuggested} onChange={(e) => props.onShowSuggested(e.target.checked)} />
        <span className="check-label">
          Show all suggested people <span className="muted">· otherwise only around the person you tap</span>
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={props.colorAll} onChange={(e) => props.onColorAll(e.target.checked)} />
        <span className="check-label">
          Color all lines <span className="muted">· otherwise only the tapped person's</span>
        </span>
      </label>

      <ForcesPanel forces={props.forces} onForces={props.onForces} />

      <h4>Key</h4>
      <div className="key">
        {SECTORS.map((s) => (
          <span key={s.id} className="key-item">
            <span className="key-dot" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        <span className="key-item">
          <span className="key-square side-R" /> Organization, Republican side
        </span>
        <span className="key-item">
          <span className="key-square side-D" /> Organization, Democratic side
        </span>
        <span className="key-item">
          <span className="key-square" /> Organization, other
        </span>
        <span className="key-item">
          <span className="key-dot suggested" /> Suggested (no file yet)
        </span>
      </div>
      <p className="muted small">
        Dot size = connections · thicker line = deeper bond · dashed line = confidence under 50% · glows = clusters, named after the group
        most of their people share · green pulses = money moving, giver to receiver
      </p>

      <div className="menu-foot">
        <span className="muted small">
          {props.stats.researched} people · {props.stats.orgs} organizations · {props.stats.suggested} suggested · {props.stats.links} links
          {props.live && props.lastUpdated && ` · updated ${props.lastUpdated.toLocaleTimeString()}`}
        </span>
        <span className="menu-foot-actions">
          <button onClick={props.onFit}>Fit map</button>
          {props.onExport && <button onClick={props.onExport}>Export PNG</button>}
        </span>
      </div>
    </>
  );
}

const FORCE_SLIDERS: { key: keyof Forces; label: string; hint: string }[] = [
  { key: 'repel', label: 'Spread', hint: 'how hard dots push apart' },
  { key: 'distance', label: 'Line length', hint: 'and room between clusters' },
  { key: 'cluster', label: 'Clustering', hint: 'how tightly each cluster gathers' },
  { key: 'center', label: 'Center pull', hint: 'keeps loose dots close' },
];

/** Layout sliders, like Obsidian's graph forces. */
function ForcesPanel({ forces, onForces }: { forces: Forces; onForces: (f: Forces) => void }) {
  const changed = FORCE_SLIDERS.some(({ key }) => forces[key] !== DEFAULT_FORCES[key]);
  return (
    <>
      <div className="menu-head">
        <h4>Forces</h4>
        {changed && (
          <span className="menu-head-actions">
            <button onClick={() => onForces(DEFAULT_FORCES)}>reset</button>
          </span>
        )}
      </div>
      {FORCE_SLIDERS.map(({ key, label, hint }) => (
        <label key={key} className="force-row">
          <span className="check-label">
            {label} <span className="muted">· {hint}</span>
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={forces[key]}
            onChange={(e) => onForces({ ...forces, [key]: Number(e.target.value) })}
            aria-label={label}
          />
        </label>
      ))}
    </>
  );
}

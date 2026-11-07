import { useEffect } from 'react';
import type { View } from '../App';
import type { GraphNode } from '../lib/graph';
import { EDGE_FAMILIES, GROUPS, SECTORS, type EdgeFamily, type GroupId } from '../lib/schema';

export type MenuName = 'views' | 'filters';

interface Props {
  menu: MenuName;
  onClose: () => void;
  view: View;
  onView: (v: View) => void;
  groupCounts: Record<GroupId, number>;
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
  year: number | null;
  span: [number, number];
  onYear: (y: number | null) => void;
  stats: { researched: number; suggested: number; links: number };
  live: boolean;
  lastUpdated: Date | null;
  onFit: () => void;
  /** Omitted when this view can't save files. */
  onExport?: () => void;
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
      <div className={`menu menu-${menu}`} role="dialog" aria-label={menu === 'views' ? 'Preset views' : 'Filters'}>
        {menu === 'views' ? <ViewsMenu {...props} /> : <FiltersMenu {...props} />}
      </div>
    </>
  );
}

function ViewsMenu({ view, onView, groupCounts, selectedNode, onWorld }: Props) {
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

      <h4>Lenses</h4>
      <button className={`menu-item${is({ kind: 'money' })}`} onClick={() => onView({ kind: 'money' })}>
        <span>Follow the money</span>
        <span className="muted">donor links</span>
      </button>
      <button className={`menu-item${is({ kind: 'feuds' })}`} onClick={() => onView({ kind: 'feuds' })}>
        <span>Feuds</span>
        <span className="muted">rival links</span>
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

function FiltersMenu(props: Props) {
  const { counts, hidden, year, span } = props;
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
        <input type="checkbox" checked={year != null} onChange={(e) => props.onYear(e.target.checked ? span[1] : null)} />
        <span className="check-label">Show links active in one year</span>
      </label>
      {year != null && (
        <div className="year-row">
          <input
            type="range"
            min={span[0]}
            max={span[1]}
            value={year}
            onChange={(e) => props.onYear(Number(e.target.value))}
            aria-label="Year"
          />
          <span className="year-value">{year}</span>
        </div>
      )}

      <h4>Display</h4>
      <label className="check-row">
        <input type="checkbox" checked={props.showPhotos} onChange={(e) => props.onShowPhotos(e.target.checked)} />
        <span className="check-label">
          Show photos <span className="muted">· in each person's circle, ringed in their sector color</span>
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

      <h4>Key</h4>
      <div className="key">
        {SECTORS.map((s) => (
          <span key={s.id} className="key-item">
            <span className="key-dot" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        <span className="key-item">
          <span className="key-dot suggested" /> Suggested (no file yet)
        </span>
      </div>
      <p className="muted small">Dot size = connections · dashed line = confidence under 50%</p>

      <div className="menu-foot">
        <span className="muted small">
          {props.stats.researched} researched · {props.stats.suggested} suggested · {props.stats.links} links
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

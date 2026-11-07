import { EDGE_GROUPS, type EdgeGroup } from '../lib/schema';

interface Props {
  counts: Record<EdgeGroup, number>;
  hidden: Set<EdgeGroup>;
  onToggle: (g: EdgeGroup) => void;
  onAll: (visible: boolean) => void;
}

export default function Legend({ counts, hidden, onToggle, onAll }: Props) {
  return (
    <div className="legend" aria-label="Relationship types">
      <div className="legend-head">
        <span>Relationships</span>
        <span className="legend-all">
          <button onClick={() => onAll(true)}>all</button>
          <button onClick={() => onAll(false)}>none</button>
        </span>
      </div>
      {EDGE_GROUPS.map((g) => (
        <label key={g.id} className={`legend-item${hidden.has(g.id) ? ' off' : ''}`}>
          <input type="checkbox" checked={!hidden.has(g.id)} onChange={() => onToggle(g.id)} />
          <span className="legend-line" style={{ background: g.color }} />
          <span className="legend-label">{g.label}</span>
          <span className="legend-count">{counts[g.id] ?? 0}</span>
        </label>
      ))}
      <div className="legend-notes muted">
        <div>
          <span className="legend-node solid" /> researched · <span className="legend-node dashed" /> suggested
        </div>
        <div>Node size = connections · dashed line = confidence under 50%</div>
      </div>
    </div>
  );
}

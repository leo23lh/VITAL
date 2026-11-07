import { useMemo, useState } from 'react';
import { matchesQuery, type GraphNode } from '../lib/graph';

interface Props {
  nodes: GraphNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  showSuggested: boolean;
  onToggleSuggested: (v: boolean) => void;
  onFit: () => void;
  onExport: () => void;
  stats: { researched: number; suggested: number; links: number };
  live: boolean;
  lastUpdated: Date | null;
}

export default function Toolbar(props: Props) {
  const { nodes, query, onQuery, onPick } = props;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return nodes
      .filter((n) => matchesQuery(n, query.trim()))
      .sort((a, b) => Number(b.researched) - Number(a.researched) || b.degree - a.degree)
      .slice(0, 8);
  }, [nodes, query]);

  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
          <g stroke="#4ea1ff" strokeWidth="2.4">
            <line x1="9" y1="10" x2="22" y2="8" />
            <line x1="9" y1="10" x2="16" y2="23" />
            <line x1="22" y1="8" x2="16" y2="23" />
          </g>
          <circle cx="9" cy="10" r="4" fill="#f5c542" />
          <circle cx="22" cy="8" r="3" fill="#e6e9ef" />
          <circle cx="16" cy="23" r="5" fill="#e6e9ef" />
        </svg>
        Influence Map
      </div>

      <div className="search">
        <input
          type="search"
          placeholder="Search people…"
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) {
              pick(results[active].id);
            } else if (e.key === 'Escape') {
              onQuery('');
              setOpen(false);
            }
          }}
          aria-label="Search people"
        />
        {open && results.length > 0 && (
          <ul className="search-results" role="listbox">
            {results.map((n, i) => (
              <li
                key={n.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(n.id);
                }}
              >
                <span>{n.name}</span>
                <span className="muted">{n.researched ? `${n.degree} links` : 'suggested'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="toggle">
        <input
          type="checkbox"
          checked={props.showSuggested}
          onChange={(e) => props.onToggleSuggested(e.target.checked)}
        />
        Suggested nodes
      </label>

      <div className="toolbar-actions">
        <button onClick={props.onFit}>Fit</button>
        <button onClick={props.onExport}>Export PNG</button>
      </div>

      <div className="stats muted">
        {props.stats.researched} researched · {props.stats.suggested} suggested · {props.stats.links} links
        {props.live && (
          <span
            className="live"
            title={props.lastUpdated ? `Updated ${props.lastUpdated.toLocaleTimeString()}` : 'Watching data/people'}
          >
            <span className="live-dot" /> live
          </span>
        )}
      </div>
    </header>
  );
}

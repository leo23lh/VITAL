import { useMemo, useState } from 'react';
import type { View } from '../App';
import { matchesQuery, type GraphNode } from '../lib/graph';
import { GROUPS } from '../lib/schema';
import type { MenuName } from './Menus';

interface Props {
  nodes: GraphNode[];
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  view: View;
  nameOf: (id: string) => string;
  menu: MenuName | null;
  onMenu: (m: MenuName | null) => void;
  /** How many filters differ from the defaults; shown as a badge. */
  filtersActive: number;
  live: boolean;
  lastUpdated: Date | null;
}

export function viewLabel(view: View, nameOf: (id: string) => string): string {
  switch (view.kind) {
    case 'all':
      return 'Whole network';
    case 'group':
      return GROUPS.find((g) => g.id === view.id)?.label ?? view.id;
    case 'camp':
      return `${nameOf(view.id)}'s 2028 camp`;
    case 'money':
      return 'Follow the money';
    case 'feuds':
      return 'Feuds';
    case 'world':
      return `${nameOf(view.id)}'s world`;
  }
}

export default function Toolbar(props: Props) {
  const { nodes, query, onQuery, onPick, menu, onMenu } = props;
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

  const toggle = (m: MenuName) => onMenu(menu === m ? null : m);

  return (
    <header className="toolbar">
      <div
        className="brand"
        title={props.live ? `Live${props.lastUpdated ? ` · updated ${props.lastUpdated.toLocaleTimeString()}` : ''}` : undefined}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
          <g stroke="#4ea1ff" strokeWidth="2.4">
            <line x1="9" y1="10" x2="22" y2="8" />
            <line x1="9" y1="10" x2="16" y2="23" />
            <line x1="22" y1="8" x2="16" y2="23" />
          </g>
          <circle cx="9" cy="10" r="4" fill="#f5c542" />
          <circle cx="22" cy="8" r="3" fill="#e6e9ef" />
          <circle cx="16" cy="23" r="5" fill="#e6e9ef" />
        </svg>
        <span className="brand-name">Influence Map</span>
        {props.live && <span className="live-dot" aria-label="Live" />}
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

      <button
        className={`tool-button${menu === 'views' ? ' on' : ''}${props.view.kind !== 'all' ? ' active' : ''}`}
        onClick={() => toggle('views')}
        aria-expanded={menu === 'views'}
        title="Preset views"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="4" cy="4" r="2.2" fill="currentColor" />
          <circle cx="12" cy="4" r="2.2" fill="currentColor" />
          <circle cx="4" cy="12" r="2.2" fill="currentColor" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" opacity="0.45" />
        </svg>
        <span className="tool-label">{props.view.kind === 'all' ? 'Views' : viewLabel(props.view, props.nameOf)}</span>
      </button>
      <button
        className={`tool-button${menu === 'filters' ? ' on' : ''}`}
        onClick={() => toggle('filters')}
        aria-expanded={menu === 'filters'}
        title="Filters and display"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="4" x2="14" y2="4" />
            <line x1="4" y1="8" x2="12" y2="8" />
            <line x1="6.5" y1="12" x2="9.5" y2="12" />
          </g>
        </svg>
        <span className="tool-label">Filters</span>
        {props.filtersActive > 0 && <span className="badge-count">{props.filtersActive}</span>}
      </button>
    </header>
  );
}

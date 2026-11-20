import type { MenuName } from './Menus';

interface Props {
  menu: MenuName | null;
  onMenu: (m: MenuName | null) => void;
  /** Back to the plain map: closes menus and the details sheet. */
  onMap: () => void;
  viewActive: boolean;
  filtersActive: number;
  unseen: number;
}

/** Folded phone: the main controls along the bottom, within thumb reach. */
export default function TabBar({ menu, onMenu, onMap, viewActive, filtersActive, unseen }: Props) {
  const toggle = (m: MenuName) => onMenu(menu === m ? null : m);
  return (
    <nav className="tabbar" aria-label="Main">
      <button className={!menu ? 'on' : ''} onClick={onMap}>
        <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.4">
            <line x1="4" y1="5" x2="11" y2="4" />
            <line x1="4" y1="5" x2="8" y2="12" />
            <line x1="11" y1="4" x2="8" y2="12" />
          </g>
          <circle cx="4" cy="5" r="2" fill="currentColor" />
          <circle cx="11" cy="4" r="1.6" fill="currentColor" />
          <circle cx="8" cy="12" r="2.3" fill="currentColor" />
        </svg>
        <span>Map</span>
      </button>
      <button className={menu === 'views' ? 'on' : ''} onClick={() => toggle('views')} aria-expanded={menu === 'views'}>
        <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="4" cy="4" r="2.2" fill="currentColor" />
          <circle cx="12" cy="4" r="2.2" fill="currentColor" />
          <circle cx="4" cy="12" r="2.2" fill="currentColor" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" opacity="0.45" />
        </svg>
        <span>Views</span>
        {viewActive && <i className="tab-dot" aria-label="A view is on" />}
      </button>
      <button
        className={menu === 'filters' ? 'on' : ''}
        onClick={() => toggle('filters')}
        aria-expanded={menu === 'filters'}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="2" y1="4" x2="14" y2="4" />
            <line x1="4" y1="8" x2="12" y2="8" />
            <line x1="6.5" y1="12" x2="9.5" y2="12" />
          </g>
        </svg>
        <span>Filters</span>
        {filtersActive > 0 && <i className="tab-badge">{filtersActive}</i>}
      </button>
      <button
        className={menu === 'updates' ? 'on' : ''}
        onClick={() => toggle('updates')}
        aria-expanded={menu === 'updates'}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
          <UpdatesIconPaths />
        </svg>
        <span>Updates</span>
        {unseen > 0 && <i className="tab-badge">{unseen}</i>}
      </button>
    </nav>
  );
}

function UpdatesIconPaths() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <line x1="5" y1="6" x2="11" y2="6" />
      <line x1="5" y1="8.5" x2="11" y2="8.5" />
      <line x1="5" y1="11" x2="8.5" y2="11" />
    </g>
  );
}

// Small React hooks for the app's chrome: screen layout and the Updates badge.
import { useCallback, useEffect, useState } from 'react';
import type { MenuName } from '../components/Menus';
import type { MapUpdate } from './schema';
import type { Layout } from './view';

function currentLayout(): Layout {
  if (window.matchMedia('(min-width: 1100px)').matches) return 'wide';
  if (window.matchMedia('(min-width: 600px)').matches) return 'card';
  return 'sheet';
}

/** wide = side panel, card = floating card, sheet = phone bottom sheet; follows window resizes. */
export function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>(currentLayout);
  useEffect(() => {
    const onResize = () => setLayout(currentLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}

const SEEN_UPDATES_KEY = 'influence-map:updates-seen';

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_UPDATES_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * The open menu, plus the Updates feed's unread count. Entries are only ever added,
 * so this device remembers how many it has seen; opening the Updates menu marks them read.
 */
export function useMenus(updates: MapUpdate[]) {
  const [menu, setMenu] = useState<MenuName | null>(null);
  const [seen, setSeen] = useState(readSeen);
  const unseen = Math.max(0, updates.length - seen);
  // Kept while the Updates menu is open, so the unread dots stay until it closes.
  const [unseenAtOpen, setUnseenAtOpen] = useState(0);
  const openMenu = useCallback(
    (m: MenuName | null) => {
      if (m === 'updates') {
        setUnseenAtOpen(unseen);
        setSeen(updates.length);
        try {
          localStorage.setItem(SEEN_UPDATES_KEY, String(updates.length));
        } catch {
          // Private browsing: the badge just comes back next visit.
        }
      }
      setMenu(m);
    },
    [unseen, updates.length],
  );
  return { menu, openMenu, unseen, unseenAtOpen };
}

/** A Set state with a toggle for one member. */
export function useToggleSet<T>(initial: () => Set<T> = () => new Set()) {
  const [set, setSet] = useState<Set<T>>(initial);
  const toggle = useCallback(
    (x: T) =>
      setSet((s) => {
        const next = new Set(s);
        if (next.has(x)) next.delete(x);
        else next.add(x);
        return next;
      }),
    [],
  );
  return [set, toggle, setSet] as const;
}

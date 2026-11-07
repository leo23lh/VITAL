import { useCallback, useEffect, useRef, useState } from 'react';
import type { PeoplePayload } from './schema';

/** Loads data/people/*.json from the dev server and refetches when files change. */
export function usePeople() {
  const [payload, setPayload] = useState<PeoplePayload>({ people: [], errors: [] });
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/people', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setPayload((await res.json()) as PeoplePayload);
      setFetchError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const hot = import.meta.hot;
    if (!hot) return;
    // Files often change in bursts (one person plus their reciprocal links), so debounce.
    const onChange = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), 250);
    };
    hot.on('people:changed', onChange);
    return () => {
      hot.off('people:changed', onChange);
      window.clearTimeout(timer.current);
    };
  }, [load]);

  return { ...payload, loaded, fetchError, lastUpdated, live: Boolean(import.meta.hot) };
}

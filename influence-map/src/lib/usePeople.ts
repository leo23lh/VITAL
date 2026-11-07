import { useCallback, useEffect, useRef, useState } from 'react';
import { IS_ARTIFACT, PEOPLE_COLLECTION, capability, type ArtifactDb } from './platform';
import type { LoadError, PeoplePayload, Person, PersonFile } from './schema';

/**
 * Loads the people files and keeps them current.
 * Locally: fetches /api/people and refetches when the dev server reports a change.
 * As an Artifact: subscribes to the page's `people` collection.
 */
export function usePeople() {
  const [payload, setPayload] = useState<PeoplePayload>({ people: [], errors: [] });
  const [loaded, setLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const count = useRef(0);

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
    if (IS_ARTIFACT) return subscribeArtifact();

    void load();
    const hot = import.meta.hot;
    if (!hot) return;
    setLive(true);
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

  function subscribeArtifact() {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const slow = window.setTimeout(() => {
      setFetchError(
        count.current > 0
          ? 'Showing a saved copy. It may be out of date until the connection comes back.'
          : "Can't reach the saved network yet. It will load once the connection comes back.",
      );
      setLoaded(true);
    }, 10_000);

    void capability<ArtifactDb>('db').then((db) => {
      if (cancelled) return;
      if (!db) {
        window.clearTimeout(slow);
        setFetchError('Open this page on claude.ai, signed in, to load the network.');
        setLoaded(true);
        return;
      }
      unsubscribe = db.collection(PEOPLE_COLLECTION).onSnapshot(
        (snap) => {
          if (!snap.metadata.fromCache) {
            window.clearTimeout(slow);
            setFetchError(null);
          }
          const people: PersonFile[] = [];
          const errors: LoadError[] = [];
          for (const d of snap.docs) {
            const data = d.data();
            if (data && typeof data.name === 'string') {
              people.push({ slug: d.id, file: `${d.id}.json`, data: data as unknown as Person });
            } else {
              errors.push({ file: `${d.id}.json`, message: 'Missing "name" field' });
            }
          }
          count.current = people.length;
          setPayload({ people, errors });
          setLastUpdated(new Date());
          setLoaded(true);
          setLive(true);
        },
        (err) => {
          window.clearTimeout(slow);
          setFetchError(`Couldn't load the network (${err.code}). Reload the page to try again.`);
          setLoaded(true);
          setLive(false);
        },
      );
    });

    return () => {
      cancelled = true;
      window.clearTimeout(slow);
      unsubscribe?.();
    };
  }

  return { ...payload, loaded, fetchError, lastUpdated, live };
}

// The viewer runs in two places:
// - locally (`npm run dev`), reading data/people/ through the dev server
// - as a claude.ai Artifact page (`npm run build:artifact`), reading the
//   page's own database, which /add-person keeps in sync with data/people/.

export const IS_ARTIFACT = import.meta.env.MODE === 'artifact';

/** Minimal slice of the claude.ai Artifact runtime used by this app. */
export interface ArtifactDocSnapshot {
  id: string;
  data(): Record<string, unknown> | undefined;
}

export interface ArtifactQuerySnapshot {
  docs: ArtifactDocSnapshot[];
  metadata: { fromCache: boolean };
}

export interface ArtifactDb {
  collection(path: string): {
    onSnapshot(
      next: (snap: ArtifactQuerySnapshot) => void,
      error?: (e: { code: string; message: string }) => void,
    ): () => void;
  };
}

export interface ArtifactDownloads {
  save(req: { filename: string; data: Blob | string }): Promise<{ status: string }>;
}

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

/** Resolves a runtime capability, or null outside claude.ai or when unavailable. */
export function capability<T>(name: 'db' | 'downloads'): Promise<T | null> {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!runtime?.use) return Promise.resolve(null);
  return runtime.use(name).then(
    (ns) => (ns ?? null) as T | null,
    () => null,
  );
}

/** The database collection that mirrors data/people/ (one document per slug). */
export const PEOPLE_COLLECTION = 'people';

/** The database collection that mirrors data/orgs/ (one document per slug). */
export const ORGS_COLLECTION = 'orgs';

/** The Updates feed: one document per entry (date, text, people). */
export const UPDATES_COLLECTION = 'updates';

/** Monthly snapshots for trends: one document per month (doc_id YYYY-MM), body = that month in data/history.json. */
export const HISTORY_COLLECTION = 'history';

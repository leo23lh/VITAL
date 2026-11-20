// Shared by the analysis scripts: reads the data folders and loads the viewer's own
// TypeScript logic (src/lib) through Vite, so scripts and the app score things identically.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readDir(dir) {
  return readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ slug: f.replace(/\.json$/, ''), file: `${dir}/${f}`, data: JSON.parse(readFileSync(join(ROOT, dir, f), 'utf8')) }));
}

/** { people, orgs } in the shape buildGraph takes. */
export function readData() {
  return { people: readDir('data/people'), orgs: readDir('data/orgs') };
}

/** Runs `fn` with a loader for modules under src/lib ("graph", "pull", …), then shuts Vite down. */
export async function withLib(fn) {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    return await fn((name) => server.ssrLoadModule(`/src/lib/${name}.ts`));
  } finally {
    await server.close();
  }
}

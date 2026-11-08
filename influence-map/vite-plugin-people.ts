import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin, ViteDevServer } from 'vite';

/**
 * Serves every data/people/*.json file (and data/orgs/*.json, the sibling folder)
 * at GET /api/people and tells the browser to refetch whenever a file is added,
 * changed or removed.
 */
export function peopleData(dataDir: string): Plugin {
  const orgsDir = path.join(dataDir, '..', 'orgs');
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const people = loadPeople(dataDir);
    const orgs = loadPeople(orgsDir);
    res.end(JSON.stringify({ people: people.people, orgs: orgs.people, errors: [...people.errors, ...orgs.errors.map((e) => ({ ...e, file: `orgs/${e.file}` }))] }));
  };

  return {
    name: 'influence-map-people',
    configureServer(server: ViteDevServer) {
      fs.mkdirSync(dataDir, { recursive: true });
      server.watcher.add(dataDir);
      if (fs.existsSync(orgsDir)) server.watcher.add(orgsDir);
      const watched = [path.resolve(dataDir), path.resolve(orgsDir)];
      const notify = (file: string) => {
        if (!watched.includes(path.dirname(path.resolve(file))) || !file.endsWith('.json')) return;
        server.ws.send({ type: 'custom', event: 'people:changed', data: { file: path.basename(file) } });
      };
      server.watcher.on('add', notify);
      server.watcher.on('change', notify);
      server.watcher.on('unlink', notify);
      server.middlewares.use('/api/people', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/people', middleware);
    },
  };
}

export function loadPeople(dataDir: string) {
  const people: { slug: string; file: string; data: unknown }[] = [];
  const errors: { file: string; message: string }[] = [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return { people, errors };
  }
  for (const file of entries) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      if (!data || typeof data !== 'object' || typeof data.name !== 'string') {
        errors.push({ file, message: 'Missing "name" field' });
        continue;
      }
      people.push({ slug: file.replace(/\.json$/, ''), file, data });
    } catch (e) {
      errors.push({ file, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { people, errors };
}

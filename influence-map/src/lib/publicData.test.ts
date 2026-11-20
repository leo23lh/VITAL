import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leaks, publicPayload } from '../../scripts/lib/public-data.mjs';

const ROOT = join(__dirname, '..', '..');

describe('public data (the public site)', () => {
  it('leaves every private file, and every trace of it, out of the real data', () => {
    const { payload, dropped } = publicPayload(ROOT);
    expect(dropped.length).toBeGreaterThan(0);
    expect(leaks(payload, dropped)).toEqual([]);
    const slugs = new Set(payload.people.map((f: { slug: string }) => f.slug));
    for (const d of dropped) expect(slugs.has(d.slug)).toBe(false);
  });

  it('drops links, notes sentences, feed chips and snapshots that point at a private file', () => {
    const root = mkdtempSync(join(tmpdir(), 'pubdata-'));
    mkdirSync(join(root, 'data', 'people'), { recursive: true });
    const w = (f: string, d: unknown) => writeFileSync(join(root, 'data', f), JSON.stringify(d));
    w('people/pat-public.json', {
      name: 'Pat Public',
      public_figure: true,
      notes: 'Researched in 2026. Sam Private added this link. Lean checked.',
      connections: [
        { name: 'Sam Private', slug: 'sam-private', relationship_type: 'friend', sources: ['user-provided'] },
        { name: 'Ann Other', slug: 'ann-other', relationship_type: 'ally', sources: [{ url: 'https://example.gov' }] },
      ],
    });
    w('people/sam-private.json', { name: 'Sam Private', public_figure: false, self_added: true, connections: [] });
    w('updates.json', [
      { id: '2026-01-01-a', date: '2026-01-01', text: 'Pat Public refreshed.', people: ['pat-public', 'sam-private'] },
      { id: '2026-01-02-b', date: '2026-01-02', text: 'Sam Private added.', people: ['sam-private'] },
    ]);
    w('history.json', { months: { '2026-01': { date: '2026-01-31', pull: { 'pat-public': 40, 'sam-private': 9 }, first: {} } } });
    const { payload, dropped } = publicPayload(root);
    expect(payload.people.map((f: { slug: string }) => f.slug)).toEqual(['pat-public']);
    const pat = payload.people[0].data;
    expect(pat.connections.map((c: { slug: string }) => c.slug)).toEqual(['ann-other']);
    expect(pat.notes).toBe('Researched in 2026. Lean checked.');
    expect(payload.updates).toEqual([{ id: '2026-01-01-a', date: '2026-01-01', text: 'Pat Public refreshed.', people: ['pat-public'] }]);
    expect(payload.history['2026-01'].pull).toEqual({ 'pat-public': 40 });
    expect(leaks(payload, dropped)).toEqual([]);
    // And the check catches what the filter would have missed.
    expect(leaks({ ...payload, extra: { slug: 'sam-private' } }, dropped)).toEqual(['slug sam-private']);
    expect(leaks({ ...payload, extra: 'Thanks to Sam Private' }, dropped)).toEqual(['name "Sam Private"']);
  });
});

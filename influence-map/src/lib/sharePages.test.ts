import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicPayload } from '../../scripts/lib/public-data.mjs';
import { previewOf, sharePage } from '../../scripts/lib/share-pages.mjs';

const SITE = 'https://example.org/site/';

describe('share pages (link previews on the public site)', () => {
  it('gives a person a preview with their name, role and photo, then opens them on the map', () => {
    const p = previewOf(
      {
        slug: 'jane-doe',
        data: { name: 'Jane "J" Doe', current_role: 'Senator <R>', connections: [{}, {}], photo: { file: 'jane-doe.jpg', credit: 'A Photographer', license: 'CC BY 2.0' } },
      },
      SITE,
    );
    expect(p.url).toBe('https://example.org/site/p/jane-doe/');
    expect(p.image).toBe('https://example.org/site/map/photos/jane-doe.jpg');
    expect(p.description).toBe('Senator <R>. 2 sourced ties on the Influence Map.');
    const html = sharePage(p);
    expect(html).toContain('<meta property="og:title" content="Jane &quot;J&quot; Doe · Influence Map" />');
    expect(html).toContain('Senator &lt;R&gt;');
    expect(html).toContain('location.replace("../../map/?p=jane-doe"');
    // The license asks for credit wherever the photo is shown.
    expect(html).toContain('Photo: A Photographer, CC BY 2.0');
  });

  it('falls back to the site card when there is no photo', () => {
    const p = previewOf({ slug: 'some-pac', data: { name: 'Some PAC', summary: 'A super PAC.', connections: [] } }, SITE);
    expect(p.image).toBe('https://example.org/site/og.png');
    expect(p.large).toBe(true);
  });

  it('only makes pages for files in the public payload', () => {
    const { payload, dropped } = publicPayload(join(__dirname, '..', '..'));
    const slugs = new Set([...payload.people, ...payload.orgs].map((f: { slug: string }) => f.slug));
    for (const d of dropped) expect(slugs.has(d.slug)).toBe(false);
  });
});

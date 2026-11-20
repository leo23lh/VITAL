import { describe, expect, it } from 'vitest';
import { landingPage, usd } from '../../scripts/lib/landing.mjs';

const data = {
  site: 'https://example.org/site/',
  updated: '2026-11-20',
  counts: { people: 289, ties: 955, sources: 3894, orgs: 26 },
  pull: [{ slug: 'eric-trump', name: 'Eric Trump', role: 'Executive <VP>', score: 90 }],
  contenders: [{ slug: 'jd-vance', name: 'JD Vance', side: 'R', camp: 12, leaning: 35 }],
  factions: { count: 8, names: ["Trump's inner circle"] },
  rift: { a: { slug: 'a', name: 'A' }, b: { slug: 'b', name: 'B' }, score: 83, label: 'High', reason: 'A reason' },
  donors: [{ slug: 'elon-musk', name: 'Elon Musk', usd: 445500000, cycle: 2026 }],
  updates: [{ date: '2026-11-20', text: 'Something & more', people: [{ slug: 'ron-klain', name: 'Ron Klain' }] }],
};

describe('landing page (public site front page)', () => {
  it('links people, views and the map under map/, and escapes text', () => {
    const html = landingPage(data);
    expect(html).toContain('href="map/?p=eric-trump"');
    expect(html).toContain('href="map/?view=pull"');
    expect(html).toContain('href="map/"');
    expect(html).toContain('Executive &lt;VP&gt;');
    expect(html).toContain('Something &amp; more');
    expect(html).toContain('<meta property="og:url" content="https://example.org/site/" />');
  });

  it('forwards old links that opened the map at the root', () => {
    expect(landingPage(data)).toContain("location.replace('map/' + location.search + location.hash)");
  });

  it('writes money short', () => {
    expect(usd(445500000)).toBe('$445.5M');
    expect(usd(2_000_000_000)).toBe('$2B');
    expect(usd(25000)).toBe('$25K');
  });
});

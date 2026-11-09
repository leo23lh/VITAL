import { describe, expect, it } from 'vitest';
import { evidenceOf, publisherOf } from './evidence';
import { buildGraph, mergePairs } from './graph';
import type { Person, PersonFile } from './schema';

const u = (...urls: string[]) => urls.map((url) => ({ url }));

describe('publisherOf', () => {
  it('classifies hosts by tier', () => {
    expect(publisherOf('https://www.dol.gov/agencies/x')).toEqual({ domain: 'dol.gov', tier: 'record' });
    expect(publisherOf('https://hawley.senate.gov/x')?.tier).toBe('record');
    expect(publisherOf('https://www.gov.uk/x')?.tier).toBe('record');
    expect(publisherOf('https://www.jcs.mil/x')?.tier).toBe('record');
    expect(publisherOf('https://en.wikipedia.org/wiki/X')).toEqual({ domain: 'wikipedia.org', tier: 'reference' });
    expect(publisherOf('https://www.axios.com/x')?.tier).toBe('news');
    expect(publisherOf('https://www.breitbart.com/x')?.tier).toBe('news');
    expect(publisherOf('https://www.kvia.com/x')?.tier).toBe('news');
    expect(publisherOf('https://www.desmog.com/x')?.tier).toBe('other');
    expect(publisherOf('https://someone.substack.com/p/x')?.tier).toBe('other');
    expect(publisherOf('user-provided')?.tier).toBe('record');
    expect(publisherOf('not a url')).toBeNull();
  });

  it('merges subdomains and sister brands into one publisher', () => {
    expect(publisherOf('https://m.washingtontimes.com/x')?.domain).toBe('washingtontimes.com');
    expect(publisherOf('https://digital-release.thehill.com/x')?.domain).toBe('thehill.com');
    expect(publisherOf('https://abcnews.go.com/x')?.domain).toBe('abcnews.com');
    expect(publisherOf('https://www.bnnbloomberg.ca/x')?.domain).toBe('bloomberg.com');
    expect(publisherOf('https://www.huffingtonpost.co.uk/x')?.domain).toBe('huffpost.com');
  });

  it("treats an organization's own site as the record for ties to it", () => {
    expect(publisherOf('https://openai.com/news/x')?.tier).toBe('other');
    expect(publisherOf('https://openai.com/news/x', ['sam-altman', 'openai'])?.tier).toBe('record');
    expect(publisherOf('https://www.foxnews.com/x', ['fox-news', 'someone'])?.tier).toBe('record');
  });
});

describe('evidenceOf', () => {
  it('grades by independent publishers', () => {
    const one = evidenceOf(u('https://axios.com/a'));
    expect(one.grade).toBe('thin');
    expect(one.cap).toBe(0.8);
    expect(one.note).toBe('1 source (news outlet)');

    expect(evidenceOf(u('https://en.wikipedia.org/wiki/A')).cap).toBe(0.75);
    expect(evidenceOf(u('https://desmog.com/a')).cap).toBe(0.7);

    // The same outlet twice is still one source.
    expect(evidenceOf(u('https://axios.com/a', 'https://www.axios.com/b')).grade).toBe('thin');

    const wikiPlusNews = evidenceOf(u('https://en.wikipedia.org/wiki/A', 'https://axios.com/a'));
    expect(wikiPlusNews.grade).toBe('solid');
    expect(wikiPlusNews.cap).toBe(0.9);

    const twoNews = evidenceOf(u('https://axios.com/a', 'https://foxnews.com/a'));
    expect(twoNews.grade).toBe('strong');
    expect(twoNews.cap).toBe(1);
    expect(twoNews.note).toBe('2 independent sources');

    const record = evidenceOf(u('https://www.state.gov/bio'));
    expect(record.grade).toBe('strong');
    expect(evidenceOf(u('https://www.state.gov/bio', 'https://axios.com/a')).note).toBe('2 independent sources (1 official record)');

    expect(evidenceOf(u('https://desmog.com/a', 'https://heritage.org/a')).grade).toBe('solid');
    expect(evidenceOf([]).grade).toBe('none');
    expect(evidenceOf(undefined).cap).toBe(0.5);
  });
});

describe('evidence in the graph', () => {
  const person = (slug: string, connections: Person['connections']): PersonFile => ({
    slug,
    file: `${slug}.json`,
    data: { name: slug, public_figure: true, connections },
  });
  const conn = (slug: string, relationship_type: string, sources: { url: string }[]) => ({
    name: slug,
    slug,
    relationship_type,
    confidence: 0.95,
    sources,
  });

  it('pools the sources of both files and holds confidence to what they carry', () => {
    const g = buildGraph([
      person('a', [conn('b', 'ally', u('https://axios.com/1')), conn('c', 'ally', u('https://axios.com/2'))]),
      person('b', [conn('a', 'ally', u('https://foxnews.com/1'))]),
      person('c', [conn('a', 'ally', u('https://axios.com/2'))]),
    ]);
    const ab = g.links.find((l) => l.id === 'ally:a|b')!;
    const ac = g.links.find((l) => l.id === 'ally:a|c')!;
    expect(ab.evidence.grade).toBe('strong');
    expect(ab.confidence).toBe(0.95);
    expect(ac.evidence.grade).toBe('thin');
    expect(ac.confidence).toBe(0.8);
    const pairs = mergePairs(g.links);
    expect(pairs.find((p) => p.id === 'a|b')!.thin).toBe(false);
    expect(pairs.find((p) => p.id === 'a|c')!.thin).toBe(true);
  });

  it('does not mark a pair thin when one of its links is well documented', () => {
    const g = buildGraph([
      person('a', [conn('b', 'ally', u('https://axios.com/1')), conn('b', 'employee', u('https://www.dol.gov/1'))]),
      person('b', [conn('a', 'ally', u('https://axios.com/1')), conn('a', 'employer', u('https://www.dol.gov/1'))]),
    ]);
    expect(mergePairs(g.links)[0].thin).toBe(false);
  });
});

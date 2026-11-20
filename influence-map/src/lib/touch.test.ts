import { describe, expect, it } from 'vitest';
import { isCleanTap, pickAt, toSegment } from './touch';

describe('isCleanTap', () => {
  it('accepts one quick, still finger only', () => {
    expect(isCleanTap({ maxPointers: 1, travel: 4, ms: 120 })).toBe(true);
    expect(isCleanTap({ maxPointers: 1, travel: 25, ms: 120 })).toBe(false); // a pan
    expect(isCleanTap({ maxPointers: 2, travel: 2, ms: 120 })).toBe(false); // a pinch
    expect(isCleanTap({ maxPointers: 1, travel: 2, ms: 900 })).toBe(false); // a long press
  });
});

describe('pickAt', () => {
  type N = { id: string; x: number; y: number; r: number };
  type L = { id: string; a: N; b: N };
  const a = { id: 'a', x: 0, y: 0, r: 10 };
  const b = { id: 'b', x: 200, y: 0, r: 10 };
  const c = { id: 'c', x: 40, y: 0, r: 5 };
  const nodes = [a, b, c];
  const links: L[] = [{ id: 'ab', a, b }];
  const pick = (x: number, y: number) =>
    pickAt({ x, y }, nodes, links, (n) => n, (n) => n.r, (l) => [l.a, l.b]);

  it('picks the nearest dot within finger reach, edge to edge', () => {
    expect(pick(22, 0)).toEqual({ kind: 'node', node: a }); // 12 from a's edge, 13 from c's
    expect(pick(30, 0)).toEqual({ kind: 'node', node: c });
    expect(pick(0, 23)).toEqual({ kind: 'node', node: a });
  });
  it('picks a line only when right on it and no dot is near', () => {
    expect(pick(120, 5)).toEqual({ kind: 'link', link: links[0] });
    expect(pick(120, 12)).toBeNull();
  });
  it('measures distance to a segment, not the whole line', () => {
    expect(toSegment({ x: -30, y: 40 }, { x: 0, y: 0 }, { x: 100, y: 0 })).toBe(50);
  });
});

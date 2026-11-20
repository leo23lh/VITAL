import { describe, expect, it } from 'vitest';
import { baseline, cleanHistory, monthLabel, pullTrend } from './trends';

describe('trends', () => {
  const history = cleanHistory({
    '2026-12': { date: '2026-12-06', pull: { a: 50, b: 40 } },
    '2026-11': { date: '2026-11-11', pull: { a: 45, b: 41 } },
    bad: { date: 'x', pull: {} },
  });

  it('reads the history file or database documents, oldest first', () => {
    expect(history.map((s) => s.month)).toEqual(['2026-11', '2026-12']);
    expect(cleanHistory([{ month: '2026-11', date: '2026-11-11', pull: { a: 1 } }])).toHaveLength(1);
    expect(cleanHistory(null)).toEqual([]);
  });

  it('compares against the latest snapshot from an earlier month', () => {
    expect(baseline(history, new Date('2026-12-20'))?.month).toBe('2026-11');
    expect(baseline(history, new Date('2027-01-05'))?.month).toBe('2026-12');
    expect(baseline(history, new Date('2026-11-30'))).toBeNull();
  });

  it('ignores small moves and people not in the snapshot', () => {
    const base = baseline(history, new Date('2026-12-20'));
    expect(pullTrend('a', 52, base)).toMatchObject({ delta: 7 });
    expect(pullTrend('b', 39, base)).toBeNull();
    expect(pullTrend('b', 36, base)?.delta).toBe(-5);
    expect(pullTrend('c', 80, base)).toBeNull();
    expect(monthLabel('2026-11')).toBe('Nov 2026');
  });
});

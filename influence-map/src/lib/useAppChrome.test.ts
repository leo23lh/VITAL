import { describe, expect, it } from 'vitest';
import { firstVisitSeen } from './useAppChrome';

const now = Date.parse('2026-11-20T12:00:00Z');
const day = (d: string) => ({ date: d });

describe('firstVisitSeen', () => {
  it('counts only the last two weeks as new on a first visit', () => {
    const updates = [day('2026-11-20'), day('2026-11-19'), day('2026-11-01'), day('2026-10-20')];
    // Two entries are within 14 days, so a newcomer sees 2 unread, not 4.
    expect(updates.length - firstVisitSeen(updates, now)).toBe(2);
  });

  it('caps the first-visit count at five', () => {
    const updates = Array.from({ length: 9 }, () => day('2026-11-18'));
    expect(updates.length - firstVisitSeen(updates, now)).toBe(5);
  });

  it('shows nothing new when the feed has been quiet', () => {
    const updates = [day('2026-09-01'), day('2026-08-01')];
    expect(firstVisitSeen(updates, now)).toBe(2);
  });
});

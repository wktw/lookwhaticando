/**
 * Check-in days per habit over a span (DESIGN §9.2; the Sunday Note, the Herbarium page and the
 * Season Review size what they say by them). Apart from `insights.ts`, which re-exports it, because
 * the letters are written on every open and the rest of the insights are only the Progress
 * screen's: kept apart, they stay out of the first-paint chunk.
 */
import type { DateKey } from '@/state/types';
import { inLifetime, logStatus, showedUp } from './activity';
import { logsFor, type Tracking } from './consistency';
import { isDateKey } from './dates';
import { ruleAt } from './rules';

export interface CheckinCount {
  /** Days showing up (done or tiny). */
  checkins: number;
  tiny: number;
}

/**
 * Check-in days per habit in [start, min(end, today)], inside each habit's lifetime (archived
 * habits included). Habits without check-ins are listed with zeros.
 */
export function checkinCounts(t: Tracking, start: DateKey, end: DateKey, today: DateKey): Record<string, CheckinCount> {
  const last = end < today ? end : today;
  const out: Record<string, CheckinCount> = {};
  for (const h of t.habits) {
    const c: CheckinCount = { checkins: 0, tiny: 0 };
    for (const [date, log] of Object.entries(logsFor(t, h.id))) {
      if (date < start || date > last || !inLifetime(h, date) || !isDateKey(date)) continue;
      const s = logStatus(log, ruleAt(h, date), date < today);
      if (showedUp(s)) c.checkins++;
      if (s === 'tiny') c.tiny++;
    }
    out[h.id] = c;
  }
  return out;
}

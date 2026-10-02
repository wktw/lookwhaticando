import { describe, expect, it } from 'vitest';
import * as habits from '@/domain/habits';
import * as logging from '@/domain/logging';
import type { AppState, Letter } from '@/state/types';
import { validateState } from '@/state/validate';
import { Game } from './game';

const DAY = '2025-09-29';
const quote = (id: string, habitId: string, date = DAY): Letter => ({ kind: 'weekly', id, weekStart: DAY, achieved: 1, expected: 1, stars: 1, showUpDays: 1, newFriends: [], plantsGrown: [], quote: { habitId, date, text: 'The first line.' } });
function archived() {
  const g = new Game({ start: DAY });
  const id = g.addHabit();
  g.checkIn(id);
  g.run((tx) => logging.setNote(tx, id, DAY, 'The first line.'));
  g.run((tx) => logging.starNote(tx, id, DAY, true));
  g.advance();
  g.run((tx) => habits.archiveHabit(tx, id));
  g.goTo('2026-09-29');
  return { g, id };
}
function withoutNotes(s: AppState) {
  const clone = structuredClone(s);
  for (const logs of Object.values(clone.logs)) for (const log of Object.values(logs)) { delete log.note; delete log.starred; }
  return JSON.stringify(clone);
}

describe('old notes (WP-C6)', () => {
  it('accepts editing and removing a year-old archived note without changing any non-note history', () => {
    const { g, id } = archived();
    const before = withoutNotes(g.state);
    expect(g.run((tx) => logging.setNote(tx, id, DAY, 'Corrected.'))).toBe(true);
    expect(g.state.logs[id]?.[DAY]).toMatchObject({ note: 'Corrected.', starred: true });
    expect(withoutNotes(g.state)).toBe(before);
    expect(g.last).toEqual([]);
    expect(g.run((tx) => logging.setNote(tx, id, DAY, ''))).toBe(true);
    expect(g.state.logs[id]?.[DAY]).not.toHaveProperty('note');
    expect(g.state.logs[id]?.[DAY]).not.toHaveProperty('starred');
    expect(withoutNotes(g.state)).toBe(before);
    expect(g.last).toEqual([]);
  });

  it('deletes a note-only day instead of leaving an empty log', () => {
    const g = new Game({ start: DAY });
    const id = g.addHabit();
    g.run((tx) => logging.setNote(tx, id, DAY, 'One line.'));
    g.run((tx) => logging.starNote(tx, id, DAY, true));
    g.run((tx) => logging.setNote(tx, id, DAY, ''));
    expect(g.state.logs[id]).not.toHaveProperty(DAY);
  });

  it.each(['e\u0301', '👩🏽‍🌾', '🇬🇧'])('keeps 280 complete graphemes at the cap: %s', (cluster) => {
    const g = new Game({ start: DAY });
    const id = g.addHabit();
    g.run((tx) => logging.setNote(tx, id, DAY, cluster.repeat(281)));
    expect(g.state.logs[id]?.[DAY]?.note).toBe(cluster.repeat(280));
    expect(validateState(g.state).ok).toBe(true);
  });

  it('removes all matching Sunday quotes only when requested, leaving other dates and habits untouched', () => {
    const { g, id } = archived();
    g.run((tx) => tx.set('inbox', [quote('a', id), quote('b', id), quote('c', id, '2025-09-30'), quote('d', 'other')]));
    const before = g.state.inbox;
    g.run((tx) => logging.setNote(tx, id, DAY, 'Changed.'));
    expect(g.state.inbox).toBe(before);
    // The optional removal follows the stored reference, even when the frozen quote has older text.
    g.run((tx) => logging.setNote(tx, id, DAY, '', { removeQuotes: true }));
    expect(g.state.inbox[0]).not.toHaveProperty('quote');
    expect(g.state.inbox[1]).not.toHaveProperty('quote');
    expect(g.state.inbox[2]).toBe(before[2]);
    expect(g.state.inbox[3]).toBe(before[3]);
    expect(before[0]).toHaveProperty('quote');
    const { quote: _q, ...rest } = before[0] as Extract<Letter, { kind: 'weekly' }>;
    expect(g.state.inbox[0]).toEqual(rest);
  });

  it('leaves frozen quotes when removal is not chosen, and refuses an invalid target without touching quotes', () => {
    const { g, id } = archived();
    g.run((tx) => tx.set('inbox', [quote('a', id)]));
    const before = g.state.inbox;
    g.run((tx) => logging.setNote(tx, id, DAY, ''));
    expect(g.state.inbox).toBe(before);
    expect(g.run((tx) => logging.setNote(tx, 'gone', DAY, '', { removeQuotes: true }))).toBe(false);
    expect(g.state.inbox).toBe(before);
  });
});

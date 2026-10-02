import { expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { lookChoiceOffer, confirmPlantLook, eligibleTimes } from '@/domain/signature';
import { Game } from './game';

it('waits for Blooming even after ten completed night occurrences, then offers the same faithful gardener a choice', () => {
  const g = new Game({ start: '2026-01-01' });
  const id = g.addHabit({ plant: 'begonia' });
  for (let i = 0; i < 10; i++) { g.goTo(addDays('2026-01-01', i), 23, 30); g.checkIn(id); }
  expect(g.state.ledger.bestStage[id]).toBeLessThan(5);
  expect(eligibleTimes(g.state, g.state.habits[0]!, g.today, g.local)).toEqual([]);
  expect(lookChoiceOffer(g.state, g.state.habits[0]!, g.today)).toBe(false);
  expect(g.run((tx) => confirmPlantLook(tx, id, 'dawn'))).toBe(false);
  for (let i = 10; i < 50; i++) { g.goTo(addDays('2026-01-01', i), 23, 30); g.checkIn(id); }
  expect(g.state.ledger.bestStage[id]).toBeGreaterThanOrEqual(5);
  expect(lookChoiceOffer(g.state, g.state.habits[0]!, g.today)).toBe(true);
});

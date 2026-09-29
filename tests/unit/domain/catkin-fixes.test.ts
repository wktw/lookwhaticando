/**
 * Regression tests for the fixes to the adversarial catkin findings ("domain: fix adversarial catkin
 * findings"): the edges of each fix that the adversarial tests themselves don't pin down.
 */
import { describe, expect, it } from 'vitest';
import * as company from '@/domain/company';
import { dayNumber } from '@/domain/dates';
import { onceKeyExpired, perfectDayStatus } from '@/domain/economy';
import { newPetState } from '@/domain/friendship';
import * as habits from '@/domain/habits';
import { isPausedOn } from '@/domain/pauses';
import { updateSettings } from '@/domain/profile';
import { applyFreshStart } from '@/domain/seasonReview';
import { Game } from './game';

const CAT = 'pet-cat-tortie';

function withPet(g: Game, id = CAT): string {
  g.state = { ...g.state, pets: { ...g.state.pets, [id]: newPetState(id, g.rng, g.now, g.today, true) } };
  return id;
}

describe('companion XP for flexible rules: one payment per place in the period', () => {
  it('3 a week: three check-ins on three days pay three times; moving one pays nothing; a 4th is beyond `times`', () => {
    const g = new Game({ start: '2026-09-07' }); // a Monday
    g.run((tx) => updateSettings(tx, { weekStart: 1 }));
    const run = g.addHabit({ name: 'Run', icon: 'run', schedule: { kind: 'weekly', times: 3, every: 1 } });
    const cat = withPet(g);
    g.run((tx) => company.setCompanion(tx, run, cat));
    const xp = company.companionXpFor({ schedule: { kind: 'weekly', times: 3, every: 1 } });
    g.checkIn(run);
    g.advance(1);
    g.checkIn(run);
    g.advance(1);
    g.checkIn(run);
    expect(g.allOf('companionXp').map((e) => e.date)).toEqual(['2026-09-07', '2026-09-08', '2026-09-09']);
    expect(g.state.pets[cat]!.xp).toBe(3 * xp);
    g.advance(1);
    g.undo(run, '2026-09-09');
    g.checkIn(run); // Thursday takes Wednesday's place: still three in the week
    g.advance(1);
    g.checkIn(run); // Friday: a 4th, beyond `times`
    expect(g.allOf('companionXp')).toHaveLength(3);
    expect(g.state.pets[cat]!.xp).toBe(3 * xp);
  });

  it('changing the week start regroups the days but can’t pay the moved occurrence again', () => {
    const g = new Game({ start: '2026-09-07' }); // a Monday
    g.run((tx) => updateSettings(tx, { weekStart: 1 }));
    const yoga = g.addHabit({ name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 1, every: 1 } });
    const cat = withPet(g);
    g.run((tx) => company.setCompanion(tx, yoga, cat));
    g.checkIn(yoga);
    expect(g.allOf('companionXp')).toHaveLength(1);
    g.advance(1);
    g.undo(yoga, '2026-09-07');
    g.run((tx) => updateSettings(tx, { weekStart: 0 })); // Sun Sep 6 – Sat Sep 12 now
    g.checkIn(yoga);
    expect(g.allOf('companionXp')).toHaveLength(1);
  });

  it('a new week is a new occurrence', () => {
    const g = new Game({ start: '2026-09-07' });
    g.run((tx) => updateSettings(tx, { weekStart: 1 }));
    const yoga = g.addHabit({ name: 'Yoga', icon: 'yoga', schedule: { kind: 'weekly', times: 1, every: 1 } });
    const cat = withPet(g);
    g.run((tx) => company.setCompanion(tx, yoga, cat));
    g.checkIn(yoga);
    g.goTo('2026-09-14', 9);
    g.checkIn(yoga);
    expect(g.allOf('companionXp').map((e) => e.date)).toEqual(['2026-09-07', '2026-09-14']);
  });

  it('a rule switch doesn’t starve the new rule: a monthly check-in paid on Sep 1 doesn’t count against a later week', () => {
    const g = new Game({ start: '2026-09-01' });
    g.run((tx) => updateSettings(tx, { weekStart: 1 }));
    const budget = g.addHabit({ name: 'Budget', icon: 'piggy-bank', schedule: { kind: 'monthly', times: 1, every: 1 } });
    const cat = withPet(g);
    g.run((tx) => company.setCompanion(tx, budget, cat));
    g.goTo('2026-09-02', 9);
    g.checkIn(budget);
    g.goTo('2026-09-08', 9); // Tuesday of the week of Sep 7
    g.run((tx) => habits.updateHabit(tx, budget, { schedule: { kind: 'weekly', times: 1, every: 1 } }, 'today'));
    g.checkIn(budget);
    expect(g.allOf('companionXp').map((e) => e.date)).toEqual(['2026-09-02', '2026-09-08']);
  });

  it('a flexible occurrence key lives while its period can still take a rewardable check-in', () => {
    const g = new Game({ start: '2026-09-20' });
    const key = 'company|h1|2026-09-01|2026-09-03';
    const end = dayNumber('2026-09-30');
    expect(onceKeyExpired(g.state, key, end, '2026-09-20')).toBe(false); // mid-month, 19 days after its start
    expect(onceKeyExpired(g.state, key, end, '2026-10-13')).toBe(false);
    expect(onceKeyExpired(g.state, key, end, '2026-10-14')).toBe(true);
    // Day-based keys keep their one-week rule.
    expect(onceKeyExpired(g.state, 'company|h1|2026-09-12', true, '2026-09-20')).toBe(true);
    expect(onceKeyExpired(g.state, 'company|h1|2026-09-13', true, '2026-09-20')).toBe(false);
  });
});

describe('day-end tiny pays companion XP once', () => {
  it('a later live top-up of the same day to full pays nothing more', () => {
    const g = new Game({ start: '2026-03-02' });
    const water = g.addHabit({ name: 'Water', icon: 'water', target: 4, tiny: { label: '2 glasses', count: 2 } });
    const cat = withPet(g);
    g.run((tx) => company.setCompanion(tx, water, cat));
    g.goTo('2026-03-03', 9);
    g.checkIn(water);
    g.checkIn(water);
    g.goTo('2026-03-04', 9); // day-end tiny for Mar 3
    expect(g.allOf('companionXp').map((e) => e.date)).toEqual(['2026-03-03']);
    g.checkIn(water, '2026-03-03');
    g.checkIn(water, '2026-03-03'); // 4 of 4: full
    expect(g.state.ledger.recent[`${water}|2026-03-03`]!.lvl).toBe('full');
    expect(g.allOf('companionXp')).toHaveLength(1);
    expect(g.allOf('story').length).toBeLessThanOrEqual(1);
  });
});

describe('restoring after Finish', () => {
  it('without a paid perfect day the restored habit is due today, as before', () => {
    const g = new Game({ start: '2026-09-01' });
    const [a, c] = ['A', 'C'].map((name) => g.addHabit({ name })) as [string, string];
    g.advance(1);
    g.run((tx) => ({ o: applyFreshStart(tx, [{ habitId: c, choice: 'finish' }]) }));
    g.run((tx) => habits.restoreHabit(tx, c));
    const h = g.state.habits.find((x) => x.id === c)!;
    expect(isPausedOn(h.pauses, g.today)).toBe(false);
    expect(perfectDayStatus(g.state, g.today, g.today).scheduled).toBe(2);
    void a;
  });

  it('with a paid perfect day the restored habit rests today and is back tomorrow', () => {
    const g = new Game({ start: '2026-09-01' });
    const [a, b, c] = ['A', 'B', 'C'].map((name) => g.addHabit({ name })) as [string, string, string];
    g.advance(1);
    g.run((tx) => ({ o: applyFreshStart(tx, [{ habitId: c, choice: 'finish' }]) }));
    g.checkIn(a);
    g.checkIn(b);
    expect(g.state.lifetime.perfectDays).toBe(1);
    g.run((tx) => habits.restoreHabit(tx, c));
    const h = g.state.habits.find((x) => x.id === c)!;
    expect(isPausedOn(h.pauses, g.today)).toBe(true);
    g.advance(1);
    expect(isPausedOn(g.state.habits.find((x) => x.id === c)!.pauses, g.today)).toBe(false);
  });
});

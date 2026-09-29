/**
 * Adversarial spec-fidelity review of the catkin logic layer (stage A f6ed7ea, stage B 57c0faa)
 * against docs/DESIGN.md §5, §6, §8, §13 and §14, line by line. Every test here encodes the bible's
 * text and is marked [FAILS]: it is evidence of a defect, kept on purpose. The implementation is not
 * changed here.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import * as company from '@/domain/company';
import { addDays } from '@/domain/dates';
import { newPetState } from '@/domain/friendship';
import { hemisphereOf, inferHemisphere } from '@/domain/hemisphere';
import { birthdayCards } from '@/domain/rituals';
import { seasonAt } from '@/domain/seasonReview';
import { eligibleTimes, timeNudge } from '@/domain/signature';
import { currentBlock } from '@/state/views/today';
import { Game, at } from '../game';

vi.setConfig({ testTimeout: 30_000 });

const habitOf = (s: AppState, id: string) => s.habits.find((h) => h.id === id)!;

/** Adds a pet to the save (test setup: as if it came from a capsule). */
function addPet(g: Game, id: string, out = true): string {
  g.state = { ...g.state, pets: { ...g.state.pets, [id]: newPetState(id, g.rng, g.now, g.today, out) } };
  return id;
}

/* ------------------------------------------------------------------ */
/* §14.3 Hemisphere-correct seasons, inferred from the time zone        */
/* ------------------------------------------------------------------ */

describe('§14.3 "Hemisphere-correct seasons (\'Where\'s your summer?\', inferred from the time zone …)"', () => {
  it('[FAILS] the zone id a device in Córdoba, Mendoza, Jujuy or Catamarca actually reports reads as south', () => {
    // The store reads Intl.DateTimeFormat().resolvedOptions().timeZone (store.ts). ICU/CLDR report
    // the canonical short ids for these Argentine cities, not the America/Argentina/* spellings, so
    // the prefix list never sees them. Córdoba is Argentina's second city (31°S).
    const reported = ['America/Argentina/Cordoba', 'America/Argentina/Mendoza', 'America/Argentina/Jujuy', 'America/Argentina/Catamarca'].map(
      (iana) => new Intl.DateTimeFormat('en', { timeZone: iana }).resolvedOptions().timeZone,
    );
    const north = reported.filter((tz) => inferHemisphere(tz) !== 'south');
    // Observed: ['America/Cordoba', 'America/Mendoza', 'America/Jujuy', 'America/Catamarca'] read as north.
    expect(north).toEqual([]);
    // The same ids spelled directly (what Chrome/Safari hand back today).
    for (const tz of ['America/Cordoba', 'America/Mendoza', 'America/Jujuy', 'America/Catamarca']) expect(inferHemisphere(tz)).toBe('south');
  });

  it('[FAILS] temperate and subtropical southern zones outside the list read as south (tzdata zone.tab latitudes)', () => {
    // Each of these is well clear of the tropics' "reads as north" band the module doc allows.
    const zones: Record<string, number> = {
      'America/Coyhaique': -45.6, // Chile, Aysén (IANA 2025a)
      'Pacific/Pitcairn': -25.1,
      'Pacific/Gambier': -23.1,
      'Pacific/Niue': -19.0,
    };
    const wrong = Object.keys(zones).filter((tz) => inferHemisphere(tz) !== 'south');
    expect(wrong).toEqual([]);
  });

  it('[FAILS] so a Córdoba user with no stored setting gets December as summer, not winter', () => {
    const s = { settings: {} } as Pick<AppState, 'settings'>;
    // Observed: seasonAt(…, 'north') → winter: her Season Review, window scenery and "Rest till next season" run six months off.
    expect(seasonAt('2026-12-15', hemisphereOf(s, 'America/Cordoba')).name).toBe('summer');
  });
});

/* ------------------------------------------------------------------ */
/* §14.2 The classifier drops catch-up bursts (≥ 3 habits within 120 s) */
/* ------------------------------------------------------------------ */

describe('§14.2 "drops catch-up bursts (≥ 3 habits within 120 s)": a burst is measured in time, not per app day', () => {
  it('[FAILS] three habits checked in within 75 s across a 5:00 day start are a burst, all three dropped', () => {
    // dayStartsAt may be 0–360 min (§5.3). With a 5 am start, 04:59 belongs to yesterday's app day
    // and 05:00 to today's, and none of these stamps is in the 23:00–03:59 drop window.
    const g = new Game({ start: '2026-03-02' });
    g.state = { ...g.state, settings: { ...g.state.settings, dayStartsAt: 300 } };
    const [a, b, c] = ['A', 'B', 'C'].map((name) => g.addHabit({ name })) as [string, string, string];
    g.now = at('2026-03-10', 4, 59);
    g.run(() => undefined);
    g.checkIn(a); // 04:59:00 → app day Mar 9
    g.now += 30_000;
    g.checkIn(b); // 04:59:30 → app day Mar 9
    g.now = at('2026-03-10', 5, 0) + 15_000;
    g.run(() => undefined);
    g.checkIn(c); // 05:00:15 → app day Mar 10
    expect(Object.keys(g.state.logs[a]!)).toEqual(['2026-03-09']);
    expect(Object.keys(g.state.logs[c]!)).toEqual(['2026-03-10']);
    const eligible = (id: string) => eligibleTimes(g.state, habitOf(g.state, id), g.today, g.local);
    // Observed: inBurst only compares stamps under the same date key, so each side sees < 3 habits
    // and all three stamps are kept (A and B at 04:59, C at 05:00).
    expect(eligible(a)).toEqual([]);
    expect(eligible(b)).toEqual([]);
    expect(eligible(c)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* §14.2 The mismatch nudge speaks in Today blocks                      */
/* ------------------------------------------------------------------ */

describe('§14.2 "≥ 60% of ≥ 10 eligible days in another Today block": the nudge uses Today\'s own blocks', () => {
  it('[FAILS] an Evening habit always done at 05:00 with a 6:00 day start is in its own block: no "Move it to Morning?"', () => {
    const g = new Game({ start: '2026-03-02' });
    g.state = { ...g.state, settings: { ...g.state.settings, dayStartsAt: 360 } };
    const h = g.addHabit({ name: 'Wind down', timeOfDay: 'evening' });
    for (let i = 0; i < 12; i++) {
      g.now = at(addDays('2026-03-04', i), 5, 0);
      g.run(() => undefined);
      g.checkIn(h);
    }
    // Today files 05:00 under the previous app day's evening (views/today.ts currentBlock).
    expect(currentBlock(5, 360, 0)).toBe('evening');
    // Observed: { from: 'evening', to: 'morning', … } (blockOfMinute ignores the day start), and
    // "move" would put the habit in a Morning block that starts only at 6:00, an hour after she does it.
    expect(timeNudge(g.state, habitOf(g.state, h), g.today, g.local)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* §14.1 Companion XP: once per occurrence, tiny included, reward path  */
/* ------------------------------------------------------------------ */

describe('§14.1 "each completing check-in gives its companion min(30, round(5 × 7/expectedPerWeek)) XP … once per occurrence (tiny included), on the reward path only"', () => {
  it('[FAILS] a count habit that reached its tiny count is paid as tiny at day end: its companion gets that occurrence\'s XP too', () => {
    const g = new Game({ start: '2026-03-02' });
    const water = g.addHabit({ name: 'Water', icon: 'water', target: 8, tiny: { label: '3 glasses', count: 3 } });
    const cat = addPet(g, 'pet-cat-tortie');
    g.run((tx) => company.setCompanion(tx, water, cat));
    g.goTo('2026-03-03', 9);
    g.checkIn(water);
    g.checkIn(water);
    g.checkIn(water); // 3 of 8: the tiny count, recorded as tiny when the day closes
    expect(g.state.pets[cat]!.xp).toBe(0);
    g.goTo('2026-03-04', 9); // the day closes on the reward path (rollover.closeDays)
    const entry = g.state.ledger.recent[`${water}|2026-03-03`]!;
    // The occurrence was rewarded as tiny, and the companion shared its sunshine and watering…
    expect(entry.lvl).toBe('tiny');
    expect(entry.co).toMatchObject({ pet: cat, watered: true });
    // …but no companion XP was paid for it. Observed: xp 0, no companionXp event.
    const xp = company.companionXpFor({ schedule: { kind: 'daily' } });
    expect(g.allOf('companionXp').map((e) => e.date)).toEqual(['2026-03-03']);
    expect(g.state.pets[cat]!.xp).toBe(xp);
  });
});

/* ------------------------------------------------------------------ */
/* §13 Birthday: each pet leaves a one-line card                        */
/* ------------------------------------------------------------------ */

describe('§13 "Birthday (optional): each pet leaves a one-line card"', () => {
  it('[FAILS] every pet leaves a card, not only the ones out on the Shelf', () => {
    const g = new Game({ start: '2026-03-02' });
    addPet(g, 'pet-cat-tortie', true);
    addPet(g, 'pet-cow-jersey', false); // indoors: still her pet
    // Observed: ['pet-cat-tortie'] (birthdayCards filters on inMeadow).
    expect([...birthdayCards(g.state)].sort()).toEqual(['pet-cat-tortie', 'pet-cow-jersey']);
  });
});

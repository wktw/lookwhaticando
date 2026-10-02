/**
 * INV-6, "accepted means usable" (WP-A5, plan §5.6): any state the validator accepts can be shown,
 * exported, round-tripped through JSON and opened, without a throw and without losing data.
 *
 * The corpus (every save a catkin build wrote, tests/fixtures/saves, DEC-E1), a demo, a fresh state
 * and explicit modern history/onboarding fields are shared with the actual DOM renderer sample.
 * A seeded generator (no fast-check, DEC-E2) makes 10,000
 * states from them, each with one to three edits: a value swapped for an adversarial one (a
 * reserved name, a date that is not a date or sits at the edge of the calendar, a number past what
 * a count, a timestamp or a JSON number can be, a long string, the wrong type) or for another
 * part of the same save, a key deleted, or a key added. Every state goes through `decodeState`,
 * which must never throw. Every accepted one goes through the consumers: the view models of every
 * screen (Today, Progress, the Memory shelf, Habit Detail for each habit, the Pet Card for each
 * pet, Capsules, the Shelf, pins, the calendar and year quilt, the Season Review), the ritual words
 * (Sunday Note, Herbarium page, anniversary, season), the CSV and the calendar files, a day opened
 * on it and a note written in it, and the JSON round trip, which must decode to the same state.
 * A sample of them is also opened by the real store (hydrate) from a save written to storage.
 *
 * Set CATKIN_PROPERTY_N to run more (or fewer) generated states, and CATKIN_PROPERTY_SEED for
 * another sequence; the default seed is fixed, so a failure names the case that reproduces it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { appDayKey, monotonicDayKey } from '@/domain/dates';
import { setNote } from '@/domain/logging';
import { wateringTimeIcs, wateringsCsv } from '@/domain/profile';
import { mulberry32 } from '@/domain/rng';
import { openDay } from '@/domain/rollover';
import { transact } from '@/domain/tx';
import { ritualLookup } from '@/features/rituals/lookup';
import { anniversaryWords, herbariumWords, seasonWords, sundayNoteWords } from '@/features/rituals/words';
import { decodeState } from '@/state/decode';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { calendarMonthVM, yearQuiltVM } from '@/state/views/calendar';
import { capsulesVM, collectionVM, walletVM, wishListVM } from '@/state/views/capsules';
import type { ViewEnv } from '@/state/views/common';
import { petCompanyVM } from '@/state/views/company';
import { habitDetailVM } from '@/state/views/habit';
import { badgesVM, memoryShelfVM, petVM, petsVM, shelfVM } from '@/state/views/pets';
import { progressVM } from '@/state/views/progress';
import { seasonReviewVM, tuneVM } from '@/state/views/season';
import { todayVM } from '@/state/views/today';
import { machineStatusOf } from '@/state/store';
import { UTC, at } from '../domain/game';
import { fakeBrowser } from './fixtures';
import { acceptedSeeds, adversarialCase } from './acceptedSeeds';

vi.setConfig({ testTimeout: 600_000 });

const N = Number(process.env.CATKIN_PROPERTY_N ?? 10_000);
const SEED = Number(process.env.CATKIN_PROPERTY_SEED ?? 20260930);
const HYDRATE_EVERY = 25;
const TODAY = '2026-09-29';
const NOW = at(TODAY, 21, 45);
const SEEDS = acceptedSeeds().map(({ state }) => state);

/* ------------------------------------------------------------------ */
/* The consumers                                                        */
/* ------------------------------------------------------------------ */

function viewEnv(s: AppState): ViewEnv {
  return { today: monotonicDayKey(appDayKey(NOW, s.settings.dayStartsAt, UTC), s.clock.maxDateKey), now: NOW, local: UTC };
}

/** Everything that reads a state; throws on the first consumer that does. */
function consume(s: AppState): void {
  const env = viewEnv(s);
  const today = env.today;
  todayVM(s, env);
  progressVM(s, env);
  const shelf = memoryShelfVM(s);
  const look = ritualLookup(s);
  for (const r of shelf.items) {
    if (r.kind === 'sundayNote') sundayNoteWords(r, look);
    else if (r.kind === 'herbarium') herbariumWords(r, look);
    else anniversaryWords(r, look);
  }
  for (const season of shelf.seasons) seasonWords(season, look);
  if (s.seasons?.pending) seasonWords(s.seasons.pending, look);
  for (const h of s.habits) habitDetailVM(s, env, h.id);
  for (const id of Object.keys(s.pets)) {
    petVM(s, env, id);
    petCompanyVM(s, env, id);
  }
  petsVM(s);
  shelfVM(s);
  badgesVM(s);
  walletVM(s);
  collectionVM(s);
  wishListVM(s, env);
  capsulesVM(s, env, (id) => machineStatusOf(s, today, id));
  calendarMonthVM(s, env, null, today.slice(0, 7));
  yearQuiltVM(s, env, Number(today.slice(0, 4)));
  seasonReviewVM(s, env);
  tuneVM(s, env);
  wateringsCsv(s, today);
  for (const slot of ['morning', 'midday', 'evening'] as const) {
    const time = s.settings.reminders[slot];
    if (time) wateringTimeIcs(slot, time, s.habits.map((h) => h.name), { startDate: today, now: NOW });
  }
  // A day opened on it, and a note written in it: the result is still a good save that JSON keeps.
  const opened = transact(s, { now: NOW, today, local: UTC, rng: mulberry32(7) }, (tx) => {
    openDay(tx);
    const h = tx.s.habits.find((x) => x.archivedOn === undefined && x.startedOn <= today);
    if (h) setNote(tx, h.id, today, 'kept');
    return {};
  });
  const round = JSON.parse(JSON.stringify(opened.state)) as AppState;
  expect(round).toEqual(opened.state);
  const again = decodeState(round, 'current');
  if (again.kind !== 'ok') throw new Error(`a day opened on an accepted state no longer decodes: ${again.kind === 'corrupt' ? again.errors.join('; ') : again.kind}`);
}

afterEach(() => {
  store.configureStore({ locks: null });
});

describe('INV-6: an accepted state is a usable state', () => {
  it('the seeds (the corpus, a demo sill, a fresh profile) are accepted and usable', () => {
    expect(SEEDS.length).toBeGreaterThan(10);
    for (const s of SEEDS) {
      expect(decodeState(s, 'import').kind).toBe('ok');
      consume(s);
    }
  });

  it(`${N} generated states: decoding never throws, and every accepted one survives every consumer, JSON and a reload`, async () => {
    const rng = mulberry32(SEED);
    let accepted = 0;
    let hydrated = 0;
    const failures: string[] = [];
    const machines = MACHINES.length;
    expect(machines).toBeGreaterThan(0);
    for (let i = 0; i < N && failures.length < 5; i++) {
      // Let the worker answer its runner now and then (a long synchronous loop times its RPC out).
      if (i % 25 === 0) await new Promise((r) => setTimeout(r, 0));
      const seed = SEEDS[i % SEEDS.length]!;
      const { state: json, edits } = adversarialCase(seed, rng);
      const text = JSON.stringify(json);
      let d: ReturnType<typeof decodeState>;
      try {
        // As an import sees it: parsed from its text (so reserved keys are own keys, as JSON.parse makes them).
        d = decodeState(JSON.parse(text), 'import');
      } catch (e) {
        failures.push(`#${i} decode threw (${edits.join(', ')}): ${String(e)}`);
        continue;
      }
      if (d.kind !== 'ok') continue;
      accepted++;
      try {
        // No data lost through JSON: the accepted state is exactly what its text says.
        expect(JSON.parse(JSON.stringify(d.state))).toEqual(d.state);
        consume(d.state);
        if (accepted % HYDRATE_EVERY === 0) {
          const b = fakeBrowser({ start: TODAY, hour: 21 });
          b.storage.setItem(SAVE_KEY, encodeEnvelope(d.state, 3, NOW, 'test'));
          store.hydrate();
          expect(store.loadIssue.value).toBeNull();
          hydrated++;
        }
      } catch (e) {
        failures.push(`#${i} accepted, then threw (${edits.join(', ')}): ${String(e).slice(0, 300)}`);
      }
    }
    console.log(`accepted-state property: ${N} generated, ${accepted} accepted, ${hydrated} reloaded by the store`);
    expect(failures).toEqual([]);
    // The generator must reach both sides of the validator, or it proves nothing.
    expect(accepted).toBeGreaterThan(N / 20);
    expect(accepted).toBeLessThan(N);
    expect(hydrated).toBeGreaterThan(0);
  });
});

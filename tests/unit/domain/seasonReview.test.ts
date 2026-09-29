/**
 * Season Review (DESIGN §14.3): hemisphere-correct seasons, the pending review on the first open
 * of a new season (idempotent), seasons that passed unopened filed silently, the fresh-start
 * chips, and "just this season" habits retiring with a ribbon.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '@/state/types';
import { validateState } from '@/state/validate';
import { newPetState } from '@/domain/friendship';
import { evalContext, habitTally, logsFor, trackingOf } from '@/domain/consistency';
import * as company from '@/domain/company';
import * as habits from '@/domain/habits';
import { transact } from '@/domain/tx';
import { openDay } from '@/domain/rollover';
import {
  applyFreshStart,
  freshStartOptions,
  growPatch,
  inferHemisphere,
  justThisSeasonEnd,
  nextSeasonStart,
  openSeason,
  resolveSeasonReview,
  seasonAt,
  tinierPatch,
} from '@/domain/seasonReview';
import { Game } from './game';

vi.setConfig({ testTimeout: 30_000 });

const habitOf = (s: AppState, id: string) => s.habits.find((h) => h.id === id)!;
/** The habit's tally over [start, end] as of `end`. */
function consistency(s: AppState, id: string, start: string, end: string): { achieved: number; expected: number } {
  const t = trackingOf(s);
  const r = habitTally(habitOf(s, id), logsFor(t, id), { start, end, attribution: 'calendar' }, evalContext(t, end));
  return { achieved: r.achieved, expected: r.expected };
}
const valid = (s: AppState) => {
  const v = validateState(s);
  return v.ok ? [] : v.errors;
};

describe('seasons and the hemisphere', () => {
  it('meteorological seasons, six months apart in the south', () => {
    expect(seasonAt('2026-09-29', 'north')).toEqual({ name: 'autumn', start: '2026-09-01', end: '2026-11-30' });
    expect(seasonAt('2026-09-29', 'south')).toEqual({ name: 'spring', start: '2026-09-01', end: '2026-11-30' });
    expect(seasonAt('2027-01-10', 'north')).toEqual({ name: 'winter', start: '2026-12-01', end: '2027-02-28' });
    expect(seasonAt('2028-02-29', 'north')).toEqual({ name: 'winter', start: '2027-12-01', end: '2028-02-29' });
    expect(seasonAt('2026-12-01', 'south')).toEqual({ name: 'summer', start: '2026-12-01', end: '2027-02-28' });
    expect(seasonAt('2026-06-01', 'south').name).toBe('winter');
    expect(nextSeasonStart('2026-09-29', 'north')).toBe('2026-12-01');
  });

  it('infers the hemisphere from the time zone (north when unknown)', () => {
    expect(inferHemisphere('Australia/Sydney')).toBe('south');
    expect(inferHemisphere('Pacific/Auckland')).toBe('south');
    expect(inferHemisphere('America/Argentina/Buenos_Aires')).toBe('south');
    expect(inferHemisphere('America/Sao_Paulo')).toBe('south');
    expect(inferHemisphere('Africa/Johannesburg')).toBe('south');
    expect(inferHemisphere('Europe/London')).toBe('north');
    expect(inferHemisphere('America/New_York')).toBe('north');
    expect(inferHemisphere('Asia/Singapore')).toBe('north');
    expect(inferHemisphere(undefined)).toBe('north');
  });

  it('onboarding stores the inferred hemisphere; her setting wins after that', () => {
    const g = new Game({ onboard: false });
    const out = transact(g.state, { ...g.env(), timeZone: 'Australia/Melbourne' }, (tx) => ({ ids: habits.completeOnboarding(tx, { name: 'Sam', templateIds: [] }) }));
    expect(out.state.settings.hemisphere).toBe('south');
    expect(justThisSeasonEnd(out.state, '2026-10-02', 'Europe/London')).toBe('2026-11-30');
    expect(justThisSeasonEnd({ settings: { ...out.state.settings, hemisphere: undefined } }, '2026-10-02', 'Europe/London')).toBe('2026-11-30');
    expect(justThisSeasonEnd({ settings: { ...out.state.settings, hemisphere: undefined } }, '2026-12-02', 'Europe/London')).toBe('2027-02-28');
  });
});

describe('the Season Review card', () => {
  it('on the first open of a new season: up to 8 plants, most watered first, counts only, with companions', () => {
    const g = new Game({ start: '2026-08-01' });
    const ids = Array.from({ length: 10 }, (_, i) => g.addHabit({ name: `H${i}` }));
    const cat = 'pet-cat-tortie';
    g.state = { ...g.state, pets: { [cat]: newPetState(cat, g.rng, g.now, g.today, true) } };
    g.run((tx) => company.setCompanion(tx, ids[0]!, cat));
    for (let d = 0; d < 31; d++) {
      ids.forEach((id, i) => {
        if (d % (i + 1) === 0) g.checkIn(id);
      });
      g.advance(1);
    }
    expect(g.today).toBe('2026-09-01');
    const r = g.state.seasons!.pending!;
    expect(r).toMatchObject({ key: '2026-06-01', name: 'summer', start: '2026-06-01', end: '2026-08-31', hemisphere: 'north' });
    expect(r.plants).toHaveLength(8);
    expect(r.plants[0]).toMatchObject({ habitId: ids[0], waterings: 31, fromStage: 0, petId: cat });
    expect(r.plants.map((p) => p.waterings)).toEqual([31, 16, 11, 8, 7, 6, 5, 4]);
    expect(r.plants[0]!.toStage).toBe(g.state.ledger.bestStage[ids[0]!]);
    expect(r.waterings).toBe(31 + 16 + 11 + 8 + 7 + 6 + 5 + 4 + 4 + 4);
    expect(g.allOf('seasonReview')).toEqual([{ type: 'seasonReview', season: 'summer', key: '2026-06-01' }]);
    expect(valid(g.state)).toEqual([]);
  });

  it('is idempotent: opening the day again, or re-running the season work, files nothing twice', () => {
    const g = new Game({ start: '2026-08-20' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-09-01', 9);
    const once = g.state.seasons;
    g.goTo('2026-09-01', 18);
    g.advance(1);
    expect(g.state.seasons).toBe(once);
    const again = transact(g.state, g.env(), (tx) => {
      openSeason(tx, '2026-08-31');
      openSeason(tx, '2026-08-31');
      return {};
    });
    expect(again.state.seasons).toBe(once);
  });

  it('seasons that passed unopened are filed silently; a card left pending is filed when the next season begins', () => {
    const g = new Game({ start: '2026-08-20' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-09-02');
    g.checkIn(a);
    expect(g.state.seasons!.pending!.key).toBe('2026-06-01');
    // A long break: she comes back in spring 2027.
    g.goTo('2027-03-05');
    const sh = g.state.seasons!;
    expect(sh.pending).toBeUndefined();
    expect(sh.filed.map((r) => [r.key, r.filed])).toEqual([
      ['2026-06-01', 'skipped'],
      ['2026-09-01', 'silent'],
    ]); // the winter she never watered anything is not filed at all
    expect(g.allOf('seasonReview')).toHaveLength(1);
    expect(valid(g.state)).toEqual([]);
  });

  it('Keep everything files it as reviewed and pays nothing; Later files it as skipped', () => {
    const g = new Game({ start: '2026-08-20' });
    const a = g.addHabit();
    g.checkIn(a);
    g.goTo('2026-09-01');
    const wallet = g.state.wallet;
    expect(g.run((tx) => ({ r: resolveSeasonReview(tx, []) })).r).toEqual([]);
    expect(g.state.seasons).toEqual({ filed: [expect.objectContaining({ key: '2026-06-01', filed: 'reviewed' })] });
    expect(g.state.wallet).toEqual(wallet);
    expect(g.run((tx) => ({ r: resolveSeasonReview(tx, 'skip') })).r).toBe(false);
  });
});

describe('fresh-start chips', () => {
  it('suggests a smaller and a bigger rule for each kind', () => {
    const g = new Game({ start: '2026-09-01' });
    const make = (over: Parameters<Game['addHabit']>[0]) => {
      const id = g.addHabit(over);
      return habitOf(g.state, id);
    };
    expect(tinierPatch(make({ name: 'a' }), g.today)).toEqual({ schedule: { kind: 'weekly', times: 5, every: 1 }, target: 1 });
    expect(tinierPatch(make({ name: 'b', target: 8, tiny: { label: 'four', count: 4 } }), g.today)).toEqual({ target: 4, tiny: { label: 'four' } });
    expect(tinierPatch(make({ name: 'c', schedule: { kind: 'weekly', times: 3, every: 1 } }), g.today)).toEqual({ schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1 });
    expect(tinierPatch(make({ name: 'd', schedule: { kind: 'weekly', times: 1, every: 1 } }), g.today)).toEqual({ schedule: { kind: 'weekly', times: 1, every: 2 }, target: 1 });
    expect(tinierPatch(make({ name: 'e', schedule: { kind: 'monthly', times: 1, every: 12 } }), g.today)).toBeNull();
    expect(tinierPatch(make({ name: 'f', schedule: { kind: 'days', days: [1, 3, 5] } }), g.today)).toEqual({ schedule: { kind: 'weekly', times: 2, every: 1 }, target: 1 });
    expect(growPatch(make({ name: 'g' }), g.today)).toBeNull();
    expect(growPatch(make({ name: 'h', target: 8, step: 2 }), g.today)).toEqual({ target: 10 });
    expect(growPatch(make({ name: 'i', schedule: { kind: 'days', days: [1, 3, 5] } }), g.today)).toEqual({ schedule: { kind: 'days', days: [1, 2, 3, 5] } });
    expect(growPatch(make({ name: 'j', schedule: { kind: 'monthly', times: 2, every: 1 } }), g.today)).toEqual({ schedule: { kind: 'monthly', times: 3, every: 1 }, target: 1 });
  });

  it('Grow pays its stamp only while "Ready to grow?" stands; otherwise the bigger rule starts tomorrow for nothing', () => {
    const g = new Game({ start: '2026-08-01' });
    const steady = g.addHabit({ name: 'Steady', target: 4 });
    const fresh = g.addHabit({ name: 'Fresh', target: 4 });
    for (let d = 0; d < 31; d++) {
      g.setCount(steady, g.today, 4);
      g.advance(1);
    }
    const opts = freshStartOptions(g.state, habitOf(g.state, steady), g.today, 'north');
    expect(opts.grow).toEqual({ patch: { target: 5 }, pays: true });
    expect(freshStartOptions(g.state, habitOf(g.state, fresh), g.today, 'north').grow).toEqual({ patch: { target: 5 }, pays: false });
    const stamps = g.state.wallet.stars;
    const out = g.run((tx) => ({ o: applyFreshStart(tx, [{ habitId: steady, choice: 'grow' }, { habitId: fresh, choice: 'grow' }]) })).o;
    expect(out.every((o) => o.ok)).toBe(true);
    expect(g.state.wallet.stars).toBe(stamps + 1);
    for (const id of [steady, fresh]) expect(habitOf(g.state, id).rules.at(-1)).toMatchObject({ from: '2026-09-02', target: 5 });
  });

  it('Rest pauses till the next season; Finish retires with a ribbon (freeing the companion); Tinier edits from today', () => {
    const g = new Game({ start: '2026-08-20' });
    const rest = g.addHabit({ name: 'Rest' });
    const fin = g.addHabit({ name: 'Finish' });
    const tiny = g.addHabit({ name: 'Tinier' });
    const cat = 'pet-cat-tortie';
    g.state = { ...g.state, pets: { [cat]: newPetState(cat, g.rng, g.now, g.today, true) } };
    g.run((tx) => company.setCompanion(tx, fin, cat));
    for (const id of [rest, fin, tiny]) g.checkIn(id);
    g.goTo('2026-09-01');
    const out = g.run((tx) => ({
      o: resolveSeasonReview(tx, [
        { habitId: rest, choice: 'rest' },
        { habitId: fin, choice: 'finish' },
        { habitId: tiny, choice: 'tinier' },
        { habitId: 'h-nope', choice: 'keep' },
      ]),
    })).o;
    expect(out).toEqual([
      { habitId: rest, choice: 'rest', ok: true },
      { habitId: fin, choice: 'finish', ok: true },
      { habitId: tiny, choice: 'tinier', ok: true },
      { habitId: 'h-nope', choice: 'keep', ok: false },
    ]);
    expect(habitOf(g.state, rest).pauses).toEqual([{ start: '2026-09-01', end: '2026-11-30' }]);
    expect(habitOf(g.state, fin)).toMatchObject({ archivedOn: '2026-08-31', ribbon: '2026-08-31' });
    expect(habitOf(g.state, fin).companionId).toBeUndefined();
    expect(g.lastOf('retired')).toEqual([{ type: 'retired', habitId: fin, ribbon: true }]);
    expect(habitOf(g.state, tiny).rules.at(-1)).toMatchObject({ from: '2026-09-01', schedule: { kind: 'weekly', times: 5, every: 1 } });
    expect(valid(g.state)).toEqual([]);
  });
});

describe('"just this season" (endsOn)', () => {
  it('retires with a ribbon after its last day, is never expected after it, and comes back without the ribbon', () => {
    const g = new Game({ start: '2026-08-20' });
    expect(() => g.addHabit({ name: 'Past', endsOn: '2026-08-19' })).toThrow(habits.HabitInputError);
    const a = g.addHabit({ name: 'Swim', endsOn: '2026-08-31' });
    g.checkIn(a);
    g.goTo('2026-08-31');
    expect(habitOf(g.state, a).archivedOn).toBeUndefined();
    g.goTo('2026-09-03');
    expect(habitOf(g.state, a)).toMatchObject({ archivedOn: '2026-08-31', ribbon: '2026-08-31', endsOn: '2026-08-31' });
    expect(g.allOf('retired')).toEqual([{ type: 'retired', habitId: a, ribbon: true }]);
    expect(consistency(g.state, a, '2026-09-01', '2026-09-03')).toEqual({ achieved: 0, expected: 0 });
    g.run((tx) => habits.restoreHabit(tx, a));
    expect(habitOf(g.state, a).ribbon).toBeUndefined();
    expect(habitOf(g.state, a).endsOn).toBeUndefined();
    expect(valid(g.state)).toEqual([]);
  });

  it('is retired before the season is filed, so it shows in the season it belonged to', () => {
    const g = new Game({ start: '2026-08-20' });
    const a = g.addHabit({ name: 'Swim', endsOn: '2026-08-31' });
    g.checkIn(a);
    g.goTo('2026-09-01');
    expect(g.state.seasons!.pending!.plants.map((p) => p.habitId)).toEqual([a]);
    void openDay;
  });
});

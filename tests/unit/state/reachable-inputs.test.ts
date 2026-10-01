/**
 * The converse of "accepted means usable" (WP-A5, INV-6; the adversarial review's blocker): what
 * the app itself writes must still read as a good save. Every store action is driven with the
 * extreme values its screens can hand it (a date typed at either end of what a date input or
 * `isDateKey` takes, the longest text, the largest count); afterwards the live state must decode as a
 * save (`decodesAsSave`), and the save on disk must reopen with no load note.
 *
 * And the save an earlier build already wrote with such a date (a pause until 3026, tracking from
 * 1899) is repaired as it is read (DEC-E1), never refused whole: refusing it fell back to an older
 * `:backup` and lost the session, or opened a lived-in save as a blank app.
 *
 * Cases marked "failed before" failed against the code before this fix (558876b).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { addDays } from '@/domain/dates';
import { earliestStartedOn, validateHabitInput } from '@/domain/habits';
import type { HabitInput } from '@/state/api';
import { decodeState, decodesAsSave } from '@/state/decode';
import * as handoff from '@/state/handoff';
import { SAVE_KEY, backupKeyOf, parseEnvelope } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { DAY_MAX, DAY_MIN, MAX_TEXT } from '@/state/validate';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 60_000 });

type Obj = Record<string, unknown>;
const CORPUS = new URL('../../fixtures/saves/', import.meta.url);
const livedInRaw = (): string => readFileSync(new URL('b053e0a/main-demo.json', CORPUS), 'utf8');
const envOf = (raw: string) => JSON.parse(raw) as { v: number; rev: number; gen?: string; savedAt: number; state: Obj };
const SAVED_AT = envOf(livedInRaw()).savedAt;
const TODAY = '2026-09-29';
const HABIT = 'h-elk0prey';
const PET = 'pet-cat-tuxedo';
const KEEPSAKE = 'k-h-jx3yjcqd-1';

/** The ends of what a date input or `isDateKey` takes, and the ends of the calendar a save names. */
const EDGE_DAYS = ['1000-01-01', '1899-12-31', DAY_MIN, DAY_MAX, '3000-01-01', '3026-10-04', '9999-12-31'];
const LONG = 'w'.repeat(MAX_TEXT + 1);
const COUNTS = [Number.MAX_SAFE_INTEGER, 1e9, 1_000_001, -5, 0.5];

const input = (over: Partial<HabitInput> = {}): HabitInput => ({
  name: 'Stretch',
  icon: 'water',
  color: 'sky',
  plant: 'pothos',
  pot: 'terracotta',
  schedule: { kind: 'daily' },
  target: 1,
  step: 1,
  effort: 'light',
  timeOfDay: 'anytime',
  polarity: 'build',
  ...over,
});

const settle = () => new Promise<void>((r) => setTimeout(r, 0));

afterEach(() => {
  store.configureStore({ locks: null });
});

/** The lived-in sill (b053e0a), open in the store on the day it was saved. */
function openLivedIn() {
  const b = fakeBrowser({ start: TODAY });
  b.clock.now = SAVED_AT;
  b.storage.setItem(SAVE_KEY, livedInRaw());
  store.configureStore({ afterFrame: (fn) => fn() });
  store.hydrate();
  expect(store.loadIssue.value).toBeNull();
  return b;
}

/** Each action, with an extreme value the screens can hand it. A refusal (a throw from the editor's checks) is fine. */
const ACTIONS: [string, () => unknown][] = [
  ...EDGE_DAYS.flatMap((d): [string, () => unknown][] => [
    [`pause until ${d}`, () => store.pauseHabit(HABIT, TODAY, d)],
    [`pause from ${d}`, () => store.pauseHabit(HABIT, d)],
    [`start tracking from ${d}`, () => store.setStartedOn(HABIT, d)],
    [`a new habit that ends on ${d}`, () => store.createHabit(input({ endsOn: d }))],
    [`an edit that ends on ${d}`, () => store.updateHabit(HABIT, { endsOn: d })],
    [`check in on ${d}`, () => store.checkIn(HABIT, d)],
    [`rest on ${d}`, () => store.toggleRest(HABIT, d)],
    [`a day off on ${d}`, () => store.toggleOffDay(d)],
    [`a note on ${d}`, () => store.setNote(HABIT, d, 'slow start')],
    [`a history edit on ${d}`, () => store.editHistory(HABIT, d, true)],
  ]),
  ...COUNTS.map((n): [string, () => unknown] => [`a count of ${n}`, () => store.setCount(HABIT, TODAY, n)]),
  ['the longest note', () => store.setNote(HABIT, TODAY, LONG)],
  ['the longest pet name', () => store.renamePet(PET, LONG)],
  ['the longest name', () => store.setName(LONG)],
  ['the longest keepsake caption', () => store.setKeepsakeNote(KEEPSAKE, LONG)],
  ['the longest why', () => store.answerWhy(HABIT, LONG)],
  ['the longest habit fields', () => store.updateHabit(HABIT, { name: LONG, notes: LONG, unit: LONG, anchor: LONG })],
  ['a birthday on 29 February', () => store.setBirthday('02-29')],
  ['a birthday on 30 February', () => store.setBirthday('02-30')],
  ['a birthday in month 13', () => store.setBirthday('13-01')],
  ['a day that starts at the latest minute', () => store.updateSettings({ dayStartsAt: 24 * 60 - 1 })],
  ['decor dragged far off the shelf', () => store.placeDecor('decor-reading-lamp', 'sill', 1e300, -1e300)],
  ['decor moved far off the shelf', () => store.moveDecor('d-5zs3ox', { x: -1e300, y: 1e300 })],
];

describe('every action, with the extremes its screens can hand it, leaves a save that reopens', () => {
  it.each(ACTIONS)('%s', (_label, run) => {
    const b = openLivedIn();
    try {
      run();
    } catch {
      // The habit editor's checks refuse by throwing (HabitInputError): nothing was written.
    }
    expect(decodeState(store.state.value, 'current')).toMatchObject({ kind: 'ok' });
    store.flushSaves();
    expect(parseEnvelope(b.storage.getItem(SAVE_KEY) ?? '').kind).toBe('ok');
    const before = JSON.stringify(store.state.value);
    store.hydrate();
    expect(store.loadIssue.value).toBeNull();
    expect(JSON.stringify(store.state.value)).toBe(before);
  });
});

describe('the domain refuses a day outside the calendar a save names', () => {
  // WP-B5 (DEC-P12(g)) moved the earliest start to earliestStartedOn, inside WP-A5's calendar.
  it('setStartedOn before 1900, or before the earliest start day, changes nothing (failed before)', () => {
    openLivedIn();
    const earliest = earliestStartedOn(store.today.value);
    store.setStartedOn(HABIT, '1899-12-31');
    store.setStartedOn(HABIT, '1000-01-01');
    store.setStartedOn(HABIT, DAY_MIN);
    store.setStartedOn(HABIT, addDays(earliest, -1));
    expect(store.state.value.habits.find((h) => h.id === HABIT)!.startedOn).toBe('2026-08-21');
    store.setStartedOn(HABIT, earliest);
    expect(store.state.value.habits.find((h) => h.id === HABIT)!.startedOn).toBe(earliest);
  });

  it('a pause that ends after 2999 or starts after it is refused (failed before)', () => {
    openLivedIn();
    store.pauseHabit(HABIT, TODAY, '3026-10-04');
    store.pauseHabit(HABIT, '3000-01-01');
    expect(store.state.value.habits.find((h) => h.id === HABIT)!.pauses).toEqual([]);
    store.pauseHabit(HABIT, TODAY, DAY_MAX);
    expect(store.state.value.habits.find((h) => h.id === HABIT)!.pauses).toEqual([{ start: TODAY, end: DAY_MAX }]);
  });

  it('the editor refuses a season that ends after 2999 (failed before)', () => {
    openLivedIn();
    const s = store.state.value;
    expect(validateHabitInput(s, input({ endsOn: '9999-12-31' }), undefined, TODAY).map((i) => i.field)).toEqual(['endsOn']);
    expect(validateHabitInput(s, input({ endsOn: DAY_MAX }), undefined, TODAY)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Repair: what an earlier build already wrote                          */
/* ------------------------------------------------------------------ */

/** The lived-in sill's state with the first habit edited as an earlier build let her. */
function livedInWith(edit: (h: Obj) => void): Obj {
  const s = envOf(livedInRaw()).state;
  edit((s.habits as Obj[])[0]!);
  return s;
}
const firstOf = (s: AppState) => s.habits.find((h) => h.id === HABIT)!;

describe('DEC-E1: a day an earlier build let her pick outside 1900–2999 is repaired as it is read', () => {
  it('a pause until 3026 (or 9999) reads as a pause with no end (failed before)', () => {
    for (const end of ['3026-10-04', '9999-12-31']) {
      const d = decodeState(livedInWith((h) => void (h.pauses = [{ start: TODAY, end }])), 'main');
      expect(d.kind).toBe('ok');
      if (d.kind !== 'ok') return;
      expect(firstOf(d.state).pauses).toEqual([{ start: TODAY }]);
      expect(d.repaired).toEqual(['habits[0].pauses[0].end']);
    }
  });

  it('tracking from 1899 (or 1000) reads as from 1900-01-01, its first rule with it (failed before)', () => {
    for (const day of ['1899-12-31', '1000-01-01']) {
      const d = decodeState(
        livedInWith((h) => {
          h.startedOn = day;
          (h.rules as Obj[])[0]!.from = day;
        }),
        'import',
      );
      expect(d.kind).toBe('ok');
      if (d.kind !== 'ok') return;
      expect(firstOf(d.state).startedOn).toBe(DAY_MIN);
      expect(firstOf(d.state).rules[0]!.from).toBe(DAY_MIN);
      expect(d.repaired).toEqual(['habits[0].startedOn', 'habits[0].rules[0].from']);
    }
  });

  it('a first rule that starts on 1900-01-01 once clamped gives way to the rule that already starts there (failed before)', () => {
    const d = decodeState(
      livedInWith((h) => {
        const [rule] = h.rules as Obj[];
        h.startedOn = '1899-06-01';
        h.rules = [{ ...rule, from: '1899-06-01' }, { ...rule, from: DAY_MIN, target: 10 }];
      }),
      'main',
    );
    expect(d.kind).toBe('ok');
    if (d.kind !== 'ok') return;
    expect(firstOf(d.state).rules.map((r) => [r.from, r.target])).toEqual([[DAY_MIN, 10]]);
  });

  it('a season that ends after 2999 reads as no end; a pause wholly after it is dropped (failed before)', () => {
    const d = decodeState(
      livedInWith((h) => {
        h.endsOn = '9999-12-31';
        h.pauses = [{ start: '3000-02-01', end: '3000-03-01' }];
      }),
      'snapshot',
    );
    expect(d.kind).toBe('ok');
    if (d.kind !== 'ok') return;
    expect(firstOf(d.state).endsOn).toBeUndefined();
    expect(firstOf(d.state).pauses).toEqual([]);
  });

  it('new API (`repaired`) and guards: a good save is not repaired, and a day that is not a day is still damage', () => {
    const good = decodeState(envOf(livedInRaw()).state, 'main');
    expect(good.kind === 'ok' && good.repaired).toEqual([]);
    expect(decodeState(livedInWith((h) => void (h.startedOn = 'yesterday')), 'main').kind).toBe('corrupt');
    expect(decodeState(livedInWith((h) => void (h.pauses = [{ start: TODAY, end: '3026-02-30' }])), 'main').kind).toBe('corrupt');
  });

  it('the same in memory: a pause written before the fix leaves a live state that decodes (failed before)', () => {
    const live = livedInWith((h) => void (h.pauses = [{ start: TODAY, end: '3026-10-04' }]));
    expect(decodesAsSave(live)).toBe(true);
  });
});

describe('an upgraded save with such a day opens as it was (the review’s case)', () => {
  /** A lived-in save (onboarded, a check-in today) with a pause until 3026, in both slots, as an earlier build leaves it. */
  function upgraded() {
    const b = fakeBrowser({ start: TODAY });
    b.clock.now = SAVED_AT;
    const env = envOf(livedInRaw());
    ((env.state.habits as Obj[])[0]!).pauses = [{ start: TODAY, end: '3026-10-04' }];
    const raw = JSON.stringify(env);
    b.storage.setItem(SAVE_KEY, raw);
    b.storage.setItem(backupKeyOf(SAVE_KEY), raw);
    store.configureStore({ afterFrame: (fn) => fn() });
    return { b, env };
  }

  it('no load note, every habit and check-in kept, still onboarded (failed before: a blank, un-onboarded app)', () => {
    const { env } = upgraded();
    store.hydrate();
    expect(store.loadIssue.value).toBeNull();
    expect(store.state.value.habits.length).toBe((env.state.habits as Obj[]).length);
    expect(store.state.value.profile.onboarded).toBe(true);
    expect(store.state.value.lifetime).toEqual(env.state.lifetime);
    expect(firstOf(store.state.value).pauses).toEqual([{ start: TODAY }]);
  });

  it('its backup, a new day’s copy and an import with Undo all work (failed before: damaged-backup, no copy, no-undo)', async () => {
    const { b } = upgraded();
    store.hydrate();
    expect((await handoff.parseBackupText(store.backupJson())).ok).toBe(true);
    await settle();
    const before = await store.listSnapshots();
    b.advance(24 * 3_600_000);
    store.startClock()();
    await settle();
    const after = await store.listSnapshots();
    expect(after.ok && before.ok && after.snapshots.length - before.snapshots.length).toBe(1);
    const res = await store.applyImport(livedInRaw());
    expect(res.ok && res.undo !== null).toBe(true);
  });
});

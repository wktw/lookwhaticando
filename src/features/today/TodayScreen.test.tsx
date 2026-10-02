// @vitest-environment jsdom
/**
 * The Today screen against the real store: one h1, the empty sill, watering and un-watering with the
 * note, the list that never regroups on a tap, the week strip's roving focus and the past-day banner,
 * the ⋯ menu, a rest day, the number pad, and the Habit Editor planting a new habit.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { createInitialState } from '@/state/defaults';
import { transact } from '@/domain/tx';
import { openDay } from '@/domain/rollover';
import * as habitsDomain from '@/domain/habits';
import { mulberry32 } from '@/domain/rng';
import { addDays, appDayKey, runtimeLocalTime, shortDateLabel, weekday } from '@/domain/dates';
import { weekdayName } from '@/catalog/formatCore';
import { archiveHabit, deleteHabit, now, setCount, setNote, state, today, updateHabit } from '@/state/store';
import type { AppState, DateKey, Weekday } from '@/state/types';
import { toasts } from '@/ui/toast';
import { habitEditorRequest } from '@/features/habits/open';
import { SheetHosts } from '@/app/SheetHosts';
import { TodayScreen } from './TodayScreen';
import { selectDay, selectedDay } from './state';
import { greetingLine } from './Band';
import { button, click, installDom, key, keyboardClick, mount, pointer, type, until } from '@/features/capsules/testing';

function seed(templateIds: string[], name = 'Sam', trackedFrom = 0): AppState {
  const now = Date.now() - 3_600_000;
  const env = { now, today: appDayKey(now, 180, runtimeLocalTime), local: runtimeLocalTime, rng: mulberry32(9) };
  return transact(createInitialState(now - 86_400_000 * 8), env, (tx) => {
    openDay(tx);
    habitsDomain.completeOnboarding(tx, { name, templateIds });
    // "Start tracking from…": the habits have cards on the past days of the strip too.
    if (trackedFrom > 0) for (const h of tx.s.habits) habitsDomain.setStartedOn(tx, h.id, addDays(env.today, -trackedFrom));
    return {};
  }).state;
}

let view: ReturnType<typeof mount> | null = null;
const cardOf = (name: string) => Array.from(document.querySelectorAll<HTMLElement>('article[data-habit]')).find((a) => a.querySelector('h3')?.textContent === name);
const ringIn = (a: HTMLElement | undefined) => a?.querySelector<HTMLButtonElement>('button[data-state]') ?? null;
const lastToast = () => toasts.value[toasts.value.length - 1];

beforeAll(() => {
  installDom();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});
beforeEach(() => {
  toasts.value = [];
  selectedDay.value = null;
});
afterEach(() => {
  view?.unmount();
  view = null;
  habitEditorRequest.value = null;
});

describe('Today', () => {
  // The greeting follows the wall clock, so the clock is pinned: an afternoon, then a late night
  // (whose two lines are picked by the day of the month).
  it.each([
    [14, () => 'Afternoon, Sam.'],
    [23, (day: string) => greetingLine({ period: 'late', hour: 23, name: 'Sam', birthday: false }, Number(day.slice(8, 10)))],
  ])('has exactly one h1: the greeting (at %i:00)', (hour, expected) => {
    const at = new Date();
    at.setHours(hour, 0, 0, 0);
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(at);
      now.value = at.getTime();
      state.value = seed(['water', 'walk', 'read']);
      today.value = appDayKey(at.getTime(), 180, runtimeLocalTime);
      view = mount(<TodayScreen />);
      const h1s = document.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0]!.textContent).toBe(expected(today.value));
      expect(document.querySelector('[role="radiogroup"]')?.querySelectorAll('[role="radio"]')).toHaveLength(7);
    } finally {
      view?.unmount();
      view = null;
      vi.useRealTimers();
      now.value = Date.now();
      today.value = appDayKey(Date.now(), 180, runtimeLocalTime);
    }
  });

  it('shows the empty sill with "Add a habit" before any habit', () => {
    state.value = seed([], '');
    view = mount(<TodayScreen />);
    expect(document.body.textContent).toMatch(/An empty sill\./);
    expect(button('Add a habit')).not.toBeNull();
    expect(document.querySelector('h1')!.textContent).not.toMatch(/,/);
  });

  it('waters a habit with its note and Undo, and un-waters it', async () => {
    state.value = seed(['walk', 'read']);
    view = mount(<TodayScreen />);
    const walk = ringIn(cardOf('Walk'));
    expect(walk?.getAttribute('aria-pressed')).toBe('false');
    await click(walk, 'the Walk ring');
    const walkId = state.value.habits.find((h) => h.name === 'Walk')!.id;
    expect(state.value.logs[walkId]?.[today.value]).toMatchObject({ kind: 'log', count: 1 });
    await until(() => ringIn(cardOf('Walk'))?.getAttribute('aria-pressed') === 'true', 'the ring pressed');
    const note = await until(() => lastToast(), 'the check-in note');
    expect(String(note.label)).toMatch(/^Walk, watered\./);
    expect(note.actions?.map((a) => a.label)).toEqual(['Undo', 'Add a note']);
    note.actions![0]!.onAction();
    await until(() => state.value.logs[walkId]?.[today.value]?.kind !== 'log' || (state.value.logs[walkId]?.[today.value] as { count: number }).count === 0, 'the undo');
    await until(() => String(lastToast()?.message ?? '').includes('not watered after all'), 'the un-watering note');
  });

  it('never moves a card to another group on a tap', async () => {
    state.value = seed(['walk', 'read', 'stretch']);
    view = mount(<TodayScreen />);
    const before = Array.from(document.querySelectorAll('article[data-habit]')).map((a) => a.getAttribute('data-habit'));
    for (const name of ['Walk', 'Read', 'Stretch']) await click(ringIn(cardOf(name)), name);
    const after = Array.from(document.querySelectorAll('article[data-habit]')).map((a) => a.getAttribute('data-habit'));
    expect(after).toEqual(before);
  });

  it('adds a count habit’s step per tap, names the ring by it, and opens the number pad on a long press', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    const ring = ringIn(cardOf('Drink water'))!;
    expect(ring.getAttribute('aria-label')).toBe('Add 1 glass to Drink water');
    await click(ring, 'the water ring');
    await until(() => ringIn(cardOf('Drink water'))?.getAttribute('aria-describedby'), 'a description');
    const desc = document.getElementById(ringIn(cardOf('Drink water'))!.getAttribute('aria-describedby')!);
    expect(desc?.textContent).toBe('1 of 8 glasses');
    const holder = ringIn(cardOf('Drink water'))!.parentElement!;
    holder.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('1 of 8 glasses'), 'the number pad');
  });

  it('waters on a slow tap when the card has no hold, and a short press on one with a tiny version logs the whole thing', async () => {
    state.value = seed(['vitamins', 'walk']);
    view = mount(<TodayScreen />);
    const press = async (name: string, ms: number) => {
      const ring = ringIn(cardOf(name))!;
      ring.parentElement!.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
      await new Promise((r) => setTimeout(r, ms));
      ring.parentElement!.dispatchEvent(new MouseEvent('pointerup', { button: 0, bubbles: true }));
      await click(ring, name);
    };
    // Take vitamins has no tiny version and no count: no hold is armed, so 650 ms is still a tap.
    await press('Take vitamins', 650);
    await until(() => ringIn(cardOf('Take vitamins'))?.getAttribute('aria-pressed') === 'true', 'vitamins watered');
    // Walk has a tiny version: 300 ms is under the hold, so the whole habit is watered, not the tiny one.
    const holder = ringIn(cardOf('Walk'))!.parentElement!;
    holder.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    expect(holder.getAttribute('data-holding')).toBe('tiny');
    holder.dispatchEvent(new MouseEvent('pointerup', { button: 0, bubbles: true }));
    expect(holder.hasAttribute('data-holding')).toBe(false);
    await press('Walk', 300);
    await until(() => ringIn(cardOf('Walk'))?.getAttribute('data-state') === 'done', 'walk watered in full');
  });

  it('offers the number pad from the ⋯ menu too (DESIGN §11.2)', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    await click(button('More for Drink water'), '⋯');
    const menu = await until(() => document.querySelector('[role="menu"]'), 'the menu');
    const item = Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find((b) => b.textContent?.startsWith('How many'));
    expect(item).toBeTruthy();
    await click(item!, 'How many…');
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('of 8 glasses'), 'the number pad');
  });

  it('keeps the week strip where it is when a past day is picked', async () => {
    state.value = seed(['walk']);
    view = mount(<TodayScreen />);
    const strip = document.querySelector('[role="radiogroup"]')!;
    await click(Array.from(strip.querySelectorAll<HTMLElement>('[role="radio"]'))[4]!, 'a past day');
    await until(() => document.body.textContent?.includes('Logging for'), 'the banner');
    const banner = Array.from(document.querySelectorAll('[role="status"]')).find((e) => e.textContent?.includes('Logging for'))!;
    // The banner follows the strip in the page, so the strip never moves down under her finger.
    expect(strip.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('selects a past day from the strip with the arrow keys, says so, and goes back', async () => {
    state.value = seed(['walk']);
    view = mount(<TodayScreen />);
    const radios = () => Array.from(document.querySelectorAll<HTMLElement>('[role="radio"]'));
    const todayRadio = radios()[6]!;
    expect(todayRadio.getAttribute('aria-checked')).toBe('true');
    expect(todayRadio.tabIndex).toBe(0);
    todayRadio.focus();
    await key(todayRadio, 'ArrowLeft');
    expect(radios()[5]!.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios()[5]);
    await until(() => document.body.textContent?.includes('Logging for'), 'the banner');
    const ring = ringIn(cardOf('Walk'));
    if (ring) expect(ring.getAttribute('aria-label')).toMatch(/^Walk for /);
    await click(button('Back to today'), 'Back to today');
    expect(selectedDay.value).toBeNull();
  });

  it('opens the ⋯ menu, and a rest day puts a moon on the ring', async () => {
    state.value = seed(['walk']);
    view = mount(<TodayScreen />);
    await click(button('More for Walk'), '⋯');
    const menu = await until(() => document.querySelector('[role="menu"]'), 'the menu');
    const items = Array.from(menu.querySelectorAll('[role^="menuitem"]')).map((b) => b.textContent);
    expect(items.map((t) => t?.replace(/Shoes on.*/, ''))).toEqual(['Tiny version', 'Rest day', 'Add a note', 'Details', 'Edit']);
    await click(Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find((b) => b.textContent === 'Rest day')!, 'Rest day');
    await until(() => ringIn(cardOf('Walk'))?.getAttribute('data-state') === 'rest', 'the moon');
    expect(String(lastToast()?.message)).toBe('Walk is resting today. Nothing here wilts.');
  });
});

describe('the Habit Editor', () => {
  it('plants a new habit from its name, and says what to do when the name is missing', async () => {
    state.value = seed(['walk']);
    view = mount(
      <>
        <TodayScreen />
        <SheetHosts />
      </>,
    );
    await click(button('Add a habit'), 'Add a habit');
    const dialog = await until(() => document.querySelector<HTMLElement>('[role="dialog"]'), 'the editor');
    await until(() => dialog.querySelector('form'), 'the form');
    const plant = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Plant it')!;
    await click(plant(), 'Plant it');
    await until(() => dialog.textContent?.includes('Give it a name, up to 60 characters.'), 'the field note');
    // Focus goes to the field that needs her, which reads its note.
    await until(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-invalid') === 'true', 'focus on the name');
    await type(dialog.querySelector<HTMLInputElement>('input[type="text"]')!, 'Read a chapter');
    await click(plant(), 'Plant it');
    await until(() => state.value.habits.some((h) => h.name === 'Read a chapter'), 'the new habit');
    expect(state.value.habits.find((h) => h.name === 'Read a chapter')!.icon).toBe('book');
    await until(() => cardOf('Read a chapter'), 'its card on Today');
  });

  it('asks before closing a form with something typed in it, and Esc keeps editing', async () => {
    state.value = seed(['walk']);
    view = mount(
      <>
        <TodayScreen />
        <SheetHosts />
      </>,
    );
    await click(button('Add a habit'), 'Add a habit');
    const dialog = await until(() => document.querySelector<HTMLElement>('[role="dialog"]'), 'the editor');
    await until(() => dialog.querySelector('form'), 'the form');
    await type(dialog.querySelector<HTMLInputElement>('input[type="text"]')!, 'Stretch a bit');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const ask = await until(() => document.querySelector<HTMLElement>('[role="alertdialog"]'), 'the question');
    expect(ask.textContent).toMatch(/Keep editing/);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await until(() => !document.querySelector('[role="alertdialog"]'), 'the question gone');
    expect(document.querySelector<HTMLInputElement>('[role="dialog"] input[type="text"]')?.value).toBe('Stretch a bit');
    expect(habitEditorRequest.value).not.toBeNull();
  });
});

/**
 * WP-C1 (UI2-03, P-ui-14): an open editor (the number pad, the inline stepper, the ⋯ menu and the
 * day-off question) is bound to the day it was opened for. The page still goes back to today after a
 * minute hidden and on a new day (DESIGN §5.3); an editor either keeps writing the day it shows, or
 * closes and says so. It never silently writes another day.
 */
describe('an open editor keeps its day (WP-C1)', () => {
  let vis: DocumentVisibilityState = 'visible';
  const setClock = (ms: number) => {
    vi.setSystemTime(ms);
    now.value = ms;
    today.value = appDayKey(ms, 180, runtimeLocalTime);
  };
  const flipVisibility = (to: DocumentVisibilityState) =>
    act(() => {
      vis = to;
      document.dispatchEvent(new Event('visibilitychange'));
    });
  /** The app is hidden for `ms` (a phone call, another app), then comes back. */
  const hideFor = async (ms: number) => {
    await flipVisibility('hidden');
    await act(() => setClock(Date.now() + ms));
    await flipVisibility('visible');
  };
  /** The app day turns over while the screen is open. */
  const nextDay = () => act(() => setClock(Date.now() + 86_400_000));

  const idOf = (name: string) => state.value.habits.find((h) => h.name === name)!.id;
  const countOn = (id: string, d: DateKey) => {
    const l = state.value.logs[id]?.[d];
    return l?.kind === 'log' ? l.count : 0;
  };
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const dialogButton = (text: string) => Array.from(dialog()?.querySelectorAll('button') ?? []).find((b) => b.textContent === text) ?? null;
  const menuItem = (start: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="menu"] [role^="menuitem"]')).find((b) => b.textContent?.startsWith(start)) ?? null;
  const notice = () => toasts.value.map((t) => String(t.message ?? t.label ?? '')).find((m) => m.startsWith('Back to today.'));
  const pick = (d: DateKey) => act(() => selectDay(d, today.value));
  async function openMenu(name: string) {
    await click(button(new RegExp(`^More for ${name}`)), `⋯ for ${name}`);
    return until(() => document.querySelector('[role="menu"]'), 'the menu');
  }
  async function openPad(name: string) {
    await openMenu(name);
    await click(menuItem('How many'), 'How many…');
    return until(() => dialogButton('+1') && dialog(), 'the number pad');
  }

  beforeAll(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis });
  });
  beforeEach(() => {
    vis = 'visible';
    // Only Date is faked, and it keeps moving, so the polling helpers still time out.
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    setClock(noon.getTime());
  });
  afterEach(() => {
    view?.unmount();
    view = null;
    vi.useRealTimers();
    now.value = Date.now();
    today.value = appDayKey(Date.now(), 180, runtimeLocalTime);
  });

  it('names the day on a past day’s number pad', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const past = addDays(today.value, -2);
    await pick(past);
    const pad = await openPad('Drink water');
    expect(pad.querySelector('h2')?.textContent).toBe(`Drink water for ${weekdayName(past)}`);
  });

  it('UI2-03: +1 after a minute hidden still counts the past day the pad shows', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    const past = addDays(t0, -2);
    await pick(past);
    await openPad('Drink water');
    await hideFor(61_000);
    // The page went back to today (DESIGN §5.3); the open pad did not.
    expect(selectedDay.value).toBeNull();
    await click(await until(() => dialogButton('+1'), 'the pad’s +1'), '+1');
    expect(countOn(id, past)).toBe(1);
    expect(countOn(id, t0)).toBe(0);
    expect(dialog()?.querySelector('h2')?.textContent).toBe(`Drink water for ${weekdayName(past)}`);
  });

  it('a new day with the pad open: the pad keeps the day it was opened on, and says which', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const opened = today.value;
    await openPad('Drink water');
    await nextDay();
    expect(today.value).toBe(addDays(opened, 1));
    await until(() => dialog()?.querySelector('h2')?.textContent === `Drink water for ${weekdayName(opened)}`, 'the pad naming its day');
    await click(dialogButton('+1'), '+1');
    expect(countOn(id, opened)).toBe(1);
    expect(countOn(id, today.value)).toBe(0);
  });

  it('a new day that takes the pad’s day off the strip closes the pad and says so', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const edge = addDays(today.value, -6);
    await pick(edge);
    await openPad('Drink water');
    await nextDay();
    await until(() => !dialog(), 'the pad closed');
    // The day is a week back, so it shares today's weekday: the note names it by its date, never
    // "Drink water for Thursday" on a Thursday, which would read as today.
    expect(weekdayName(edge)).toBe(weekdayName(today.value));
    expect(notice()).toBe(`Back to today. Drink water for ${shortDateLabel(edge)} is as you left it.`);
    expect(countOn(id, edge)).toBe(0);
    expect(countOn(id, today.value)).toBe(0);
  });

  it('a schedule change from today on, with the pad open on a past day: +1 still counts the pad’s day', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    const past = addDays(t0, -2);
    await pick(past);
    await openPad('Drink water');
    // From today on, Drink water is only on the other weekdays: it is not due today.
    const others = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((d) => d !== weekday(t0));
    await act(() => updateHabit(id, { schedule: { kind: 'days', days: others } }));
    await hideFor(61_000);
    await click(await until(() => dialogButton('+1'), 'the pad’s +1'), '+1');
    expect(countOn(id, past)).toBe(1);
    expect(countOn(id, t0)).toBe(0);
  });

  it('a schedule change that makes the pad’s own day not due: the pad stays on that day, and writes only it', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    await openPad('Drink water');
    // Drink water is no longer due today. Its card moves to "not today", where it can still be
    // logged, so the pad (bound to today) stays open and keeps writing today.
    const others = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((d) => d !== weekday(t0));
    await act(() => updateHabit(id, { schedule: { kind: 'days', days: others } }));
    await hideFor(61_000);
    await click(await until(() => dialogButton('+1'), 'the pad’s +1'), '+1');
    expect(countOn(id, t0)).toBe(1);
    for (let i = 1; i <= 6; i++) expect(countOn(id, addDays(t0, -i))).toBe(0);
    expect(notice()).toBeUndefined();
  });

  it('the habit archived while the pad is open: +1 still counts the pad’s day; deleted, the pad closes', async () => {
    state.value = seed(['water', 'walk'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    const past = addDays(t0, -2);
    await pick(past);
    await openPad('Drink water');
    await act(() => archiveHabit(id));
    await hideFor(61_000);
    await click(await until(() => dialogButton('+1'), 'the pad’s +1'), '+1');
    expect(countOn(id, past)).toBe(1);
    expect(countOn(id, t0)).toBe(0);
    await act(() => deleteHabit(id));
    await until(() => !dialog(), 'the pad closed with its habit');
    expect(state.value.logs[id]).toBeUndefined();
  });

  it('P-ui-14: the ⋯ menu of a past day closes when the page goes back to today, so Tiny never lands on today', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    const past = addDays(t0, -2);
    await pick(past);
    await openMenu('Drink water');
    await hideFor(61_000);
    await until(() => !document.querySelector('[role="menu"]'), 'the menu closed');
    expect(notice()).toBe(`Back to today. Drink water for ${weekdayName(past)} is as you left it.`);
    expect(countOn(id, t0)).toBe(0);
    // Closed, not just hidden while another day shows: picking that day again brings no menu back.
    await pick(past);
    await until(() => document.body.textContent?.includes('Logging for'), 'the past day again');
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('the inline stepper of a past day closes when the page goes back to today, and says so', async () => {
    state.value = seed(['water'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const t0 = today.value;
    const past = addDays(t0, -2);
    await pick(past);
    // Filled after the list's groups were taken, so the card stays unfolded (a tap never regroups).
    await act(() => void setCount(id, past, 8));
    await click(await until(() => ringIn(cardOf('Drink water')), 'the ring'), 'the full ring');
    await until(() => Array.from(cardOf('Drink water')?.querySelectorAll('button') ?? []).some((b) => b.textContent === 'Done'), 'the inline stepper');
    await hideFor(61_000);
    await until(() => !Array.from(cardOf('Drink water')?.querySelectorAll('button') ?? []).some((b) => b.textContent === 'Done'), 'the stepper closed');
    expect(notice()).toBe(`Back to today. Drink water for ${weekdayName(past)} is as you left it.`);
    expect(countOn(id, past)).toBe(8);
    expect(countOn(id, t0)).toBe(0);
  });

  it('P-ui-14: “Take today off?” open over a new day closes, and takes neither day off', async () => {
    state.value = seed(['walk'], 'Sam', 10);
    view = mount(<TodayScreen />);
    const asked = today.value;
    await click(await until(() => document.querySelector<HTMLElement>('[role="switch"]'), 'the day-off switch'), 'Take today off');
    await until(() => document.querySelector('[role="alertdialog"]'), 'the question');
    await nextDay();
    await until(() => !document.querySelector('[role="alertdialog"]'), 'the question closed');
    expect(notice()).toBe(`Back to today. ${weekdayName(asked)} is as you left it.`);
    expect(state.value.offDays[asked]).toBeUndefined();
    expect(state.value.offDays[today.value]).toBeUndefined();
  });
});

/**
 * WP-C2 (UI2-05, P-ui-04, P-ui-08's dirty confirm): a cancelled gesture commits nothing and never
 * swallows the next keyboard activation, and the note sheet asks before it drops a line typed in it.
 */
describe('cancelled gestures on Today, and the note sheet’s draft (WP-C2)', () => {
  const idOf = (name: string) => state.value.habits.find((h) => h.name === name)!.id;
  const countOn = (id: string, d: DateKey) => {
    const l = state.value.logs[id]?.[d];
    return l?.kind === 'log' ? l.count : 0;
  };
  const noteOn = (id: string, d: DateKey) => {
    const l = state.value.logs[id]?.[d];
    return l && 'note' in l ? (l.note ?? null) : null;
  };
  const esc = () => act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  const noteSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.querySelector('textarea')) ?? null;
  const question = () => document.querySelector<HTMLElement>('[role="alertdialog"]');
  const questionButton = (text: string) => Array.from(question()?.querySelectorAll('button') ?? []).find((b) => b.textContent === text) ?? null;

  async function openNote(name: string) {
    await click(button(new RegExp(`^More for ${name}`)), `⋯ for ${name}`);
    const menu = await until(() => document.querySelector('[role="menu"]'), 'the menu');
    await click(Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find((b) => /note/i.test(b.textContent ?? ''))!, 'Add a note');
    const sheet = await until(noteSheet, 'the note sheet');
    // Two frames after opening, the sheet is 'open' and takes drags.
    await until(() => sheet.closest<HTMLElement>('[data-state]')?.dataset.state === 'open', 'the sheet settled');
    return sheet;
  }
  const typeNote = (sheet: HTMLElement, text: string) => type(sheet.querySelector('textarea') as unknown as HTMLInputElement, text);

  it('P-ui-04: a long press that opened the number pad, then a cancelled pointer: the next keyboard Enter on the ring still adds', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const holder = ringIn(cardOf('Drink water'))!.parentElement!;
    holder.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('of 8 glasses'), 'the number pad');
    holder.dispatchEvent(pointer('pointercancel', { pointerType: 'touch' }));
    await esc();
    await until(() => !document.querySelector('[role="dialog"]'), 'the pad closed');
    expect(countOn(id, today.value)).toBe(0);
    await keyboardClick(ringIn(cardOf('Drink water')), 'the ring');
    await until(() => countOn(id, today.value) === 1, 'the glass added from the keyboard');
  });

  it('P-ui-04: a long press that opened the number pad and was let go off the ring (no click follows): the next keyboard Enter on the ring still adds', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const holder = ringIn(cardOf('Drink water'))!.parentElement!;
    holder.dispatchEvent(pointer('pointerdown'));
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('of 8 glasses'), 'the number pad');
    // Released off the ring: a pointerup, and no click for the ring to see.
    holder.dispatchEvent(pointer('pointerup'));
    await esc();
    await until(() => !document.querySelector('[role="dialog"]'), 'the pad closed');
    expect(countOn(id, today.value)).toBe(0);
    await keyboardClick(ringIn(cardOf('Drink water')), 'the ring');
    await until(() => countOn(id, today.value) === 1, 'the glass added from the keyboard');
  });

  it('P-ui-04: after a cancelled long press, an activation with no press behind it that still reports detail 1 (an assistive tap; WP-G3 checks what VoiceOver sends) adds', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const holder = ringIn(cardOf('Drink water'))!.parentElement!;
    holder.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('of 8 glasses'), 'the number pad');
    holder.dispatchEvent(pointer('pointercancel', { pointerType: 'touch' }));
    await esc();
    await until(() => !document.querySelector('[role="dialog"]'), 'the pad closed');
    const ring = ringIn(cardOf('Drink water'))!;
    await act(() => void ring.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
    await until(() => countOn(id, today.value) === 1, 'the glass added');
  });

  it('control: the click that ends a long press is not also a tap', async () => {
    state.value = seed(['water']);
    view = mount(<TodayScreen />);
    const id = idOf('Drink water');
    const ring = ringIn(cardOf('Drink water'))!;
    ring.parentElement!.dispatchEvent(pointer('pointerdown'));
    await until(() => document.querySelector('[role="dialog"]')?.textContent?.includes('of 8 glasses'), 'the number pad');
    ring.parentElement!.dispatchEvent(pointer('pointerup'));
    await act(() => void ring.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
    await new Promise((r) => setTimeout(r, 50));
    expect(countOn(id, today.value)).toBe(0);
  });

  it('P-ui-08: closing the note sheet with a line typed in it asks first; Keep editing keeps the line, Leave it drops it', async () => {
    state.value = seed(['walk']);
    view = mount(<TodayScreen />);
    const id = idOf('Walk');
    const sheet = await openNote('Walk');
    await typeNote(sheet, 'It rained all the way.');
    await esc();
    const ask = await until(question, 'the question');
    expect(ask.textContent).toContain('Leave without saving?');
    expect(noteSheet()).toBe(sheet);
    await click(questionButton('Keep editing'), 'Keep editing');
    await until(() => !question(), 'the question gone');
    expect(noteSheet()?.querySelector('textarea')?.value).toBe('It rained all the way.');
    // The close button asks too.
    await click(sheet.querySelector<HTMLButtonElement>('button[aria-label="Close"]'), 'Close');
    await until(question, 'the question again');
    await click(questionButton('Leave it'), 'Leave it');
    await until(() => !noteSheet(), 'the note sheet closed');
    expect(noteOn(id, today.value)).toBeNull();
  });

  it('control: an untouched note sheet closes at once; clearing a kept note asks', async () => {
    state.value = seed(['walk']);
    view = mount(<TodayScreen />);
    const id = idOf('Walk');
    await openNote('Walk');
    await esc();
    await until(() => !noteSheet(), 'the note sheet closed');
    expect(question()).toBeNull();
    await act(() => { setNote(id, today.value, 'Shoes by the door.'); });
    const sheet = await openNote('Walk');
    expect(sheet.querySelector('textarea')?.value).toBe('Shoes by the door.');
    await typeNote(sheet, '');
    await esc();
    await until(question, 'the question');
    expect(noteOn(id, today.value)).toBe('Shoes by the door.');
  });

  describe('dragging the note sheet (jsdom: the panel is 400 px tall)', () => {
    let height: PropertyDescriptor | undefined;
    beforeEach(() => {
      height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });
    });
    afterEach(() => {
      if (height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
    });
    const touch = (type: string, y = 0) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: 0, clientY: y }] });
      return e;
    };
    const pullDown = (header: HTMLElement) =>
      act(() => {
        header.dispatchEvent(touch('touchstart', 100));
        header.dispatchEvent(touch('touchmove', 110));
        header.dispatchEvent(touch('touchmove', 400));
      });

    it('UI2-05: touchcancel after a dismissing pull keeps the sheet and the draft', async () => {
      state.value = seed(['walk']);
      view = mount(<TodayScreen />);
      const sheet = await openNote('Walk');
      await typeNote(sheet, 'It rained all the way.');
      const header = sheet.querySelector<HTMLElement>('[data-sheet-header]')!;
      await pullDown(header);
      expect(sheet.style.transform).toBe('translateY(300px)');
      await act(() => void header.dispatchEvent(touch('touchcancel')));
      // Longer than the sheet's exit (320 ms): a sheet that was closing would be gone by now.
      await act(() => new Promise((r) => setTimeout(r, 400)));
      expect(noteSheet()).toBe(sheet);
      expect(sheet.closest<HTMLElement>('[data-state]')?.dataset.state).toBe('open');
      expect(question()).toBeNull();
      expect(sheet.style.transform).toBe('');
      expect(sheet.querySelector('textarea')?.value).toBe('It rained all the way.');
    });

    it('a finished pull with a draft asks, and Keep editing brings the sheet back to rest', async () => {
      state.value = seed(['walk']);
      view = mount(<TodayScreen />);
      const sheet = await openNote('Walk');
      await typeNote(sheet, 'It rained all the way.');
      const header = sheet.querySelector<HTMLElement>('[data-sheet-header]')!;
      await pullDown(header);
      await act(() => void header.dispatchEvent(touch('touchend')));
      await until(question, 'the question');
      await click(questionButton('Keep editing'), 'Keep editing');
      await until(() => !question(), 'the question gone');
      expect(noteSheet()).toBe(sheet);
      expect(sheet.closest<HTMLElement>('[data-state]')?.dataset.state).toBe('open');
      expect(sheet.style.transform).toBe('');
      expect(sheet.querySelector('textarea')?.value).toBe('It rained all the way.');
    });
  });
});

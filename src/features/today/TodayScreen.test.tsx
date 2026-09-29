// @vitest-environment jsdom
/**
 * The Today screen against the real store: one h1, the empty sill, watering and un-watering with the
 * note, the list that never regroups on a tap, the week strip's roving focus and the past-day banner,
 * the ⋯ menu, a rest day, the number pad, and the Habit Editor planting a new habit.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { transact } from '@/domain/tx';
import { openDay } from '@/domain/rollover';
import * as habitsDomain from '@/domain/habits';
import { mulberry32 } from '@/domain/rng';
import { appDayKey, runtimeLocalTime } from '@/domain/dates';
import { state, today } from '@/state/store';
import type { AppState } from '@/state/types';
import { toasts } from '@/ui/toast';
import { habitEditorRequest } from '@/features/habits/open';
import { SheetHosts } from '@/app/SheetHosts';
import { TodayScreen } from './TodayScreen';
import { selectedDay } from './state';
import { button, click, installDom, key, mount, type, until } from '@/features/capsules/testing';

function seed(templateIds: string[], name = 'Sam'): AppState {
  const now = Date.now() - 3_600_000;
  const env = { now, today: appDayKey(now, 180, runtimeLocalTime), local: runtimeLocalTime, rng: mulberry32(9) };
  return transact(createInitialState(now - 86_400_000 * 8), env, (tx) => {
    openDay(tx);
    habitsDomain.completeOnboarding(tx, { name, templateIds });
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
  it('has exactly one h1: the greeting', () => {
    state.value = seed(['water', 'walk', 'read']);
    today.value = appDayKey(Date.now(), 180, runtimeLocalTime);
    view = mount(<TodayScreen />);
    const h1s = document.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toMatch(/, Sam\.$/);
    expect(document.querySelector('[role="radiogroup"]')?.querySelectorAll('[role="radio"]')).toHaveLength(7);
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
    await type(dialog.querySelector<HTMLInputElement>('input[type="text"]')!, 'Read a chapter');
    await click(plant(), 'Plant it');
    await until(() => state.value.habits.some((h) => h.name === 'Read a chapter'), 'the new habit');
    expect(state.value.habits.find((h) => h.name === 'Read a chapter')!.icon).toBe('book');
    await until(() => cardOf('Read a chapter'), 'its card on Today');
  });
});

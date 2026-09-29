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

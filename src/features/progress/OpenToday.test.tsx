// @vitest-environment jsdom
/**
 * "Open Today" from a calendar day in the week strip's window (WP-C7, domain-w2-d2): the hand-off
 * closes Habit Detail, selects the day on Today, goes to Today and puts focus on the habit's ring for
 * that day, so the next Enter waters it. From Today (the Detail sheet was over Today) and from
 * Progress (the Detail sheet was over Progress, and from Progress's own calendar with no sheet).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeHabitDetail, habitDetailRequest, openHabitDetail } from '@/features/habits/open';
import { ritualRequest } from '@/features/rituals/open';
import { state } from '@/state/store';
import type { AppState } from '@/state/types';
import { toasts } from '@/ui/toast';
import { SheetHosts } from '@/app/SheetHosts';
import { currentTab } from '@/app/router';
import { TodayScreen } from '@/features/today/TodayScreen';
import { selectedDay } from '@/features/today/state';
import { ProgressScreen } from './ProgressScreen';
import { TODAY, click, demoState, installDom, mount, until, useState_ } from './testing';

vi.setConfig({ testTimeout: 30_000 });

const YESTERDAY = '2026-09-28';
let views: ReturnType<typeof mount>[] = [];
let habitId = '';

/** The demo with "Take vitamins" not yet watered yesterday, so the ring has something to do. */
function household(): AppState {
  const s = demoState();
  habitId = s.habits.find((h) => h.name === 'Take vitamins')!.id;
  const { [YESTERDAY]: _gone, ...rest } = s.logs[habitId] ?? {};
  return { ...s, logs: { ...s.logs, [habitId]: rest } };
}

const openDialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const ringFor = (id: string) => document.querySelector<HTMLButtonElement>(`article[data-habit="${id}"] button[data-state]`);

beforeAll(() => {
  installDom();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
}, 60_000);
beforeEach(() => {
  useState_(household());
  closeHabitDetail();
  ritualRequest.value = null;
  selectedDay.value = null;
  toasts.value = [];
  // Where the router would have it (src/app/router.ts, not started here).
  location.hash = '#/progress';
  currentTab.value = 'progress';
});
afterEach(() => {
  for (const v of views.reverse()) v.unmount();
  views = [];
  closeHabitDetail();
  selectedDay.value = null;
});

/** Opens Habit Detail, picks yesterday in its calendar, and returns the "Open Today" link. */
async function openTodayLinkInDetail(): Promise<HTMLAnchorElement> {
  openHabitDetail(habitId);
  const detail = await until(() => document.querySelector<HTMLElement>(`[data-habit-detail="${habitId}"]`), 'Habit Detail');
  const day = await until(() => detail.querySelector<HTMLButtonElement>(`[data-date="${YESTERDAY}"]`), 'yesterday in its calendar');
  await click(day, 'yesterday');
  return until(() => detail.querySelector<HTMLAnchorElement>('a[href="#/today"]'), 'Open Today');
}

describe('Open Today (WP-C7)', () => {
  it('from Habit Detail over Today: no dialog is left, yesterday is selected, focus is on its ring, and Enter waters it', async () => {
    location.hash = '#/today';
    currentTab.value = 'today';
    views.push(mount(<TodayScreen />), mount(<SheetHosts />));
    const link = await openTodayLinkInDetail();
    await click(link, 'Open Today');
    expect(habitDetailRequest.value).toBeNull();
    await until(() => !openDialog(), 'the Detail sheet to go');
    expect(selectedDay.value).toBe(YESTERDAY);
    expect(location.hash).toBe('#/today');
    const ring = await until(() => ringFor(habitId), 'the habit’s card on yesterday');
    await until(() => document.activeElement === ring, 'focus on the ring');
    expect(ring.getAttribute('aria-label')).toMatch(/Take vitamins/);
    const todayBefore = state.value.logs[habitId]?.[TODAY];
    await click(ring, 'the ring');
    expect(state.value.logs[habitId]?.[YESTERDAY]).toMatchObject({ kind: 'log', count: 1 });
    expect(state.value.logs[habitId]?.[TODAY]).toEqual(todayBefore);
  });

  it('a habit in a folded row ("This month"): the row opens for it and focus lands on its ring', async () => {
    location.hash = '#/today';
    currentTab.value = 'today';
    habitId = state.value.habits.find((h) => h.name === 'Deep clean')!.id;
    views.push(mount(<TodayScreen />), mount(<SheetHosts />));
    // Before the hand-off the row is folded: the card isn't on the page.
    expect(ringFor(habitId)).toBeNull();
    await click(await openTodayLinkInDetail(), 'Open Today');
    await until(() => !openDialog(), 'the Detail sheet to go');
    const ring = await until(() => ringFor(habitId), 'the habit’s card, its row open');
    await until(() => document.activeElement === ring, 'focus on the ring');
    expect(ring.closest('ul')?.hidden).toBe(false);
  });

  it('from Habit Detail over Progress: the sheet closes, the route is Today with yesterday selected, and Today lands on the habit', async () => {
    views.push(mount(<ProgressScreen />), mount(<SheetHosts />));
    const link = await openTodayLinkInDetail();
    await click(link, 'Open Today');
    expect(habitDetailRequest.value).toBeNull();
    await until(() => !openDialog(), 'the Detail sheet to go');
    expect(location.hash).toBe('#/today');
    expect(selectedDay.value).toBe(YESTERDAY);
    // The route change brings Today in (ScreenHost does it in the app).
    views.shift()!.unmount();
    views.push(mount(<TodayScreen />));
    const ring = await until(() => ringFor(habitId), 'the habit’s card on yesterday');
    await until(() => document.activeElement === ring, 'focus on the ring');
  });

  it('from Progress’s own calendar (no sheet): Today opens on that day with focus on the habit', async () => {
    views.push(mount(<ProgressScreen />));
    await until(() => document.querySelector('[data-section="calendar"] [role="radio"]'), 'the calendar filter');
    const radio = Array.from(document.querySelectorAll<HTMLElement>('[data-section="calendar"] [role="radio"]')).find((r) => r.textContent?.trim() === 'Take vitamins');
    await click(radio, 'the Take vitamins filter');
    expect(radio!.getAttribute('aria-checked')).toBe('true');
    await click(await until(() => document.querySelector(`[data-section="calendar"] [data-date="${YESTERDAY}"]`), 'yesterday'), 'yesterday');
    const link = await until(() => document.querySelector<HTMLAnchorElement>('[data-section="calendar"] a[href="#/today"]'), 'Open Today');
    await click(link, 'Open Today');
    expect(location.hash).toBe('#/today');
    expect(selectedDay.value).toBe(YESTERDAY);
    views.shift()!.unmount();
    views.push(mount(<TodayScreen />));
    const ring = await until(() => ringFor(habitId), 'the habit’s card on yesterday');
    await until(() => document.activeElement === ring, 'focus on the ring');
  });
});

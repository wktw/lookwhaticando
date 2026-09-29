// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeHabitDetail, habitDetailRequest, habitEditorRequest, openHabitDetail } from '@/features/habits/open';
import { state } from '@/state/store';
import * as store from '@/state/store';
import { toasts } from '@/ui/toast';
import { button, click, demoState, dialog, installDom, key, mount, until, useState_ } from '@/features/progress/testing';
import HabitDetailHost from './HabitDetailHost';

vi.setConfig({ testTimeout: 30_000 });

let view: ReturnType<typeof mount> | null = null;
const idOf = (name: string) => state.value.habits.find((h) => h.name === name)!.id;
const detail = () => document.querySelector<HTMLElement>('[data-habit-detail]');

beforeAll(() => installDom());
beforeEach(() => {
  useState_(demoState());
  toasts.value = [];
  habitEditorRequest.value = null;
  closeHabitDetail();
  view = mount(<HabitDetailHost />);
});
afterEach(() => {
  closeHabitDetail();
  view?.unmount();
  view = null;
  vi.restoreAllMocks();
});

async function openFor(name: string) {
  openHabitDetail(idOf(name));
  return until(detail, `${name}’s detail`);
}

describe('Habit Detail', () => {
  it('opens as a dialog named after the habit, with its plant, stage and forecast in waterings', async () => {
    const d = await openFor('Read');
    expect(dialog()!.getAttribute('aria-labelledby')).toBeTruthy();
    expect(d.querySelector('h2')!.textContent).toBe('Read');
    expect(d.querySelector('[data-hero-plant]')!.getAttribute('aria-label')).toMatch(/^Read, [A-Z]/);
    expect(d.textContent).toMatch(/\d+ more waterings? to [A-Z][a-z]+\.|Evergreen\. Small visitors arrive from here on\./);
    expect(d.textContent).not.toMatch(/sunshine/i);
  });

  it('has the Garden Journal, stat tiles, why it matters and Moments, newest first', async () => {
    const d = await openFor('Read');
    expect(d.querySelector('[data-detail="journal"] li')).not.toBeNull();
    expect(d.querySelector('[data-detail="stats"] dl')).not.toBeNull();
    const dates = Array.from(d.querySelectorAll('[data-detail="moments"] li')).map((li) => li.textContent);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('stars a moment for the Sunday Note', async () => {
    const d = await openFor('Read');
    const star = d.querySelector<HTMLButtonElement>('[data-detail="moments"] button[aria-pressed]')!;
    const was = star.getAttribute('aria-pressed') === 'true';
    await click(star, 'the star');
    await until(() => d.querySelector('[data-detail="moments"] button[aria-pressed]')!.getAttribute('aria-pressed') === String(!was), 'the star to toggle');
  });

  it('the look chooser is a radio group; choosing Classic calls setPlantLook(null)', async () => {
    const withLook = state.value.habits.find((h) => (state.value.plantLooks?.[h.id]?.looks.length ?? 0) > 0)!;
    const d = await openFor(withLook.name);
    const spy = vi.spyOn(store, 'setPlantLook');
    const group = d.querySelector('[data-detail="tag"] [role="radiogroup"]')!;
    const classic = Array.from(group.querySelectorAll('[role="radio"]')).find((r) => r.textContent === 'Classic')!;
    if (classic.getAttribute('aria-checked') === 'true') await key(classic, 'ArrowRight');
    else await click(classic, 'Classic');
    expect(spy).toHaveBeenCalled();
  });

  it('Edit opens the Habit Editor on this habit', async () => {
    await openFor('Yoga');
    await click(button('Edit'), 'Edit');
    expect(habitEditorRequest.value).toEqual({ id: idOf('Yoga') });
  });

  it('Pause asks “Back on…” and says when it comes back', async () => {
    await openFor('Yoga');
    const spy = vi.spyOn(store, 'pauseHabit');
    await click(button('Pause Yoga'), 'Pause');
    const form = document.querySelector('[data-detail="actions"] form')!;
    expect(form.textContent).toMatch(/Back on/);
    await click(form.querySelector('button[type="submit"]'), 'the pause button');
    expect(spy).toHaveBeenCalledWith(idOf('Yoga'), '2026-09-29', '2026-10-05');
    expect(String(toasts.value.at(-1)?.message)).toBe('Yoga is resting until Oct 6.');
    await until(() => button('Bring it back'), 'Bring it back');
  });

  it('Delete asks, then offers to keep the plant on the balcony shelf', async () => {
    await openFor('Deep clean');
    const spy = vi.spyOn(store, 'deleteHabit');
    await click(button('Delete'), 'Delete');
    const ask = await until(() => document.querySelector('[role="alertdialog"]'), 'the delete question');
    expect(ask.textContent).toMatch(/Delete Deep clean\?/);
    expect(ask.textContent).toMatch(/The plant and its history go too\./);
    await click(Array.from(ask.querySelectorAll('button')).find((b) => b.textContent === 'Delete'), 'confirm');
    const keep = await until(() => Array.from(document.querySelectorAll('[role="alertdialog"]')).find((d) => d.textContent?.includes('Keep the plant on the balcony shelf?')), 'the keep question');
    await click(Array.from(keep.querySelectorAll('button')).find((b) => b.textContent === 'Keep it on the balcony'), 'keep');
    expect(spy).toHaveBeenCalledWith(idOf('Deep clean'), { keepPlant: true });
    expect(habitDetailRequest.value).toBeNull();
  });

  it('an archived habit can come back to the sill', async () => {
    const s = demoState();
    const id = idOf('Deep clean');
    useState_({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, archivedOn: '2026-09-20' } : h)) });
    const d = await openFor('Deep clean');
    expect(d.textContent).toMatch(/On the balcony shelf since Sep 20/);
    const spy = vi.spyOn(store, 'restoreHabit');
    await click(button('Bring it back to the sill'), 'restore');
    expect(spy).toHaveBeenCalledWith(id);
  });

  it('Tune my habits offers the fresh-start chips as a radio group', async () => {
    await openFor('Go for a walk');
    await click(button('Tune my habits'), 'Tune');
    const group = document.querySelector('[data-detail="actions"] [role="radiogroup"]')!;
    const labels = Array.from(group.querySelectorAll('[role="radio"]')).map((r) => r.textContent);
    expect(labels[0]).toBe('Keep going');
    expect(labels).toContain('Rest till next season');
    expect(labels).toContain('Finish');
  });

  it('the companion and its stories: unlocked ones open on tap, waiting ones say how many waterings', async () => {
    const d = await openFor('Read');
    const company = d.querySelector('[data-detail="company"]')!;
    expect(company).not.toBeNull();
    const first = company.querySelector<HTMLButtonElement>('[data-story] button')!;
    await click(first, 'a story');
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(company.querySelector('[data-story] p')!.textContent).toMatch(/^The start\./);
    for (const w of company.querySelectorAll('[data-story]')) expect(w.textContent).not.toMatch(/\b0\b/);
  });
});

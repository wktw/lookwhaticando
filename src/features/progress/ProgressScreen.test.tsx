// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { habitDetailRequest } from '@/features/habits/open';
import { ritualRequest } from '@/features/rituals/open';
import { createInitialState } from '@/state/defaults';
import { state } from '@/state/store';
import * as store from '@/state/store';
import { toasts } from '@/ui/toast';
import { ProgressScreen } from './ProgressScreen';
import { TODAY, button, click, demoState, dialog, installDom, key, mount, until, useState_ } from './testing';

vi.setConfig({ testTimeout: 30_000 });

let view: ReturnType<typeof mount> | null = null;
const sections = () => Array.from(document.querySelectorAll('[data-section]')).map((el) => el.getAttribute('data-section'));

beforeAll(() => installDom());
beforeEach(() => {
  useState_(demoState());
  habitDetailRequest.value = null;
  ritualRequest.value = null;
  toasts.value = [];
});
afterEach(() => {
  view?.unmount();
  view = null;
  vi.restoreAllMocks();
});

async function open() {
  view = mount(<ProgressScreen />);
  await until(() => document.querySelector('[data-section="memory"]'), 'the sections below the fold');
}

describe('the Progress screen', () => {
  it('has exactly one h1 and the sections in DESIGN §9.2 order', async () => {
    await open();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('h1')!.textContent).toBe('Progress');
    expect(sections()).toEqual(['months', 'plants', 'calendar', 'year', 'records', 'insights', 'pins', 'memory']);
  });

  it('the hero says showing up over time, never a streak, never a 0', async () => {
    await open();
    const hero = document.querySelector('[data-hero]')!;
    expect(hero.textContent).toMatch(/You showed up \d+ of the last 30 days/);
    expect(hero.textContent).not.toMatch(/streak|\b0 of|missed/i);
    // this month's weighted percentage is a labelled progressbar
    const ring = hero.querySelector('[role="progressbar"]');
    expect(ring?.getAttribute('aria-label')).toBe('September');
  });

  it('the recent months are labelled bars; the words are the text alternative', async () => {
    await open();
    const rows = Array.from(document.querySelectorAll('[data-section="months"] li')).map((li) => li.textContent);
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) expect(r).toMatch(/^[A-Z][a-z]{2}( · \d+ days?)?/);
    expect(rows[rows.length - 1]).toMatch(/so far$/);
  });

  it('a plant opens its Habit Detail', async () => {
    await open();
    const plant = button(/^Read, /)!;
    expect(plant.getAttribute('aria-label')).toMatch(/^Read, (Cutting|Rooting|Potted|Leafy|Budding|Blooming|Flourishing|Evergreen)$/);
    await click(plant, 'the Read plant');
    const id = state.value.habits.find((h) => h.name === 'Read')!.id;
    expect(habitDetailRequest.value).toBe(id);
  });

  it('the year is aria-hidden, with its summary as text', async () => {
    await open();
    const year = document.querySelector('[data-section="year"]')!;
    expect(year.querySelector('[data-year-strip]')!.getAttribute('aria-hidden')).toBe('true');
    expect(year.textContent).toMatch(/\d+ waterings in 2026, across \d+ days/);
  });

  it('unearned pins say “not yet”, and a hidden pin is not on the shelf', async () => {
    await open();
    const pins = Array.from(document.querySelectorAll('[data-pin]'));
    expect(pins.some((p) => p.getAttribute('data-earned') === 'false' && /not yet$/.test(p.getAttribute('aria-label')!))).toBe(true);
    expect(pins.some((p) => p.getAttribute('data-pin') === 'comeback' && p.getAttribute('data-earned') === 'false')).toBe(false);
    await click(pins[0], 'a pin');
    const d = await until(dialog, 'the pin sheet');
    expect(d.textContent).toMatch(/Earned|of|not yet/);
  });

  it('the memory shelf opens a Sunday Note in the reader, and reading it files it as read', async () => {
    await open();
    const note = document.querySelector<HTMLButtonElement>('button[data-ritual="sundayNote"]')!;
    const id = state.value.inbox.filter((l) => l.kind === 'weekly').sort((a, b) => (a.kind === 'weekly' && b.kind === 'weekly' && a.weekStart < b.weekStart ? 1 : -1))[0]!.id;
    await click(note, 'the newest note');
    expect(ritualRequest.value).toEqual({ kind: 'letter', id });
    const paper = await until(() => document.querySelector('[role="dialog"] [data-ritual="sundayNote"]'), 'the Sunday Note');
    expect(paper.textContent).toMatch(/^Week of [A-Z][a-z]{2} \d+\./);
    expect(paper.textContent).not.toMatch(/%/);
    await until(() => state.value.inbox.find((l) => l.id === id)?.readAt !== undefined, 'the note to be read');
  });
});

describe('the calendar', () => {
  it('filters by habit through a radio group with roving focus', async () => {
    await open();
    const group = document.querySelector('[role="radiogroup"]')!;
    const radios = () => Array.from(group.querySelectorAll('[role="radio"]'));
    expect(radios()[0]!.getAttribute('aria-checked')).toBe('true');
    expect(radios().filter((r) => r.getAttribute('tabindex') === '0')).toHaveLength(1);
    await key(radios()[0]!, 'ArrowRight');
    expect(radios()[1]!.getAttribute('aria-checked')).toBe('true');
    expect(radios()[1]!.getAttribute('tabindex')).toBe('0');
  });

  it('a day is a named button; tapping one shows its notes', async () => {
    await open();
    const day = document.querySelector<HTMLButtonElement>(`[data-section="calendar"] [data-date="${TODAY.slice(0, 8)}14"]`)!;
    expect(day.getAttribute('aria-label')).toMatch(/^Monday, September 14/);
    await click(day, 'Sep 14');
    const panel = document.querySelector('[data-section="calendar"] section')!;
    expect(panel.textContent).toMatch(/Monday, September 14/);
    expect(panel.textContent).toMatch(/No notes on Sep 14\.|‘|\w/);
  });

  it('arrow keys move between days, one tab stop at a time', async () => {
    await open();
    const cal = document.querySelector('[data-section="calendar"]')!;
    const stop = () => Array.from(cal.querySelectorAll<HTMLButtonElement>('[data-date]')).filter((b) => b.tabIndex === 0);
    expect(stop()).toHaveLength(1);
    const first = stop()[0]!;
    await key(first, 'ArrowLeft');
    await until(() => stop()[0]!.dataset.date !== first.dataset.date, 'the tab stop to move');
    expect(stop()[0]!.dataset.date! < first.dataset.date!).toBe(true);
  });

  it('an older day fixes history (no coins), and a refusal points to the week strip', async () => {
    await open();
    const radios = Array.from(document.querySelectorAll('[role="radio"]'));
    await click(radios.find((r) => r.textContent === 'Go for a walk'), 'the Walk filter');
    const coins = state.value.wallet.coins;
    const spy = vi.spyOn(store, 'editHistory');
    const day = document.querySelector<HTMLButtonElement>(`[data-section="calendar"] [data-date="2026-09-03"]`)!;
    await click(day, 'Sep 3');
    const edit = button(/^Water it for Sep 3$|^Not watered after all$/)!;
    expect(document.querySelector('[data-section="calendar"] section')!.textContent).toMatch(/Fixes history\. No coins for this one\./);
    await click(edit, 'the history edit');
    expect(spy).toHaveBeenCalledWith(expect.any(String), '2026-09-03', expect.any(Boolean));
    expect(state.value.wallet.coins).toBe(coins);
    spy.mockReturnValueOnce(false);
    const again = button(/^Water it for Sep 3$|^Not watered after all$/)!;
    await click(again, 'the history edit');
    expect(toasts.value.at(-1)?.message).toBe('That day is watered from the week strip on Today.');
  });

  it('the last 6 days point to the week strip on Today', async () => {
    await open();
    const radios = Array.from(document.querySelectorAll('[role="radio"]'));
    await click(radios[1], 'a habit filter');
    await click(document.querySelector(`[data-section="calendar"] [data-date="2026-09-27"]`), 'Sep 27');
    const panel = document.querySelector('[data-section="calendar"] section')!;
    expect(panel.textContent).toMatch(/The last 6 days are watered from the week strip on Today\./);
    expect(panel.querySelector('a[href="#/today"]')).not.toBeNull();
  });
});

describe('first days and quiet', () => {
  it('with no habits: one calm empty state and a way to add one', async () => {
    useState_({ ...createInitialState(Date.UTC(2026, 8, 29)), profile: { name: 'Sam', onboarded: true, createdAt: Date.UTC(2026, 8, 29) } });
    view = mount(<ProgressScreen />);
    expect(document.body.textContent).toMatch(/This fills in as you water\./);
    expect(button('Add a habit')).not.toBeNull();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('with Quiet rewards on, no coin or stamp amounts show on the ladder or pins', async () => {
    const s = demoState();
    useState_({ ...s, settings: { ...s.settings, quietRewards: true } });
    await open();
    await click(document.querySelector('[data-pin][data-earned="true"]'), 'an earned pin');
    const d = await until(dialog, 'the pin sheet');
    expect(d.textContent).not.toMatch(/stamp/);
  });
});

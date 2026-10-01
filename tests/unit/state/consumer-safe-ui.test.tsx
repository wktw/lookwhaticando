// @vitest-environment jsdom
/**
 * WP-A5 in the interface (P-persistence-06): choosing a backup file past the import bound says so
 * from its size alone, and never reads it, even while an earlier paste is still being read. And the
 * two date inputs on Habit Detail stay inside the calendar a save names (the review's blocker).
 * Cases marked "failed before" failed against the code before WP-A5 (416f43d); those marked
 * "review" failed against the code before the WP-A5 review's fixes (558876b).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import * as store from '@/state/store';
import { ERRORS } from '@/catalog/lines';
import { DAY_MAX, DAY_MIN } from '@/domain/dayRange';
import { ImportSheet } from '@/features/you/ImportSheet';
import { Actions } from '@/features/habits/detail/Actions';
import { selectHabitDetail } from '@/state/selectors';
import { toasts } from '@/ui/toast';
import { installDom, mount, type, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

// The store's previewImport is wrapped so a test can hold one preview back.
vi.mock('@/state/store', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/state/store')>();
  return { ...real, previewImport: vi.fn(real.previewImport) };
});

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
});

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  store.configureStore({ locks: null });
  localStorage.clear();
});

/** Chooses `file` in the sheet's hidden file input. */
async function choose(file: unknown): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('Import a backup: a file too big to be one', () => {
  it('says it is too big, and never reads it (failed before)', async () => {
    fakeBrowser();
    store.hydrate();
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const text = vi.fn(async () => '{}');
    await choose({ name: 'huge.json', size: 64 * 1024 * 1024 + 1, type: 'application/json', text });
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the error line');
    expect(alert.textContent).toBe(ERRORS.tooLarge);
    expect(text).not.toHaveBeenCalled();
  });
});

describe('Import a backup: a too-big file chosen while a paste is still being read', () => {
  it('the paste’s late preview never replaces the too-large line, and Import is never offered (review)', async () => {
    fakeBrowser();
    store.hydrate();
    const backup = store.backupJson();
    let release: () => void = () => undefined;
    const real = (await vi.importActual<typeof import('@/state/store')>('@/state/store')).previewImport;
    vi.mocked(store.previewImport).mockImplementationOnce(async (text: string) => {
      await new Promise<void>((r) => (release = r));
      return real(text);
    });
    view = mount(<ImportSheet open onClose={() => undefined} />);
    const area = document.querySelector('textarea')!;
    await type(area as unknown as HTMLInputElement, backup);
    await choose({ name: 'huge.json', size: 64 * 1024 * 1024 + 1, type: 'application/json', text: async () => '{}' });
    await act(async () => {
      release();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(ERRORS.tooLarge);
    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});

describe('Habit Detail: the date inputs stay inside the calendar a save names', () => {
  const walk = {
    name: 'Walk',
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
  } as const;

  function openActions() {
    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit({ ...walk, schedule: { kind: 'daily' } });
    view = mount(<Actions vm={selectHabitDetail(id).value!} onGone={() => undefined} />);
    return id;
  }
  const panelButton = (i: number) => document.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')[i]!;
  const habit = (id: string) => store.state.value.habits.find((h) => h.id === id)!;

  it('“Back on…” stops at 2999-12-31, and a later day typed in pauses nothing (review)', async () => {
    const id = openActions();
    await act(() => panelButton(0).click());
    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(input.max).toBe(DAY_MAX);
    toasts.value = [];
    await type(input, '3026-10-05');
    await act(() => void input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(habit(id).pauses).toEqual([]);
    // Nothing says it paused, and the panel stays open with the day she typed.
    expect(toasts.value).toEqual([]);
    expect(document.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('3026-10-05');
  });

  it('“Start tracking from” stops at 1900-01-01, and an earlier day typed in changes nothing (review)', async () => {
    const id = openActions();
    const startedOn = habit(id).startedOn;
    await act(() => panelButton(1).click());
    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(input.min).toBe(DAY_MIN);
    await type(input, '1899-12-31');
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    await act(() => void input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(habit(id).startedOn).toBe(startedOn);
    expect(document.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('1899-12-31');
  });
});

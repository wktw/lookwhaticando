// @vitest-environment jsdom
/**
 * Onboarding truth and ownership on screen (WP-C5: creative-cr-d1, UI2-07, P-ui-13, P-ui-16), with
 * the real store on a fake browser. A refused planting stays on the picks, keeps them and points to
 * "Use here"; a refused step write stays on its step; a step another window takes is the step shown
 * here; a name chosen on step 5 survives Skip; an import from the sill lands where its save is.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { createInitialState } from '@/state/defaults';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { currentTab } from '@/app/router';
import { ShellBanners } from '@/app/App';
import { button, click, installDom, mount, type, until } from '@/features/capsules/testing';
import { fakeBrowser, fakeLocks } from '../../../tests/unit/state/fixtures';
import { onboardingActive, onboardingProgress, reloadProgress, saveProgress } from './progress';
import { Onboarding } from './Onboarding';

vi.setConfig({ testTimeout: 30_000 });

const USE_HERE = 'Choose Use here above to carry on in this window.';
const READ_ONLY = 'This window can’t change the save right now.';
const GEN = 'e'.repeat(32);
/** The capsule steps' chunk is transformed on first import: room for a busy machine. */
const LOAD = 20_000;

let view: ReturnType<typeof mount> | null = null;
const h1 = () => document.querySelector('h1')?.textContent;
const byText = (text: string) => Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) ?? null;
const note = () => document.querySelector('[data-onboarding-note]')?.textContent ?? null;
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));
type Saved = { rev: number; state: AppState };
const saved = (b: ReturnType<typeof fakeBrowser>) => JSON.parse(b.storage.getItem(SAVE_KEY)!) as Saved;

function show() {
  view = mount(
    <main id="main" tabIndex={-1}>
      <ShellBanners />
      <Onboarding />
    </main>,
  );
}

/** This window opens on `s`, written by another window that keeps the writer lock. */
function readOnlyOn(s: AppState, rev = 1) {
  const held = { byOther: true };
  const b = fakeBrowser({ locks: fakeLocks(held) });
  b.storage.setItem(SAVE_KEY, encodeEnvelope(s, rev, 0, 'other', GEN));
  store.hydrate();
  return { b, held };
}

/** A save planted by onboarding's own Plant (step 3), made by a real store session. */
function planted(templateIds = ['walk', 'read']): AppState {
  fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds, inFlow: true });
  return store.state.value;
}

async function toPicks() {
  await click(byText('Next'), 'Next');
  expect(h1()).toBe('Pick up to 3.');
}

beforeAll(() => {
  installDom();
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver ??= RO;
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver ??= RO;
});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  reloadProgress();
  location.hash = '';
});
afterEach(() => {
  view?.unmount();
  view = null;
  document.body.innerHTML = '';
  store.configureStore({ locks: null });
});

describe('creative-cr-d1: a refused planting stays on the picks', () => {
  it('read-only: the picks stay chosen, the note points to Use here; after Use here, Plant gives one set of habits', async () => {
    const { b, held } = readOnlyOn(createInitialState(Date.UTC(2026, 8, 29)));
    expect(store.readOnly.value).toBe('other-window');
    show();
    await toPicks();
    await click(button('Walk'), 'Walk');
    await click(button('Read'), 'Read');
    await click(byText('Plant these'), 'Plant these');

    expect(h1()).toBe('Pick up to 3.');
    expect(button('Walk')!.getAttribute('aria-pressed')).toBe('true');
    expect(button('Read')!.getAttribute('aria-pressed')).toBe('true');
    expect(note()).toBe(USE_HERE);
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(store.state.value.habits).toHaveLength(0);

    held.byOther = false;
    await click(button('Use here'), 'Use here');
    await settle();
    expect(store.readOnly.value).toBe(false);
    expect(note()).toBeNull();
    await click(byText('Plant these'), 'Plant these');
    expect(h1()).toBe('Anything already done today?');
    expect(store.state.value.profile.onboarded).toBe(true);
    expect(store.state.value.habits.map((h) => h.name)).toEqual(['Walk', 'Read']);
    store.flushSaves();
    expect(saved(b).state.habits.map((h) => h.name)).toEqual(['Walk', 'Read']);
    expect(saved(b).state.profile).toMatchObject({ onboarded: true, onboardingStep: { step: 'today' } });
  });

  it('Skip on the picks while read-only is refused too: no step 4, the note instead', async () => {
    readOnlyOn(createInitialState(Date.UTC(2026, 8, 29)));
    show();
    await toPicks();
    await click(byText('Skip'), 'Skip');
    expect(h1()).toBe('Pick up to 3.');
    expect(note()).toBe(USE_HERE);
    expect(store.state.value.profile.onboarded).toBe(false);
  });

  it('a newer catkin’s save: the note says this window can’t change it (no Use here to point to)', async () => {
    const b = fakeBrowser();
    const s = createInitialState(Date.UTC(2026, 8, 29));
    b.storage.setItem(SAVE_KEY, encodeEnvelope({ ...s, version: 2 } as AppState, 1, 0, 'newer', GEN));
    store.hydrate();
    expect(store.readOnly.value).toBe('newer-version');
    show();
    await toPicks();
    await click(button('Walk'), 'Walk');
    await click(byText('Plant it'), 'Plant it');
    expect(h1()).toBe('Pick up to 3.');
    expect(note()).toBe(READ_ONLY);
  });
});

describe('UI2-07: the late steps follow the save', () => {
  it('a step write refused (the lock taken by another window) stays on its step, with the note', async () => {
    const held = { byOther: false };
    const locks = fakeLocks(held);
    fakeBrowser({ locks });
    store.hydrate();
    await settle();
    show();
    await toPicks();
    await click(button('Walk'), 'Walk');
    await click(byText('Plant it'), 'Plant it');
    expect(h1()).toBe('Anything already done today?');

    await act(() => locks.stolen());
    await settle();
    expect(store.readOnly.value).toBe('other-window');
    await click(byText('Next'), 'Next');
    expect(h1()).toBe('Anything already done today?');
    expect(note()).toBe(USE_HERE);
    await click(byText('Skip'), 'Skip');
    expect(h1()).toBe('Anything already done today?');
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });
  });

  it('the other window moves on: this window shows the step it moved to', async () => {
    const a = planted();
    const { b } = readOnlyOn(a, 3);
    show();
    expect(h1()).toBe('Anything already done today?');
    const onFirst = { ...a, profile: { ...a.profile, onboardingStep: { step: 'first', habitIds: a.habits.map((h) => h.id) } } } as AppState;
    await act(() => {
      b.storage.setItem(SAVE_KEY, encodeEnvelope(onFirst, 4, 0, 'other', GEN));
      b.fire('storage', { key: SAVE_KEY });
    });
    await until(() => h1() === 'Who comes home first?' && button(/^No\. 01 · Cats/), 'step 4, as the other window has it', LOAD);
  });

  it('the other window starts over mid-step: this window goes back to the sill', async () => {
    const { b } = readOnlyOn(planted(), 3);
    show();
    expect(h1()).toBe('Anything already done today?');
    await act(() => {
      b.storage.removeItem(SAVE_KEY);
      b.fire('storage', { key: SAVE_KEY, newValue: null });
    });
    expect(h1()).toBe('New place. Which plants came with you?');
    expect(onboardingActive.value).toBe(true);
  });
});

describe('P-ui-13: a name chosen on step 5 survives Skip', () => {
  async function onStep5() {
    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk'], inFlow: true });
    const got = store.pull('cats', { free: true });
    if (!got.ok || !got.pet) throw new Error('no first pet');
    store.finishReveal();
    const petId = got.pet.id;
    saveProgress({ step: 'place', habitIds: store.state.value.habits.map((h) => h.id), petId });
    show();
    const name = store.state.value.pets[petId]!.name;
    await until(() => h1() === `Find ${name} a plant`, 'step 5', LOAD);
    // (The step's heading stands while its chunk loads: wait for the step itself.)
    await click(await until(() => byText('Rename'), 'Rename', LOAD), 'Rename');
    return { petId, name };
  }

  it('a suggestion tapped, then Skip: the pet keeps the suggestion', async () => {
    const { petId, name } = await onStep5();
    const ideas = document.querySelector('[role="group"][aria-label="Name ideas"]')!;
    const idea = Array.from(ideas.querySelectorAll('button')).find((b) => b.textContent !== name && b.textContent !== 'Another name')!;
    const chosen = idea.textContent!;
    await click(idea, 'a name idea');
    await click(byText('Skip'), 'Skip');
    expect(store.state.value.pets[petId]!.name).toBe(chosen);
    expect(onboardingActive.value).toBe(false);
    expect(currentTab.value).toBe('today');
  });

  it('a name typed, then Skip (no blur first): the pet keeps it', async () => {
    const { petId } = await onStep5();
    await type(document.querySelector('#onb-pet-name') as HTMLInputElement, 'Biscuit');
    await click(byText('Skip'), 'Skip');
    expect(store.state.value.pets[petId]!.name).toBe('Biscuit');
  });
});

describe('P-ui-16: an import from the sill lands where its save is', () => {
  async function importFromSill(backup: string) {
    fakeBrowser();
    store.hydrate();
    show();
    await click(byText('Import a backup'), 'Import a backup');
    const box = await until(() => document.querySelector<HTMLTextAreaElement>('textarea'), 'the paste box');
    await type(box as unknown as HTMLInputElement, backup);
    await click(await until(() => byText('Import'), 'Import', LOAD), 'Import');
  }

  it('a mature quiet save: Today, with its quiet rewards', async () => {
    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Maya', templateIds: ['water', 'walk', 'read'] });
    store.updateSettings({ quietRewards: true });
    const backup = store.backupJson();
    await importFromSill(backup);
    await until(() => !onboardingActive.value, 'onboarding to end');
    expect(currentTab.value).toBe('today');
    expect(store.state.value.profile.name).toBe('Maya');
    expect(store.state.value.settings.quietRewards).toBe(true);
  });

  it('a save made mid-onboarding: its own step, not Today', async () => {
    const a = planted(['walk']);
    saveProgress({ step: 'first', habitIds: a.habits.map((h) => h.id) });
    const backup = store.backupJson();
    await importFromSill(backup);
    await until(() => h1() === 'Who comes home first?', 'step 4 of the imported save', LOAD);
    expect(onboardingActive.value).toBe(true);
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });
  });
});

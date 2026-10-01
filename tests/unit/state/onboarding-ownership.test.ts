// @vitest-environment jsdom
/**
 * Onboarding truth and ownership (WP-C5 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md:
 * creative-cr-d1, UI2-07, P-persistence-23, P-ui-16). Planting says whether it happened, and why
 * not; the late steps (3 "Anything already done today?", 4 "Who comes home first?", 5 "Find {name}
 * a plant") are part of the save (`profile.onboardingStep`, DEC-E3), written through the store like
 * any change, so they follow the writer lock, the revision, adoption, import, reset and the demo;
 * the old `catkin:onboarding` sidecar is folded in once by the window that owns the save, then
 * removed. Each case names its finding; the plan's status note under WP-C5 says which failed on
 * the code before the change.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { SAVE_KEY, encodeEnvelope } from '@/state/persist';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { onboardingActive, onboardingProgress, reloadProgress, saveProgress } from '@/features/onboarding/progress';
import { failWrites, fakeBrowser, fakeLocks } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

const LEGACY_KEY = 'catkin:onboarding';
const GEN = 'c'.repeat(32);
const OTHER_GEN = 'd'.repeat(32);
type Saved = { v: number; rev: number; gen?: string; state: AppState };
const saved = (b: ReturnType<typeof fakeBrowser>) => JSON.parse(b.storage.getItem(SAVE_KEY)!) as Saved;
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

const input = (name: string) => ({
  name,
  icon: 'walk',
  color: 'sage' as const,
  plant: 'pothos' as const,
  pot: 'terracotta' as const,
  schedule: { kind: 'daily' as const },
  target: 1,
  step: 1,
  effort: 'steady' as const,
  timeOfDay: 'anytime' as const,
  polarity: 'build' as const,
});

/** A save planted through onboarding's own Plant, so it is on step 3 (or 4 with nothing planted). */
function midOnboarding(templateIds: string[] = ['walk', 'read']): AppState {
  fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds, inFlow: true });
  return store.state.value;
}

/** A lived-in save: onboarded long ago, quiet rewards on, three habits, a few capsules. */
function mature(): AppState {
  fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Maya', templateIds: ['water', 'walk', 'read'] });
  store.updateSettings({ quietRewards: true });
  const s = store.state.value;
  return { ...s, lifetime: { ...s.lifetime, pulls: 12 } };
}

/** This window (the store under test) opens on `s`, written by another window, which keeps the lock. */
function readOnlyOn(s: AppState, rev = 3) {
  const held = { byOther: true };
  const b = fakeBrowser({ locks: fakeLocks(held) });
  b.storage.setItem(SAVE_KEY, encodeEnvelope(s, rev, 0, 'other', GEN));
  store.hydrate();
  return { b, held };
}

/** Another window writes `s` as the save (rev, gen), and this window hears of it. */
function otherWindowWrites(b: ReturnType<typeof fakeBrowser>, s: AppState, rev: number, gen = GEN) {
  b.storage.setItem(SAVE_KEY, encodeEnvelope(s, rev, 0, 'other', gen));
  b.fire('storage', { key: SAVE_KEY });
}

const withoutStep = (s: AppState): AppState => {
  const { onboardingStep: _drop, ...profile } = s.profile as AppState['profile'] & { onboardingStep?: unknown };
  return { ...s, profile } as AppState;
};

beforeEach(() => {
  localStorage.clear();
  reloadProgress();
});
afterEach(() => {
  store.configureStore({ locks: null });
  localStorage.clear();
});

describe('creative-cr-d1: planting says whether it happened', () => {
  it('a refusal is not a zero-pick success: read-only, then already onboarded, then a real result', async () => {
    const { b, held } = readOnlyOn(createInitialState(Date.UTC(2026, 8, 29)), 1);
    expect(store.readOnly.value).toBe('other-window');
    expect(store.completeOnboarding({ name: 'Sam', templateIds: ['walk'] })).toEqual({ ok: false, reason: 'read-only' });
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(store.state.value.habits).toHaveLength(0);

    // Use here, then the same picks again: exactly one set of habits, onboarded, on disk.
    held.byOther = false;
    store.useHere();
    await settle();
    const res = store.completeOnboarding({ name: 'Sam', templateIds: ['walk'] });
    if (!res.ok) throw new Error(`refused: ${res.reason}`);
    expect(res.ids).toHaveLength(1);
    expect(store.state.value.habits.map((h) => h.name)).toEqual(['Walk']);
    store.flushSaves();
    expect(saved(b).state.profile.onboarded).toBe(true);
    expect(saved(b).state.habits.map((h) => h.name)).toEqual(['Walk']);

    expect(store.completeOnboarding({ name: 'Sam', templateIds: ['read'] })).toEqual({ ok: false, reason: 'already-onboarded' });
    expect(store.state.value.habits).toHaveLength(1);
  });

  it('zero picks is still a success, with no habits', () => {
    fakeBrowser();
    store.hydrate();
    expect(store.completeOnboarding({ name: '', templateIds: [] })).toEqual({ ok: true, ids: [] });
    expect(store.state.value.profile.onboarded).toBe(true);
  });
});

describe('DEC-E3: the late steps are part of the save', () => {
  it('Plant from the flow keeps step 3 in the same change, with the new habits; nothing planted goes to step 4', () => {
    const b = fakeBrowser();
    store.hydrate();
    const res = store.completeOnboarding({ name: 'Sam', templateIds: ['walk', 'read'], inFlow: true });
    if (!res.ok) throw new Error(`refused: ${res.reason}`);
    expect(store.state.value.profile).toMatchObject({ onboarded: true, onboardingStep: { step: 'today', habitIds: res.ids } });
    store.flushSaves();
    expect(saved(b).state.profile).toMatchObject({ onboarded: true, onboardingStep: { step: 'today', habitIds: res.ids } });
    expect(b.storage.getItem(LEGACY_KEY)).toBeNull();

    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [], inFlow: true });
    expect(store.state.value.profile).toMatchObject({ onboardingStep: { step: 'first', habitIds: [] } });
    // Callers outside the flow (an import's own, tests, tools) finish onboarding outright.
    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk'] });
    expect((store.state.value.profile as { onboardingStep?: unknown }).onboardingStep).toBeUndefined();
    expect(onboardingActive.value).toBe(false);
  });

  it('progress is written through the store: a reload from disk lands on the same step', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk'], inFlow: true });
    expect(saveProgress({ step: 'first', habitIds: store.state.value.habits.map((h) => h.id) })).toBe(true);
    store.flushSaves();
    expect(saved(b).state.profile).toMatchObject({ onboardingStep: { step: 'first' } });
    expect(b.storage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    store.hydrate();
    expect(onboardingActive.value).toBe(true);
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });
    expect(saveProgress(null)).toBe(true);
    expect(onboardingActive.value).toBe(false);
  });

  it('there is no late step before planting', () => {
    fakeBrowser();
    store.hydrate();
    expect(saveProgress({ step: 'first', habitIds: [] })).toBe(false);
    expect(onboardingProgress.value).toBeNull();
    expect(onboardingActive.value).toBe(true);
  });
});

describe('UI2-07: one authority under the writer lock', () => {
  it('a read-only window cannot write progress: nothing in memory, nothing on disk, no sidecar', () => {
    const { b } = readOnlyOn(midOnboarding());
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });
    const before = b.storage.getItem(SAVE_KEY);
    expect(saveProgress({ step: 'first', habitIds: [] })).toBe(false);
    expect(saveProgress(null)).toBe(false);
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });
    expect(b.storage.getItem(SAVE_KEY)).toBe(before);
    expect(b.storage.getItem(LEGACY_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('the owner moves on and finishes; the other window follows each step, then leaves onboarding', () => {
    const a = midOnboarding();
    const { b } = readOnlyOn(a, 3);
    expect(onboardingActive.value).toBe(true);
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });

    const onFirst = { ...a, profile: { ...a.profile, onboardingStep: { step: 'first', habitIds: [] } } } as AppState;
    otherWindowWrites(b, onFirst, 4);
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });

    otherWindowWrites(b, withoutStep(a), 5);
    expect(onboardingProgress.value).toBeNull();
    expect(onboardingActive.value).toBe(false);
  });

  it('a reset in another window mid-step: this window starts fresh, at the sill, with the note', () => {
    const { b } = readOnlyOn(midOnboarding());
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });
    b.storage.removeItem(SAVE_KEY);
    b.fire('storage', { key: SAVE_KEY, newValue: null });
    expect(store.crossWindowNotice.value).toBe('started-over');
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(onboardingProgress.value).toBeNull();
    expect(onboardingActive.value).toBe(true);
  });

  it('an import in another window mid-step: this window takes the imported save, and leaves onboarding', () => {
    const imported = mature();
    const { b } = readOnlyOn(midOnboarding());
    expect(onboardingActive.value).toBe(true);
    otherWindowWrites(b, imported, 1, OTHER_GEN);
    expect(store.state.value.profile.name).toBe('Maya');
    expect(onboardingActive.value).toBe(false);
  });

  it('Use here mid-step takes the step from the save, and this window can carry on', async () => {
    const a = midOnboarding();
    const { b, held } = readOnlyOn(a);
    held.byOther = false;
    store.useHere();
    await settle();
    expect(store.readOnly.value).toBe(false);
    expect(onboardingProgress.value).toMatchObject({ step: 'today' });
    expect(saveProgress({ step: 'first', habitIds: a.habits.map((h) => h.id) })).toBe(true);
    store.flushSaves();
    expect(saved(b).state.profile).toMatchObject({ onboardingStep: { step: 'first' } });
  });

  it('a demo round trip: the demo has no onboarding, and leaving it lands on the same step', () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [], inFlow: true });
    store.flushSaves();
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });
    expect(store.enterDemo()).toBe(true);
    expect(onboardingActive.value).toBe(false);
    // Nothing the demo does touches the real flow.
    expect(saveProgress(null)).toBe(true);
    store.exitDemo();
    expect(onboardingActive.value).toBe(true);
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });
    expect(saved(b).state.profile).toMatchObject({ onboardingStep: { step: 'first' } });
  });
});

describe('P-persistence-23: a stale sidecar never brings onboarding back over another save', () => {
  it('a late-step sidecar, then an import of an onboarded save: Today', async () => {
    const backup = (() => {
      mature();
      return store.backupJson();
    })();
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk'], inFlow: true });
    const stale = JSON.stringify({ step: 'first', habitIds: store.state.value.habits.map((h) => h.id) });
    b.storage.setItem(LEGACY_KEY, stale);
    localStorage.setItem(LEGACY_KEY, stale);
    reloadProgress();
    expect(await store.applyImport(backup)).toEqual({ ok: true });
    expect(store.state.value.profile.name).toBe('Maya');
    expect(onboardingProgress.value).toBeNull();
    expect(onboardingActive.value).toBe(false);
  });

  it('a mid-onboarding backup imports onto its own step', async () => {
    midOnboarding(['walk']);
    saveProgress({ step: 'first', habitIds: store.state.value.habits.map((h) => h.id) });
    const backup = store.backupJson();
    // Another device: nothing of this flow is there but the backup.
    localStorage.clear();
    reloadProgress();
    fakeBrowser();
    store.hydrate();
    expect(await store.applyImport(backup)).toEqual({ ok: true });
    expect(onboardingActive.value).toBe(true);
    expect(onboardingProgress.value).toMatchObject({ step: 'first' });
  });
});

describe('the legacy catkin:onboarding key is folded into the save once, by the owner', () => {
  /** A save the old build onboarded: onboarded, its habits, no step in the save; the step in the sidecar. */
  function legacy(step: 'today' | 'first' | 'place' = 'first') {
    fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk', 'read'] });
    const s = store.state.value;
    return { s, sidecar: JSON.stringify({ step, habitIds: s.habits.map((h) => h.id) }) };
  }

  it('the owner folds it in, writes it, and removes the key', () => {
    const { s, sidecar } = legacy('first');
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, encodeEnvelope(s, 2, 0, 'old', GEN));
    b.storage.setItem(LEGACY_KEY, sidecar);
    store.hydrate();
    expect(onboardingProgress.value).toEqual({ step: 'first', habitIds: s.habits.map((h) => h.id) });
    expect(saved(b).state.profile).toMatchObject({ onboardingStep: { step: 'first' } });
    expect(b.storage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('a window that doesn’t own the save leaves the key alone and changes nothing', () => {
    const { s, sidecar } = legacy('today');
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    b.storage.setItem(SAVE_KEY, encodeEnvelope(s, 2, 0, 'old', GEN));
    b.storage.setItem(LEGACY_KEY, sidecar);
    store.hydrate();
    expect(store.readOnly.value).toBe('other-window');
    expect(b.storage.getItem(LEGACY_KEY)).toBe(sidecar);
    expect(onboardingProgress.value).toBeNull();
    expect(saved(b).rev).toBe(2);
  });

  it('when the fold can’t be written, the key stays for the next time', () => {
    const { s, sidecar } = legacy('first');
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, encodeEnvelope(s, 2, 0, 'old', GEN));
    b.storage.setItem(LEGACY_KEY, sidecar);
    failWrites(b.storage, 'quota', [SAVE_KEY]);
    store.hydrate();
    expect(b.storage.getItem(LEGACY_KEY)).toBe(sidecar);
  });

  it('a sidecar that belongs to another save (a mature one, or one not onboarded) is dropped, not folded', () => {
    const grown = mature();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, encodeEnvelope(grown, 9, 0, 'old', GEN));
    b.storage.setItem(LEGACY_KEY, JSON.stringify({ step: 'first', habitIds: grown.habits.map((h) => h.id) }));
    store.hydrate();
    expect(b.storage.getItem(LEGACY_KEY)).toBeNull();
    expect(onboardingActive.value).toBe(false);

    // A quiet save that never opened a capsule, with other habits than the key's: not this save's.
    const quiet = { ...grown, lifetime: { ...grown.lifetime, pulls: 0 } };
    const q = fakeBrowser();
    q.storage.setItem(SAVE_KEY, encodeEnvelope(quiet, 9, 0, 'old', GEN));
    q.storage.setItem(LEGACY_KEY, JSON.stringify({ step: 'today', habitIds: grown.habits.slice(0, 1).map((h) => h.id) }));
    store.hydrate();
    expect(q.storage.getItem(LEGACY_KEY)).toBeNull();
    expect(onboardingActive.value).toBe(false);

    const c = fakeBrowser();
    c.storage.setItem(LEGACY_KEY, JSON.stringify({ step: 'today', habitIds: ['h1'] }));
    store.hydrate();
    expect(c.storage.getItem(LEGACY_KEY)).toBeNull();
    expect(onboardingProgress.value).toBeNull();
  });
});

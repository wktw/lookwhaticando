import { afterEach, describe, expect, it } from 'vitest';
import type { GameEvent } from '@/state/api';
import { onGameEvent } from '@/state/events';
import { DEMO_KEY, SAVE_KEY, backupKeyOf, encodeEnvelope } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import * as store from '@/state/store';
import { at } from '../domain/game';
import { fakeBrowser, fakeLocks } from './fixtures';

const input = (name = 'Walk') => ({
  name,
  icon: 'walk',
  color: 'sage' as const,
  plant: 'tulip' as const,
  pot: 'terracotta' as const,
  schedule: { kind: 'daily' as const },
  target: 1,
  step: 1,
  effort: 'steady' as const,
  timeOfDay: 'anytime' as const,
  polarity: 'build' as const,
});

const saved = (b: ReturnType<typeof fakeBrowser>, key = SAVE_KEY) => JSON.parse(b.storage.getItem(key)!) as { rev: number; state: ReturnType<typeof createInitialState> };

let unsub: (() => void) | null = null;
afterEach(() => {
  unsub?.();
  unsub = null;
});

function boot(opts: Parameters<typeof fakeBrowser>[0] = {}) {
  const b = fakeBrowser(opts);
  store.hydrate();
  const events: GameEvent[] = [];
  unsub = onGameEvent((e) => events.push(e));
  return { b, events };
}

describe('boot', () => {
  it('starts fresh, computes the app day, and opens it', () => {
    const { b } = boot({ start: '2026-09-29', hour: 2 }); // 2 am belongs to yesterday (day starts at 3:00)
    expect(store.today.value).toBe('2026-09-28');
    expect(store.state.value.clock.maxDateKey).toBe('2026-09-28');
    expect(store.readOnly.value).toBe(false);
    b.advance(1000);
    expect(saved(b).state.clock.maxDateKey).toBe('2026-09-28');
  });

  it('restores an existing save and keeps the loaded copy as :backup', () => {
    const b = fakeBrowser();
    const s = { ...createInitialState(b.clock.now), profile: { ...createInitialState(b.clock.now).profile, name: 'Sam' } };
    b.storage.setItem(SAVE_KEY, encodeEnvelope(s, 5, 0, 'old'));
    store.hydrate();
    expect(store.state.value.profile.name).toBe('Sam');
    expect(b.storage.getItem(backupKeyOf(SAVE_KEY))).toContain('"rev":5');
  });

  it('opens a newer-version save read-only: actions are no-ops', () => {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, JSON.stringify({ v: 2, appVersion: 'future', rev: 1, savedAt: 0, state: { ...createInitialState(0), version: 2 } }));
    store.hydrate();
    expect(store.readOnly.value).toBe('newer-version');
    expect(store.loadIssue.value).toEqual({ kind: 'newer-version' });
    store.completeOnboarding({ name: 'X', templateIds: [] });
    expect(store.state.value.profile.onboarded).toBe(false);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).v).toBe(2);
  });

  it('keeps a corrupt save aside and explains it', () => {
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, '{"v":1,"state":{"habits":"nope"}}');
    store.hydrate();
    expect(store.loadIssue.value?.kind).toBe('corrupt-save');
    expect(b.storage.getItem(`${SAVE_KEY}:corrupt`)).toBe('{"v":1,"state":{"habits":"nope"}}');
  });
});

describe('actions', () => {
  it('commit, emit events and write wallet changes at once; other changes are debounced', () => {
    const { b, events } = boot();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input());
    const r = store.checkIn(id);
    expect(r).toMatchObject({ completed: true, rewarded: true, coins: 25 });
    expect(r.events.map((e) => e.type)).toContain('checkin');
    expect(events.filter((e) => e.type === 'coins').map((e) => (e as { amount: number }).amount)).toEqual([5, 20]);
    expect(saved(b).state.wallet.coins).toBe(25); // immediate
    const rev = saved(b).rev;
    store.setNote(id, store.today.value, 'Lovely');
    expect(saved(b).rev).toBe(rev); // debounced
    b.advance(300);
    expect(saved(b).rev).toBe(rev + 1);
    expect(saved(b).state.logs[id]![store.today.value]).toMatchObject({ note: 'Lovely' });
  });

  it('createHabit throws a readable error on invalid input', () => {
    boot();
    expect(() => store.createHabit({ ...input(), name: '' })).toThrow(/name/);
  });

  it('machine status and availability are real', () => {
    boot({ start: '2026-09-29' });
    expect(store.availableMachines()).toContain('pumpkin');
    expect(store.availableMachines()).not.toContain('snow');
    expect(store.machineStatus('snow')).toMatchObject({ available: false, nextStart: '2026-11-11' });
    expect(store.machineStatus('pumpkin')).toMatchObject({ available: true, activeUntil: '2026-11-10', rareIn: 10, ultraIn: 40, dupStreak: 0, owned: 0, canAfford: false, price: 25, currency: 'coins', secretId: 'pet-cow-ghost' });
  });

  it('a pull is committed (pendingReveal) and saved before it is returned', () => {
    const { b } = boot();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.checkIn(store.createHabit(input()));
    const r = store.pull('kitty');
    expect(r.ok).toBe(true);
    expect(saved(b).state.pendingReveal).toMatchObject({ machineId: 'kitty' });
    expect(store.pull('kitty')).toEqual({ ok: false, error: 'reveal-pending' });
    store.finishReveal();
    expect(store.state.value.pendingReveal).toBeUndefined();
  });
});

describe('the clock', () => {
  it('rolls the day over at 3:00, restocks the pantry and snapshots the new day', async () => {
    const { b, events } = boot({ start: '2026-09-29', hour: 23 });
    store.completeOnboarding({ name: 'Sam', templateIds: ['water'] });
    const stop = store.startClock();
    b.advance(3 * 3_600_000 + 60_000); // 02:01 → still Sep 29
    expect(store.today.value).toBe('2026-09-29');
    b.advance(60 * 60_000); // 03:01
    expect(store.today.value).toBe('2026-09-30');
    expect(events.some((e) => e.type === 'restock')).toBe(true);
    stop();
    await Promise.resolve();
    expect((await store.listSnapshots()).map((m) => m.id)).toContain('daily-2026-09-30');
  });

  it('a later day start keeps today where it is (never earlier than a day already seen)', () => {
    boot({ start: '2026-09-29', hour: 4 }); // 4 am: already Sep 29 with the default 3:00 start
    expect(store.today.value).toBe('2026-09-29');
    store.updateSettings({ dayStartsAt: 360 }); // days now start at 6:00 → 4 am would be Sep 28
    expect(store.state.value.settings.dayStartsAt).toBe(360);
    expect(store.today.value).toBe('2026-09-29');
    store.updateSettings({ dayStartsAt: 9999 });
    expect(store.state.value.settings.dayStartsAt).toBe(360);
  });

  it('never goes backwards when the device clock does', () => {
    const { b } = boot({ start: '2026-09-29', hour: 12 });
    b.clock.now = at('2026-09-25', 12);
    const stop = store.startClock();
    expect(store.today.value).toBe('2026-09-29');
    expect(store.clockBehind.value).toBe(true);
    stop();
  });
});

describe('demo meadow (DESIGN §13.8)', () => {
  it('lives in its own namespace and never touches the real save', () => {
    const { b } = boot();
    store.completeOnboarding({ name: 'Sam', templateIds: ['water'] });
    store.flushSaves();
    const real = b.storage.getItem(SAVE_KEY);
    store.enterDemo();
    expect(store.demoMode.value).toBe(true);
    expect(store.state.value.habits.length).toBe(7);
    store.checkIn(store.state.value.habits[0]!.id);
    store.flushSaves();
    expect(b.storage.getItem(SAVE_KEY)).toBe(real);
    expect(b.storage.getItem(DEMO_KEY)).not.toBeNull();
    store.exitDemo();
    expect(store.demoMode.value).toBe(false);
    expect(store.state.value.habits.map((h) => h.name)).toEqual(['Drink water']);
    store.enterDemo(); // the demo resumes where it was
    expect(store.state.value.habits.length).toBe(7);
    store.exitDemo();
  });
});

describe('data', () => {
  it('export → preview → import (replace) → undo within 24 h', async () => {
    const { b } = boot();
    store.completeOnboarding({ name: 'Sam', templateIds: ['water', 'walk'] });
    const backup = store.exportData();
    expect(store.state.value.lastBackupAt).toBe(b.clock.now);
    const payload = await store.exportPayload();
    expect(payload.startsWith('MM1:')).toBe(true);
    store.resetAll();
    store.completeOnboarding({ name: 'Other', templateIds: ['read'] });
    const preview = await store.previewImport(payload);
    expect(preview).toMatchObject({ ok: true, habits: 2, friends: 1, device: 'Test · Node' });
    expect(await store.applyImport(backup)).toEqual({ ok: true });
    expect(store.state.value.profile.name).toBe('Sam');
    expect(saved(b).state.profile.name).toBe('Sam');
    expect(store.canUndoImport()).toBe(true);
    expect(await store.undoImport()).toBe(true);
    expect(store.state.value.profile.name).toBe('Other');
    expect(await store.applyImport('garbage')).toEqual({ ok: false, error: 'not-a-backup' });
  });

  it('undo import expires after 24 h', async () => {
    const { b } = boot();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const backup = store.exportData();
    await store.applyImport(backup);
    b.clock.now += 25 * 3_600_000;
    expect(store.canUndoImport()).toBe(false);
    expect(await store.undoImport()).toBe(false);
  });

  it('resetAll removes only mochi-meadow:* keys', () => {
    const { b } = boot();
    b.storage.setItem('someone-else', 'keep me');
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.updateSettings({ theme: 'night' });
    store.flushSaves();
    expect(b.storage.getItem('mochi-meadow:theme')).toContain('night');
    store.resetAll();
    expect([...b.storage.data.keys()]).toEqual(['someone-else']);
    expect(store.state.value.profile.onboarded).toBe(false);
  });

  it('restores a snapshot (after snapshotting the current save)', async () => {
    boot();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    await Promise.resolve();
    const [snap] = await store.listSnapshots();
    store.setName('Renamed');
    expect(await store.restoreSnapshot(snap!.id)).toBe(true);
    expect(store.state.value.profile.name).toBe('Sam');
    expect((await store.listSnapshots()).some((m) => m.kind === 'pre-import')).toBe(true);
  });
});

describe('single writer', () => {
  it('another window holding the lock makes this one read-only until "Use here"', async () => {
    const held = { byOther: true };
    const locks = fakeLocks(held);
    const { b } = boot({ locks });
    await Promise.resolve();
    expect(store.readOnly.value).toBe('other-window');
    store.completeOnboarding({ name: 'Nope', templateIds: [] });
    expect(store.state.value.profile.onboarded).toBe(false);
    store.useHere();
    await Promise.resolve();
    expect(store.readOnly.value).toBe(false);
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    expect(store.state.value.profile.onboarded).toBe(true);
    locks.stolen();
    await new Promise((r) => setTimeout(r, 0));
    expect(store.readOnly.value).toBe('other-window');
    void b;
  });

  it('adopts a newer rev written by another window', () => {
    const { b } = boot();
    const other = { ...createInitialState(b.clock.now), profile: { ...createInitialState(b.clock.now).profile, name: 'From the other window' } };
    b.storage.setItem(SAVE_KEY, encodeEnvelope(other, 99, b.clock.now, 'test'));
    b.fire('storage', { key: SAVE_KEY });
    expect(store.state.value.profile.name).toBe('From the other window');
  });
});

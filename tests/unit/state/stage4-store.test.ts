/**
 * Stage-4 store fixes: imports never replace a meadow without an undo copy unless confirmed, the
 * calendar tells the UI when an edit belongs to the week strip, and a window whose Web Locks call
 * fails still saves (best effort, like a browser without Web Locks).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/state/persist';
import type { SnapshotStore } from '@/state/snapshots';
import * as store from '@/state/store';
import { addDays } from '@/domain/dates';
import { fakeBrowser } from './fixtures';

const input = {
  name: 'Walk',
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
};

afterEach(() => store.configureStore({ locks: null }));

describe('import keeps an undo copy (DESIGN §13.8 "snapshots first … offers Undo import")', () => {
  it('refuses to replace a meadow it could not snapshot unless the user confirms', async () => {
    const b = fakeBrowser();
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const backup = store.exportData();
    store.createHabit(input);
    const broken: SnapshotStore = {
      durable: true,
      put: () => Promise.reject(new Error('IndexedDB unavailable')),
      get: () => Promise.resolve(null),
      list: () => Promise.resolve([]),
      remove: () => Promise.resolve(),
    };
    store.configureStore({ snapshots: broken });
    expect(await store.applyImport(backup)).toEqual({ ok: false, error: 'no-undo' });
    expect(store.state.value.habits).toHaveLength(1);
    expect(await store.applyImport(backup, { withoutUndo: true })).toEqual({ ok: true, undo: null });
    expect(store.state.value.habits).toHaveLength(0);
    expect(store.canUndoImport()).toBe(false);
    store.configureStore({ snapshots: b.snapshots });
  });
});

describe('calendar edits (DESIGN §13.2 "The Progress calendar edits older days as history only")', () => {
  it('reports whether the edit was made, so the UI can point window days to the week strip', () => {
    fakeBrowser({ start: '2026-09-29', hour: 12 });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const id = store.createHabit(input);
    store.setStartedOn(id, '2026-09-01');
    expect(store.editHistory(id, '2026-09-10', true)).toBe(true);
    expect(store.editHistory(id, addDays(store.today.value, -2), true)).toBe(false);
    expect(store.state.value.logs[id]?.['2026-09-10']).toMatchObject({ kind: 'log', count: 1 });
  });
});

describe('single writer, best effort (DESIGN §13.8)', () => {
  it('a Web Locks call that fails before answering does not leave saves held forever', async () => {
    const b = fakeBrowser();
    store.configureStore({ locks: { request: () => Promise.reject(new DOMException('no locks here', 'SecurityError')) } });
    store.hydrate();
    await Promise.resolve();
    await Promise.resolve();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    store.flushSaves();
    expect(store.readOnly.value).toBe(false);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.profile.name).toBe('Sam');
  });
});

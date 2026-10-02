import { afterEach, describe, expect, it } from 'vitest';
import { encodeEnvelope, SAVE_KEY } from '@/state/persist';
import * as store from '@/state/store';
import { setNote } from '@/domain/logging';
import { archiveHabit } from '@/domain/habits';
import { Game } from '../domain/game';
import { failWrites, fakeBrowser, fakeLocks } from './fixtures';

const DAY = '2025-09-29';
function fixture() {
  const g = new Game({ start: DAY });
  const id = g.addHabit();
  g.run((tx) => setNote(tx, id, DAY, 'The first line.'));
  g.advance();
  g.run((tx) => archiveHabit(tx, id));
  g.goTo('2026-09-29');
  return { state: g.state, id };
}
afterEach(() => store.configureStore({ locks: null }));

describe('old note save ownership and retry (WP-C6)', () => {
  it('refuses a non-owner without changing disk or memory, then Use here accepts and persists the note', async () => {
    const f = fixture();
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    b.storage.setItem(SAVE_KEY, encodeEnvelope(f.state, 1, b.clock.now, 'other'));
    store.hydrate();
    const before = b.storage.getItem(SAVE_KEY);
    expect(store.setNote(f.id, DAY, 'Refused.')).toBe(false);
    expect(store.state.value.logs[f.id]?.[DAY]?.note).toBe('The first line.');
    expect(b.storage.getItem(SAVE_KEY)).toBe(before);
    await store.useHere();
    expect(store.setNote(f.id, DAY, 'Accepted.')).toBe(true);
    b.advance(1000);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.logs[f.id][DAY].note).toBe('Accepted.');
  });

  it('keeps an accepted note edit pending after a failed write and retries it when storage recovers', () => {
    const f = fixture();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, encodeEnvelope(f.state, 1, b.clock.now, 'test'));
    store.hydrate();
    const broken = failWrites(b.storage, 'quota', [SAVE_KEY]);
    expect(store.setNote(f.id, DAY, 'Kept in this window.')).toBe(true);
    b.advance(1000);
    expect(store.state.value.logs[f.id]?.[DAY]?.note).toBe('Kept in this window.');
    expect(store.saveStatus.value.status).toBe('storage-full');
    expect(store.hasUnsavedWork()).toBe(true);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.logs[f.id][DAY].note).toBe('The first line.');
    broken.heal();
    b.advance(30_000);
    expect(JSON.parse(b.storage.getItem(SAVE_KEY)!).state.logs[f.id][DAY].note).toBe('Kept in this window.');
    expect(store.hasUnsavedWork()).toBe(false);
  });
});

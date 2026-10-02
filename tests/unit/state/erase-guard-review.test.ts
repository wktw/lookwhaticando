import { afterEach, expect, it } from 'vitest';
import * as store from '@/state/store';
import { SAVE_KEY, backupKeyOf, corruptKeyOf, parseEnvelope } from '@/state/persist';
import { fakeBrowser } from './fixtures';

afterEach(() => store.configureStore({ locks: null }));

it('can erase a save currently recovered from its backup over known damaged bytes', async () => {
  const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] }); store.flushSaves();
  b.storage.setItem(backupKeyOf(SAVE_KEY), b.storage.getItem(SAVE_KEY)!);
  b.storage.setItem(SAVE_KEY, '{damaged');
  store.hydrate();
  expect(store.loadIssue.value?.kind).toBe('recovered-from-backup');
  expect(await store.eraseEverything()).toEqual({ ok: true });
  expect(b.storage.getItem(SAVE_KEY)).toBeNull();
});

it('an unannounced newly damaged main is kept aside before a pending edit may replace it', () => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Kept name', templateIds: [] });
  store.flushSaves();
  store.setName('New edit');
  const damaged = '{a new interrupted external journal';
  b.storage.setItem(SAVE_KEY, damaged);
  store.flushSaves();
  expect(b.storage.getItem(SAVE_KEY) === damaged || b.storage.getItem(corruptKeyOf(SAVE_KEY)) === damaged).toBe(true);
});

it('a queue recovered from backup can still save the next edit over its known damaged main', () => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Kept name', templateIds: [] });
  store.flushSaves();
  b.storage.setItem(backupKeyOf(SAVE_KEY), b.storage.getItem(SAVE_KEY)!);
  b.storage.setItem(SAVE_KEY, '{damaged');
  store.hydrate();
  expect(store.state.value.profile.name).toBe('Kept name');
  store.setName('New edit');
  store.flushSaves();
  const read = parseEnvelope(b.storage.getItem(SAVE_KEY)!);
  expect(read.kind === 'ok' ? read.state.profile.name : read.kind).toBe('New edit');
  expect(store.state.value.profile.name).toBe('New edit');
});

it('reads becoming unavailable never discard the last pending edit or replace memory with an empty journal', () => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Kept name', templateIds: [] });
  store.flushSaves();
  store.setName('New edit');
  const get = b.storage.getItem;
  b.storage.getItem = () => { throw new Error('Storage unavailable'); };
  store.flushSaves();
  expect(store.state.value.profile.name).toBe('New edit');
  expect(store.hasUnsavedWork()).toBe(true);
  b.storage.getItem = get;
  store.flushSaves();
  expect(parseEnvelope(b.storage.getItem(SAVE_KEY)!)).toMatchObject({ kind: 'ok', state: { profile: { name: 'New edit' } } });
});

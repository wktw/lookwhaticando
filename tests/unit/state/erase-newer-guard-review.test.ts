import { afterEach, expect, it } from 'vitest';
import * as store from '@/state/store';
import { SAVE_KEY } from '@/state/persist';
import { fakeBrowser } from './fixtures';

afterEach(() => store.configureStore({ locks: null }));

it.each([[true, 2], [false, 2], [true, 1], [false, 1]] as const)('does not overwrite a newer schema at the same revision (legacy: %s, envelope: %s)', (legacy, envelopeVersion) => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Old journal', templateIds: [] });
  store.flushSaves();
  const saved = JSON.parse(b.storage.getItem(SAVE_KEY)!);
  store.setName('Pending old edit');
  if (legacy) delete saved.gen;
  saved.v = envelopeVersion;
  saved.state.version = 2;
  saved.state.profile.name = 'Newer journal';
  const newer = JSON.stringify(saved);
  b.storage.setItem(SAVE_KEY, newer);
  store.flushSaves();
  expect(b.storage.getItem(SAVE_KEY)).toBe(newer);
  expect(store.readOnly.value).toBe('newer-version');
});

// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import * as store from '@/state/store';
import { encodeEnvelope } from '@/state/persist';
import { TodayScreen } from '@/features/today/TodayScreen';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
afterEach(() => { view?.unmount(); view = null; store.flushSaves(); });

it('an open number pad belongs to the old save even when an imported habit has the same id and day', async () => {
  const b = fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Before', templateIds: ['water'] });
  store.flushSaves();
  const id = store.state.value.habits[0]!.id;
  view = mount(<TodayScreen />);
  await click(button('More for Drink water'), 'More');
  await click(document.querySelector('[role="menuitem"]'), 'How many');
  await until(() => document.querySelector('[role="dialog"]'), 'the pad');
  const oldPlus = button('+1');
  expect(oldPlus).not.toBeNull();
  const imported = { ...store.state.value, profile: { ...store.state.value.profile, name: 'After' }, logs: { [id]: { [store.today.value]: { kind: 'log' as const, count: 5 } } } };
  await act(async () => { expect(await store.applyImport(encodeEnvelope(imported, 1, b.clock.now, 'test'))).toMatchObject({ ok: true }); });
  // A stale DOM callback also must not change the new journal while the old sheet exits.
  await act(() => oldPlus!.click());
  expect(store.state.value.logs[id]?.[store.today.value]).toMatchObject({ count: 5 });
  await until(() => !document.querySelector('[role="dialog"]'), 'the old pad to close');
});

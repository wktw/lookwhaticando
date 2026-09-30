// @vitest-environment jsdom
/**
 * WP-A2 in the interface: when another window starts over, this one follows and says so, calmly,
 * with a way to put the note away (VOICE §18).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SAVE_KEY, encodeEnvelope, removeNamespace } from '@/state/persist';
import { createInitialState } from '@/state/defaults';
import * as store from '@/state/store';
import { ShellBanners } from '@/app/App';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { ERRORS } from '@/catalog/lines';
import { installDom, mount, pause } from '@/features/capsules/testing';
import { fakeBrowser, fakeLocks } from './fixtures';

beforeAll(() => installDom());

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  store.configureStore({ locks: null });
  localStorage.clear();
});

const bannerText = () => [...document.querySelectorAll('[data-banner]')].map((b) => b.querySelector('p')?.textContent ?? '');

describe('Started over in another window', () => {
  it('the shell line is the deck’s line', () => {
    expect(ERRORS.startedOver).toMatch(/another window/);
    expect(SHELL_LINES.startedOver).toBe(ERRORS.startedOver);
  });

  it('a deletion event shows the note in a read-only window, and Close puts it away (failed before)', async () => {
    const b = fakeBrowser({ locks: fakeLocks({ byOther: true }) });
    const s = createInitialState(b.clock.now);
    b.storage.setItem(SAVE_KEY, encodeEnvelope({ ...s, profile: { ...s.profile, name: 'Sam', onboarded: true } }, 5, 0, 'other'));
    store.hydrate();
    await Promise.resolve();
    removeNamespace(b.storage);
    b.fire('storage', { key: SAVE_KEY, newValue: null });
    view = mount(<ShellBanners />);
    expect(bannerText()).toContain(SHELL_LINES.startedOver);
    const close = document.querySelector<HTMLButtonElement>('[data-banner="started-over"] button[aria-label]');
    expect(close).not.toBeNull();
    close!.click();
    await pause(0);
    expect(bannerText()).not.toContain(SHELL_LINES.startedOver);
  });
});

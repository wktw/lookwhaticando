// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DataSection } from '@/features/you/DataSection';
import { DATA, DATA_COPY } from '@/catalog/lines';
import { SHELL_LINES } from '@/features/you/shellCopy';
import * as store from '@/state/store';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';
import { toasts } from '@/ui/toast';

beforeAll(() => { installDom(); window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia; });
let view: ReturnType<typeof mount> | undefined;
afterEach(() => { view?.unmount(); toasts.value = []; });

describe('the erase choice', () => {
  it('discloses retained daily copies in the first Start over dialog, with a backup and separate irreversible erase choice', async () => {
    fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] });
    view = mount(<DataSection />);
    expect(button('Erase everything on this device')).toBeNull();
    await click(button(DATA.startOver), 'Start over');
    const first = await until(() => document.querySelector('[role="alertdialog"]'), 'the first dialog');
    expect(first.textContent).toContain('The daily copies stay on this device.');
    expect(button('Save a backup first')).not.toBeNull();
    await click(button('Erase everything on this device'), 'erase choice');
    await until(() => document.querySelector('[role="alertdialog"]')?.textContent?.includes('There is no undo.'), 'the irreversible confirmation');
    expect(store.state.value.profile.name).toBe('Sam');
  });

  it('keeps a partial erase visible, gives a retry, and never shows a success note', async () => {
    const b = fakeBrowser(); store.hydrate(); store.completeOnboarding({ name: 'Sam', templateIds: [] });
    b.snapshots.erase = async () => ({ ok: false, error: 'blocked' });
    view = mount(<DataSection />);
    await click(button(DATA.startOver), 'Start over');
    await click(await until(() => button('Erase everything on this device'), 'erase choice'), 'erase choice');
    await click(await until(() => button(DATA_COPY.eraseButton), 'erase confirmation'), 'confirm');
    await until(() => document.querySelector('[role="alert"]')?.textContent?.includes('Close other catkin windows'), 'the blocked explanation');
    expect(toasts.value.some((t) => t.key === 'erased')).toBe(false);
    expect(store.state.value.profile.name).toBe('Sam');
    b.snapshots.erase = async () => { b.snapshots.records.clear(); return { ok: true }; };
    await click(button(DATA_COPY.eraseRetry), 'retry');
    await until(() => store.state.value.profile.onboarded === false, 'fresh state');
  });

  it('a follower deletion notice does not promise that erased daily copies remain', () => {
    expect(SHELL_LINES.startedOver).not.toContain('daily copies stay');
  });
});

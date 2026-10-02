// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import * as store from '@/state/store';
import { fakeBrowser } from '../../tests/unit/state/fixtures';
import { button, click, installDom, mount, until } from '@/features/capsules/testing';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { currentTab, startRouter } from './router';
import { parseHash, tabForDigit } from './routes';
import { ShelfScreen } from '@/features/shelf/ShelfScreen';
import { TodayPrefsSection } from '@/features/you/PreferencesSection';
import { DoneTodayStep } from '@/features/onboarding/DoneTodayStep';
import { Calendar } from '@/features/progress/Calendar';
import { toasts } from '@/ui/toast';
import * as live from '@/ui/announce';

let view: ReturnType<typeof mount> | null = null;
let stopRouter: (() => void) | undefined;
beforeAll(installDom);
beforeEach(() => {
  fakeBrowser();
  store.hydrate();
  store.completeOnboarding({ name: 'Sam', templateIds: ['walk'] });
  toasts.value = [];
});
afterEach(() => {
  view?.unmount();
  view = null;
  stopRouter?.();
  stopRouter = undefined;
  live.cancelSettled('checkin');
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('complete quiet mode (WP-D3)', () => {
  it.each([Sidebar, TabBar])('%s hides only the Capsules destination and restores it losslessly', async (Nav) => {
    view = mount(<Nav tab="shelf" />);
    const links = () => Array.from(view!.root.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(links()).toEqual(['#/today', '#/progress', '#/capsules', '#/shelf', '#/you']);
    await act(() => store.updateSettings({ quietRewards: true }));
    expect(links()).toEqual(['#/today', '#/progress', '#/shelf', '#/you']);
    expect(view.root.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe('#/shelf');
    if (Nav === Sidebar) {
      expect(view.root.querySelector('a[href="#/shelf"]')?.getAttribute('aria-keyshortcuts')).toBe('4');
      expect(view.root.querySelector('a[href="#/you"] kbd')?.textContent).toBe('5');
    }
    await act(() => store.updateSettings({ quietRewards: false }));
    expect(links()).toHaveLength(5);
  });

  it('keeps the addressed Capsules route and all five digit routes', async () => {
    location.hash = '#/capsules';
    stopRouter = startRouter();
    view = mount(<Sidebar tab="capsules" />);
    await act(() => store.updateSettings({ quietRewards: true }));
    expect(location.hash).toBe('#/capsules');
    expect(currentTab.value).toBe('capsules');
    expect(parseHash('#/capsules').tab).toBe('capsules');
    expect(['1', '2', '3', '4', '5'].map(tabForDigit)).toEqual(['today', 'progress', 'capsules', 'shelf', 'you']);
  });

  it('keeps earned items, pending reveal and wallet when the real preference switches both ways', async () => {
    expect(store.pull('cats', { free: true }).ok).toBe(true);
    const before = structuredClone(store.state.value);
    expect(before.pendingReveal).toBeDefined();
    view = mount(<><TodayPrefsSection /><TabBar tab="you" /></>);
    const toggle = () => Array.from(view!.root.querySelectorAll<HTMLInputElement>('input')).find((input) => input.closest('label')?.textContent?.includes('Quiet rewards'))!;
    await click(toggle());
    expect(store.state.value.settings.quietRewards).toBe(true);
    expect(view.root.textContent).toContain('Turn this off to show them again. Everything earned stays kept.');
    expect({ ...store.state.value, settings: before.settings }).toEqual(before);
    await click(toggle());
    expect(store.state.value).toEqual(before);
    expect(view.root.querySelector('a[href="#/capsules"]')).not.toBeNull();
  });

  it('hides Shelf wallet totals and the empty-pet capsule invitation, retaining functional prices', async () => {
    store.updateSettings({ quietRewards: true });
    view = mount(<ShelfScreen />);
    await until(() => view!.root.querySelector('[aria-labelledby="shelf-places"]'), 'places');
    expect(view.root.querySelector('[data-wallet-target="coins"]')).toBeNull();
    expect(view.root.textContent).not.toMatch(/capsule|\bin the jar\b/i);
    expect(view.root.textContent).toContain('The sill is ready for someone.');
    expect(view.root.querySelector('[aria-labelledby="shelf-places"]')!.textContent).toMatch(/\d+ coins/);
    await act(() => store.updateSettings({ quietRewards: false }));
    expect(view.root.querySelector('[data-wallet-target="coins"]')).not.toBeNull();
    expect(view.root.textContent).toContain('Your first capsule is on the Capsules tab.');
  });

  it('makes imported quiet onboarding waterings and Undo quiet without losing their coins', async () => {
    vi.useFakeTimers();
    store.updateSettings({ quietRewards: true });
    const id = store.state.value.habits[0]!.id;
    view = mount(<DoneTodayStep habitIds={[id]} onNext={() => undefined} />);
    await click(button('Walk'));
    expect(store.state.value.wallet.coins).toBeGreaterThanOrEqual(25);
    expect(view.root.textContent).not.toMatch(/coin|capsule/i);
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
    await act(() => vi.advanceTimersByTimeAsync(1800));
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' ')).not.toMatch(/coin|capsule/i);
    await click(button('Walk'));
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
  });

  it.each(['quiet', 'unmount'] as const)('does not read an old top-up after %s', async (after) => {
    vi.useFakeTimers();
    const announce = vi.spyOn(live, 'announce');
    const id = store.state.value.habits[0]!.id;
    view = mount(<DoneTodayStep habitIds={[id]} onNext={() => undefined} />);
    await click(button('Walk'));
    if (after === 'quiet') await act(() => store.updateSettings({ quietRewards: true }));
    else { view.unmount(); view = null; }
    await act(() => vi.advanceTimersByTimeAsync(1800));
    expect(announce.mock.calls.map(([line]) => line).join(' ')).not.toMatch(/capsule/i);
  });

  it('keeps history correction helper and success toast quiet', async () => {
    const id = store.state.value.habits[0]!.id;
    store.setStartedOn(id, '2026-09-01');
    store.updateSettings({ quietRewards: true });
    view = mount(<Calendar habitId={id} month="2026-09" />);
    await click(view.root.querySelector('[data-date="2026-09-01"]'));
    expect(view.root.textContent).not.toMatch(/coin|capsule/i);
    await click(button('Water it for Sep 1'));
    expect(store.state.value.logs[id]?.['2026-09-01']?.count).toBe(1);
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
  });
});

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
import { Toaster } from '@/ui/Toaster';
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
  it.each([['Sidebar', Sidebar], ['TabBar', TabBar]] as const)('%s hides only the Capsules destination and restores it losslessly', async (_name, Nav) => {
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
    expect(view.root.textContent).toContain('Turn this off to return to collecting. Everything earned stays kept.');
    expect({ ...store.state.value, settings: before.settings }).toEqual(before);
    await click(toggle());
    expect(store.state.value).toEqual(before);
    expect(view.root.querySelector('a[href="#/capsules"]')).not.toBeNull();
  });

  it('hides Shelf wallet totals and the empty-pet capsule invitation, retaining functional prices', async () => {
    store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 123 } };
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
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    expect(store.state.value.wallet.coins).toBeGreaterThanOrEqual(25);
    expect(view.root.textContent).not.toMatch(/coin|capsule/i);
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
    await act(async () => { await vi.advanceTimersByTimeAsync(1800); });
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((n) => n.textContent).join(' ')).not.toMatch(/coin|capsule/i);
    await click(button('Walk'));
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
  });

  it('keeps the purchase price but hides the wallet total if a confirmed place becomes unaffordable', async () => {
    store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 5000 } };
    store.updateSettings({ quietRewards: true });
    view = mount(<ShelfScreen />);
    await until(() => view!.root.querySelector('[data-open-place]'), 'place purchase');
    const first = view.root.querySelector<HTMLButtonElement>('[data-open-place]')!;
    const label = first.textContent!.trim();
    await click(first);
    await until(() => document.querySelector('[role="alertdialog"]'), 'confirmation');
    await act(() => { store.state.value = { ...store.state.value, wallet: { ...store.state.value.wallet, coins: 123 } }; });
    const confirm = document.querySelector('[role="alertdialog"]')!;
    await click(Array.from(confirm.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) ?? null);
    expect(toasts.value.find((t) => t.key === 'shelf-place')?.message).toMatch(/is \d+ coins\./);
    expect(toasts.value.find((t) => t.key === 'shelf-place')?.message).not.toMatch(/123|in the jar/);
    expect(store.state.value.wallet.coins).toBe(123);
  });

  it.each(['quiet', 'unmount'] as const)('does not read an old top-up after %s', async (after) => {
    vi.useFakeTimers();
    const announce = vi.spyOn(live, 'announce');
    const id = store.state.value.habits[0]!.id;
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    if (after === 'quiet') await act(() => store.updateSettings({ quietRewards: true }));
    else { view.unmount(); view = null; }
    await act(async () => { await vi.advanceTimersByTimeAsync(1800); });
    expect(announce.mock.calls.map(([line]) => line).join(' ')).not.toMatch(/capsule/i);
    if (after === 'quiet') {
      expect.soft(Array.from(document.querySelectorAll('[aria-live]')).map((node) => node.textContent).join(' ')).not.toMatch(/coins?|capsule/i);
      expect.soft(toasts.value.map((item) => item.label ?? item.message).join(' ')).not.toMatch(/coins?|capsule/i);
    }
  });

  it.each(['quiet', 'unmount', 'replacement'] as const)('does not deliver a top-up already queued in the live region after %s', async (after) => {
    vi.useFakeTimers();
    const id = store.state.value.habits[0]!.id;
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1610); });
    if (after === 'quiet') await act(() => store.updateSettings({ quietRewards: true }));
    else if (after === 'unmount') { view.unmount(); view = null; }
    else await act(() => { store.saveEpoch.value++; });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((el) => el.textContent).join(' ')).not.toMatch(/coins?|capsule/i);
  });

  it.each([true, false])('keeps focused toast Undo usable when quiet began before watering: %s', async (initialQuiet) => {
    vi.useFakeTimers();
    store.updateSettings({ quietRewards: initialQuiet });
    const id = store.state.value.habits[0]!.id;
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    const coins = store.state.value.wallet.coins;
    const undo = button('Undo')!;
    await act(() => undo.focus());
    if (!initialQuiet) await act(() => store.updateSettings({ quietRewards: true }));
    expect(document.activeElement).toBe(undo);
    expect(document.querySelector('[data-toast-id]')?.textContent).not.toMatch(/\+5|coins?|capsule/i);
    await click(undo);
    const undone = store.state.value.logs[id]?.[store.today.value];
    expect(undone?.kind === 'log' ? undone.count : 0).toBe(0);
    expect(store.state.value.wallet.coins).toBe(coins - 5);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(toasts.value.filter((item) => !item.leaving).map((item) => item.label ?? item.message).join(' ')).not.toMatch(/coins?|capsule/i);
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((el) => el.textContent).join(' ')).not.toMatch(/coins?|capsule/i);
  });

  it('changes an already-visible note without restarting its remaining lifetime', async () => {
    vi.useFakeTimers();
    const id = store.state.value.habits[0]!.id;
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    const item = toasts.value.find((t) => t.key === `checkin-${id}`)!;
    expect(document.querySelector(`[data-toast-id="${item.id}"]`)?.textContent).toContain('+5');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    await act(() => store.updateSettings({ quietRewards: true }));
    const quietItem = toasts.value.find((t) => t.id === item.id)!;
    expect(quietItem.version).toBe(item.version);
    expect(quietItem.actions).toBe(item.actions);
    expect(quietItem.label).not.toMatch(/coin/i);
    expect(document.querySelector(`[data-toast-id="${item.id}"]`)?.textContent).not.toContain('+5');
    await act(async () => { await vi.advanceTimersByTimeAsync(1999); });
    expect(toasts.value.find((t) => t.id === item.id)?.leaving).not.toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(toasts.value.find((t) => t.id === item.id)?.leaving).toBe(true);
  });

  it('uses the current setting during the last live-write delay for a check-in and its refund', async () => {
    vi.useFakeTimers();
    const id = store.state.value.habits[0]!.id;
    view = mount(<><DoneTodayStep habitIds={[id]} onNext={() => undefined} /><Toaster /></>);
    await click(button('Walk'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1210); });
    await act(() => store.updateSettings({ quietRewards: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(70); });
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((el) => el.textContent).join(' ')).not.toMatch(/coins?|capsule/i);
    await act(() => store.updateSettings({ quietRewards: false }));
    await click(button('Undo'));
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    await act(() => store.updateSettings({ quietRewards: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(70); });
    expect(Array.from(document.querySelectorAll('[aria-live]')).map((el) => el.textContent).join(' ')).not.toMatch(/coins?|capsule/i);
    expect(document.querySelector('[data-toast-id]:not([data-toast-leaving])')?.textContent).not.toMatch(/coins?|capsule/i);
  });

  it('keeps history correction helper and success toast quiet', async () => {
    const id = store.state.value.habits[0]!.id;
    store.setStartedOn(id, '2026-09-01');
    store.updateSettings({ quietRewards: true });
    view = mount(<Calendar habitId={id} month="2026-09" />);
    await click(view.root.querySelector('[data-date="2026-09-01"]'));
    expect(view.root.textContent).not.toMatch(/coin|capsule/i);
    await click(button('Water it for Sep 1'));
    expect(store.state.value.logs[id]?.['2026-09-01']).toMatchObject({ kind: 'log', count: 1 });
    expect(toasts.value.map((t) => t.label ?? t.message).join(' ')).not.toMatch(/coin|capsule/i);
  });
});

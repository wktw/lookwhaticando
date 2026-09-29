// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { state, wish } from '@/state/store';
import { CapsulesScreen, availableCabinets } from './CapsulesScreen';
import { button, buttonWithText, click, installDom, key, mount, pause, revealDialog, until } from './testing';

vi.mock('@/state/store', async (importOriginal) => {
  const store = await importOriginal<typeof import('@/state/store')>();
  return { ...store, wish: vi.fn() };
});

/** Lets a test decide when the grid's "load more" sentinel scrolls into view. */
const observers: IntersectionObserverCallback[] = [];
class FakeObserver {
  constructor(cb: IntersectionObserverCallback) {
    observers.push(cb);
  }
  observe() {}
  disconnect() {}
}

const orderSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.textContent?.includes('ordered at the counter'));
const tiles = () => orderSheet()?.querySelectorAll('ul li button').length ?? 0;

let view: ReturnType<typeof mount> | null = null;

beforeAll(() => {
  installDom();
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeObserver;
});
beforeEach(() => {
  vi.mocked(wish)
    .mockReset()
    .mockImplementation((itemId) => ({ ok: true, itemId, stars: 2, events: [] }));
  state.value = { ...state.value, collection: {}, wallet: { coins: 100, stars: 20, stardust: 0, tickets: 0 } };
  view = mount(<CapsulesScreen />);
});
afterEach(() => {
  view?.unmount();
  view = null;
});

describe('the counter', () => {
  it('only in-season editions stand on the counter', () => {
    const autumn = availableCabinets('2026-09-29').map((m) => m.id);
    expect(autumn).toEqual(['cats', 'cows', 'dogs', 'pond', 'garden', 'pantry', 'night', 'autumn']);
    const winter = availableCabinets('2026-12-01').map((m) => m.id);
    expect(winter).toContain('winter');
    expect(winter).not.toContain('autumn');
  });

  it('each cabinet stands beside its lineup leaflet, which opens the full lineup', async () => {
    const leaflet = button(/^Lineup leaflet/)!;
    expect(leaflet.getAttribute('aria-label')).toMatch(/0 of 21 collected/);
    expect(leaflet.textContent).toMatch(/\?/);
    await click(leaflet, 'the leaflet');
    const sheet = await until(() => document.querySelector('[role="dialog"][aria-modal="true"]'), 'the Lineup sheet');
    expect(sheet.textContent).toMatch(/Classic/);
    expect(sheet.textContent).toMatch(/Super rare/);
    expect(sheet.textContent).toMatch(/Secret/);
  });
});

describe('Special Order', () => {
  it('opens on the series you are looking at, and builds its list a page at a time', async () => {
    await click(buttonWithText('Special Order'), 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    expect(orderSheet()!.querySelector('[aria-pressed="true"]')?.textContent).toBe('No. 01 Cats');
    expect(orderSheet()!.textContent).toMatch(/0 of 10 swaps toward the next stamp/);

    await click(button('Every series'), 'Every series');
    expect(tiles()).toBe(24);
    await pause(20);
    observers.at(-1)!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await until(() => tiles() === 48, 'the next page of tiles');
  });

  it('an order is revealed, keeps focus inside, then hands focus back to "Special Order"', async () => {
    const opener = buttonWithText('Special Order')!;
    opener.focus();
    await click(opener, 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    await click(orderSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Place the order'), 'Place the order');

    const reveal = await until(revealDialog, 'the reveal');
    expect(reveal.contains(document.activeElement)).toBe(true);
    await pause(400); // the sheet has slid away by now
    expect(orderSheet()).toBeUndefined();
    expect(revealDialog()!.contains(document.activeElement)).toBe(true);

    await until(() => document.activeElement?.tagName === 'H2', 'the card');
    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(document.activeElement).toBe(opener);
    // The sheet and the reveal both locked scrolling; both have let go.
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('says kindly when there are not enough stamps', async () => {
    vi.mocked(wish).mockImplementation(() => ({ ok: false, error: 'not-enough-stars' }));
    state.value = { ...state.value, wallet: { ...state.value.wallet, stars: 30 } };
    await click(buttonWithText('Special Order'), 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    await click(orderSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Place the order'), 'Place the order');
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the notice');
    expect(alert.textContent).toMatch(/Stamps come from showing up, Sunday Notes and pins\./);
  });
});

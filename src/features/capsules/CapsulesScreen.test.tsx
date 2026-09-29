// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { state, wish } from '@/state/store';
import { CapsulesScreen } from './CapsulesScreen';
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

const wellSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.textContent?.includes('Wishes cost stars'));
const tiles = () => wellSheet()?.querySelectorAll('ul li button').length ?? 0;

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

describe('Wishing Well', () => {
  it('opens on the machine you are looking at, and builds its grid a page at a time', async () => {
    await click(buttonWithText('Make a wish'), 'Make a wish');
    await until(wellSheet, 'the Wishing Well');
    expect(wellSheet()!.querySelector('[aria-pressed="true"]')?.textContent).toBe('Kitty');

    await click(button('All machines'), 'All machines');
    expect(tiles()).toBe(24);
    await pause(20);
    observers.at(-1)!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await until(() => tiles() === 48, 'the next page of tiles');
  });

  it('a wish reveal keeps focus inside it, then hands focus back to "Make a wish"', async () => {
    const opener = buttonWithText('Make a wish')!;
    opener.focus();
    await click(opener, 'Make a wish');
    await until(wellSheet, 'the Wishing Well');
    await click(wellSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Make the wish'), 'Make the wish');

    const reveal = await until(revealDialog, 'the wish reveal');
    expect(reveal.contains(document.activeElement)).toBe(true);
    await pause(400); // the sheet has slid away by now
    expect(wellSheet()).toBeUndefined();
    expect(revealDialog()!.contains(document.activeElement)).toBe(true);

    await until(() => document.activeElement?.tagName === 'H2', 'the card');
    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(document.activeElement).toBe(opener);
    // Sheet and reveal both locked scrolling; both have let go.
    expect(document.documentElement.style.overflow).toBe('');
  });
});

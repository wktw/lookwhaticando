// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WISH_PRICE, getMachine, seriesLabel } from '@/catalog/machines';
import { getCollectible, itemsInMachine } from '@/catalog/collectibles';
import type { MachineId } from '@/catalog/types';
import { newPetState } from '@/domain/friendship';
import { ownership, state, today, wish } from '@/state/store';
import { toasts } from '@/ui/toast';
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
  unobserve() {}
  disconnect() {}
}

const orderSheet = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.textContent?.includes('not yet in the Field Guide'));
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
  ownership.value = 'unsupported';
});

describe('the counter', () => {
  it('only in-season editions stand on the counter (capsulesView)', () => {
    const was = today.value;
    today.value = '2026-09-29';
    const autumn = availableCabinets().map((m) => m.id);
    expect(autumn).toEqual(['cats', 'cows', 'dogs', 'pond', 'garden', 'pantry', 'night', 'autumn']);
    today.value = '2026-12-01';
    const winter = availableCabinets().map((m) => m.id);
    expect(winter).toContain('winter');
    expect(winter).not.toContain('autumn');
    today.value = was;
  });

  it('each cabinet stands beside its lineup leaflet, which opens the full lineup', async () => {
    const leaflet = button(/^Lineup leaflet/)!;
    expect(leaflet.getAttribute('aria-label')).toMatch(/21 in the lineup/);
    expect(leaflet.textContent).toMatch(/\?/);
    await click(leaflet, 'the leaflet');
    const sheet = await until(() => document.querySelector('[role="dialog"][aria-modal="true"]'), 'the Lineup sheet');
    expect(sheet.textContent).toMatch(/Classic/);
    expect(sheet.textContent).toMatch(/Super rare/);
    expect(sheet.textContent).toMatch(/Secret/);
  });
});

describe('the free first capsule (after "Not yet, I’ll earn it")', () => {
  it('each first-pick cabinet offers it on the Capsules tab, and pulls it free', async () => {
    view?.unmount();
    state.value = { ...state.value, lifetime: { ...state.value.lifetime, pulls: 0 }, ledger: { ...state.value.ledger, once: {} }, wallet: { coins: 0, stars: 0, stardust: 0, tickets: 0 } };
    view = mount(<CapsulesScreen />);
    // Cats is the first cabinet: its first capsule is on the house, not "unaffordable at 0 coins".
    expect(document.body.textContent).toMatch(/Your first capsule is on the house/);
    const put = buttonWithText('Put a coin in')!;
    expect(document.querySelector('[class*="facts"]')?.textContent).toMatch(/on the house/);
    expect(put.getAttribute('aria-label')).toBe('Put a coin in, on the house');
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
    await click(button('Order'), 'Order');

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
    await click(button('Order'), 'Order');
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the notice');
    expect(alert.textContent).toBe(`A Classic is ${WISH_PRICE.common} stamps at the counter. There are 30 on the card.`);
  });

  it('an order that could not be saved is not shown, says nothing was spent, and the sheet stays (audit FS10)', async () => {
    vi.mocked(wish).mockImplementation(() => ({ ok: false, error: 'storage-full' }));
    await click(buttonWithText('Special Order'), 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    await click(orderSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Order'), 'Order');
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the notice');
    expect(alert.textContent).toBe('That order couldn’t be saved, so it wasn’t placed. No stamps were spent.');
    expect(revealDialog()).toBeNull();
    expect(orderSheet()).toBeTruthy();
  });

  it('"one moment" while this window gets ready, gone once it is (audit FS4)', async () => {
    ownership.value = 'acquiring';
    vi.mocked(wish).mockImplementation(() => ({ ok: false, error: 'acquiring' }));
    await click(buttonWithText('Special Order'), 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    await click(orderSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Order'), 'Order');
    const alert = await until(() => document.querySelector('[role="alert"]'), 'the notice');
    expect(alert.textContent).toBe('One moment: catkin is still getting ready in this window. No stamps were spent.');
    ownership.value = 'granted';
    await until(() => !document.querySelector('[role="alert"]'), 'the notice to clear');
    expect(button('Order')?.disabled).toBe(false);
  });

  it('the order’s reveal is cleared from the store once shown, so the cabinet never replays it', async () => {
    vi.mocked(wish).mockImplementation((itemId) => {
      // The store commits an order before it animates (pendingReveal with order: true).
      state.value = { ...state.value, pendingReveal: { machineId: 'cats', itemId, isNew: true, stardust: 0, fusedStars: 0, order: true, at: 0 } };
      return { ok: true, itemId, stars: 2, events: [] };
    });
    await click(buttonWithText('Special Order'), 'Special Order');
    await until(orderSheet, 'the Special Order sheet');
    await click(orderSheet()!.querySelector('ul li button'), 'a tile');
    await click(button('Order'), 'Order');
    await until(revealDialog, 'the reveal');
    expect(state.value.pendingReveal?.order).toBe(true);
    await until(() => document.activeElement?.tagName === 'H2', 'the card');
    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(state.value.pendingReveal).toBeUndefined();
  });

  it('after a reload mid-reveal, the order comes back as an order, not as a capsule from the cabinet', async () => {
    view?.unmount();
    const itemId = 'pet-cat-siamese';
    state.value = { ...state.value, pendingReveal: { machineId: 'cats', itemId, isNew: true, stardust: 0, fusedStars: 0, order: true, at: 0 } };
    view = mount(<CapsulesScreen />);
    const reveal = await until(revealDialog, 'the order’s reveal');
    await until(() => reveal.textContent?.includes(getCollectible(itemId)!.name), 'the card');
    expect(reveal.textContent).toMatch(/Your order/);
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(state.value.pendingReveal).toBeUndefined();
  });

  it('"Let {name} choose" lets a new pet pick, and says what it chose', async () => {
    view?.unmount();
    const itemId = 'pet-bunny-lop';
    const pet = newPetState(itemId, () => 0.5, Date.now(), today.value, true);
    state.value = {
      ...state.value,
      pets: { ...state.value.pets, [itemId]: pet },
      pendingReveal: { machineId: 'garden', itemId, isNew: true, stardust: 0, fusedStars: 0, order: true, at: 0 },
    };
    view = mount(<CapsulesScreen />);
    await until(() => button(`Let ${pet.name} choose`), 'the Let-choose button');
    expect(button(`Find ${pet.name} a plant`)).not.toBeNull();
    await click(button(`Let ${pet.name} choose`), 'Let choose');
    await until(() => !revealDialog(), 'the reveal to close');
    const note = await until(() => toasts.value.find((t) => t.key === `chose-${itemId}`), 'the note');
    expect(String(note.message)).toMatch(new RegExp(`^${pet.name} chose .+\\.$`));
    expect(state.value.pendingReveal).toBeUndefined();
  });
});

describe('integration-i3: a capsule left waiting opens on its own cabinet, wherever the counter was (WP-A8)', () => {
  /** A capsule the store committed on `machineId` (commit before animate) that was never opened. */
  const waitingOn = (machineId: MachineId, at = 1) => {
    const itemId = itemsInMachine(machineId).find((i) => i.category !== 'pet')!.id;
    state.value = { ...state.value, pendingReveal: { machineId, itemId, isNew: true, stardust: 0, fusedStars: 0, at } };
    return itemId;
  };
  const cardName = async () => {
    await click(await until(() => button(/^Open the capsule/), 'the capsule'), 'the capsule');
    return until(() => revealDialog()?.querySelector('h2')?.textContent, 'the card');
  };
  const onCounter = () => document.querySelector('[aria-label="Choose a cabinet"] [aria-current="true"]')?.getAttribute('aria-label');

  it.each(['cows', 'dogs', 'pond', 'garden', 'pantry', 'night', 'autumn', 'cats'] as const)(
    'a %s capsule: the counter opens on that cabinet with it, and closing it clears it (failed before, except cats)',
    async (id) => {
      view?.unmount();
      const was = today.value;
      today.value = '2026-09-29';
      try {
        const itemId = waitingOn(id);
        view = mount(<CapsulesScreen />);
        await until(revealDialog, 'the waiting capsule');
        expect(onCounter()).toBe(seriesLabel(getMachine(id)));
        expect(await cardName()).toBe(getCollectible(itemId)!.name);
        await key(document.activeElement!, 'Escape');
        await until(() => !revealDialog(), 'the reveal to close');
        expect(state.value.pendingReveal).toBeUndefined();
      } finally {
        today.value = was;
      }
    },
  );

  it('a capsule from a season that has gone since opens over the counter, and once shown the cabinets are free (failed before)', async () => {
    view?.unmount();
    const was = today.value;
    today.value = '2026-12-01';
    try {
      expect(availableCabinets().map((m) => m.id)).not.toContain('autumn');
      const itemId = waitingOn('autumn');
      view = mount(<CapsulesScreen />);
      await until(revealDialog, 'the waiting capsule');
      expect(await cardName()).toBe(getCollectible(itemId)!.name);
      await key(document.activeElement!, 'Escape');
      await until(() => !revealDialog(), 'the reveal to close');
      expect(state.value.pendingReveal).toBeUndefined();
      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    } finally {
      today.value = was;
    }
  });
});

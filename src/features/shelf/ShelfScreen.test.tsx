// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDemo } from '@/state/demo';
import { runtimeLocalTime } from '@/domain/dates';
import { createInitialState } from '@/state/defaults';
import { petPet, state, today } from '@/state/store';
import { collectionView } from '@/state/selectors';
import type { AppState } from '@/state/types';
import { closePetCard, petCardRequest } from '@/features/habits/open';
import { routeRest } from '@/app/router';
import { toasts } from '@/ui/toast';
import { button, buttonWithText, click, installDom, key, mount, until } from '@/features/capsules/testing';
import { ShelfScreen, scenePets, scenePots } from './ShelfScreen';
import { basketRows } from './BasketSheet';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const TODAY = '2026-09-29';
let demo: AppState;
let view: ReturnType<typeof mount> | null = null;

beforeAll(() => {
  installDom();
  today.value = TODAY;
  demo = buildDemo({ today: TODAY, now: Date.parse('2026-09-29T15:00:00'), local: runtimeLocalTime });
});
beforeEach(() => {
  state.value = demo;
  toasts.value = [];
  closePetCard();
});
afterEach(() => {
  view?.unmount();
  view = null;
});

/** Mounts the Shelf and waits for the paper below the scene (it follows the first paint). */
async function mountShelf() {
  view = mount(<ShelfScreen />);
  await until(() => view!.root.querySelector('section[aria-labelledby="shelf-places"]'), 'the paper below the scene');
  return view;
}

const dialog = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]')).find((d) => d.textContent?.includes(text));

describe('the Shelf', () => {
  it('has one h1, the scene as a labelled group, and every pet as a button to its card', async () => {
    const view = await mountShelf();
    expect(view.root.querySelectorAll('h1')).toHaveLength(1);
    expect(view.root.querySelector('[role="group"][aria-label^="The Shelf"]')).not.toBeNull();
    const pets = Object.values(demo.pets);
    expect(view.root.querySelectorAll('[data-pet-tile]')).toHaveLength(pets.length);
    // Pets out are in the scene, named after themselves.
    const out = pets.filter((p) => p.inMeadow);
    for (const p of out) expect(view.root.querySelector(`[data-pet="${p.id}"]`), p.name).not.toBeNull();
    const tile = view.root.querySelector<HTMLButtonElement>('[data-pet-tile]')!;
    await click(tile);
    expect(petCardRequest.value).toEqual({ id: tile.dataset.petTile });
  });

  it('opens on a line from the sill about a pet out, by name', async () => {
    const view = await mountShelf();
    const line = await until(() => view!.root.querySelector('[data-caption]')?.textContent, 'the caption');
    const names = Object.values(demo.pets).filter((p) => p.inMeadow).map((p) => p.name);
    expect(names.some((n) => line.includes(n))).toBe(true);
  });

  it('with no pets yet, points her to her first capsule', async () => {
    const empty = { ...createInitialState(Date.parse('2026-09-29T10:00:00')), profile: { name: 'Sam', onboarded: true, createdAt: 0 } };
    state.value = empty;
    const view = await mountShelf();
    expect(view.root.textContent).toContain('The sill is ready for someone.');
    expect(view.root.textContent).toContain('Your first capsule is on the Capsules tab.');
    expect(view.root.querySelectorAll('[data-pet-tile]')).toHaveLength(0);
  });

  it('opens a place with coins, asking first, and says who moved in', async () => {
    state.value = { ...demo, wallet: { ...demo.wallet, coins: 5000 } };
    const view = await mountShelf();
    const locked = demo.shelf.places.includes('bookshelf') ? 'quilt' : 'bookshelf';
    await click(view.root.querySelector(`[data-open-place="${locked}"]`), 'Open for… coins');
    const ask = await until(() => dialog('?'), 'the confirm');
    await click(Array.from(ask.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Open for')) ?? null, 'confirm');
    expect(state.value.shelf.places).toContain(locked);
    expect(state.value.wallet.coins).toBeLessThan(5000);
    expect(toasts.value.at(-1)?.message).toMatch(/is open/);
  });

  it('says what a place costs when the jar is short, and offers no button', async () => {
    state.value = { ...demo, wallet: { ...demo.wallet, coins: 12 } };
    const view = await mountShelf();
    expect(view.root.querySelector('[data-open-place]')).toBeNull();
    // The jar is said once, above the places; each locked place keeps its price and its room.
    expect(view.root.textContent).toContain('There are 12 coins in the jar.');
    expect(view.root.textContent).not.toContain('in the jar. There');
    expect(view.root.textContent).toContain('1,000 coins. ');
  });

  it('on a first day, offers no Decorate or Basket with nothing in them', async () => {
    const empty = { ...createInitialState(Date.parse('2026-09-29T10:00:00')), profile: { name: 'Sam', onboarded: true, createdAt: 0 } };
    state.value = empty;
    await mountShelf();
    expect(buttonWithText('Decorate')).toBeNull();
    expect(buttonWithText('Basket')).toBeNull();
  });

  it('a stroke that pays XP leaves the scene’s inputs as they were (no re-render behind the card)', async () => {
    await mountShelf();
    const pets = scenePets.value;
    const pots = scenePots.value;
    const id = Object.values(state.value.pets).find((p) => p.inMeadow)!.id;
    const xp = state.value.pets[id]!.xp;
    petPet(id);
    expect(state.value.pets[id]!.xp).toBeGreaterThan(xp);
    expect(scenePets.value).toBe(pets);
    expect(scenePots.value).toBe(pots);
  });

  it('decor edit mode: the tray adds a thing to the place in view, and Done ends it', async () => {
    // One more yarn ball than is already out, and room on the Sill.
    const placedYarn = demo.shelf.decor.filter((d) => d.itemId === 'decor-yarn-ball').length;
    const withDecor: AppState = {
      ...demo,
      shelf: { ...demo.shelf, decor: demo.shelf.decor.filter((d) => d.place !== 'sill' || d.itemId === 'decor-yarn-ball') },
      collection: { ...demo.collection, 'decor-yarn-ball': { count: placedYarn + 1, firstAt: 0 } },
    };
    state.value = withDecor;
    const view = await mountShelf();
    await click(buttonWithText('Decorate'), 'Decorate');
    expect(view.root.querySelector('[data-editing]')).not.toBeNull();
    // Every placed thing becomes a keyboard button in the scene.
    expect(view.root.querySelectorAll('[data-edit]').length).toBeGreaterThan(0);
    const before = state.value.shelf.decor.length;
    const tray = view.root.querySelector('section[aria-labelledby="shelf-decorate"]')!;
    const add = Array.from(tray.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.getAttribute('aria-label') === 'Yarn Ball');
    await click(add ?? null, 'the yarn ball');
    expect(state.value.shelf.decor.length).toBe(before + 1);
    const placed = state.value.shelf.decor.at(-1)!;
    expect(placed.place).toBe('sill');
    // The new thing is selected: flip it, then put it away.
    await click(buttonWithText('Flip'), 'Flip');
    expect(state.value.shelf.decor.find((d) => d.id === placed.id)?.flip).toBe(true);
    await click(buttonWithText('Put away'), 'Put away');
    expect(state.value.shelf.decor.find((d) => d.id === placed.id)).toBeUndefined();
    await click(buttonWithText('Done'), 'Done');
    expect(view.root.querySelector('[data-editing]')).toBeNull();
  });

  it('arriving with a thing to place ("Find it a place", WP-C7): edit mode, focus on that thing in the tray, and the route is plain Shelf again', async () => {
    const placedYarn = demo.shelf.decor.filter((d) => d.itemId === 'decor-yarn-ball').length;
    state.value = { ...demo, collection: { ...demo.collection, 'decor-yarn-ball': { count: placedYarn + 1, firstAt: 0 } } };
    location.hash = '#/shelf/place/decor-yarn-ball';
    routeRest.value = ['place', 'decor-yarn-ball'];
    try {
      const view = await mountShelf();
      await until(() => view.root.querySelector('[data-editing]'), 'edit mode');
      const tray = view.root.querySelector('section[aria-labelledby="shelf-decorate"]')!;
      const tile = Array.from(tray.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.getAttribute('aria-label')?.startsWith('Yarn Ball'))!;
      await until(() => document.activeElement === tile, 'focus on the yarn ball');
      expect(routeRest.value).toEqual([]);
      expect(location.hash).toBe('#/shelf');
      // Nothing is placed until she says where.
      expect(state.value.shelf.decor.filter((d) => d.itemId === 'decor-yarn-ball')).toHaveLength(placedYarn);
    } finally {
      routeRest.value = [];
    }
  });

  it('a thing to place that isn’t in the tray (already out, or not hers) opens the Shelf as usual', async () => {
    location.hash = '#/shelf/place/decor-not-a-thing';
    routeRest.value = ['place', 'decor-not-a-thing'];
    try {
      const view = await mountShelf();
      expect(view.root.querySelector('[data-editing]')).toBeNull();
      expect(routeRest.value).toEqual([]);
    } finally {
      routeRest.value = [];
    }
  });

  it('the scene’s keys flip and remove a thing in edit mode', async () => {
    const view = await mountShelf();
    await click(buttonWithText('Decorate'), 'Decorate');
    const hit = view.root.querySelector<HTMLButtonElement>('[data-edit]')!;
    const id = hit.dataset.edit!;
    const was = !!state.value.shelf.decor.find((d) => d.id === id)?.flip;
    await key(hit, 'f');
    expect(!!state.value.shelf.decor.find((d) => d.id === id)?.flip).toBe(!was);
    await key(view.root.querySelector<HTMLButtonElement>(`[data-edit="${id}"]`)!, 'Delete');
    expect(state.value.shelf.decor.find((d) => d.id === id)).toBeUndefined();
  });

  it('the basket sheet offers a bake only for a treat running out, never a harvest, for 10 coins', async () => {
    const rows = basketRows.peek();
    const low = rows.pantry[0]!;
    const pantry: AppState['pantry'] = {};
    for (const r of rows.pantry) pantry[r.id] = { servings: 5, restockedOn: TODAY };
    for (const h of rows.basket) pantry[h.id] = { servings: 0, restockedOn: TODAY };
    pantry[low.id] = { servings: 1, restockedOn: TODAY };
    state.value = { ...demo, pantry, wallet: { ...demo.wallet, coins: 100 } };
    await mountShelf();
    await click(buttonWithText('Basket'), 'Basket');
    const sheet = await until(() => dialog('The pantry'), 'the basket sheet');
    const bakes = sheet.querySelectorAll<HTMLButtonElement>('button[aria-label^="Bake a tray"]');
    expect(bakes).toHaveLength(1);
    const bake = bakes[0]!;
    const treat = bake.getAttribute('aria-label')!.split(', ')[1]!;
    expect(treat).toBe(low.name);
    await click(bake);
    expect(state.value.wallet.coins).toBe(90);
    expect(toasts.value.at(-1)?.message).toContain(`Baked: 5 servings of ${treat.toLowerCase()}`);
  });

  it('the Field Guide opens on a page, and arrow keys move between pages', async () => {
    const view = await mountShelf();
    await click(view.root.querySelector('[aria-label^="Cows,"]'), 'the Cows page');
    const tabs = await until(() => document.querySelector<HTMLElement>('[role="tablist"]'), 'the pages');
    const selected = () => tabs.querySelector('[aria-selected="true"]')?.textContent ?? '';
    expect(selected()).toMatch(/^Cows/);
    await key(tabs, 'ArrowRight');
    expect(selected()).toMatch(/^Dogs/);
    const page = document.querySelector('[role="tabpanel"]')!;
    // Anything not yet hers is "not yet"; only a Secret is a "?".
    expect(page.textContent).toContain('not yet');
    expect(button(/^Secret/)).toBeNull();
  });

  it('the Field Guide holds everything: the Moonlit page and the things, counted as the pins count', async () => {
    const view = await mountShelf();
    const meta = view.root.querySelector('#shelf-guide-count')!.textContent!;
    const guide = collectionView.peek();
    expect(meta).toBe(`${guide.owned} of ${guide.total}`);
    await click(view.root.querySelector('[aria-label^="Cats,"]'), 'the Cats page');
    const tabs = await until(() => document.querySelector<HTMLElement>('[role="tablist"]'), 'the pages');
    const names = Array.from(tabs.querySelectorAll('[role="tab"]')).map((t) => t.firstChild?.textContent);
    for (const n of ['Wardrobe', 'Treats', 'Decor']) expect(names).toContain(n);
    // Counts read as words, never "3 slash 21".
    expect(tabs.querySelector('[role="tab"]')!.textContent).toMatch(/, \d+ of \d+$/);
    await click(Array.from(tabs.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.firstChild?.textContent === 'Treats') ?? null, 'Treats');
    const page = document.querySelector('[role="tabpanel"]')!;
    expect(page.querySelector('h3')!.textContent).toBe('Treats');
    // An owned thing says its rarity in words.
    const owned = page.querySelector('[data-owned]')!;
    const item = guide.categories.find((c) => c.category === 'treat')!.items.find((i) => i.owned > 0)!;
    expect(owned.textContent).toContain(item.rarityLabel);
  });
});

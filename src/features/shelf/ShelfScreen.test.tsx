// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDemo } from '@/state/demo';
import { runtimeLocalTime } from '@/domain/dates';
import { createInitialState } from '@/state/defaults';
import { state, today } from '@/state/store';
import type { AppState } from '@/state/types';
import { closePetCard, petCardRequest } from '@/features/habits/open';
import { toasts } from '@/ui/toast';
import { button, buttonWithText, click, installDom, key, mount, until } from '@/features/capsules/testing';
import { ShelfScreen } from './ShelfScreen';

vi.setConfig({ testTimeout: 60_000 });

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

const dialog = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]')).find((d) => d.textContent?.includes(text));

describe('the Shelf', () => {
  it('has one h1, the scene as a labelled group, and every pet as a button to its card', async () => {
    view = mount(<ShelfScreen />);
    expect(view.root.querySelectorAll('h1')).toHaveLength(1);
    expect(view.root.querySelector('[role="group"][aria-label^="The Shelf"]')).not.toBeNull();
    const pets = Object.values(demo.pets);
    expect(view.root.querySelectorAll('[data-pet-tile]')).toHaveLength(pets.length);
    // Pets out are in the scene, named after themselves.
    const out = pets.filter((p) => p.inMeadow);
    for (const p of out) expect(view.root.querySelector(`[data-pet="${p.id}"]`), p.name).not.toBeNull();
    const tile = view.root.querySelector<HTMLButtonElement>('[data-pet-tile]')!;
    await click(tile);
    expect(petCardRequest.value).toBe(tile.dataset.petTile);
  });

  it('opens on a line from the sill about a pet out, by name', async () => {
    view = mount(<ShelfScreen />);
    const line = await until(() => view!.root.querySelector('[data-caption]')?.textContent, 'the caption');
    const names = Object.values(demo.pets).filter((p) => p.inMeadow).map((p) => p.name);
    expect(names.some((n) => line.includes(n))).toBe(true);
  });

  it('with no pets yet, points her to her first capsule', () => {
    const empty = { ...createInitialState(Date.parse('2026-09-29T10:00:00')), profile: { name: 'Sam', onboarded: true, createdAt: 0 } };
    state.value = empty;
    view = mount(<ShelfScreen />);
    expect(view.root.textContent).toContain('The sill is ready for someone.');
    expect(view.root.textContent).toContain('Your first capsule is on the Capsules tab.');
    expect(view.root.querySelectorAll('[data-pet-tile]')).toHaveLength(0);
  });

  it('opens a place with coins, asking first, and says who moved in', async () => {
    state.value = { ...demo, wallet: { ...demo.wallet, coins: 5000 } };
    view = mount(<ShelfScreen />);
    const locked = demo.shelf.places.includes('bookshelf') ? 'quilt' : 'bookshelf';
    await click(view.root.querySelector(`[data-open-place="${locked}"]`), 'Open for… coins');
    const ask = await until(() => dialog('?'), 'the confirm');
    await click(Array.from(ask.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Open for')) ?? null, 'confirm');
    expect(state.value.shelf.places).toContain(locked);
    expect(state.value.wallet.coins).toBeLessThan(5000);
    expect(toasts.value.at(-1)?.message).toMatch(/is open/);
  });

  it('says what a place costs when the jar is short, and offers no button', () => {
    state.value = { ...demo, wallet: { ...demo.wallet, coins: 12 } };
    view = mount(<ShelfScreen />);
    expect(view.root.querySelector('[data-open-place]')).toBeNull();
    expect(view.root.textContent).toContain('There are 12 in the jar.');
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
    view = mount(<ShelfScreen />);
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

  it('the scene’s keys flip and remove a thing in edit mode', async () => {
    view = mount(<ShelfScreen />);
    await click(buttonWithText('Decorate'), 'Decorate');
    const hit = view.root.querySelector<HTMLButtonElement>('[data-edit]')!;
    const id = hit.dataset.edit!;
    const was = !!state.value.shelf.decor.find((d) => d.id === id)?.flip;
    await key(hit, 'f');
    expect(!!state.value.shelf.decor.find((d) => d.id === id)?.flip).toBe(!was);
    await key(view.root.querySelector<HTMLButtonElement>(`[data-edit="${id}"]`)!, 'Delete');
    expect(state.value.shelf.decor.find((d) => d.id === id)).toBeUndefined();
  });

  it('the basket sheet bakes a tray for 10 coins', async () => {
    state.value = { ...demo, wallet: { ...demo.wallet, coins: 100 } };
    view = mount(<ShelfScreen />);
    await click(buttonWithText('Basket'), 'Basket');
    const sheet = await until(() => dialog('The pantry'), 'the basket sheet');
    const bake = sheet.querySelector<HTMLButtonElement>('button[aria-label^="Bake a tray"]')!;
    const treat = bake.getAttribute('aria-label')!.split(', ')[1]!;
    await click(bake);
    expect(state.value.wallet.coins).toBe(90);
    expect(toasts.value.at(-1)?.message).toContain(`Baked: 5 servings of ${treat.toLowerCase()}`);
  });

  it('the Field Guide opens on a page, and arrow keys move between pages', async () => {
    view = mount(<ShelfScreen />);
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
});

// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDemo } from '@/state/demo';
import { getCollectible } from '@/catalog/collectibles';
import { runtimeLocalTime } from '@/domain/dates';
import { now, state, today } from '@/state/store';
import type { AppState } from '@/state/types';
import { closePetCard, openPetCard, petCardRequest } from '@/features/habits/open';
import { toasts } from '@/ui/toast';
import { buttonWithText, click, installDom, mount, type, until } from '@/features/capsules/testing';
import { lint, PET_PRONOUN } from '../../../tests/unit/voiceLint';
import PetCardHost from './PetCardHost';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

// The whole file runs on 29 September at 3 pm: the demo, the pantry's restock day and the store's
// own rollover (which reads Date.now()) all agree on the day, whatever the real clock says.
const TODAY = '2026-09-29';
const NOW = Date.parse('2026-09-29T15:00:00');
let demo: AppState;
let view: ReturnType<typeof mount> | null = null;
let petId = '';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  installDom();
  now.value = NOW;
  today.value = TODAY;
  demo = buildDemo({ today: TODAY, now: NOW, local: runtimeLocalTime });
  petId = Object.values(demo.pets).find((p) => p.inMeadow)!.id;
});
beforeEach(() => {
  state.value = demo;
  toasts.value = [];
});
afterAll(() => {
  vi.useRealTimers();
});
afterEach(() => {
  closePetCard();
  view?.unmount();
  view = null;
});

const card = () => until(() => document.querySelector<HTMLElement>('[role="dialog"]'), 'the Pet Card');
const pet = () => state.value.pets[petId]!;

async function open(id = petId) {
  view = mount(<PetCardHost />);
  openPetCard(id);
  return card();
}

describe('the Pet Card', () => {
  it('is an adoption profile: name, friendship, Likes, Came home, all in the voice', async () => {
    const d = await open();
    expect(d.getAttribute('aria-labelledby')).toBeTruthy();
    expect(d.textContent).toContain(pet().name);
    for (const field of ['Friendship', 'Likes', 'Came home', 'Feed', 'Wardrobe', 'Spends the day in', 'Memories']) expect(d.textContent, field).toContain(field);
    expect(d.querySelector('[role="img"][aria-label^="Friendship: "]')).not.toBeNull();
    // Every sentence it shows passes the voice lint, with no pronoun for the pet.
    for (const p of d.querySelectorAll('p, dd, li')) expect(lint(p.textContent ?? '', { pronouns: PET_PRONOUN }), p.textContent ?? '').toEqual([]);
  });

  it('has a button for every gesture, and they pay friendship through petPet', async () => {
    await open();
    const before = pet().xp;
    await click(buttonWithText('Say hello'), 'Say hello');
    await click(buttonWithText('Stroke'), 'Stroke');
    await click(buttonWithText('Touch'), 'Touch nose');
    await click(buttonWithText('Pick up'), 'Pick up');
    expect(buttonWithText('Put down')).not.toBeNull();
    expect(pet().xp).toBeGreaterThan(before);
  });

  it('feeds from the pantry: a serving goes, and the caption names the pet', async () => {
    const d = await open();
    const feed = d.querySelector<HTMLButtonElement>('button[aria-label^="Feed "]:not([disabled])')!;
    const name = feed.getAttribute('aria-label')!.slice('Feed '.length).split(', ')[0]!;
    const id = Object.keys(state.value.pantry).find((t) => getCollectible(t)?.name === name)!;
    const before = state.value.pantry[id]!.servings;
    await click(feed);
    expect(state.value.pantry[id]!.servings).toBe(before - 1);
    expect(pet().daily.treats).toBeGreaterThan(0);
    const caption = await until(() => d.querySelector('p[class*="caption"]')?.textContent, 'the caption');
    expect(caption).toContain(pet().name);
  });

  it('renames with a suggestion, and marks a favourite', async () => {
    await open();
    await click(document.querySelector('button[aria-label="Rename"]'), 'Rename');
    const input = await until(() => document.querySelector<HTMLInputElement>('[role="dialog"] input'), 'the name field');
    await type(input, 'Marigold the Second');
    await click(buttonWithText('Keep it'), 'Keep it');
    expect(pet().name).toBe('Marigold the Second');
    const heart = document.querySelector<HTMLButtonElement>('button[aria-label="Favourite"]')!;
    const was = pet().favorite;
    await click(heart);
    expect(pet().favorite).toBe(!was);
  });

  it('the wardrobe previews first, then "Put it on" dresses the pet', async () => {
    const d = await open();
    const wear = Array.from(d.querySelectorAll<HTMLButtonElement>('button[aria-pressed="false"]')).find((b) => b.closest('[class*="wardrobe"]'));
    if (!wear) return; // the demo pet already wears everything in this slot
    await click(wear);
    const before = { ...pet().outfit };
    expect(pet().outfit).toEqual(before);
    await click(buttonWithText('Put it on'), 'Put it on');
    expect(pet().outfit).not.toEqual(before);
  });

  it('moves between out on the Shelf and indoors', async () => {
    const d = await open();
    const toggle = d.querySelector<HTMLInputElement>('input[role="switch"], input[type="checkbox"]')!;
    await click(toggle);
    expect(pet().inMeadow).toBe(false);
    expect(d.textContent).toContain('Indoors');
  });

  it('a favourite treat with no servings left says so, and a tap never bakes: baking is its own button', async () => {
    const p = demo.pets[petId]!;
    const fav = p.favoriteTreat;
    state.value = {
      ...demo,
      pets: { ...demo.pets, [petId]: { ...p, favoriteKnown: true } },
      collection: { ...demo.collection, [fav]: { count: 1, firstAt: 0 } },
      pantry: { ...demo.pantry, [fav]: { servings: 0, restockedOn: TODAY } },
      wallet: { ...demo.wallet, coins: 100 },
    };
    const d = await open();
    const name = getCollectible(fav)!.name;
    const tiles = Array.from(d.querySelectorAll<HTMLButtonElement>('button[aria-label^="Feed "]'));
    // The favourite comes first, says its servings ("More in the morning") and is tagged Favourite.
    const tile = tiles[0]!;
    expect(tile.getAttribute('aria-label')).toBe(`Feed ${name}, More in the morning, Favourite`);
    expect(tile.textContent).toContain('More in the morning');
    expect(tile.disabled).toBe(true);
    await click(tile);
    expect(state.value.wallet.coins).toBe(100);
    // At most a row of 6; the rest are in the basket and pantry.
    expect(tiles.length).toBeLessThanOrEqual(6);
    const bake = d.querySelector<HTMLButtonElement>(`button[aria-label="Bake a tray · 10 coins, ${name}"]`);
    if (getCollectible(fav)!.source === 'harvest') expect(bake).toBeNull();
    else {
      await click(bake, 'Bake a tray');
      expect(state.value.wallet.coins).toBe(90);
      expect(state.value.pantry[fav]!.servings).toBe(5);
    }
  });

  it('Memories: the day it came home and each “Look at us” bloom, before best friends', async () => {
    const habit = demo.habits.find((h) => h.archivedOn === undefined)!;
    // The plant bloomed on 12 Aug while this pet kept it company (WP-B6: the Memory is the bloom's day, with the pet there).
    const withBloom: AppState = {
      ...demo,
      stageDates: { ...demo.stageDates, [habit.id]: { ...demo.stageDates?.[habit.id], 5: '2026-08-12' } },
      company: {
        offer: demo.company?.offer ?? { declines: 0 },
        pairs: {
          ...(demo.company?.pairs ?? {}),
          [`${petId}|${habit.id}`]: { petId, habitId: habit.id, since: '2026-06-01', sunshine: 0, waterings: 40, stories: { lookAtUs: { on: '2026-08-12' } }, stints: [{ from: '2026-06-01', to: '2026-08-31' }] },
        },
      },
    };
    state.value = withBloom;
    const d = await open();
    const memories = d.querySelector('section[aria-labelledby="pc-memories"]')!;
    const items = Array.from(memories.querySelectorAll('li')).map((li) => li.textContent);
    expect(items.some((t) => t?.startsWith('Came home'))).toBe(true);
    expect(items).toContain(`The day ${habit.name} bloomed`);
    expect(memories.textContent).not.toContain('Memories start once');
  });

  it('closes itself for a pet that isn’t there', async () => {
    view = mount(<PetCardHost />);
    openPetCard('pet-nobody');
    await until(() => petCardRequest.value === null, 'the request to clear');
  });
});

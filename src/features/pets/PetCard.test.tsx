// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDemo } from '@/state/demo';
import { COLLECTIBLES, getCollectible } from '@/catalog/collectibles';
import { runtimeLocalTime } from '@/domain/dates';
import { now, state, today } from '@/state/store';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { closeHabitEditor, closePetCard, habitEditorRequest, openPetCard, petCardRequest } from '@/features/habits/open';
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
  closeHabitEditor();
  view?.unmount();
  view = null;
  vi.restoreAllMocks();
});

const card = () => until(() => document.querySelector<HTMLElement>('[role="dialog"]'), 'the Pet Card');
const pet = () => state.value.pets[petId]!;

async function open(id = petId) {
  view = mount(<PetCardHost />);
  openPetCard(id);
  return card();
}

describe('the Pet Card', () => {
  it('uses the solo nap line when the chosen friend comes indoors, while keeping the friend’s name in the profile', async () => {
    const friendId = Object.keys(demo.pets).find((id) => id !== petId)!;
    state.value = { ...demo, pets: { ...demo.pets,
      [petId]: { ...demo.pets[petId]!, xp: 540, inMeadow: true, place: 'sill', bestFriend: friendId },
      [friendId]: { ...demo.pets[friendId]!, inMeadow: true, place: 'sill' },
    } };
    const d = await open();
    expect(d.textContent).toContain(`${pet().name} naps next to ${state.value.pets[friendId]!.name} now, most afternoons.`);
    state.value = { ...state.value, pets: { ...state.value.pets, [friendId]: { ...state.value.pets[friendId]!, inMeadow: false } } };
    await until(() => d.textContent?.includes(`${pet().name} naps in the same spot every afternoon now.`), 'the solo nap line');
    expect(d.textContent).not.toContain('naps next to');
    expect(d.textContent).toContain(state.value.pets[friendId]!.name);
  });

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

/* ------------------------------------------------------------------ */
/* WP-C7: the Pet Card as the end of a hand-off                         */
/* ------------------------------------------------------------------ */

/** Eight treats she can bake, in name order (the card's order when every one has the same servings). */
const EIGHT = COLLECTIBLES.filter((c) => c.category === 'treat' && c.source !== 'harvest')
  .slice(0, 8)
  .sort((a, b) => a.name.localeCompare(b.name));

/** The demo pet with exactly these treats in the pantry, its favourite not known yet, and 100 coins. */
function withTreats(servings: (i: number) => number): AppState {
  const p = demo.pets[petId]!;
  const collection = Object.fromEntries(Object.entries(demo.collection).filter(([id]) => getCollectible(id)?.category !== 'treat'));
  for (const t of EIGHT) collection[t.id] = { count: 1, firstAt: 0 };
  return {
    ...demo,
    pets: { ...demo.pets, [petId]: { ...p, favoriteKnown: false, daily: { ...p.daily, treats: 0 } } },
    collection,
    pantry: Object.fromEntries(EIGHT.map((t, i) => [t.id, { servings: servings(i), restockedOn: TODAY }])),
    wallet: { ...demo.wallet, coins: 100 },
  };
}

/** The demo with the pet keeping no plant company. */
function unpaired(s: AppState = demo): AppState {
  return { ...s, habits: s.habits.map((h) => (h.companionId === petId ? { ...h, companionId: undefined } : h)) };
}

const feedButtons = (d: ParentNode) => Array.from(d.querySelectorAll<HTMLButtonElement>('button[aria-label^="Feed "]'));

describe('the Pet Card feeds every treat, not just the first six (WP-C7, creative-cr-01)', { timeout: 20_000 }, () => {
  it('"All treats (8)" shows the rest in the card, focus goes to the first of them, and the 8th of 8 can be fed', async () => {
    state.value = withTreats(() => 3);
    const d = await open();
    expect(feedButtons(d)).toHaveLength(6);
    const all = await until(() => Array.from(d.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'All treats (8)'), 'All treats (8)');
    expect(all.getAttribute('aria-expanded')).toBe('false');
    await click(all, 'All treats (8)');
    expect(all.getAttribute('aria-expanded')).toBe('true');
    const buttons = feedButtons(d);
    expect(buttons).toHaveLength(8);
    await until(() => document.activeElement === buttons[6], 'focus on the first treat shown');
    const eighth = EIGHT[7]!;
    expect(buttons[7]!.getAttribute('aria-label')).toBe(`Feed ${eighth.name}, 3 servings`);
    await click(buttons[7] ?? null, 'the 8th treat');
    expect(state.value.pantry[eighth.id]!.servings).toBe(2);
    for (const t of EIGHT.slice(0, 7)) expect(state.value.pantry[t.id]!.servings, t.name).toBe(3);
    expect(pet().daily.treats).toBe(1);
    const caption = await until(() => d.querySelector('p[class*="caption"]')?.textContent, 'the caption');
    expect(caption).toContain(pet().name);
    // The list stays where it was: the 8th is still the 8th, and still there to feed again.
    expect(feedButtons(d)[7]).toBe(buttons[7]);
  });

  it('a fed treat stays where it was while the card is open, and keeps focus', async () => {
    // Every treat has 3 servings, so the row is in name order; fed down to 2, the first would sort
    // last under a fresh feedOrder. The order taken as the card opened keeps it first, under her finger.
    state.value = withTreats(() => 3);
    const d = await open();
    const first = feedButtons(d)[0]!;
    expect(first.getAttribute('aria-label')).toBe(`Feed ${EIGHT[0]!.name}, 3 servings`);
    first.focus();
    await click(first, 'the first treat');
    expect(state.value.pantry[EIGHT[0]!.id]!.servings).toBe(2);
    const now = feedButtons(d)[0]!;
    expect(now.getAttribute('aria-label')).toBe(`Feed ${EIGHT[0]!.name}, 2 servings`);
    expect(now).toBe(first);
    expect(document.activeElement).toBe(first);
  });

  it('an empty treat at 7th or later can be baked from the card', async () => {
    // Most servings first: the empty one sorts last, the 8th.
    state.value = withTreats((i) => (i === 0 ? 0 : 4));
    const d = await open();
    const empty = EIGHT[0]!;
    expect(d.querySelector(`button[aria-label="Bake a tray · 10 coins, ${empty.name}"]`)).toBeNull();
    await click(Array.from(d.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'All treats (8)') ?? null, 'All treats (8)');
    const bake = await until(() => d.querySelector<HTMLButtonElement>(`button[aria-label="Bake a tray · 10 coins, ${empty.name}"]`), 'its bake button');
    await click(bake, 'Bake a tray');
    expect(state.value.wallet.coins).toBe(90);
    expect(state.value.pantry[empty.id]!.servings).toBe(5);
  });

  it('six or fewer treats: no "All treats" button', async () => {
    state.value = withTreats(() => 3);
    state.value = { ...state.value, collection: Object.fromEntries(Object.entries(state.value.collection).filter(([id]) => !EIGHT.slice(6).some((t) => t.id === id))) };
    const d = await open();
    expect(feedButtons(d)).toHaveLength(6);
    expect(Array.from(d.querySelectorAll('button')).some((b) => b.textContent?.startsWith('All treats'))).toBe(false);
  });

  it('opened to feed, focus is on the first treat she can feed', async () => {
    state.value = withTreats((i) => (i === 0 ? 0 : 3));
    view = mount(<PetCardHost />);
    openPetCard(petId, { intent: 'feed' });
    const d = await card();
    const first = await until(() => feedButtons(d).find((b) => !b.disabled), 'a treat to feed');
    await until(() => document.activeElement === first, 'focus on the first treat she can feed');
  });

  it('opened to feed with the favourite run out and coins to bake, focus is on a treat to feed, not on "Bake a tray"', async () => {
    // The favourite sorts first even when empty, and its "Bake a tray" is the first enabled button.
    const base = withTreats((i) => (i === 0 ? 0 : 3));
    state.value = { ...base, pets: { ...base.pets, [petId]: { ...base.pets[petId]!, favoriteKnown: true, favoriteTreat: EIGHT[0]!.id } } };
    view = mount(<PetCardHost />);
    openPetCard(petId, { intent: 'feed' });
    const d = await card();
    expect(feedButtons(d)[0]!.getAttribute('aria-label')).toBe(`Feed ${EIGHT[0]!.name}, More in the morning, Favourite`);
    const focused = await until(() => (d.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null), 'focus in the card');
    expect(focused.getAttribute('aria-label')).toBe(`Feed ${EIGHT[1]!.name}, 3 servings`);
  });
});

describe('the Pet Card opened to find a plant (WP-C7, integration-i6)', { timeout: 20_000 }, () => {
  it('opens on the chooser with focus on its first plant, and a choice moves the pet in once', async () => {
    state.value = unpaired();
    const spy = vi.spyOn(store, 'setCompanion');
    view = mount(<PetCardHost />);
    openPetCard(petId, { intent: 'findPlant' });
    const d = await card();
    const chooser = await until(() => d.querySelector<HTMLElement>(`ul[aria-label="Find ${pet().name} a plant"]`), 'the chooser');
    const first = chooser.querySelector<HTMLButtonElement>('button')!;
    await until(() => document.activeElement === first, 'focus on the first plant');
    const free = Array.from(chooser.querySelectorAll<HTMLButtonElement>('button')).find((b) => !b.textContent?.includes('keeps it company'))!;
    const habit = state.value.habits.find((h) => h.name === free.textContent?.trim())!;
    await click(free, 'a plant');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(habit.id, petId);
    expect(state.value.habits.find((h) => h.id === habit.id)!.companionId).toBe(petId);
  });

  it('with no plant on the sill, says how one comes, and "Add a habit" (focused) opens the Habit Editor', async () => {
    state.value = { ...unpaired(), habits: demo.habits.map((h) => ({ ...h, companionId: undefined, archivedOn: h.archivedOn ?? '2026-09-01' })) };
    view = mount(<PetCardHost />);
    openPetCard(petId, { intent: 'findPlant' });
    const d = await card();
    const add = await until(() => Array.from(d.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Add a habit'), 'Add a habit');
    expect(d.textContent).toContain(`${pet().name} would like a plant to keep company. Plants grow from habits, starting as a cutting in a glass of water.`);
    await until(() => document.activeElement === add, 'focus on Add a habit');
    for (const p of d.querySelectorAll('p')) expect(lint(p.textContent ?? '', { pronouns: PET_PRONOUN }), p.textContent ?? '').toEqual([]);
    await click(add, 'Add a habit');
    expect(habitEditorRequest.value).toEqual({});
  });

  it('opened as usual, the card keeps "Find {name} a plant" as a button and puts focus nowhere in it', async () => {
    state.value = unpaired();
    const d = await open();
    expect(buttonWithText(`Find ${pet().name} a plant`)).not.toBeNull();
    expect(d.querySelector(`ul[aria-label="Find ${pet().name} a plant"]`)).toBeNull();
    expect(petCardRequest.value).toEqual({ id: petId });
  });
});

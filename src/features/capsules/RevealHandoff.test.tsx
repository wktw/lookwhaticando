// @vitest-environment jsdom
/**
 * Where a reveal's buttons go on the routed Capsules screen, which gets no PlaceHandlers from the
 * shell (WP-C7, integration-i6): "Find {name} a plant" opens that pet's card on the plant chooser,
 * with focus on it, instead of a bare "#/shelf"; "Find it a place" takes the decor to the Shelf's
 * edit mode; a repeat pet offers "Visit {name}", which opens its card.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLECTIBLES } from '@/catalog/collectibles';
import { isMachineSource } from '@/domain/collection';
import { newPetState } from '@/domain/friendship';
import { runtimeLocalTime } from '@/domain/dates';
import { buildDemo } from '@/state/demo';
import { state, today } from '@/state/store';
import * as store from '@/state/store';
import type { AppState, PendingReveal } from '@/state/types';
import { SheetHosts } from '@/app/SheetHosts';
import { closeHabitEditor, closePetCard, habitEditorRequest, petCardRequest } from '@/features/habits/open';
import { toasts } from '@/ui/toast';
import { CapsulesScreen } from './CapsulesScreen';
import { RevealCard } from './RevealCard';
import { capsuleShell, revealFromPending } from './reveal';
import { button, click, installDom, keyboardClick, mount, revealDialog, type, until } from './testing';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const TODAY = '2026-09-29';
let demo: AppState;
let views: ReturnType<typeof mount>[] = [];

const PET = 'pet-bunny-lop';
const DECOR = COLLECTIBLES.find((c) => c.category === 'decor' && isMachineSource(c.source))!;

beforeAll(async () => {
  installDom();
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver ??= class {
    observe() {}
    disconnect() {}
  };
  today.value = TODAY;
  demo = buildDemo({ today: TODAY, now: Date.parse('2026-09-29T15:00:00'), local: runtimeLocalTime });
  // The Pet Card's chunk, once, so the first test isn't timing its import.
  await import('@/features/pets/PetCardHost');
});
beforeEach(() => {
  toasts.value = [];
  closePetCard();
  closeHabitEditor();
  location.hash = '#/capsules';
});
afterEach(() => {
  for (const v of views.reverse()) v.unmount();
  views = [];
  closePetCard();
  closeHabitEditor();
  vi.restoreAllMocks();
});

const order = (itemId: string): PendingReveal => ({ machineId: 'garden', itemId, isNew: true, stardust: 0, fusedStars: 0, order: true, at: 0 });

/** A new pet (or decor) whose Special Order reveal is waiting, on the routed Capsules screen with the shell's sheets. */
function routedReveal(itemId: string, base: AppState = demo) {
  const pets = itemId === PET ? { ...base.pets, [PET]: newPetState(PET, () => 0.5, Date.now(), TODAY, true) } : base.pets;
  state.value = { ...base, pets, collection: { ...base.collection, [itemId]: { count: 1, firstAt: 0 } }, pendingReveal: order(itemId) };
  // As ScreenHost renders it: no props.
  views.push(mount(<CapsulesScreen />), mount(<SheetHosts />));
}

const petCard = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.getAttribute('aria-label') !== 'Capsule reveal');

describe('the routed Capsules screen hands a reveal on (WP-C7)', () => {
  it('"Find {name} a plant" opens the Pet Card on the chooser, focused, and a choice moves the pet in once', async () => {
    routedReveal(PET);
    const name = state.value.pets[PET]!.name;
    const find = await until(() => button(`Find ${name} a plant`), 'Find a plant');
    await keyboardClick(find, 'Find a plant');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(location.hash).toBe('#/capsules');
    expect(petCardRequest.value).toEqual({ id: PET, intent: 'findPlant' });
    const card = await until(petCard, 'the Pet Card');
    expect(card.textContent).toContain(name);
    const chooser = await until(() => card.querySelector<HTMLElement>(`ul[aria-label="Find ${name} a plant"]`), 'the chooser');
    const first = chooser.querySelector<HTMLButtonElement>('button')!;
    await until(() => document.activeElement === first, 'focus on the chooser');
    const spy = vi.spyOn(store, 'setCompanion');
    const free = Array.from(chooser.querySelectorAll<HTMLButtonElement>('button')).find((b) => !b.textContent?.includes('keeps it company'))!;
    const habit = state.value.habits.find((h) => h.name === free.textContent?.trim())!;
    await keyboardClick(free, 'a plant');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(state.value.habits.find((h) => h.id === habit.id)!.companionId).toBe(PET);
  });

  it('with no live habit, the Pet Card says how a plant comes, and "Add a habit" opens the Habit Editor', async () => {
    routedReveal(PET, { ...demo, habits: demo.habits.map((h) => ({ ...h, companionId: undefined, archivedOn: h.archivedOn ?? '2026-09-01' })) });
    const name = state.value.pets[PET]!.name;
    await keyboardClick(await until(() => button(`Find ${name} a plant`), 'Find a plant'), 'Find a plant');
    const card = await until(petCard, 'the Pet Card');
    const add = await until(() => Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Add a habit'), 'Add a habit');
    await until(() => document.activeElement === add, 'focus on Add a habit');
    await keyboardClick(add, 'Add a habit');
    expect(habitEditorRequest.value).toEqual({});
  });

  it('planting a habit from the no-habit note brings focus back to the card, on the new plant in the chooser', async () => {
    routedReveal(PET, { ...demo, habits: demo.habits.map((h) => ({ ...h, companionId: undefined, archivedOn: h.archivedOn ?? '2026-09-01' })) });
    const name = state.value.pets[PET]!.name;
    await keyboardClick(await until(() => button(`Find ${name} a plant`), 'Find a plant'), 'Find a plant');
    const card = await until(petCard, 'the Pet Card');
    const add = await until(() => Array.from(card.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Add a habit'), 'Add a habit');
    await until(() => document.activeElement === add, 'focus on Add a habit');
    await keyboardClick(add, 'Add a habit');
    const editor = await until(() => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((d) => d.querySelector('form')), 'the Habit Editor');
    await type(editor.querySelector<HTMLInputElement>('input[type="text"]')!, 'Read a chapter');
    await keyboardClick(Array.from(editor.querySelectorAll('button')).find((b) => b.textContent === 'Plant it') ?? null, 'Plant it');
    await until(() => state.value.habits.some((h) => h.name === 'Read a chapter' && !h.archivedOn), 'the new habit');
    await until(() => !editor.isConnected, 'the Habit Editor to close');
    // The card is still open on the chooser, and focus is on the new plant, not lost to the page.
    const chooser = await until(() => card.querySelector<HTMLElement>(`ul[aria-label="Find ${name} a plant"]`), 'the chooser');
    const first = chooser.querySelector<HTMLButtonElement>('button')!;
    expect(first.textContent?.trim()).toBe('Read a chapter');
    await until(() => document.activeElement === first, 'focus on the new plant');
    // Give the editor's own focus return its time; focus stays on the plant.
    await new Promise((r) => setTimeout(r, 600));
    expect(document.activeElement).toBe(first);
  });

  it('"Find it a place" takes new decor to the Shelf, carrying the item', async () => {
    routedReveal(DECOR.id);
    await keyboardClick(await until(() => button('Find it a place'), 'Find it a place'), 'Find it a place');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(location.hash).toBe(`#/shelf/place/${DECOR.id}`);
    expect(petCardRequest.value).toBeNull();
  });
});

describe('a repeat pet (WP-C7)', () => {
  it('shows "Visit {name}" with no host handlers, and it opens that pet’s card', async () => {
    state.value = demo;
    const id = Object.keys(demo.pets)[0]!;
    const name = demo.pets[id]!.name;
    const data = revealFromPending({ machineId: 'cats', itemId: id, isNew: false, stardust: 1, fusedStars: 0, at: 0 }, capsuleShell(['#DDD4F1', '#F6E6B4'], 0))!;
    const onClose = vi.fn();
    views.push(mount(<RevealCard data={data} light={{ from: 'left', night: false }} onClose={onClose} />));
    const visit = button(`Visit ${name}`);
    expect(visit).not.toBeNull();
    expect(button(`Find ${name} a plant`)).toBeNull();
    await keyboardClick(visit, 'Visit');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(petCardRequest.value).toEqual({ id });
  });

  it('a host’s own onPlace still gets the pet (onboarding keeps its own step)', async () => {
    state.value = demo;
    const id = Object.keys(demo.pets)[0]!;
    const data = revealFromPending({ machineId: 'cats', itemId: id, isNew: false, stardust: 1, fusedStars: 0, at: 0 }, capsuleShell(['#DDD4F1', '#F6E6B4'], 0))!;
    const onPlace = vi.fn();
    views.push(mount(<RevealCard data={data} light={{ from: 'left', night: false }} onClose={() => undefined} onPlace={onPlace} />));
    await click(button(`Visit ${demo.pets[id]!.name}`), 'Visit');
    expect(onPlace).toHaveBeenCalledWith(id);
    expect(petCardRequest.value).toBeNull();
  });
});

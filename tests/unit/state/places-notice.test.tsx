// @vitest-environment jsdom
/**
 * DEC-P10 (WP-B7, domain-d5) through the real store and the Today notices: a backup from before the
 * Balcony Box counted as a place every pet loves is imported; its never-placed pets settle there
 * once, Today says so once, and neither the move nor the notice comes back after a reload.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PETS } from '@/catalog/collectibles';
import { movedToPlaceLine } from '@/catalog/format';
import { COMPANION, fillLine } from '@/catalog/lines';
import { addDays } from '@/domain/dates';
import { newPetState } from '@/domain/friendship';
import { mulberry32 } from '@/domain/rng';
import { settledNotice } from '@/domain/shelf';
import { makeBackup } from '@/state/handoff';
import { selectToday, todayView } from '@/state/selectors';
import * as store from '@/state/store';
import type { AppState } from '@/state/types';
import { Notices } from '@/features/today/Notices';
import { installDom, mount } from '@/features/capsules/testing';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

beforeAll(() => installDom());

let view: ReturnType<typeof mount> | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

const cats = PETS.filter((p) => p.species === 'cat').map((p) => p.id);

/** The save as an older build wrote it: the Balcony open, three cats never placed, nothing recorded. */
function oldSave(s: AppState, now: number): AppState {
  const rng = mulberry32(7);
  const pets = Object.fromEntries(cats.slice(0, 3).map((id, i) => [id, { ...newPetState(id, rng, now, s.clock.maxDateKey, true), xp: 30 - i * 10 }]));
  const collection = { ...s.collection, ...Object.fromEntries(cats.slice(0, 3).map((id) => [id, { count: 1, firstAt: now }])) };
  const once = Object.fromEntries(Object.entries(s.ledger.once).filter(([k]) => k !== 'settle|universal' && !k.startsWith('settled|')));
  return { ...s, pets, collection, shelf: { ...s.shelf, places: ['sill', 'balcony'] }, ledger: { ...s.ledger, once } };
}

const noticeTitles = () => [...document.querySelectorAll('section[aria-label]')].map((n) => n.getAttribute('aria-label') ?? '');

describe('an imported save from before the change settles on the Balcony once, and says so once (DEC-P10)', () => {
  it('the move and its notice happen exactly once, including after a reload', async () => {
    const b = fakeBrowser({ start: '2026-09-29' });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: [] });
    const backup = JSON.stringify(makeBackup(oldSave(store.state.value, b.clock.now), { now: b.clock.now, appVersion: 'old', device: 'Test · Node' }));
    expect(await store.applyImport(backup, { withoutUndo: true })).toEqual({ ok: true });

    const placeOf = () => cats.slice(0, 3).map((id) => store.state.value.pets[id]!.place ?? null);
    expect(placeOf()).toEqual(['balcony', 'balcony', null]);
    expect(todayView.value.settled.map((x) => x.petId)).toEqual(cats.slice(0, 2));

    const pets = store.state.value.pets;
    const lines = cats.slice(0, 2).map((id) => movedToPlaceLine(pets[id]!.name, 'balcony'));
    view = mount(<Notices vm={todayView.value} />);
    expect(noticeTitles()).toEqual(expect.arrayContaining(lines));
    // Shown, so the save no longer holds it; it stays on Today for the rest of the day.
    expect(settledNotice(store.state.value)).toEqual([]);
    expect(todayView.value.settled).toEqual([]);
    view.unmount();
    view = mount(<Notices vm={todayView.value} />);
    expect(noticeTitles()).toEqual(expect.arrayContaining(lines));
    view.unmount();
    view = null;
    b.advance(60_000); // the save lands

    // A reload: the same save, read again.
    store.hydrate();
    expect(placeOf()).toEqual(['balcony', 'balcony', null]);
    expect(settledNotice(store.state.value)).toEqual([]);
    expect(todayView.value.settled).toEqual([]);
    b.advance(24 * 3_600_000);
    expect(settledNotice(store.state.value)).toEqual([]);
    expect(placeOf()).toEqual(['balcony', 'balcony', null]);
  });
});

describe('the cards Today holds for the rest of the day stay on today\'s page', () => {
  it('a past day shows neither the settling notice nor the Keeping Company offer, once both are latched', async () => {
    const b = fakeBrowser({ start: '2026-10-06' });
    store.hydrate();
    store.completeOnboarding({ name: 'Sam', templateIds: ['walk'] });
    const backup = JSON.stringify(makeBackup(oldSave(store.state.value, b.clock.now), { now: b.clock.now, appVersion: 'old', device: 'Test · Node' }));
    expect(await store.applyImport(backup, { withoutUndo: true })).toEqual({ ok: true });

    const vm = todayView.value;
    expect(vm.settled.map((x) => x.petId)).toEqual(cats.slice(0, 2));
    expect(vm.companionOffer).not.toBeNull();
    const pets = store.state.value.pets;
    const cards = [...cats.slice(0, 2).map((id) => movedToPlaceLine(pets[id]!.name, 'balcony')), fillLine(COMPANION.reveal.find, { name: pets[vm.companionOffer!.petId]!.name })];

    // Today shows both, and the store forgets them the moment they appear.
    view = mount(<Notices vm={vm} />);
    expect(noticeTitles()).toEqual(expect.arrayContaining(cards));
    expect(todayView.value.settled).toEqual([]);
    expect(todayView.value.companionOffer).toBeNull();
    view.unmount();

    // She picks yesterday in the week strip: neither card is there.
    const past = selectToday(addDays(store.today.value, -1)).value;
    expect(past.isToday).toBe(false);
    view = mount(<Notices vm={past} />);
    const onPast = noticeTitles();
    for (const c of cards) expect(onPast).not.toContain(c);
    view.unmount();

    // Back to today: both are still there for the rest of the day.
    view = mount(<Notices vm={todayView.value} />);
    expect(noticeTitles()).toEqual(expect.arrayContaining(cards));
  });
});

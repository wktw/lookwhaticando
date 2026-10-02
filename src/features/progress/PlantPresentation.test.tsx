// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { effect } from '@preact/signals';
import { createInitialState } from '@/state/defaults';
import type { AppState } from '@/state/types';
import { state } from '@/state/store';
import { todayVM } from '@/state/views/today';
import { progressVM } from '@/state/views/progress';
import { habitDetailVM } from '@/state/views/habit';
import { bandPots } from '@/features/today/Band';
import * as shelf from '@/features/shelf/ShelfScreen';
import { PlantShelf } from './PlantShelf';
import { HabitDetail } from '@/features/habits/detail/HabitDetail';
import { lookArtOf } from './looks';
import { habit } from '../../../tests/unit/domain/helpers';
import { NOW, TODAY, UTC, demoState, installDom, mount, useState_ } from './testing';

const env = { now: NOW, today: TODAY, local: UTC };
let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
afterEach(() => { view?.unmount(); view = null; });
function fixture(): AppState {
  const s = createInitialState(NOW);
  s.habits = [
    { ...habit({ id: 'plant', startedOn: '2026-01-01' }), name: 'Read', plant: 'begonia', anchorHabitId: 'new-anchor' },
    { ...habit({ id: 'evidence', startedOn: '2026-01-01' }), color: 'blush' },
    { ...habit({ id: 'new-anchor', startedOn: '2026-01-01' }), color: 'lavender' },
  ];
  s.ledger.bestStage.plant = 7;
  s.ledger.once['flourish|plant'] = 5;
  s.ledger.sunshine.plant = 180;
  s.plantLooks = { plant: { shown: 0, reads: { bloom: '2026-07-01' }, looks: [{ colour: 'dawn', shape: 'paired', read: 'bloom', on: '2026-07-01', evidence: { band: 'dawn', eligibleDays: 20, bandDays: 20, usualMinute: 450, tinyDays: 0, doneDays: 20, keptTogether: { habitId: 'evidence', days: 20 } } }] } };
  return s;
}
const earned = { species: 'begonia', stage: 7, flourishes: 5, look: { colour: 'dawn', shape: 'paired', partnerColour: 'blush' } };

describe('one earned plant presentation (WP-D2)', () => {
  it('Today and Shelf keep the recorded partner colour and five flourishes', () => {
    const s = fixture(); useState_(s);
    expect(bandPots(todayVM(s, env), s.habits).find((p) => p.habitId === 'plant')).toMatchObject(earned);
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')).toMatchObject(earned);
  });

  it('unstacking and a pause preserve the same earned look; resume changes no earned field', () => {
    const s = fixture();
    delete s.habits[0]!.anchorHabitId;
    useState_(s);
    expect(bandPots(todayVM(s, env), s.habits).find((p) => p.habitId === 'plant')).toMatchObject(earned);
    const paused = { ...s, habits: s.habits.map((h) => h.id === 'plant' ? { ...h, pauses: [{ start: TODAY }] } : h) };
    useState_(paused);
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')).toMatchObject(earned);
    useState_(s);
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')).toMatchObject(earned);
  });

  it('retirement keeps the recorded look and flourishes on the Balcony', () => {
    const s = fixture();
    s.habits[0]!.archivedOn = '2026-09-20';
    useState_(s);
    expect(shelf.sceneRetired.value.find((p) => p.habitId === 'plant')).toMatchObject(earned);
  });

  it('a deleted evidence partner leaves Paired intact and never borrows the new anchor colour', () => {
    const s = fixture(); s.habits = s.habits.filter((h) => h.id !== 'evidence');
    useState_(s);
    const look = { colour: 'dawn', shape: 'paired' };
    expect(lookArtOf(s, 'plant')).toEqual(look);
    expect(bandPots(todayVM(s, env), s.habits).find((p) => p.habitId === 'plant')?.look).toEqual(look);
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')?.look).toEqual(look);
  });

  it('the actual Shelf pot and Progress plant draw their earned flourish nodes', () => {
    const s = fixture(); useState_(s);
    view = mount(<shelf.ShelfScreen />);
    expect(view.root.querySelector('[data-habit="plant"] [data-flourish="snail"], [data-habit-front="plant"] [data-flourish="snail"]')).not.toBeNull();
    view.unmount();
    view = mount(<PlantShelf garden={progressVM(s, env).garden.filter((g) => g.habitId === 'plant')} />);
    expect(view.root.querySelector('[data-flourish="snail"]')).not.toBeNull();
  });

  it('a twenty-habit scene stays stable for coin and pet-XP changes but notices earned fields', () => {
    const s = fixture();
    for (let i = 3; i < 20; i++) s.habits.push(habit({ id: `h${i}`, startedOn: '2026-01-01' }));
    useState_(s);
    let reads = 0;
    const dispose = effect(() => { shelf.scenePots.value; reads++; });
    const before = shelf.scenePots.value;
    act(() => { state.value = { ...s, wallet: { ...s.wallet, coins: 99 } }; });
    expect(shelf.scenePots.value).toBe(before);
    expect(reads).toBe(1);
    act(() => { state.value = { ...state.value, ledger: { ...s.ledger, once: { ...s.ledger.once, 'flourish|plant': 6 } } }; });
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')?.flourishes).toBe(6);
    expect(reads).toBe(2);
    const beforeColour = shelf.scenePots.value;
    act(() => { state.value = { ...state.value, habits: s.habits.map((h) => h.id === 'evidence' ? { ...h, color: 'butter' } : h) }; });
    expect(shelf.scenePots.value).not.toBe(beforeColour);
    expect(shelf.scenePots.value.find((p) => p.habitId === 'plant')?.look?.partnerColour).toBe('butter');
    dispose();
  });

  it('the Detail hero and company portrait both wear the resident’s outfit', () => {
    const s = structuredClone(demoState());
    const h = s.habits.find((h) => h.companionId && s.pets[h.companionId])!;
    s.pets[h.companionId!]!.outfit = { neck: 'wear-bell-collar', body: 'wear-knit-sweater' };
    useState_(s);
    view = mount(<HabitDetail vm={habitDetailVM(s, env, h.id)!} onGone={() => undefined} />);
    expect(view.root.querySelector('[data-detail="company"] .pet-wear-neck')).not.toBeNull();
    expect(view.root.querySelector('[data-hero-plant] .pet-wear-neck')).not.toBeNull();
    expect(view.root.querySelector('[data-hero-plant] .pet-wear-body')).not.toBeNull();
  });
});

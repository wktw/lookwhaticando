// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { createInitialState } from '@/state/defaults';
import { state } from '@/state/store';
import { progressVM } from '@/state/views/progress';
import { newPetState } from '@/domain/friendship';
import { habit } from '../../../tests/unit/domain/helpers';
import { PlantShelf } from './PlantShelf';
import { NOW, TODAY, UTC, installDom, mount, useState_ } from './testing';

const draws = vi.hoisted(() => [] as Array<{ species: string; flourishes: number; look?: { partnerColour?: string } }>);
vi.mock('@/art/plants', async (load) => ({ ...await load<object>(), PlantArt: (props: (typeof draws)[number]) => { draws.push(props); return <span data-drawn-plant />; } }));
let view: ReturnType<typeof mount> | undefined;
beforeAll(installDom);
afterEach(() => { view?.unmount(); draws.length = 0; });

it('twenty Progress plants redraw only their changed earned presentation', () => {
  const s = createInitialState(NOW);
  s.habits = Array.from({ length: 20 }, (_, i) => habit({ id: `h${i}`, startedOn: '2026-01-01' }));
  s.habits[0]!.plant = 'begonia';
  s.habits[1]!.color = 'blush';
  s.ledger.bestStage.h0 = 7;
  s.ledger.once['flourish|h0'] = 5;
  s.plantLooks = { h0: { shown: 0, reads: {}, looks: [{ colour: 'dawn', shape: 'paired', read: 'bloom', on: TODAY, evidence: { band: 'dawn', eligibleDays: 20, bandDays: 20, usualMinute: 450, tinyDays: 0, doneDays: 20, keptTogether: { habitId: 'h1', days: 20 } } }] } };
  s.pets['pet-cat-calico'] = newPetState('pet-cat-calico', () => .5, NOW, TODAY, true);
  useState_(s);
  const garden = progressVM(s, { today: TODAY, now: NOW, local: UTC }).garden;
  view = mount(<PlantShelf garden={garden} />);
  expect(draws).toHaveLength(20);
  expect(draws[0]).toMatchObject({ species: 'begonia', flourishes: 5, look: { partnerColour: 'blush' } });
  act(() => { state.value = { ...s, wallet: { ...s.wallet, coins: 10 }, pets: { ...s.pets, 'pet-cat-calico': { ...s.pets['pet-cat-calico']!, xp: 40 } } }; });
  expect(draws).toHaveLength(20);
  act(() => { state.value = { ...state.value, ledger: { ...s.ledger, once: { ...s.ledger.once, 'flourish|h0': 6 } } }; });
  expect(draws).toHaveLength(21);
  expect(draws[20]?.flourishes).toBe(6);
  act(() => { state.value = { ...state.value, habits: s.habits.map((h) => h.id === 'h1' ? { ...h, color: 'butter' } : h) }; });
  expect(draws).toHaveLength(22);
  expect(draws[21]?.look?.partnerColour).toBe('butter');
});

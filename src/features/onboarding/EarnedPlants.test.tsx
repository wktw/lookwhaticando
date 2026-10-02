// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import type { SillPot } from '@/art/scene';
import { Game } from '../../../tests/unit/domain/game';
import { newPetState } from '@/domain/friendship';
import { plantVM } from '@/state/views/common';
import { SillStage } from './SillStage';
import { PlaceStep } from './CapsuleSteps';
import { installDom, mount, useState_, TODAY, UTC } from '@/features/progress/testing';

vi.mock('@/art/scene', async (load) => ({ ...await load<object>(), WindowsillBand: ({ pots }: { pots: SillPot[] }) => <div data-stage-pots={JSON.stringify(pots)} /> }));
vi.mock('@/art/plants', async (load) => ({ ...await load<object>(), PlantArt: (props: { stage: number }) => <span data-plant-stage={props.stage} data-plant-props={JSON.stringify(props)} /> }));
let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
afterEach(() => { view?.unmount(); view = null; });

it('onboarding shows the real stage after its first watering, while unplanted picks remain cuttings', () => {
  const g = new Game({ start: TODAY });
  const id = g.addHabit(); g.checkIn(id);
  useState_(g.state);
  const stage = plantVM(g.state, g.state.habits[0]!, TODAY, UTC).displayStage;
  expect(stage).toBeGreaterThan(0);
  view = mount(<SillStage pots={null} habitIds={[id]} />);
  const pots = JSON.parse(view.root.querySelector('[data-stage-pots]')!.getAttribute('data-stage-pots')!);
  expect(pots[0].stage).toBe(stage);
  view.unmount();
  view = mount(<SillStage pots={[{ habitId: 'pick', name: 'Walk', species: 'pothos' }]} habitIds={[]} />);
  expect(JSON.parse(view.root.querySelector('[data-stage-pots]')!.getAttribute('data-stage-pots')!)[0].stage).toBe(0);
});

it('the onboarding companion chooser shows the same already-watered plant stage', () => {
  const g = new Game({ start: TODAY });
  const id = g.addHabit(); g.checkIn(id);
  g.run((tx) => {
    tx.section('pets')['pet-cat-calico'] = newPetState('pet-cat-calico', tx.env.rng, tx.env.now, tx.env.today, true);
  });
  useState_(g.state);
  view = mount(<PlaceStep petId="pet-cat-calico" habitIds={[id]} onDone={() => undefined} />);
  expect(view.root.querySelector('[data-plant-stage]')!.getAttribute('data-plant-stage')).toBe(String(plantVM(g.state, g.state.habits[0]!, TODAY, UTC).displayStage));
});

it('both planted onboarding surfaces keep an imported earned Paired look and its flourishes', () => {
  const g = new Game({ start: TODAY });
  const id = g.addHabit({ plant: 'begonia' });
  const partner = g.addHabit({ color: 'blush' });
  const saved = structuredClone(g.state);
  saved.ledger.bestStage[id] = 7;
  saved.ledger.once[`flourish|${id}`] = 5;
  saved.plantLooks = { [id]: { shown: 0, reads: {}, looks: [{ colour: 'dawn', shape: 'paired', read: 'bloom', on: TODAY, evidence: { band: 'dawn', eligibleDays: 20, bandDays: 20, usualMinute: 450, tinyDays: 0, doneDays: 20, keptTogether: { habitId: partner, days: 20 } } }] } };
  saved.pets['pet-cat-calico'] = newPetState('pet-cat-calico', () => .5, g.now, TODAY, true);
  useState_(saved);
  const earned = { species: 'begonia', stage: 7, flourishes: 5, look: { colour: 'dawn', shape: 'paired', partnerColour: 'blush' } };
  view = mount(<SillStage pots={null} habitIds={[id]} />);
  expect(JSON.parse(view.root.querySelector('[data-stage-pots]')!.getAttribute('data-stage-pots')!)[0]).toMatchObject(earned);
  view.unmount();
  view = mount(<PlaceStep petId="pet-cat-calico" habitIds={[id]} onDone={() => undefined} />);
  expect(JSON.parse(view.root.querySelector('[data-plant-props]')!.getAttribute('data-plant-props')!)).toMatchObject(earned);
});

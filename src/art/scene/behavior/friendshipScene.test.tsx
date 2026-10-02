// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { SillScene } from '../SillScene';
import { ShelfScene } from '../ShelfScene';
import type { ShelfPet } from '../model';
import { lightAtSun } from '../lighting';
import { skyTime, type Moment } from '../time';
import * as plans from './plan';
import { Director } from './director';
import { groundSpot, type Ground } from '../arrange';

const light = lightAtSun(0.6, false);
const moment: Moment = { light, time: skyTime(light), hour: 14, season: 'autumn' };
const pets: ShelfPet[] = [
  { key: 'pudding', petId: 'pet-cat-calico', bond: { sunBias: 0.9, frontBias: 0.85, napWith: 'juniper' } },
  { key: 'juniper', petId: 'pet-cow-jersey' },
];
let host: HTMLDivElement;
afterEach(() => {
  if (host) { act(() => render(null, host)); host.remove(); }
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete document.documentElement.dataset.motion;
});

for (const Scene of [SillScene, ShelfScene]) describe(Scene === SillScene ? 'Sill friendship wiring' : 'Shelf friendship wiring', () => {
  it('plans with the earned profile, then forgets the departed friend and stops the previous cast', () => {
    vi.useFakeTimers();
    document.documentElement.dataset.motion = 'full';
    const plan = vi.spyOn(plans, 'planAct');
    host = document.createElement('div');
    document.body.append(host);
    act(() => render(<Scene pots={[]} pets={pets} moment={moment} />, host));
    act(() => { vi.advanceTimersByTime(5_000); });
    const first = plan.mock.calls.find(([p]) => p.key === 'pudding')?.[0];
    expect(first?.bond?.napWith).toBe('juniper');
    expect(first?.friend?.key).toBe('juniper');
    plan.mockClear();
    act(() => render(<Scene pots={[]} pets={pets.slice(0, 1)} moment={moment} />, host));
    act(() => { vi.advanceTimersByTime(100_000); });
    expect(plan.mock.calls.length).toBeGreaterThan(0);
    expect(plan.mock.calls.every(([p]) => p.key === 'pudding' && p.friend === undefined)).toBe(true);
  });
});

describe('the director’s current nap partner', () => {
  it.each(['here', 'other ground', 'held'] as const)('only offers the friend when free on the same ground: %s', (availability) => {
    vi.useFakeTimers();
    const ground: Ground = { rows: { glassBottom: 50, sillBack: 65, sillFront: 85, nosing: 88 }, x0: 0, x1: 180, d0: 0.2, d1: 0.95, surface: '#fff', beam: null, perches: [], obstacles: [], petSize: 20 };
    const other = availability === 'other ground' ? { ...ground, x0: 200, x1: 400 } : ground;
    const spot = groundSpot(ground, 90, 0.85, 'sleep', true, 'left');
    const friend = groundSpot(other, other.x0 + 60, 0.85, 'sleep', true, 'right');
    const director = new Director([
      { key: 'pudding', species: 'cat', place: 'sill', ground, bond: pets[0]!.bond },
      { key: 'juniper', species: 'cow', place: availability === 'other ground' ? 'grass' : 'sill', ground: other },
    ], new Map([['pudding', spot], ['juniper', friend]]), { moment, reduced: () => false, vignettes: false });
    const plan = vi.spyOn(plans, 'planAct');
    try {
      if (availability === 'held') director.hold('juniper');
      director.start();
      vi.advanceTimersByTime(5_000);
      const input = plan.mock.calls.find(([p]) => p.key === 'pudding')?.[0];
      expect(input).toBeDefined();
      if (availability === 'here') expect(input!.friend?.key).toBe('juniper');
      else expect(input!.friend).toBeUndefined();
    } finally { director.stop(); }
  });
});

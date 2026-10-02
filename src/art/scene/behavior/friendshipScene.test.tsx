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

// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { signal } from '@preact/signals';
import { usePetTouch, type PetTouchLayer } from './usePetTouch';
import type { ActorView } from './PetActor';
import type { Ground } from '../arrange';
import { groundSpot } from '../arrange';
import type { PetSpot, ShelfPet } from '../model';

let host: HTMLDivElement | undefined;
afterEach(() => { if (host) { act(() => render(null, host!)); host.remove(); host = undefined; } });

it.each(['low', 'raised', 'another place', 'self only'] as const)('a carried pet lands clear of the %s perch without reserving unrelated space', kind => {
  const g: Ground = { rows: { glassBottom: 60, sillBack: 64, sillFront: 88, nosing: 93 }, x0: 0, x1: 180, d0: 0.42, d1: 0.96, surface: '#fff', beam: null, perches: [], obstacles: [], petSize: 26 };
  const elsewhere = { ...g };
  const pets: ShelfPet[] = [{ key: 'visitor', petId: 'pet-dog-corgi' }, ...(kind === 'self only' ? [] : [{ key: 'sleeper', petId: 'pet-hamster-black' }])];
  const views = new Map(pets.map(p => [p.key!, signal<ActorView>(p.key === 'visitor' ? groundSpot(g, 145, 0.7, 'sit', false, 'left') : { ...groundSpot(g, 80, 0.8, 'sleep', true, 'right'), perch: 'bed', y: kind === 'raised' ? 45.8 : 79 })]));
  host = document.createElement('div'); document.body.appendChild(host);
  Object.defineProperty(host, 'clientHeight', { value: 100 });
  const release = vi.fn((key: string, spot?: PetSpot) => { if (spot) views.get(key)!.value = spot; });
  let layer!: PetTouchLayer;
  function Harness() {
    layer = usePetTouch({ pets, views, sceneRef: { current: host! }, groundOf: key => key === 'sleeper' && kind === 'another place' ? elsewhere : g, interactive: true, release });
    return null;
  }
  act(() => render(<Harness />, host!));
  act(() => { layer.touchFor(pets[0]!)!.onCarry('lift', 0); layer.touchFor(pets[0]!)!.onCarry('drop', kind === 'self only' ? 0 : -65); });
  expect(release).toHaveBeenCalledTimes(1);
  const [key, spot] = release.mock.calls[0]!;
  expect(key).toBe('visitor');
  expect(spot!.perch).toBeUndefined();
  if (kind === 'low') expect(Math.abs(spot!.x - 80)).toBeGreaterThan(g.petSize / 2);
  else expect(spot!.x).toBe(kind === 'self only' ? 145 : 80);
});

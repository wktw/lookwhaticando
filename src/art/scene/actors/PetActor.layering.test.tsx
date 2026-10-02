// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { NIGHT_LIGHT } from '@/art/light';
import { PetActor, type ActorView } from './PetActor';
import { CARRY_MS } from './touch';

let host: HTMLDivElement | undefined;
afterEach(() => {
  if (host) { act(() => render(null, host!)); host.remove(); host = undefined; }
  vi.useRealTimers();
});

const view: ActorView = { x: 40, y: 60, depth: 0.5, z: 120, pose: 'loaf', facing: 'right', asleep: false };
const touch = { label: 'Juniper', onGesture: () => {}, onCarry: () => {}, onOpen: () => {} };
function draw(tagOpen: boolean) {
  if (!host) { host = document.createElement('div'); document.body.appendChild(host); }
  act(() => render(<>
    <PetActor id="selected" petId="pet-cat-calico" species="cat" view={view} size={35} light={NIGHT_LIGHT} animated={false} touch={{ ...touch, tagOpen }} />
    <PetActor id="nearer" petId="pet-cat-grey" species="cat" view={{ ...view, z: 900 }} size={35} light={NIGHT_LIGHT} animated={false} touch={touch} />
  </>, host!));
}
const actor = (id: string) => host!.querySelector<HTMLElement>(`[data-pet="${id}"]`)!;
const z = (id: string) => Number(actor(id).style.zIndex);

it('keeps the open name tag above nearer pets and restores scene depth when it closes', () => {
  draw(false);
  const original = actor('selected');
  const geometry = original.style.transform;
  expect(z('selected')).toBe(view.z);
  expect(z('selected')).toBeLessThan(z('nearer'));
  draw(true);
  expect(z('selected')).toBeGreaterThan(z('nearer'));
  expect(actor('selected')).toBe(original);
  expect(original.style.transform).toBe(geometry);
  draw(false);
  expect(z('selected')).toBe(view.z);
  expect(z('selected')).toBeLessThan(z('nearer'));
});

it('keeps a carried pet above the selected name tag and restores its depth after release', () => {
  vi.useFakeTimers();
  draw(true);
  const button = actor('nearer').querySelector('button')!;
  act(() => button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 })));
  act(() => vi.advanceTimersByTime(CARRY_MS + 1));
  expect(actor('nearer').hasAttribute('data-held')).toBe(true);
  expect(z('nearer')).toBeGreaterThan(z('selected'));
  act(() => button.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 10, clientY: 10 })));
  expect(actor('nearer').hasAttribute('data-held')).toBe(false);
  expect(z('selected')).toBeGreaterThan(z('nearer'));
  draw(false);
  expect(z('selected')).toBeLessThan(z('nearer'));
});

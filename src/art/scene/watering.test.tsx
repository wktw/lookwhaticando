// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef, render } from 'preact';
import { act } from 'preact/test-utils';
import { PlantArt } from '@/art/plants';
import { WindowsillBand, type WindowsillBandHandle } from './WindowsillBand';
import type { SillPot } from './model';

let host: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  document.documentElement.dataset.motion = 'full';
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  delete document.documentElement.dataset.motion;
  vi.useRealTimers();
});
const soil = () => host.querySelector('.plant-soil')!.getAttribute('fill');
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function band() {
  const ref = createRef<WindowsillBandHandle>();
  const show = (damp: boolean, pulse: number) => {
    const pots: SillPot[] = [{ habitId: 'walk', species: 'begonia', stage: 4, pot: 'mug', damp, pulse }];
    act(() => render(<WindowsillBand ref={ref} pots={pots} coins={0} now={new Date('2026-10-02T12:00:00Z')} />, host));
  };
  const pour = () => act(() => ref.current!.pour('walk'));
  return { show, pour };
}

describe('WP-D1: soil follows the saved watering, never an animation counter', () => {
  it('undo and rollover dry the same PlantArt instance without replaying its glint or changing growth', () => {
    const show = (damp: boolean, pulse: number) => act(() => render(<PlantArt species="begonia" stage={4} progress={0.5} pot="mug" damp={damp} pulse={pulse} />, host));
    show(false, 0);
    const dry = soil();
    const foliage = host.querySelector('.plant-sway')!.innerHTML;
    show(true, 1);
    expect(soil()).not.toBe(dry);
    const glint = host.querySelector('.plant-glint');
    expect(glint).not.toBeNull();
    show(false, 0);
    expect(soil()).toBe(dry);
    expect(host.querySelector('.plant-glint')).toBe(glint);
    show(true, 3);
    const nextGlint = host.querySelector('.plant-glint');
    show(false, 0);
    expect(soil()).toBe(dry);
    expect(host.querySelector('.plant-glint')).toBe(nextGlint);
    // The leaf paths remain identical; only the animation wrapper's class changes.
    expect(host.querySelector('.plant-sway g')!.innerHTML).toBe(foliage.replace(/^<g[^>]*>/, '').replace(/<\/g>$/, ''));
  });

  it('a pulse without a saved watering leaves soil dry', () => {
    const show = (pulse: number) => act(() => render(<PlantArt species="pilea" stage={3} pot="cream" pulse={pulse} damp={false} />, host));
    show(0);
    const dry = soil();
    show(1);
    expect(host.querySelector('.plant-glint')).not.toBeNull();
    expect(soil()).toBe(dry);
  });

  it.each([100, 300, 1200])('undo %i ms into a pour stays dry after every late callback', (delay) => {
    const { show, pour } = band();
    show(false, 0);
    const dry = soil();
    show(true, 1);
    pour();
    advance(delay);
    show(false, 0);
    const glints = [...host.querySelectorAll('.plant-glint')];
    expect(soil()).toBe(dry);
    advance(2000);
    expect(soil()).toBe(dry);
    expect([...host.querySelectorAll('.plant-glint')]).toEqual(glints);
  });

  it('reduced-motion watering then Undo stays dry', () => {
    document.documentElement.dataset.motion = 'reduced';
    const { show, pour } = band();
    show(false, 0);
    const dry = soil();
    show(true, 1);
    pour();
    expect(soil()).not.toBe(dry);
    show(false, 0);
    expect(soil()).toBe(dry);
    advance(2000);
    expect(soil()).toBe(dry);
  });

  it('a cancelled pour cannot lift the plant after an immediate re-check', () => {
    const { show, pour } = band();
    show(false, 0);
    show(true, 1);
    pour();
    advance(100);
    show(false, 0);
    show(true, 1);
    pour();
    const glint = host.querySelector('.plant-glint');
    advance(160);
    expect(host.querySelector('.plant-glint')).toBe(glint);
    advance(100);
    expect(host.querySelector('.plant-glint')).not.toBe(glint);
  });

  it('unmount cancels every pending pour callback', () => {
    const { show, pour } = band();
    show(true, 1);
    pour();
    act(() => render(null, host));
    expect(vi.getTimerCount()).toBe(0);
    advance(2000);
    expect(host.innerHTML).toBe('');
  });
});

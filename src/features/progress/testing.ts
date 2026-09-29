/**
 * jsdom helpers for the Progress and Habit Detail component tests: a demo household on a fixed
 * clock, render, query, click, key and wait utilities.
 */
import type { ComponentChild } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildDemo } from '@/state/demo';
import { configureStore, state, today } from '@/state/store';
import type { AppState } from '@/state/types';
import type { LocalTimeReader } from '@/domain/dates';

export const UTC: LocalTimeReader = (ms) => {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
};
export const TODAY = '2026-09-29';
export const NOW = Date.UTC(2026, 8, 29, 16, 30);

let demo: AppState | null = null;
/** The shipped demo (120 days, seven habits, pets, notes and pages), built once per file. */
export function demoState(): AppState {
  demo ??= buildDemo({ today: TODAY, now: NOW, local: UTC });
  return demo;
}

/** Points the store at a fixed clock with `s` as the save (no storage, no locks). */
export function useState_(s: AppState): void {
  configureStore({ now: () => NOW, local: UTC, storage: null, snapshots: null, locks: null, listen: null, timeZone: () => 'Europe/London' });
  act(() => {
    state.value = s;
    today.value = TODAY;
  });
}

export function installDom(): void {
  const proto = Element.prototype as Element & { animate?: unknown; getAnimations?: unknown };
  proto.animate = function animate() {
    return { finished: Promise.resolve(), cancel() {}, play() {}, pause() {} } as unknown as Animation;
  };
  proto.getAnimations = () => [];
  document.documentElement.dataset.motion = 'reduced';
  window.scrollTo = () => undefined;
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => undefined;
}

export function mount(ui: ComponentChild): { root: HTMLElement; unmount: () => void } {
  const root = document.createElement('div');
  document.body.append(root);
  act(() => render(ui, root));
  return {
    root,
    unmount: () => {
      act(() => render(null, root));
      root.remove();
    },
  };
}

export async function until<T>(get: () => T | null | undefined | false, what: string, timeout = 3000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = get();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`Timed out waiting for ${what}`);
    await act(() => new Promise((r) => setTimeout(r, 10)));
  }
}

export const pause = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

/** A button by its accessible name (aria-label, else its text). */
export function button(name: string | RegExp, within: ParentNode = document): HTMLButtonElement | null {
  const all = Array.from(within.querySelectorAll('button'));
  return (
    all.find((b) => {
      const label = (b.getAttribute('aria-label') ?? b.textContent ?? '').trim();
      return typeof name === 'string' ? label === name : name.test(label);
    }) ?? null
  );
}

export async function click(el: Element | null | undefined, what = 'element'): Promise<void> {
  if (!el) throw new Error(`No ${what} to click`);
  await act(() => (el as HTMLElement).click());
}

export async function key(target: EventTarget, k: string): Promise<void> {
  await act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

export const dialog = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')).pop() ?? null;

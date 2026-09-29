/**
 * jsdom helpers for the capsules component tests: a Web Animations stub whose animations
 * finish at once, reduced motion (so choreography takes its short paths), and small
 * render / query / wait utilities.
 */
import type { ComponentChild } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';

export function installDom(): void {
  const proto = Element.prototype as Element & { animate?: unknown; getAnimations?: unknown };
  proto.animate = function animate() {
    return { finished: Promise.resolve(), cancel() {}, play() {}, pause() {} } as unknown as Animation;
  };
  proto.getAnimations = () => [];
  document.documentElement.dataset.motion = 'reduced';
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

/** Poll until `get` returns something truthy (the flow is async: timers, rAF, promises). */
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

/** A button by its accessible name (aria-label, else its text), anywhere in the document. */
export function button(name: string | RegExp): HTMLButtonElement | null {
  const all = Array.from(document.querySelectorAll('button'));
  return (
    all.find((b) => {
      const label = (b.getAttribute('aria-label') ?? b.textContent ?? '').trim();
      return typeof name === 'string' ? label === name : name.test(label);
    }) ?? null
  );
}

/** A button by its visible text (e.g. the Insert button, not the slot's hit area of the same name). */
export function buttonWithText(start: string): HTMLButtonElement | null {
  return Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(start)) ?? null;
}

export async function type(input: HTMLInputElement, value: string): Promise<void> {
  await act(() => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export async function click(el: Element | null, what = 'element'): Promise<void> {
  if (!el) throw new Error(`No ${what} to click`);
  await act(() => (el as HTMLElement).click());
}

export async function key(target: EventTarget, k: string): Promise<void> {
  await act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

export const revealDialog = () => document.querySelector<HTMLElement>('[role="dialog"][aria-label="Capsule reveal"]');

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { Sheet } from '@/ui/Sheet';
import { LoadSheet } from '@/app/LoadSheet';
import { Toaster } from '@/ui/Toaster';
import { dismissToast, toast, toasts } from '@/ui/toast';

let host: HTMLElement;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const card = () => document.querySelector<HTMLElement>('[data-toast-id]')!;
beforeEach(() => {
  vi.useFakeTimers();
  window.scrollTo = () => undefined;
  document.body.innerHTML = '<div id="app"></div>';
  host = document.getElementById('app')!;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  toasts.value = [];
});
afterEach(() => {
  act(() => render(null, host));
  toasts.value = [];
  vi.clearAllTimers(); vi.useRealTimers();
  document.body.innerHTML = '';
});
function mount(kind: string) {
  act(() => render(<>
    {kind === 'sheet' ? <Sheet open title="Reading" onClose={() => undefined}><button id="origin">Continue</button></Sheet> : <LoadSheet open title="Reading" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} />}
    <Toaster />
  </>, host));
  act(() => void toast({ message: 'This note can be read with the keyboard.', duration: 4000 }));
  return card().closest<HTMLElement>('[role="dialog"], [role="alertdialog"]')!;
}

describe('plain modal note focus ownership', () => {
  it.each(['sheet', 'load'])('dismissal from a focused plain %s note returns to the durable origin', (kind) => {
    const panel = mount(kind);
    const origin = panel.querySelector<HTMLButtonElement>('button')!;
    act(() => origin.focus());
    expect(card().tabIndex).toBe(0);
    act(() => card().focus());
    const id = card().dataset.toastId!;
    expect(document.activeElement).toBe(card());
    act(() => dismissToast(id));
    expect(card().tabIndex).toBe(-1);
    tick(500);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).toBeNull();
    expect(document.activeElement).toBe(origin);
  });

  it('keeps a deliberately focused control when a plain note leaves', () => {
    const panel = mount('sheet');
    const origin = panel.querySelector<HTMLButtonElement>('button')!;
    act(() => origin.focus());
    act(() => card().focus());
    const chosen = document.getElementById('origin')!;
    act(() => chosen.focus());
    act(() => dismissToast(card().dataset.toastId!));
    tick(500);
    expect(document.activeElement).toBe(chosen);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
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
    // Chromium blurs a focused div if its tabindex is removed during the leaving render.
    // jsdom retains it, so mirror the observed browser behavior at that DOM boundary.
    const focusedCard = card();
    const removeAttribute = focusedCard.removeAttribute.bind(focusedCard);
    vi.spyOn(focusedCard, 'removeAttribute').mockImplementation((name) => {
      // Blur before removal: jsdom's blur() is itself a no-op once the div is unfocusable.
      if (name.toLowerCase() === 'tabindex' && document.activeElement === focusedCard) focusedCard.blur();
      removeAttribute(name);
    });
    act(() => dismissToast(id));
    expect(document.activeElement).toBe(origin);
    expect(card().getAttribute('tabindex')).toBe('-1');
    tick(500);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).toBeNull();
    expect(document.activeElement).toBe(origin);
  });

  it.each(['sheet', 'load'])('keeps a deliberately focused %s control when a plain note leaves', (kind) => {
    const panel = mount(kind);
    const origin = panel.querySelector<HTMLButtonElement>('button')!;
    act(() => origin.focus());
    act(() => card().focus());
    const chosen = [...panel.querySelectorAll<HTMLButtonElement>('button')].at(-1)!;
    expect(chosen).not.toBe(origin);
    act(() => chosen.focus());
    act(() => dismissToast(card().dataset.toastId!));
    tick(500);
    expect(document.activeElement).toBe(chosen);
  });

  it.each(['sheet', 'load'])('a leaving plain %s note never steals a newer modal’s focus', (kind) => {
    let open!: () => void;
    function Panels() {
      const [newer, setNewer] = useState(false);
      open = () => setNewer(true);
      return <>
        {kind === 'sheet' ? <Sheet open title="First" onClose={() => undefined}><button>Continue</button></Sheet> : <LoadSheet open title="First" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} />}
        <Sheet open={newer} title="Newer" initialFocus="textarea" onClose={() => undefined}><textarea /></Sheet>
        <Toaster />
      </>;
    }
    act(() => render(<Panels />, host));
    act(() => void toast({ message: 'Read this note.', duration: 4000 }));
    const old = card();
    const id = old.dataset.toastId!;
    act(() => old.focus());
    act(() => { open(); dismissToast(id); });
    const chosen = document.querySelector('textarea')!;
    expect(document.activeElement).toBe(chosen);
    tick(500);
    expect(document.querySelector(`[data-toast-id="${id}"]`)).toBeNull();
    expect(document.activeElement).toBe(chosen);
  });

});

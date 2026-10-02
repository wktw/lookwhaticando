// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { Sheet } from '@/ui/Sheet';
import { LoadSheet } from '@/app/LoadSheet';
import { Toaster } from '@/ui/Toaster';
import { holdToasts, toast, toasts } from '@/ui/toast';
import { pushLayer, removeLayer } from '@/ui/sheetStack';
import { showCheckInNote } from '@/fx/checkin';

let host: HTMLElement;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const card = () => document.querySelector<HTMLElement>('[data-toast-id]')!;
const live = () => [...document.querySelectorAll('[role="status"]')].map((el) => el.textContent).join(' ');
const fire = (el: Element, name: string, props = {}) => act(() => { el.dispatchEvent(Object.assign(new Event(name, { bubbles: true }), props)); });
const shown = () => expect(toasts.value[0]?.leaving).not.toBe(true);
const expired = () => expect(toasts.value[0]?.leaving).toBe(true);
const hidden = (value: boolean) => act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')); });
const note = (message = 'Water kept.', duration = 4000) => act(() => void toast({ message, duration, action: { label: 'Undo', onAction: vi.fn() } }));
function Nested() {
  const [nested, setNested] = useState(false);
  return <><Sheet open title="Pet card" onClose={() => undefined}><button id="basket" onClick={() => setNested(true)}>Basket</button></Sheet><Sheet open={nested} title="Basket" onClose={() => setNested(false)}><button id="feed">Feed</button></Sheet><Toaster /></>;
}
function mount(node: preact.ComponentChild = <Toaster />) { act(() => render(node, host)); }

beforeEach(() => {
  vi.useFakeTimers();
  for (const name of ['onpointerenter', 'onpointerleave']) Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value: null });
  window.scrollTo = () => undefined;
  document.body.innerHTML = '<div id="app"></div>';
  host = document.getElementById('app')!;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  toasts.value = [];
});
afterEach(() => {
  act(() => render(null, host));
  removeLayer('moment-c3');
  toasts.value = [];
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('modal-owned notes (WP-C3)', () => {
  it.each(['sheet', 'load'])('the %s notes container cannot become an implicit scroll Tab stop', (kind) => {
    mount(<>{kind === 'sheet' ? <Sheet open title="A note" onClose={() => undefined}><button>Continue</button></Sheet> : <LoadSheet open title="One moment" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} />}<Toaster /></>);
    const slot = document.querySelector<HTMLElement>('[data-notes-slot]')!;
    // The explicit attribute matters: Chromium otherwise makes an overflowing scroll container
    // tabbable when its last live card starts leaving, even though slot.tabIndex reads -1.
    expect(slot.getAttribute('tabindex')).toBe('-1');
    act(() => void toast({ message: 'A plain notice.', duration: 1000 }));
    expect(card().tabIndex).toBe(0);
    tick(1000); expired();
    expect(card().tabIndex).toBe(-1);
    expect(slot.getAttribute('tabindex')).toBe('-1');
    tick(220);
    expect(slot.querySelector('[data-toast-id]')).toBeNull();
    note();
    expect(card().querySelector<HTMLButtonElement>('button')?.tabIndex).toBe(0);
    expect(slot.getAttribute('tabindex')).toBe('-1');
  });

  it.each(['sheet', 'load'])('a plain note owned by a %s is keyboard focusable and keeps its remaining reading time', (kind) => {
    mount(<>{kind === 'sheet' ? <Sheet open title="A note" onClose={() => undefined}><button id="reading-done">Continue</button></Sheet> : <LoadSheet open title="One moment" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} />}<Toaster /></>);
    act(() => void toast({ message: 'Little by little works offline now.', duration: 4000 }));
    const panel = card().closest<HTMLElement>('[role="dialog"], [role="alertdialog"]')!;
    expect(panel.querySelector('[data-notes-slot]')?.contains(card())).toBe(true);
    expect(card().querySelector('button')).toBeNull();
    expect(card().tabIndex).toBe(0);
    tick(1000);
    act(() => card().focus());
    expect(document.activeElement).toBe(card());
    tick(5000); shown();
    act(() => panel.querySelector<HTMLButtonElement>('button')!.focus());
    tick(2999); shown(); tick(1); expired();
  });

  it('plain root notes and action notes do not acquire an extra keyboard stop', () => {
    mount();
    act(() => void toast({ message: 'At the root.' }));
    expect(card().tabIndex).toBe(-1);
    act(() => { toasts.value = []; });
    mount(<><Sheet open title="A note" onClose={() => undefined} /><Toaster /></>);
    note();
    expect(card().tabIndex).toBe(-1);
    expect(card().querySelector('button')?.tabIndex).toBe(0);
  });

  it('moves Undo into the active Pet card, then Basket, then back with its elapsed time intact', () => {
    mount(<Nested />); note(); tick(1000);
    expect(card().closest('[role="dialog"]')?.textContent).toContain('Pet card');
    act(() => document.getElementById('basket')!.click()); tick(1000);
    expect(card().closest('[role="dialog"]')?.textContent).toContain('Basket');
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    tick(1999); shown(); tick(1); expired();
    expect(card().closest('[role="dialog"]')?.textContent).toContain('Pet card');
  });

  it('the shell load dialog owns Undo and its Tab cycle', () => {
    mount(<><LoadSheet open title="One moment" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} /><Toaster /></>); note();
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const undo = card().querySelector('button')!;
    expect(dialog.contains(undo)).toBe(true);
    undo.focus(); fire(undo, 'keydown', { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(dialog.querySelector('[data-notes-slot]')?.contains(card())).toBe(true);
  });

  it('moving a focused note to a new panel does not steal that panel’s initial focus', () => {
    mount(<Nested />); note(); card().querySelector('button')!.focus();
    act(() => document.getElementById('basket')!.click());
    const panel = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1)!;
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(card().closest('[role="dialog"]')).toBe(panel);
  });

  it('a sheet opened by a root note returns focus to the durable control after the note expires', () => {
    function OpenFromNote() {
      const [open, setOpen] = useState(false);
      return <><button id="origin" onClick={() => toast({ message: 'Water kept.', action: { label: 'Add a note', onAction: () => setOpen(true) } })}>Water</button><Sheet open={open} title="A note" onClose={() => setOpen(false)}><textarea /></Sheet><Toaster /></>;
    }
    mount(<OpenFromNote />);
    const origin = document.getElementById('origin')!;
    act(() => { origin.focus(); origin.click(); });
    act(() => card().querySelector('button')!.focus());
    act(() => card().querySelector('button')!.click());
    tick(1000);
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.activeElement).toBe(origin);
  });

  it.each(['sheet', 'load'])('the exiting %s gives back focus and leaves the accessibility tree immediately', (kind) => {
    function Closing() {
      const [open, setOpen] = useState(true);
      return kind === 'sheet' ? <Sheet open={open} title={open ? 'Note' : ''} onClose={() => setOpen(false)}><button>Save</button></Sheet> : <LoadSheet open={open} title={open ? 'Note' : ''} retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => setOpen(false)} />;
    }
    mount(<Closing />);
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    const exit = document.querySelector<HTMLElement>('[data-state="exit"]')!;
    expect(exit).not.toBeNull();
    expect(exit.inert).toBe(true);
    expect(exit.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(['sheet', 'load'])('removing a covered %s preserves the focused field in the top modal', (kind) => {
    let remove!: () => void;
    function Covered() {
      const [lower, setLower] = useState(true);
      remove = () => setLower(false);
      return <>{lower && (kind === 'sheet' ? <Sheet key="lower" open title="Lower" onClose={() => undefined} /> : <LoadSheet key="lower" open title="Lower" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => undefined} />)}<Sheet key="upper" open title="Upper" initialFocus="textarea" onClose={() => undefined}><textarea /></Sheet></>;
    }
    mount(<Covered />);
    const input = document.querySelector('textarea')!;
    expect(document.activeElement).toBe(input);
    act(() => remove());
    expect(document.activeElement).toBe(input);
  });

  it('forward Tab from a modal panel fallback explicitly enters its first control', () => {
    mount(<Sheet open title="A note" onClose={() => undefined}><button>Inside</button></Sheet>);
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    act(() => panel.focus());
    fire(panel, 'keydown', { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(panel.querySelector('button'));
  });

  it.each(['sheet', 'load'])('reopening an exiting %s clears inert before its initial focus', (kind) => {
    let show!: () => void;
    function Reopen() {
      const [open, setOpen] = useState(true);
      show = () => setOpen(true);
      return <><button id="origin">Open</button>{kind === 'sheet' ? <Sheet open={open} title="Note" initialFocus="textarea" onClose={() => setOpen(false)}><textarea /></Sheet> : <LoadSheet open={open} title="Note" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={() => setOpen(false)} />}</>;
    }
    mount(<Reopen />);
    const layer = document.querySelector<HTMLElement>('[data-state]')!;
    const target = layer.querySelector<HTMLElement>(kind === 'sheet' ? 'textarea' : 'button')!;
    // jsdom has no inert focus behavior. Match the browser: focusing an inert element does nothing.
    const nativeFocus = target.focus.bind(target);
    vi.spyOn(target, 'focus').mockImplementation((options) => { if (!layer.inert) nativeFocus(options); });
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    tick(100);
    act(() => document.getElementById('origin')!.focus());
    act(() => show());
    expect(document.activeElement).toBe(target);
  });

  it('counts only visible time after ten seconds hidden', () => {
    mount(); note(); tick(1500); hidden(true); tick(10000); shown(); hidden(false); tick(2499); shown(); tick(1); expired();
  });

  it('a sheet opened after keyboarding between root notes returns to a durable control', () => {
    function OpenFromTwoNotes() {
      const [open, setOpen] = useState(false);
      return <><button id="origin" onClick={() => {
        toast({ message: 'First water kept.', action: { label: 'Undo first', onAction() {} } });
        toast({ message: 'Second water kept.', action: { label: 'Add a note', onAction: () => setOpen(true) } });
      }}>Water</button><Sheet open={open} title="A note" onClose={() => setOpen(false)}><textarea /></Sheet><Toaster /></>;
    }
    mount(<OpenFromTwoNotes />);
    const origin = document.getElementById('origin')!;
    act(() => { origin.focus(); origin.click(); });
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-toast-id] button');
    act(() => buttons[0]!.focus());
    act(() => buttons[1]!.focus());
    act(() => buttons[1]!.click());
    tick(1000);
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.activeElement).toBe(origin);
  });

  it('hover pauses the remaining time rather than starting a new lifetime', () => {
    mount(); note(); tick(1500); fire(card(), 'pointerenter', { pointerType: 'mouse' }); tick(10000); shown();
    fire(card(), 'pointerleave', { pointerType: 'mouse' }); tick(2499); shown(); tick(1); expired();
  });

  it('focus pauses remaining time and moving between actions does not restart it', () => {
    mount(); act(() => void toast({ message: 'Water kept.', actions: [{ label: 'Undo', onAction() {} }, { label: 'Add a note', onAction() {} }] })); tick(1500);
    const buttons = card().querySelectorAll('button'); act(() => buttons[0]!.focus()); tick(10000); shown();
    act(() => buttons[1]!.focus()); tick(10000); shown(); act(() => buttons[1]!.blur()); tick(2499); shown(); tick(1); expired();
  });

  it('leaving hover does not end a simultaneous focus pause', () => {
    mount(); note(); tick(1500); fire(card(), 'pointerenter', { pointerType: 'mouse' }); act(() => card().querySelector('button')!.focus());
    fire(card(), 'pointerleave', { pointerType: 'mouse' }); tick(10000); shown();
    act(() => card().querySelector('button')!.blur()); tick(2499); shown(); tick(1); expired();
  });

  it('moment unmounts and explicit holds preserve the elapsed lifetime', () => {
    mount(); note(); tick(1000); act(() => pushLayer('moment-c3', { moment: true })); tick(10000); shown(); expect(card()).toBeNull();
    act(() => removeLayer('moment-c3')); tick(1000); let release!: () => void; act(() => { release = holdToasts(); }); tick(10000); shown();
    act(() => release()); tick(1999); shown(); tick(1); expired();
  });

  it('a coalesced update earns a fresh lifetime while remaining paused', () => {
    mount(); act(() => void toast({ key: 'one', message: 'First.', duration: 4000 })); tick(3000); hidden(true);
    act(() => void toast({ key: 'one', message: 'Second.', duration: 4000 })); tick(10000); hidden(false); tick(3999); shown(); tick(1); expired();
  });

  it('does not announce an action queued behind two other notes', () => {
    mount(); note('First.', 0); note('Second.', 0); tick(100);
    note('Queued.', 0); tick(100);
    expect(live()).not.toContain('Queued');
  });

  it('announces availability only after a hidden or moment-held action becomes reachable', () => {
    mount(); hidden(true); note(); tick(100); expect(live()).not.toContain('available');
    hidden(false); tick(100); expect(live()).toContain('Undo available');
  });

  it('does not deliver a scheduled availability announcement after a moment takes focus', () => {
    mount(); note(); act(() => pushLayer('moment-c3', { moment: true })); tick(100); expect(live()).not.toContain('available');
    act(() => removeLayer('moment-c3')); tick(100); expect(live()).toContain('Undo available');
  });

  it('check-in burst availability waits for its note to be reachable', () => {
    mount(); act(() => pushLayer('moment-c3', { moment: true }));
    act(() => void showCheckInNote({ habitId: 'c3-water', habitName: 'Water', coins: 0, onUndo() {} }));
    tick(2000); expect(live()).not.toContain('Undo available');
    act(() => removeLayer('moment-c3')); tick(1400); expect(live()).toContain('Water, watered'); expect(live()).toContain('Undo available');
  });
});

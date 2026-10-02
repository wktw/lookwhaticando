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
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const card = () => document.querySelector<HTMLElement>('[data-toast-id]')!;
const live = () => [...document.querySelectorAll('[role="status"]')].map((el) => el.textContent).join(' ');
const fire = (el: Element, name: string, props = {}) => act(() => el.dispatchEvent(Object.assign(new Event(name, { bubbles: true }), props)));
const shown = () => expect(toasts.value[0]?.leaving).not.toBe(true);
const expired = () => expect(toasts.value[0]?.leaving).toBe(true);
const hidden = (value: boolean) => act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')); });
const note = (message = 'Water kept.', duration = 4000) => act(() => toast({ message, duration, action: { label: 'Undo', onAction: vi.fn() } }));
function Nested() {
  const [nested, setNested] = useState(false);
  return <><Sheet open title="Pet card" onClose={() => undefined}><button id="basket" onClick={() => setNested(true)}>Basket</button></Sheet><Sheet open={nested} title="Basket" onClose={() => setNested(false)}><button id="feed">Feed</button></Sheet><Toaster /></>;
}
function mount(node: preact.ComponentChild = <Toaster />) { act(() => render(node, host)); }

beforeEach(() => {
  vi.useFakeTimers();
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
  it('moves Undo into the active Pet card, then Basket, then back with its elapsed time intact', () => {
    mount(<Nested />); note(); tick(1000);
    expect(card().closest('[role="dialog"]')?.textContent).toContain('Pet card');
    act(() => document.getElementById('basket')!.click()); tick(1000);
    expect(card().closest('[role="dialog"]')?.textContent).toContain('Basket');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
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

  it('counts only visible time after ten seconds hidden', () => {
    mount(); note(); tick(1500); hidden(true); tick(10000); shown(); hidden(false); tick(2499); shown(); tick(1); expired();
  });

  it('hover pauses the remaining time rather than starting a new lifetime', () => {
    mount(); note(); tick(1500); fire(card(), 'pointerenter', { pointerType: 'mouse' }); tick(10000); shown();
    fire(card(), 'pointerleave', { pointerType: 'mouse' }); tick(2499); shown(); tick(1); expired();
  });

  it('focus pauses remaining time and moving between actions does not restart it', () => {
    mount(); act(() => toast({ message: 'Water kept.', actions: [{ label: 'Undo', onAction() {} }, { label: 'Add a note', onAction() {} }] })); tick(1500);
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
    mount(); act(() => toast({ key: 'one', message: 'First.', duration: 4000 })); tick(3000); hidden(true);
    act(() => toast({ key: 'one', message: 'Second.', duration: 4000 })); tick(10000); hidden(false); tick(3999); shown(); tick(1); expired();
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
    act(() => showCheckInNote({ habitId: 'c3-water', habitName: 'Water', coins: 0, onUndo() {} }));
    tick(2000); expect(live()).not.toContain('Undo available');
    act(() => removeLayer('moment-c3')); tick(1400); expect(live()).toContain('Water, watered'); expect(live()).toContain('Undo available');
  });
});

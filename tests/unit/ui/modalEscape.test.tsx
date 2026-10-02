// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useLayoutEffect } from 'preact/hooks';
import { Sheet } from '@/ui/Sheet';
import { LoadSheet } from '@/app/LoadSheet';

let host: HTMLElement;
function EscapeAtLayout({ check }: { check: () => void }) {
  useLayoutEffect(check, []);
  return null;
}
function escape() {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.activeElement!.dispatchEvent(event);
  return event;
}
beforeEach(() => {
  vi.useFakeTimers();
  window.scrollTo = () => undefined;
  document.body.innerHTML = '<div id="app"></div>';
  host = document.getElementById('app')!;
});
afterEach(() => {
  act(() => render(null, host));
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Escape is ready when a modal owns focus', () => {
  it.each(['sheet', 'load'] as const)('%s handles Escape before passive effects', (kind) => {
    const close = vi.fn();
    const sampled = vi.fn(() => {
      expect(document.activeElement?.closest('[role="dialog"], [role="alertdialog"]')).not.toBeNull();
      expect(escape().defaultPrevented).toBe(true);
      expect(close).toHaveBeenCalledTimes(1);
    });
    act(() => render(<>{kind === 'sheet' ? <Sheet open title="A note" onClose={close}><button data-autofocus>Write</button></Sheet> : <LoadSheet open title="One moment" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={close} />}<EscapeAtLayout check={sampled} /></>, host));
    expect(sampled).toHaveBeenCalledTimes(1);
    act(() => render(null, host));
    expect(escape().defaultPrevented).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it.each(['sheet', 'load'] as const)('the upper %s alone handles immediate Escape', (kind) => {
    const lower = vi.fn();
    const upper = vi.fn();
    act(() => render(<><Sheet open title="Parent" onClose={lower} />{kind === 'sheet' ? <Sheet open title="Child" onClose={upper} /> : <LoadSheet open title="Loading child" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={upper} />}<EscapeAtLayout check={() => {
      expect(document.activeElement?.closest('[role="dialog"], [role="alertdialog"]')?.textContent).toContain(kind === 'sheet' ? 'Child' : 'Loading child');
      expect(escape().defaultPrevented).toBe(true);
      expect(upper).toHaveBeenCalledTimes(1);
      expect(lower).not.toHaveBeenCalled();
    }} /></>, host));
  });

  it('a nondismissible upper sheet consumes immediate Escape without closing either layer', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    act(() => render(<><Sheet open title="Parent" onClose={lower} /><Sheet open title="Choose" dismissible={false} onClose={upper} /><EscapeAtLayout check={() => {
      expect(escape().defaultPrevented).toBe(true);
      expect(upper).not.toHaveBeenCalled();
      expect(lower).not.toHaveBeenCalled();
    }} /></>, host));
  });

  it.each(['sheet', 'load'] as const)('%s keeps its current callback through enter/open, then releases Escape at exit', (kind) => {
    const first = vi.fn();
    const current = vi.fn();
    const view = (open: boolean, close: () => void) => kind === 'sheet'
      ? <Sheet open={open} title="A note" onClose={close} />
      : <LoadSheet open={open} title="One moment" retryLabel="Try again" closeLabel="Close" onRetry={() => undefined} onClose={close} />;
    act(() => render(view(true, first), host));
    act(() => { vi.advanceTimersByTime(40); });
    act(() => render(view(true, current), host));
    expect(escape().defaultPrevented).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
    act(() => render(view(false, current), host));
    expect(escape().defaultPrevented).toBe(false);
    expect(current).toHaveBeenCalledTimes(1);
  });

});

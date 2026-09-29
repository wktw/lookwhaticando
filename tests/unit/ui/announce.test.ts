// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announceSettled, cancelSettled, SETTLE_MS } from '@/ui/announce';
import { toast, toasts } from '@/ui/toast';

const live = () => document.querySelector('[aria-live="polite"]')?.textContent ?? '';
/** announce() writes the region 60 ms after clearing it, so a repeat is still read. */
const WRITE_MS = 60;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  toasts.value = [];
  document.body.innerHTML = '';
});

describe('the burst rule (DESIGN §9.1)', () => {
  it('announces once, 1.2 s after the last of several quick calls, with the latest sentence', () => {
    expect(SETTLE_MS).toBe(1200);
    announceSettled('checkin', 'Walk, watered.');
    vi.advanceTimersByTime(500);
    announceSettled('checkin', 'Walk and Read watered.');
    vi.advanceTimersByTime(500);
    announceSettled('checkin', 'Walk, Read and Stretch watered.');
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(live()).toBe('');
    vi.advanceTimersByTime(1 + WRITE_MS);
    expect(live()).toBe('Walk, Read and Stretch watered.');
  });

  it('builds a lazy sentence only when it is spoken', () => {
    const build = vi.fn(() => 'Everything is watered.');
    announceSettled('checkin', build);
    announceSettled('checkin', build);
    expect(build).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS + WRITE_MS);
    expect(build).toHaveBeenCalledTimes(1);
    expect(live()).toBe('Everything is watered.');
  });

  it('groups are independent, and a cancelled group says nothing', () => {
    announceSettled('a', 'First.');
    announceSettled('b', 'Second.');
    cancelSettled('a');
    vi.advanceTimersByTime(SETTLE_MS + WRITE_MS);
    expect(live()).toBe('Second.');
  });

  it('a silent toast leaves the live region alone; a normal one speaks at once', () => {
    toast({ message: 'Walk, watered.', silent: true });
    vi.advanceTimersByTime(WRITE_MS);
    expect(live()).toBe('');
    toast({ message: 'Saved.' });
    vi.advanceTimersByTime(WRITE_MS);
    expect(live()).toBe('Saved.');
  });
});

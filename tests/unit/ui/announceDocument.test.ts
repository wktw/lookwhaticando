// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announce } from '@/ui/announce';
import { pushLayer, removeLayer } from '@/ui/sheetStack';

const createdRegions: Element[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  removeLayer('delayed-announcement');
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const region of createdRegions.splice(0)) region.remove();
  document.body.innerHTML = '';
});

describe('a delayed announcement belongs to the document that accepted it', () => {
  it('places the actual live region inside a modal opened after scheduling', () => {
    announce('Saved.');
    const region = document.querySelector('[aria-live="polite"]')!;
    createdRegions.push(region);
    const slot = document.createElement('div');
    document.body.append(slot);
    pushLayer('delayed-announcement', { notesSlot: slot });

    vi.advanceTimersByTime(60);

    expect(slot.firstElementChild).toBe(region);
    expect(region.textContent).toBe('Saved.');
  });

  it('does not move its live region into a later ambient document', () => {
    const owner = document;
    const replacement = document.implementation.createHTMLDocument('Another page');
    announce('Saved.');
    const region = owner.querySelector('[aria-live="polite"]')!;
    createdRegions.push(region);
    vi.stubGlobal('document', replacement);

    vi.advanceTimersByTime(60);

    expect(region.parentNode).toBe(owner.body);
    expect(region.textContent).toBe('Saved.');
    expect(replacement.querySelector('[aria-live]')).toBeNull();
  });

  it('finishes an accepted write without looking up a retired ambient document', () => {
    announce('Saved.');
    const region = document.querySelector('[aria-live="polite"]')!;
    createdRegions.push(region);
    vi.stubGlobal('document', undefined);

    expect(() => vi.advanceTimersByTime(60)).not.toThrow();
    expect(region.textContent).toBe('Saved.');
  });
});

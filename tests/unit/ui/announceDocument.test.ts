// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { announce } from '@/ui/announce';

const createdRegions: Element[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const region of createdRegions.splice(0)) region.remove();
  document.body.innerHTML = '';
});

describe('a delayed announcement belongs to the document that accepted it', () => {
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

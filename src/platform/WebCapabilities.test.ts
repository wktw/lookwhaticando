// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPlatform, type LifecycleEvent } from './capabilities';
import { saveFile } from '@/features/you/files';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('web capability behaviour', () => {
  it('reports cancelled share without downloading, but a denied share falls back to download', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const share = vi.fn().mockRejectedValueOnce(new DOMException('cancelled', 'AbortError')).mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { share, canShare: () => true });
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(saveFile('backup.json', '{}')).resolves.toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
    await expect(saveFile('backup.json', '{}')).resolves.toBe('downloaded-instead');
    expect(click).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(2);
  });

  it('delivers pause, resume and browser-restored-page events, then removes all listeners', () => {
    const received: LifecycleEvent[] = [];
    const stop = getPlatform().lifecycle.subscribe((event) => received.push(event));
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(getPlatform().lifecycle.hidden).toBe(true);
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(received).toEqual(['pause', 'resume', 'restore']);
    stop();
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(received).toHaveLength(3);
  });

  it('leaves real calendar links to the browser and opens only HTTP links without an opener', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    expect(getPlatform().externalLinks.open('cal/morning-0730.ics', { fromLink: true })).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(getPlatform().externalLinks.open('javascript:alert(1)')).toBe(false);
    expect(getPlatform().externalLinks.open('https://example.com/calendar')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://example.com/calendar', '_blank', 'noopener,noreferrer');
  });
});

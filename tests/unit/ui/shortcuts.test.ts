// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { installShortcuts, shortcutsEnabled } from '@/app/shortcuts';

const press = (key: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(e);
  return e;
};

let stop: (() => void) | null = null;
window.scrollTo = () => undefined;
afterEach(() => {
  stop?.();
  stop = null;
  location.hash = '';
});

describe('single-key shortcuts (WCAG 2.1.4)', () => {
  it('follow the setting, and default to on only with a fine pointer', () => {
    expect(shortcutsEnabled({ keyboardShortcuts: false }, true)).toBe(false);
    expect(shortcutsEnabled({ keyboardShortcuts: true }, false)).toBe(true);
    expect(shortcutsEnabled({}, true)).toBe(true);
    expect(shortcutsEnabled({}, false)).toBe(false);
  });

  it('the setting is stored and kept by updateSettings; anything but a boolean is dropped', async () => {
    const { sanitizeSettings } = await import('@/domain/profile');
    expect(sanitizeSettings({ keyboardShortcuts: false })).toEqual({ keyboardShortcuts: false });
    expect(sanitizeSettings({ keyboardShortcuts: 'yes' as unknown as boolean })).toEqual({});
  });

  it('"1" does nothing when they are off', () => {
    location.hash = '#/capsules';
    stop = installShortcuts({ enabled: () => false });
    const e = press('1');
    expect(e.defaultPrevented).toBe(false);
    expect(location.hash).toBe('#/capsules');
  });

  it('"2" goes to Progress when they are on, never with a modifier', () => {
    location.hash = '#/capsules';
    stop = installShortcuts({ enabled: () => true });
    expect(press('2', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(press('2').defaultPrevented).toBe(true);
    expect(location.hash).toBe('#/progress');
  });

  it('N asks for a new habit as ck:new-habit (the old mm:new-habit is gone)', () => {
    const heard: string[] = [];
    const a = () => heard.push('ck');
    const b = () => heard.push('mm');
    window.addEventListener('ck:new-habit', a);
    window.addEventListener('mm:new-habit', b);
    stop = installShortcuts({ enabled: () => true });
    press('n');
    window.removeEventListener('ck:new-habit', a);
    window.removeEventListener('mm:new-habit', b);
    expect(heard).toEqual(['ck']);
  });
});

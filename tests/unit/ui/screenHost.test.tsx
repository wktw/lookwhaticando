// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

vi.mock('@/app/screens', () => {
  const screen = (title: string) => () => <h1>{title}</h1>;
  const map: Record<string, () => preact.JSX.Element> = { today: screen('Today'), progress: screen('Progress'), capsules: screen('Capsules') };
  return {
    loadedScreen: (tab: string) => map[tab],
    loadScreen: (tab: string) => Promise.resolve(map[tab]),
    preloadScreen: () => undefined,
    preloadAllWhenIdle: () => undefined,
  };
});

const { ScreenHost } = await import('@/app/ScreenHost');
const { setInputModality } = await import('@/app/inputModality');

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const live = () => document.querySelector('[aria-live="polite"]')?.textContent ?? '';
window.scrollTo = () => undefined;

let host: HTMLElement;
afterEach(() => {
  act(() => render(null, host));
  document.body.innerHTML = '';
});

describe('a tab change is heard and, by keyboard, focused (VoiceOver ignores hash changes)', () => {
  it('announces the new screen, not the first one, and moves keyboard focus to its heading', async () => {
    host = document.body.appendChild(document.createElement('main'));
    act(() => render(<ScreenHost tab="today" />, host));
    await act(() => sleep(100));
    expect(live()).toBe('');

    setInputModality('keyboard');
    act(() => render(<ScreenHost tab="progress" />, host));
    await act(() => sleep(100));
    expect(live()).toBe('Progress');
    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');

    // By touch, it is announced but focus stays where the finger was.
    setInputModality('pointer');
    (document.activeElement as HTMLElement).blur();
    act(() => render(<ScreenHost tab="capsules" />, host));
    await act(() => sleep(100));
    expect(live()).toBe('Capsules');
    expect(document.activeElement).toBe(document.body);
  });
});

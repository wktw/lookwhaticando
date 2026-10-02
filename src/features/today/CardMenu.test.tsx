// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { click, installDom, key, mount, pointer } from '@/features/capsules/testing';
import { CardMenu } from './CardMenu';

let view: ReturnType<typeof mount> | undefined;
let anchor: HTMLButtonElement;
const close = vi.fn();
const choose = vi.fn();
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const items = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));

beforeEach(() => {
  installDom();
  vi.stubGlobal('scrollX', 0);
  vi.stubGlobal('scrollY', 332);
  anchor = document.createElement('button');
  anchor.textContent = 'More for Drink water';
  document.body.append(anchor);
  close.mockClear();
  choose.mockClear();
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  anchor.remove();
  vi.unstubAllGlobals();
});
function open() {
  function Subject() {
    const [open, setOpen] = useState(true);
    return open ? <CardMenu anchor={anchor} label="Drink water" items={[
      { id: 'tiny', label: 'Tiny version', icon: 'tiny', onSelect: () => choose('tiny') },
      { id: 'count', label: 'How many…', icon: 'drop', onSelect: () => choose('count') },
    ]} onClose={(restore) => { close(restore); setOpen(false); if (restore) anchor.focus(); }} /> : null;
  }
  view = mount(<Subject />);
  expect(menu()).not.toBeNull();
}

it('keeps a newly opened menu when a completed scroll delivers its queued notification', async () => {
  // The browser has already scrolled the More button into view when it is clicked.
  // Its scroll event can be delivered after the menu is placed and focused.
  open();
  await act(() => window.dispatchEvent(new Event('scroll')));
  expect(menu()).not.toBeNull();
  expect(close).not.toHaveBeenCalled();
  await click(items()[1]!, 'How many…');
  expect(choose).toHaveBeenCalledExactlyOnceWith('count');
  expect(menu()).toBeNull();
});

it.each(['scrollX', 'scrollY'] as const)('closes if %s changes after the menu is placed', async (axis) => {
  open();
  vi.stubGlobal(axis, window[axis] + 1);
  await act(() => window.dispatchEvent(new Event('scroll')));
  expect(menu()).toBeNull();
  expect(close).toHaveBeenCalledExactlyOnceWith(false);
  expect(choose).not.toHaveBeenCalled();
});

it('still closes on viewport resize even if the scroll position stays the same', async () => {
  open();
  await act(() => window.dispatchEvent(new Event('resize')));
  expect(menu()).toBeNull();
  expect(close).toHaveBeenCalledExactlyOnceWith(false);
});

it('keeps keyboard navigation and Escape focus return', async () => {
  open();
  expect(document.activeElement).toBe(items()[0]);
  await key(menu()!, 'ArrowDown');
  expect(document.activeElement).toBe(items()[1]);
  await key(menu()!, 'Home');
  expect(document.activeElement).toBe(items()[0]);
  await key(menu()!, 'End');
  expect(document.activeElement).toBe(items()[1]);
  await key(menu()!, 'Escape');
  expect(menu()).toBeNull();
  expect(close).toHaveBeenCalledExactlyOnceWith(true);
  expect(document.activeElement).toBe(anchor);
});

it('still closes on a pointer down outside the menu and its anchor', async () => {
  open();
  await act(() => document.body.dispatchEvent(pointer('pointerdown')));
  expect(menu()).toBeNull();
  expect(close).toHaveBeenCalledExactlyOnceWith(false);
});

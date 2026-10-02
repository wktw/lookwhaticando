// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLayoutEffect, useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { installDom, mount, pointer } from '@/features/capsules/testing';
import { CardMenu } from './CardMenu';

let view: ReturnType<typeof mount> | undefined;
let anchor: HTMLButtonElement;
const close = vi.fn();
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');

beforeEach(() => {
  installDom();
  vi.stubGlobal('scrollX', 10);
  vi.stubGlobal('scrollY', 332);
  anchor = document.createElement('button');
  anchor.textContent = 'More for Walk';
  document.body.append(anchor);
  close.mockClear();
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  anchor.remove();
  vi.unstubAllGlobals();
});

function AfterPlacement({ move }: { move: () => void }) {
  useLayoutEffect(move, []);
  return null;
}
function open(move?: () => void) {
  function Subject() {
    const [visible, setVisible] = useState(true);
    return <>
      {visible && <CardMenu anchor={anchor} label="Walk" items={[
        { id: 'note', label: 'Add a note', icon: 'note', onSelect() {} },
      ]} onClose={(restore) => { close(restore); setVisible(false); if (restore) anchor.focus(); }} />}
      {move && <AfterPlacement move={move} />}
    </>;
  }
  view = mount(<Subject />);
  expect(menu()).not.toBeNull();
}

it.each(['scrollX', 'scrollY'] as const)('notices %s movement between placement and the passive listener effect', async (axis) => {
  open(() => {
    expect(menu()).not.toBeNull();
    vi.stubGlobal(axis, window[axis] + 1);
  });
  expect(close).not.toHaveBeenCalled();
  await act(() => void window.dispatchEvent(new Event('scroll')));
  expect(menu()).toBeNull();
  expect(close).toHaveBeenCalledExactlyOnceWith(false);
});

it('retains first-item focus through old scroll notifications and presses inside the anchor or menu', async () => {
  open();
  const first = menu()!.querySelector<HTMLButtonElement>('[role="menuitem"]')!;
  expect(document.activeElement).toBe(first);
  await act(() => {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    anchor.dispatchEvent(pointer('pointerdown'));
    first.dispatchEvent(pointer('pointerdown'));
  });
  expect(close).not.toHaveBeenCalled();
  expect(menu()).not.toBeNull();
  expect(document.activeElement).toBe(first);
});

it('disposes scroll, resize and outside-press callbacks when the owning screen unmounts', async () => {
  open();
  view!.unmount();
  view = undefined;
  expect(menu()).toBeNull();
  vi.stubGlobal('scrollY', 333);
  await act(() => {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    document.body.dispatchEvent(pointer('pointerdown'));
  });
  expect(close).not.toHaveBeenCalled();
});

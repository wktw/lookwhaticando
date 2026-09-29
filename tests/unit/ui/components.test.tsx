// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { CandyButton, IconButton, Segmented, Sheet, Toggle } from '@/ui';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// jsdom has no layout: scrolling is a no-op here.
window.scrollTo = () => undefined;

const hosts: HTMLElement[] = [];

function mount(node: preact.ComponentChild) {
  const host = document.createElement('div');
  document.getElementById('app')!.appendChild(host);
  act(() => render(node, host));
  hosts.push(host);
  return host;
}

afterEach(() => {
  // Unmount properly so sheets release the shared layer stack and scroll lock.
  for (const host of hosts.splice(0)) act(() => render(null, host));
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
});

function setup() {
  document.body.innerHTML = '<div id="app"><button id="opener">Open</button></div>';
  document.getElementById('opener')!.focus();
}

describe('Sheet', () => {
  function Harness({ onClose }: { onClose?: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <Sheet
        open={open}
        title="Edit habit"
        description="Small and steady."
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <button>Inside</button>
      </Sheet>
    );
  }

  it('is a labelled modal dialog in #overlay-root that takes focus, locks scroll and makes the app inert', () => {
    setup();
    mount(<Harness />);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.closest('#overlay-root')).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Edit habit');
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('Small and steady.');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.getElementById('app')!.inert).toBe(true);
    expect(document.body.style.position).toBe('fixed');
  });

  it('closes on Esc, then unlocks the page and gives focus back', async () => {
    setup();
    const onClose = vi.fn();
    mount(<Harness onClose={onClose} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(() => sleep(400));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.getElementById('app')!.inert).toBe(false);
    expect(document.body.style.position).toBe('');
    expect(document.activeElement?.id).toBe('opener');
  });

  it('keeps Tab inside the sheet', () => {
    setup();
    mount(<Harness />);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const buttons = [...dialog.querySelectorAll('button')];
    buttons.at(-1)!.focus();
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe('controls', () => {
  it('Toggle is a real checkbox with switch semantics', () => {
    setup();
    const onChange = vi.fn();
    const host = mount(<Toggle checked={false} onChange={onChange} label="Sounds" />);
    const input = host.querySelector('input')!;
    expect(input.type).toBe('checkbox');
    expect(input.getAttribute('role')).toBe('switch');
    expect(input.hasAttribute('switch')).toBe(true);
    act(() => input.click());
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Segmented is a radiogroup with roving focus and arrow keys', () => {
    setup();
    function Seg() {
      const [v, setV] = useState<'a' | 'b' | 'c'>('a');
      return <Segmented label="Theme" value={v} onChange={setV} options={[{ value: 'a', label: 'Auto' }, { value: 'b', label: 'Light' }, { value: 'c', label: 'Night' }]} />;
    }
    const host = mount(<Seg />);
    const group = host.querySelector('[role="radiogroup"]')!;
    const radios = () => [...host.querySelectorAll<HTMLElement>('[role="radio"]')];
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    act(() => {
      group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  });

  it('CandyButton ignores presses while loading and says so', () => {
    setup();
    const onClick = vi.fn();
    const host = mount(
      <CandyButton loading onClick={onClick}>
        Save
      </CandyButton>,
    );
    const btn = host.querySelector('button')!;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    act(() => btn.click());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('IconButton always has an accessible name', () => {
    setup();
    const host = mount(<IconButton icon="close" label="Close" />);
    expect(host.querySelector('button')!.getAttribute('aria-label')).toBe('Close');
  });
});

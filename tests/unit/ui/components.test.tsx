// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { Button, Card, CandyButton, ConfirmDialog, IconButton, RarityPill, Segmented, Sheet, Toggle } from '@/ui';
import { ToastNote } from '@/ui/Toaster';

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

  it('stacked sheets: Esc closes only the top one, and focus goes back into the one below', async () => {
    setup();
    const closed: string[] = [];
    function Stack() {
      const [inner, setInner] = useState(false);
      return (
        <Sheet open title="Pet" onClose={() => closed.push('outer')}>
          <button id="wardrobe" onClick={() => setInner(true)}>
            Wardrobe
          </button>
          <Sheet open={inner} title="Wardrobe" onClose={() => (closed.push('inner'), setInner(false))}>
            <button>Done</button>
          </Sheet>
        </Sheet>
      );
    }
    mount(<Stack />);
    const wardrobe = document.getElementById('wardrobe')!;
    wardrobe.focus();
    act(() => wardrobe.click());
    const [outer, inner] = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')];
    expect(inner!.contains(document.activeElement)).toBe(true);
    expect((outer!.closest('[data-state]') as HTMLElement).inert).toBe(true);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).toEqual(['inner']);
    await act(() => sleep(400));
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect((outer!.closest('[data-state]') as HTMLElement).inert).toBe(false);
    expect(document.activeElement).toBe(wardrobe);
  });

  it('ConfirmDialog is an alertdialog that is described by its message', () => {
    setup();
    mount(<ConfirmDialog open title="Delete it?" message="Its plant goes too." onConfirm={() => undefined} onCancel={() => undefined} />);
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe('Its plant goes too.');
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
      return (
        <Segmented
          label="Theme"
          value={v}
          onChange={setV}
          options={[
            { value: 'a', label: 'Auto' },
            { value: 'b', label: 'Light' },
            { value: 'c', label: 'Night' },
          ]}
        />
      );
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

  it('CandyButton is the catkin Button under its older name, and the older variants still work', () => {
    expect(CandyButton).toBe(Button);
    setup();
    const host = mount(
      <>
        <Button variant="soft">Tint</Button>
        <Button variant="ghost">Quiet</Button>
        <Button variant="danger">Delete</Button>
      </>,
    );
    const [tint, quiet, danger] = [...host.querySelectorAll('button')];
    expect(tint!.className).toMatch(/tint/);
    expect(quiet!.className).toMatch(/quiet/);
    expect(danger!.className).toMatch(/primary/);
    expect(danger!.className).toContain('ck-tone-danger');
    for (const b of [tint, quiet, danger]) expect(b!.type).toBe('button');
  });

  it('a tier label always prints its word (never colour alone)', () => {
    setup();
    const host = mount(
      <>
        <RarityPill rarity="common" />
        <RarityPill rarity="uncommon" />
        <RarityPill rarity="rare" />
        <RarityPill rarity="ultra" />
        <RarityPill rarity="ultra" secret />
      </>,
    );
    expect([...host.children].map((c) => c.textContent)).toEqual(['Classic', 'Special', 'Rare', 'Super rare', 'Secret']);
  });

  it('a note shows its line, its observed second line and a real Undo button', () => {
    setup();
    const onUndo = vi.fn();
    const host = mount(<ToastNote item={{ message: 'Walk, watered.', note: 'Pudding opened one eye.', action: { label: 'Undo', onAction: onUndo }, version: 0 }} />);
    expect(host.textContent).toContain('Walk, watered.');
    expect(host.textContent).toContain('Pudding opened one eye.');
    const undo = host.querySelector('button')!;
    expect(undo.textContent).toBe('Undo');
    act(() => undo.click());
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('a button Card never submits the form around it', () => {
    setup();
    const host = mount(<Card as="button">Pick me</Card>);
    expect(host.querySelector('button')!.type).toBe('button');
  });

  it('IconButton always has an accessible name', () => {
    setup();
    const host = mount(<IconButton icon="close" label="Close" />);
    expect(host.querySelector('button')!.getAttribute('aria-label')).toBe('Close');
  });
});

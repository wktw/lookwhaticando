// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { Button, Card, CandyButton, ConfirmDialog, IconButton, RarityPill, Segmented, Sheet, Toggle } from '@/ui';
import { Stepper } from '@/ui/Stepper';
import { Toaster, ToastNote } from '@/ui/Toaster';
import { toast, toasts } from '@/ui/toast';

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

/* ---------- gesture abort (WP-C2: UI2-05, UI2-06, P-ui-01, P-ui-02, P-ui-03) ---------- */

beforeAll(() => {
  // jsdom has no on-pointer handler properties, so Preact would listen for "PointerDown" instead of
  // "pointerdown"; declaring them lets these tests dispatch the real event names.
  for (const name of ['onpointerdown', 'onpointermove', 'onpointerup', 'onpointercancel', 'onpointerleave', 'onlostpointercapture']) {
    if (!(name in HTMLElement.prototype)) Object.defineProperty(HTMLElement.prototype, name, { value: null, writable: true, configurable: true });
  }
  const proto = Element.prototype as Element & { setPointerCapture?: unknown; releasePointerCapture?: unknown };
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
});

/** A pointer event (jsdom has no PointerEvent): a MouseEvent carrying pointerId and pointerType. */
function pointer(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
  const { pointerId = 1, pointerType = 'mouse', ...rest } = init;
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...rest });
  Object.defineProperties(e, { pointerId: { value: pointerId }, pointerType: { value: pointerType } });
  return e;
}

/** A one-finger touch event at `y` (none left on the screen for touchend and touchcancel). */
function touch(type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', y = 0) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: 0, clientY: y }] });
  return e;
}

/** A click as a keyboard (Enter, Space) or assistive activation sends it: no pointer, detail 0. */
const keyboardClick = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })));
/** The click a finished pointer press sends. */
const pointerClick = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));

describe('Sheet gestures: a cancelled drag is not a release (UI2-05, P-ui-01)', () => {
  // jsdom has no layout: the panel is 400 px tall, so a 300 px pull is a dismissing drag.
  let height: PropertyDescriptor | undefined;
  beforeEach(() => {
    height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });
  });
  afterEach(() => {
    if (height) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
  });

  function Draft({ onClose, refuse = false }: { onClose: () => void; refuse?: boolean }) {
    const [open, setOpen] = useState(true);
    const [text, setText] = useState('');
    return (
      <Sheet
        open={open}
        title="A note for Walk"
        onClose={() => {
          onClose();
          if (!refuse) setOpen(false);
        }}
      >
        <textarea value={text} onInput={(e) => setText(e.currentTarget.value)} />
      </Sheet>
    );
  }

  async function openDraft(onClose: () => void, refuse = false) {
    setup();
    mount(<Draft onClose={onClose} refuse={refuse} />);
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    // Two frames after mounting the sheet is 'open', and only then takes drags.
    for (let i = 0; i < 100 && panel.closest<HTMLElement>('[data-state]')!.dataset.state !== 'open'; i++) await act(() => sleep(10));
    expect(panel.closest<HTMLElement>('[data-state]')!.dataset.state).toBe('open');
    const header = panel.querySelector<HTMLElement>('[data-sheet-header]')!;
    const area = panel.querySelector('textarea')!;
    act(() => {
      area.value = 'It rained all the way.';
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return { panel, header, area };
  }

  /** Pull the sheet down by its header far enough to dismiss it on release. */
  function pullDown(header: HTMLElement) {
    act(() => {
      header.dispatchEvent(touch('touchstart', 100));
      header.dispatchEvent(touch('touchmove', 110));
      header.dispatchEvent(touch('touchmove', 250));
      header.dispatchEvent(touch('touchmove', 400));
    });
  }

  it('touchcancel after a dismissing pull: the sheet stays, back at rest, and the draft is intact', async () => {
    const onClose = vi.fn();
    const { panel, header, area } = await openDraft(onClose);
    pullDown(header);
    expect(panel.style.transform).toBe('translateY(300px)');
    act(() => void header.dispatchEvent(touch('touchcancel')));
    await act(() => sleep(20));
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBe(panel);
    expect(panel.style.transform).toBe('');
    expect(panel.style.transition).toBe('');
    expect(area.value).toBe('It rained all the way.');
  });

  it('control: touchend after the same pull still dismisses', async () => {
    const onClose = vi.fn();
    const { header } = await openDraft(onClose);
    pullDown(header);
    act(() => void header.dispatchEvent(touch('touchend')));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the window losing focus mid-pull puts the sheet back and a later release does nothing', async () => {
    const onClose = vi.fn();
    const { panel, header } = await openDraft(onClose);
    pullDown(header);
    expect(panel.style.transform).toBe('translateY(300px)');
    act(() => void window.dispatchEvent(new Event('blur')));
    expect(panel.style.transform).toBe('');
    act(() => void header.dispatchEvent(touch('touchend')));
    await act(() => sleep(20));
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('');
  });

  it('a dismissing pull whose close is refused (a form that asks first) springs back to rest', async () => {
    const onClose = vi.fn();
    const { panel, header } = await openDraft(onClose, true);
    pullDown(header);
    act(() => void header.dispatchEvent(touch('touchend')));
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(() => sleep(20));
    expect(document.querySelector('[role="dialog"]')).toBe(panel);
    expect(panel.style.transform).toBe('');
  });

  it('a mouse pull cancelled by a window pointercancel: back at rest, nothing closed, and a later pointerup does nothing', async () => {
    const onClose = vi.fn();
    const { panel, header } = await openDraft(onClose);
    act(() => {
      header.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      window.dispatchEvent(pointer('pointermove', { clientY: 110 }));
      window.dispatchEvent(pointer('pointermove', { clientY: 400 }));
    });
    expect(panel.style.transform).toBe('translateY(300px)');
    act(() => void window.dispatchEvent(pointer('pointercancel', { clientY: 400 })));
    expect(panel.style.transform).toBe('');
    expect(panel.style.transition).toBe('');
    act(() => void window.dispatchEvent(pointer('pointerup', { clientY: 400 })));
    await act(() => sleep(20));
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBe(panel);
    expect(panel.style.transform).toBe('');
  });

  it('control: the same mouse pull released with a pointerup dismisses', async () => {
    const onClose = vi.fn();
    const { header } = await openDraft(onClose);
    act(() => {
      header.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      window.dispatchEvent(pointer('pointermove', { clientY: 110 }));
      window.dispatchEvent(pointer('pointermove', { clientY: 400 }));
    });
    act(() => void window.dispatchEvent(pointer('pointerup', { clientY: 400 })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('unmounting mid mouse-drag leaves no window listeners behind', async () => {
    const onClose = vi.fn();
    const { header } = await openDraft(onClose);
    const added: [string, unknown][] = [];
    const removed: [string, unknown][] = [];
    const add = vi.spyOn(window, 'addEventListener').mockImplementation(function (this: Window, type: string, fn: unknown) {
      added.push([type, fn]);
    } as never);
    const remove = vi.spyOn(window, 'removeEventListener').mockImplementation(function (this: Window, type: string, fn: unknown) {
      removed.push([type, fn]);
    } as never);
    try {
      act(() => {
        header.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 200 }));
      });
      const pointerListeners = added.filter(([t]) => t.startsWith('pointer'));
      expect(pointerListeners.length).toBeGreaterThan(0);
      for (const host of hosts.splice(0)) act(() => render(null, host));
      for (const [type, fn] of pointerListeners) expect(removed.some(([t, f]) => t === type && f === fn)).toBe(true);
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Stepper: a cancelled press never eats the next activation (UI2-06, P-ui-03)', () => {
  function Harness({ start = 0, max = 99, onValue }: { start?: number; max?: number; onValue?: (v: number) => void }) {
    const [v, setV] = useState(start);
    return (
      <Stepper
        value={v}
        max={max}
        label="Glasses"
        onChange={(n) => {
          onValue?.(n);
          setV(n);
        }}
      />
    );
  }
  const plus = () => document.querySelector<HTMLButtonElement>('button[aria-label="Increase Glasses"]')!;
  const minus = () => document.querySelector<HTMLButtonElement>('button[aria-label="Decrease Glasses"]')!;
  const shown = () => Number(document.querySelector('output')!.textContent);

  it('R208 inverted: pointerdown, pointercancel, then a keyboard activation still counts', () => {
    setup();
    mount(<Harness />);
    act(() => void plus().dispatchEvent(pointer('pointerdown', { pointerType: 'touch' })));
    expect(shown()).toBe(1);
    act(() => void plus().dispatchEvent(pointer('pointercancel', { pointerType: 'touch' })));
    keyboardClick(plus());
    expect(shown()).toBe(2);
  });

  it('a press that reaches the maximum (the button goes disabled, no click comes) does not eat the other button’s keyboard activation', () => {
    setup();
    mount(<Harness start={9} max={10} />);
    act(() => void plus().dispatchEvent(pointer('pointerdown')));
    expect(shown()).toBe(10);
    expect(plus().disabled).toBe(true);
    keyboardClick(minus());
    expect(shown()).toBe(9);
  });

  it('a press released outside the button (no click) does not eat the next keyboard activation', () => {
    setup();
    mount(<Harness />);
    act(() => {
      plus().dispatchEvent(pointer('pointerdown'));
      plus().dispatchEvent(pointer('pointerleave'));
      document.body.dispatchEvent(pointer('pointerup'));
    });
    expect(shown()).toBe(1);
    keyboardClick(plus());
    expect(shown()).toBe(2);
  });

  it('a hold stops repeating when the window loses focus mid-hold (no pointerup may ever come)', async () => {
    setup();
    mount(<Harness />);
    act(() => void plus().dispatchEvent(pointer('pointerdown')));
    act(() => void window.dispatchEvent(new Event('blur')));
    await act(() => sleep(420 + 90 * 4));
    expect(shown()).toBe(1);
  });

  it('control: a short pointer press gives exactly one step, and keyboard activations one each', () => {
    setup();
    const onValue = vi.fn();
    mount(<Harness onValue={onValue} />);
    act(() => {
      plus().dispatchEvent(pointer('pointerdown'));
      plus().dispatchEvent(pointer('pointerup'));
    });
    pointerClick(plus());
    expect(shown()).toBe(1);
    keyboardClick(plus());
    keyboardClick(plus());
    expect(shown()).toBe(3);
    expect(onValue).toHaveBeenCalledTimes(3);
  });

  it('control: a long press repeats while held and adds no extra step on release', async () => {
    setup();
    mount(<Harness />);
    act(() => void plus().dispatchEvent(pointer('pointerdown')));
    await act(() => sleep(420 + 90 * 3 + 45));
    const held = shown();
    expect(held).toBeGreaterThanOrEqual(3);
    act(() => void plus().dispatchEvent(pointer('pointerup')));
    pointerClick(plus());
    await act(() => sleep(200));
    expect(shown()).toBe(held);
  });
});

describe('Toaster: a cancelled flick never puts a note away (P-ui-02)', () => {
  beforeEach(() => {
    toasts.value = [];
  });
  afterEach(() => {
    toasts.value = [];
  });

  function showNote(withUndo: boolean) {
    setup();
    const id = toast({ message: 'Walk, watered.', ...(withUndo ? { action: { label: 'Undo', onAction: () => undefined } } : {}), duration: 0 });
    mount(<Toaster />);
    const card = document.querySelector<HTMLElement>(`[data-toast-id="${id}"]`)!;
    expect(card).not.toBeNull();
    return { id, card, leaving: () => toasts.value.find((t) => t.id === id)?.leaving === true };
  }

  it('pointercancel after a flick-length drag: the note with Undo stays, back in place', () => {
    const { card, leaving } = showNote(true);
    act(() => {
      card.dispatchEvent(pointer('pointerdown', { clientY: 100, pointerType: 'touch' }));
      card.dispatchEvent(pointer('pointermove', { clientY: 160, pointerType: 'touch' }));
    });
    expect(card.style.transform).toBe('translateY(60px)');
    act(() => void card.dispatchEvent(pointer('pointercancel', { clientY: 160, pointerType: 'touch' })));
    expect(leaving()).toBe(false);
    expect(card.style.transform).toBe('');
    expect(card.style.transition).toBe('');
  });

  it('pointercancel without moving is not a tap: a plain note stays', () => {
    const { card, leaving } = showNote(false);
    act(() => {
      card.dispatchEvent(pointer('pointerdown', { clientY: 100, pointerType: 'touch' }));
      card.dispatchEvent(pointer('pointercancel', { clientY: 100, pointerType: 'touch' }));
    });
    expect(leaving()).toBe(false);
  });

  it('losing the pointer capture without a pointerup puts the note back and leaves it up', () => {
    const { card, leaving } = showNote(true);
    act(() => {
      card.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      card.dispatchEvent(pointer('pointermove', { clientY: 160 }));
      card.dispatchEvent(pointer('lostpointercapture', { clientY: 160 }));
    });
    expect(leaving()).toBe(false);
    expect(card.style.transform).toBe('');
  });

  it('the window losing focus mid-flick puts the note back, and a later pointerup does not put it away', () => {
    const { card, leaving } = showNote(true);
    act(() => {
      card.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      card.dispatchEvent(pointer('pointermove', { clientY: 160 }));
      window.dispatchEvent(new Event('blur'));
    });
    expect(card.style.transform).toBe('');
    act(() => void card.dispatchEvent(pointer('pointerup', { clientY: 160 })));
    expect(leaving()).toBe(false);
  });

  it('control: a flick then pointerup still puts the note away, and so does a tap on a plain note', () => {
    const first = showNote(true);
    act(() => {
      first.card.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      first.card.dispatchEvent(pointer('pointermove', { clientY: 160 }));
      first.card.dispatchEvent(pointer('pointerup', { clientY: 160 }));
    });
    expect(first.leaving()).toBe(true);
    for (const host of hosts.splice(0)) act(() => render(null, host));
    toasts.value = [];
    const second = showNote(false);
    act(() => {
      second.card.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
      second.card.dispatchEvent(pointer('pointerup', { clientY: 101 }));
    });
    expect(second.leaving()).toBe(true);
  });
});

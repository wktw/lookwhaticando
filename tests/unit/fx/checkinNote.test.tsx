// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { Toaster } from '@/ui/Toaster';
import { runToastAction, toastActions, toasts, type ToastItem } from '@/ui/toast';
import { checkInKey, showCheckInNote, showUncheckNote, uncheckKey } from '@/fx/checkin';
import { uncheckLine } from '@/fx/copy';

const live = () => toasts.value.filter((t) => !t.leaving);
const UNCHECK = uncheckLine('Walk', { refunded: 5 });

function checkIn(onUndo = () => void showUncheckNote({ habitId: 'h-walk', habitName: 'Walk', refunded: 5 })) {
  return showCheckInNote({ habitId: 'h-walk', habitName: 'Walk', coins: 5, note: 'Pudding opened one eye.', onUndo, onAddNote: () => undefined });
}

function expectOnlyUncheckNote() {
  const shown = live();
  expect(shown).toHaveLength(1);
  const t = shown[0] as ToastItem;
  expect(t.key).toBe(uncheckKey('h-walk'));
  expect(t.message).toBe(UNCHECK);
  expect(t.note).toBeUndefined();
  expect(t.silent).toBeFalsy();
  expect(toastActions(t)).toEqual([]);
}

afterEach(() => {
  toasts.value = [];
});

describe('the un-watering note', () => {
  it('Undo on the check-in note leaves exactly the "not watered after all" note', () => {
    const id = checkIn();
    const undo = toastActions(live()[0]!)[0]!;
    runToastAction(id, undo);
    expectOnlyUncheckNote();
    expect(live()[0]!.id).not.toBe(id);
  });

  it('un-watering from the ring while the check-in note is up replaces it, never merges into it', () => {
    const id = checkIn();
    showUncheckNote({ habitId: 'h-walk', habitName: 'Walk', refunded: 5 });
    expectOnlyUncheckNote();
    expect(toasts.value.find((t) => t.id === id)?.leaving).toBe(true);
  });

  it('watering again puts the un-watering note away', () => {
    showUncheckNote({ habitId: 'h-walk', habitName: 'Walk', refunded: 5 });
    checkIn();
    expect(live().map((t) => t.key)).toEqual([checkInKey('h-walk')]);
  });
});

describe('the Toaster', () => {
  let host: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    host = document.getElementById('app')!;
  });
  afterEach(() => {
    act(() => render(null, host));
    document.body.innerHTML = '';
  });

  it('pressing Undo shows the un-watering note and keeps it on screen', () => {
    act(() => render(<Toaster />, host));
    act(() => void checkIn());
    const undo = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Undo');
    expect(undo).toBeTruthy();
    act(() => undo!.click());
    expectOnlyUncheckNote();
    expect(document.body.textContent).toContain(UNCHECK);
  });
});

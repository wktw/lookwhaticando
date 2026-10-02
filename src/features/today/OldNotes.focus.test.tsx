// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { Sheet } from '@/ui/Sheet';
import { Moments } from '@/features/habits/detail/Parts';
import { selectHabitDetail } from '@/state/selectors';
import { readOnly, state } from '@/state/store';
import { toasts } from '@/ui/toast';
import * as logging from '@/domain/logging';
import { Game } from '../../../tests/unit/domain/game';
import { button, dialog, installDom, mount, useState_ } from '@/features/progress/testing';

const DAY = '2025-09-29';
let view: ReturnType<typeof mount> | null = null;
let id = '';
let openUpper: () => void;
let removeContext: () => void;
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const click = (el: HTMLElement | null) => act(() => { if (!el) throw new Error('Missing button'); el.click(); });
const heading = () => document.getElementById('detail-moments');

function NestedMoments() {
  const [upper, setUpper] = useState(false);
  const [context, setContext] = useState(true);
  openUpper = () => setUpper(true);
  removeContext = () => setContext(false);
  return <>
    <Sheet open title="Walk" onClose={() => undefined}>
      <button id="keep-reading">Keep reading</button>
      {context && <Moments vm={selectHabitDetail(id).value!} />}
    </Sheet>
    <Sheet open={upper} title="Another task" initialFocus="#upper-input" onClose={() => setUpper(false)}>
      <input id="upper-input" aria-label="Another task" />
    </Sheet>
  </>;
}

beforeAll(installDom);
beforeEach(() => {
  vi.useFakeTimers();
  const game = new Game({ start: DAY });
  id = game.addHabit();
  game.run((tx) => logging.setNote(tx, id, DAY, 'The first line.'));
  game.run((tx) => logging.starNote(tx, id, DAY, true));
  useState_(game.state);
  readOnly.value = false;
  toasts.value = [];
  view = mount(<NestedMoments />);
});
afterEach(() => {
  view?.unmount(); view = null;
  vi.restoreAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  readOnly.value = false;
  toasts.value = [];
  document.body.innerHTML = '';
  document.body.removeAttribute('tabindex');
});

function removeNote() {
  const edit = button(/Edit the note for Walk/)!;
  edit.focus();
  click(edit);
  click(button('Remove note'));
  click(button('Remove note', dialog()!));
  expect(state.value.logs[id]?.[DAY]).toBeUndefined();
  expect(edit.isConnected).toBe(false);
}

describe('old note removal inside the persistent Habit Detail sheet', () => {
  it.each([false, true])('returns to Moments after both children close (reverse callbacks: %s)', (reverse) => {
    const originalTimeout = globalThis.setTimeout;
    const exits: Array<() => void> = [];
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, ms, ...args) => originalTimeout(
      ms === 320 ? () => exits.push(() => fn(...args)) : fn, ms, ...args,
    ));
    removeNote();
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');
    tick(320);
    expect(exits).toHaveLength(2);
    for (const exit of reverse ? exits.reverse() : exits) act(exit);
    expect(document.querySelector('textarea, [role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(heading());
  });

  it('keeps a live parent control chosen during the closing animation', () => {
    removeNote();
    const chosen = document.getElementById('keep-reading')!;
    chosen.focus();
    tick(320);
    expect(document.activeElement).toBe(chosen);
  });

  it.each(['input', 'panel', 'body'])('does not reach behind a newer upper sheet (%s focused)', (where) => {
    removeNote();
    act(openUpper);
    const chosen = where === 'input' ? document.getElementById('upper-input')! : where === 'panel' ? document.getElementById('upper-input')!.closest<HTMLElement>('[role="dialog"]')! : document.body;
    if (where === 'body') document.body.tabIndex = -1;
    chosen.focus();
    tick(320);
    expect(document.activeElement).toBe(chosen);
  });

  it('does not revive a removed context when the children finish closing', () => {
    removeNote();
    act(removeContext);
    const chosen = document.getElementById('keep-reading')!;
    chosen.focus();
    tick(320);
    expect(heading()).toBeNull();
    expect(document.activeElement).toBe(chosen);
  });
});

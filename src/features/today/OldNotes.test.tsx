// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { NoteSheet, type NoteTarget } from './NoteSheet';
import { Calendar } from '@/features/progress/Calendar';
import { Moments } from '@/features/habits/detail/Parts';
import { selectHabitDetail } from '@/state/selectors';
import { readOnly, saveEpoch, setNote, state } from '@/state/store';
import { toasts } from '@/ui/toast';
import { archiveHabit } from '@/domain/habits';
import * as logging from '@/domain/logging';
import { Game } from '../../../tests/unit/domain/game';
import { button, click, dialog, installDom, mount, useState_, until } from '@/features/progress/testing';

const DAY = '2025-09-29';
let view: ReturnType<typeof mount> | null = null;
let id = '';
beforeAll(installDom);
beforeEach(() => {
  const g = new Game({ start: DAY });
  id = g.addHabit();
  g.run((tx) => logging.setNote(tx, id, DAY, 'The first line.'));
  g.run((tx) => logging.starNote(tx, id, DAY, true));
  g.advance();
  g.run((tx) => archiveHabit(tx, id));
  g.goTo('2026-09-29');
  useState_(g.state);
  readOnly.value = false;
  toasts.value = [];
});
afterEach(() => { view?.unmount(); view = null; readOnly.value = false; });
const target = (): NoteTarget => ({ habitId: id, habitName: 'Walk', date: DAY, note: state.value.logs[id]?.[DAY]?.note ?? null });
function Host() {
  const [t, setTarget] = useState<NoteTarget | null>(target);
  return <NoteSheet target={t} onClose={() => setTarget(null)} />;
}
const type = (text: string) => act(() => {
  const el = document.querySelector('textarea')!;
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('old note controls (WP-C6)', () => {
  it.each(['Moments', 'Calendar'])('opens the exact dated note from %s with a named keyboard button', async (from) => {
    view = mount(from === 'Moments' ? <Moments vm={selectHabitDetail(id).value!} /> : <Calendar habitId={null} month="2025-09" />);
    if (from === 'Calendar') await click(document.querySelector(`[data-date="${DAY}"]`));
    const edit = button(/Edit the note.*Walk.*September 29, 2025/);
    expect(edit).not.toBeNull();
    edit!.focus();
    await click(edit); // Native button activation is the same handler keyboard/AT invokes.
    await until(() => document.querySelector('textarea'), 'the dated note');
    expect(dialog()?.textContent).toContain('Monday, September 29, 2025');
    expect(document.querySelector('textarea')?.value).toBe('The first line.');
    await type('A corrected line.');
    await click(button('Save note'));
    expect(state.value.logs[id]?.[DAY]?.note).toBe('A corrected line.');
    expect(state.value.logs[id]?.['2026-09-29']).toBeUndefined();
  });

  it('asks before removing, starts with Keep editing focused, and clears the note-only day and its star', async () => {
    view = mount(<Host />);
    await click(button('Remove note'));
    expect(dialog()?.getAttribute('role')).toBe('alertdialog');
    expect(dialog()?.textContent).toContain('Daily and weekly copies');
    expect(dialog()?.textContent).toContain('backup files');
    await until(() => document.activeElement === button('Keep editing', dialog()!), 'safe initial focus');
    await click(button('Keep editing', dialog()!));
    expect(state.value.logs[id]?.[DAY]?.note).toBe('The first line.');
    await click(button('Remove note'));
    await click(button('Remove note', dialog()!));
    expect(state.value.logs[id]?.[DAY]).toBeUndefined();
  });

  it('clearing the field and Save uses the same removal confirmation', async () => {
    view = mount(<Host />);
    await type('');
    await click(button('Save note'));
    expect(dialog()?.getAttribute('role')).toBe('alertdialog');
    expect(state.value.logs[id]?.[DAY]?.note).toBe('The first line.');
  });

  it('optional Sunday Note removal is unchecked initially and redacts the matching reference', async () => {
    state.value = { ...state.value, inbox: [{ kind: 'weekly', id: 'w-old', weekStart: DAY, achieved: 1, expected: 1, stars: 1, showUpDays: 1, newFriends: [], plantsGrown: [], quote: { habitId: id, date: DAY, text: 'The first line.' } }] };
    view = mount(<Host />);
    await click(button('Remove note'));
    const option = dialog()!.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(option).not.toBeNull();
    expect(option!.checked).toBe(false);
    await click(option);
    await click(button('Remove note', dialog()!));
    expect(state.value.inbox[0]).not.toHaveProperty('quote');
  });

  it('another window owning the save keeps the draft open and does not say Noted', async () => {
    view = mount(<Host />);
    await type('Keep this draft.');
    await act(() => { readOnly.value = 'other-window'; });
    await click(button('Save note'));
    expect(document.querySelector('textarea')?.value).toBe('Keep this draft.');
    expect(state.value.logs[id]?.[DAY]?.note).toBe('The first line.');
    expect(toasts.value).toEqual([]);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('This window can’t change the save right now.');
  });

  it('a replacement save cannot receive the old draft even if it has the same habit id', async () => {
    view = mount(<Host />);
    await type('Old draft.');
    await act(() => {
      state.value = { ...state.value, logs: { [id]: { [DAY]: { kind: 'log', count: 0, note: 'Imported line.' } } } };
      saveEpoch.value++;
    });
    await click(button('Save note'));
    expect(state.value.logs[id]?.[DAY]?.note).toBe('Imported line.');
    expect(document.querySelector('textarea')?.value).toBe('Old draft.');
    expect(toasts.value).toEqual([]);
  });

  it('keeps a full composed emoji at the 280-grapheme cap without the browser code-unit cap', async () => {
    view = mount(<Host />);
    const text = '👩🏽‍🌾'.repeat(280);
    expect(document.querySelector('textarea')!.getAttribute('maxlength')).not.toBe('280');
    await type(text + 'x');
    await click(button('Save note'));
    expect(state.value.logs[id]?.[DAY]?.note).toBe(text);
  });

  it('updates aggregate calendar dots and accessible names after note-only edits while mounted', async () => {
    view = mount(<Calendar habitId={null} month="2025-09" />);
    const day = () => document.querySelector(`[data-date="${DAY}"]`)!;
    const markedName = day().getAttribute('aria-label');
    const markedChildren = day().children.length;
    expect(markedName).toContain('a note');
    await act(() => { setNote(id, DAY, ''); });
    expect(day().getAttribute('aria-label')).not.toContain('a note');
    expect(day().children.length).toBe(markedChildren - 1);
    await act(() => { setNote(id, DAY, 'A new line.'); });
    expect(day().getAttribute('aria-label')).toBe(markedName);
    expect(day().children.length).toBe(markedChildren);
  });
});

/**
 * The calendar (DESIGN §9.2): a month of day glyphs (a flower sized by how full the day was, a moon
 * for a rest or a day off, a sprout for the tiny version, a leaf for a pause; an empty day is just
 * its date). All habits, or one. Tap a day for its notes; one habit's older days can be fixed as
 * history ("Fixes history. No coins for this one."), while the last 6 days belong to the week strip
 * on Today. Also the history calendar in Habit Detail.
 *
 * Accessibility: a real table with weekday column headers; each day is a button named like the week
 * strip ("Saturday, September 27, 3 of 5 watered"); one tab stop, arrow keys move by day and week,
 * Home and End jump to the month's ends.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DayGlyph } from '@/art/progress';
import { CHECKIN_TOASTS, NOTE_COPY, PROGRESS_LINES, TODAY_LINES, fillLine } from '@/catalog/lines';
import { longDateLabel, num } from '@/catalog/format';
import { WEEKDAY_NAMES, addDays, monthDayLabel, shortDateLabel, weekdayOrder } from '@/domain/dates';
import { dayCompletion, trackingOf } from '@/domain/consistency';
import { selectCalendarMonth, type CalendarCell } from '@/state/selectors';
import { editHistory, setStartedOn, state, today } from '@/state/store';
import { handOff } from '@/app/handoff';
import type { DateKey } from '@/state/types';
import { announce } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { haptic } from '@/fx/haptics';
import { cx } from '@/ui/cx';
import { NoteSheet, noteDateLabel, type NoteTarget } from '@/features/today/NoteSheet';
import { PROGRESS_UI, dayAria, stateWord } from './copy';
import s from './Calendar.module.css';

const C = PROGRESS_UI.calendar;

export interface CalendarProps {
  /** One habit, or null for all habits. */
  habitId: string | null;
  /** The month shown first ('YYYY-MM'); defaults to this month. */
  month?: string;
  /** The heading level of the month label (the section's heading is above it). */
  headingLevel?: 'h3' | 'h4';
  /** A prefix for ids, so two calendars can share a page. */
  idPrefix?: string;
  class?: string;
}

export function Calendar({ habitId, month: initial, headingLevel: H = 'h3', idPrefix = 'cal', class: cls }: CalendarProps) {
  const [month, setMonth] = useState(initial ?? today.value.slice(0, 7));
  const vm = useStable(selectCalendarMonth(habitId, month).value);
  const cells = useMemo(() => vm.weeks.flat().filter((c): c is CalendarCell => c !== null), [vm]);
  const [selected, setSelected] = useState<DateKey | null>(null);
  const [focus, setFocus] = useState<DateKey | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const moveFocus = useRef(false);
  const s0 = state.value;
  const habit = habitId ? s0.habits.find((h) => h.id === habitId) ?? null : null;

  // A new month or habit: keep the selection only if it is still on the page.
  useEffect(() => {
    if (selected && !cells.some((c) => c.date === selected)) setSelected(null);
  }, [month, habitId]);

  // The roving tab stop: the selected day, else today, else the month's last past day.
  const pastCells = cells.filter((c) => c.state !== 'future');
  const stop = focus && cells.some((c) => c.date === focus && c.state !== 'future') ? focus : selected && pastCells.some((c) => c.date === selected) ? selected : (pastCells.find((c) => c.isToday) ?? pastCells[pastCells.length - 1])?.date ?? null;

  useEffect(() => {
    if (!moveFocus.current || !stop) return;
    moveFocus.current = false;
    tableRef.current?.querySelector<HTMLButtonElement>(`[data-date="${stop}"]`)?.focus();
  }, [stop, month]);

  const agg = useMemo(() => {
    if (habitId) return null;
    const t = trackingOf(s0);
    const m = new Map<DateKey, { done: number; due: number }>();
    for (const c of cells) if (c.state !== 'future' && c.state !== 'before-start') m.set(c.date, dayCompletion(t, c.date, today.value));
    return m;
  }, [vm, habitId]);

  // All habits: a day with any habit's note carries the note mark too (one habit's cells have it).
  const notesOn = useMemo(() => {
    if (habitId) return null;
    const set = new Set<DateKey>();
    for (const h of s0.habits) {
      const logs = s0.logs[h.id];
      if (!logs) continue;
      for (const c of cells) if (logs[c.date]?.note) set.add(c.date);
    }
    return set;
  }, [vm, habitId, s0.logs, s0.habits]);

  const go = (to: string | null) => {
    if (!to) return;
    setMonth(to);
    setFocus(null);
  };

  const onKey = (e: KeyboardEvent, date: DateKey) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: DateKey | null = null;
    if (e.key in step) target = addDays(date, step[e.key]!);
    else if (e.key === 'Home') target = `${vm.month}-01`;
    else if (e.key === 'End') target = pastCells[pastCells.length - 1]?.date ?? null;
    else return;
    e.preventDefault();
    if (!target || target > today.value) return;
    moveFocus.current = true;
    const tm = target.slice(0, 7);
    if (tm !== vm.month) {
      if (tm > vm.month && !vm.next) return;
      setMonth(tm);
    }
    setFocus(target);
  };

  const sel = selected ? cells.find((c) => c.date === selected) ?? null : null;
  const cols = weekdayOrder(s0.settings.weekStart);
  const labelId = `${idPrefix}-month`;

  return (
    <div class={cx(s.calendar, cls)}>
      <div class={s.nav}>
        <IconButton icon="chevron-left" label={C.prev} onClick={() => go(vm.prev)} />
        <H id={labelId} class={s.month} aria-live="polite">
          {vm.label}
        </H>
        <IconButton icon="chevron-right" label={C.next} onClick={() => go(vm.next)} disabled={!vm.next} />
      </div>
      <div class={s.gridScroll}>
      <table ref={tableRef} class={s.grid} aria-labelledby={labelId}>
        <thead>
          <tr>
            {cols.map((d, i) => (
              <th key={d} scope="col" abbr={WEEKDAY_NAMES[d]}>
                <span aria-hidden="true">{vm.weekdays[i]}</span>
                <span class="sr-only">{WEEKDAY_NAMES[d]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vm.weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((c, di) =>
                c === null ? (
                  <td key={di} />
                ) : (
                  <td key={c.date}>
                    <DayButton
                      cell={c}
                      note={notesOn ? notesOn.has(c.date) : !!c.note}
                      tab={c.date === stop}
                      selected={c.date === selected}
                      label={dayAria({ ...c, note: notesOn ? notesOn.has(c.date) : !!c.note }, agg?.get(c.date) ?? null, habit?.unit ?? null)}
                      onPick={() => {
                        setSelected(c.date === selected ? null : c.date);
                        setFocus(c.date);
                        haptic('tick');
                      }}
                      onKey={(e) => onKey(e, c.date)}
                    />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {sel && <DayPanel cell={sel} habitId={habitId} agg={agg?.get(sel.date) ?? null} idPrefix={idPrefix} Heading={H === 'h3' ? 'h4' : 'h5'} />}
    </div>
  );
}

function DayButton({ cell, note, tab, selected, label, onPick, onKey }: { cell: CalendarCell; note: boolean; tab: boolean; selected: boolean; label: string; onPick: () => void; onKey: (e: KeyboardEvent) => void }) {
  const future = cell.state === 'future';
  // Nothing watered yet (all habits, today at 0) is a quiet day, not a bud.
  const empty = cell.state === 'partial' && (cell.fraction ?? 0) <= 0;
  const drawn = !empty && cell.state !== 'none' && cell.state !== 'unscheduled' && cell.state !== 'future' && cell.state !== 'before-start' && cell.state !== 'archived';
  return (
    <button
      type="button"
      class={cx(s.day, cell.isToday && s.today, selected && s.selected, !drawn && s.bare, future && s.future)}
      data-date={cell.date}
      data-state={cell.state}
      tabIndex={tab ? 0 : -1}
      aria-label={label}
      aria-pressed={selected}
      aria-current={cell.isToday ? 'date' : undefined}
      disabled={future}
      onClick={onPick}
      onKeyDown={onKey}
    >
      {drawn && <DayGlyph state={cell.state} fraction={cell.fraction} size={30} class={s.glyph} />}
      <span class={s.num} aria-hidden="true">
        {cell.day}
      </span>
      {note && <span class={s.noteDot} aria-hidden="true" />}
    </button>
  );
}

/** What a tapped day shows: its notes, and for one habit what can be done about it. */
function DayPanel({ cell, habitId, agg, idPrefix, Heading }: { cell: CalendarCell; habitId: string | null; agg: { done: number; due: number } | null; idPrefix: string; Heading: 'h4' | 'h5' }) {
  const [note, setNoteTarget] = useState<NoteTarget | null>(null);
  const panel = useRef<HTMLElement>(null);
  const s0 = state.value;
  const date = cell.date;
  const title = longDateLabel(date);
  const notes = s0.habits
    .filter((h) => (habitId ? h.id === habitId : true))
    .map((h) => ({ id: h.id, name: h.name, note: s0.logs[h.id]?.[date]?.note }))
    .filter((n): n is { id: string; name: string; note: string } => !!n.note);
  const habit = habitId ? s0.habits.find((h) => h.id === habitId) ?? null : null;
  const summary = habit ? stateWord(cell.state, cell.count ?? 0, cell.target ?? 1, habit.unit ?? null) : agg && agg.due > 0 && agg.done > 0 ? fillLine(TODAY_LINES.dayAria, { done: num(agg.done), total: num(agg.due) }) : null;
  const panelId = `${idPrefix}-day`;
  return (
    <section ref={panel} class={s.panel} aria-labelledby={panelId}>
      <Heading id={panelId} class={s.panelTitle}>
        {title}
      </Heading>
      {summary && <p class={s.summary}>{capitalFirst(summary)}</p>}
      {notes.length > 0 ? (
        <ul class={s.notes}>
          {notes.map((n) => (
            <li key={n.id}>
              {!habitId && <span class={s.noteHabit}>{n.name}</span>}
              <q class={s.noteText}>{n.note}</q>
              <Button
                variant="quiet"
                size="sm"
                aria-label={fillLine(NOTE_COPY.editLabel, { habit: n.name, date: noteDateLabel(date) })}
                onClick={() => setNoteTarget({ habitId: n.id, habitName: n.name, date, note: n.note })}
              >{NOTE_COPY.edit}</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p class={s.quiet}>{fillLine(PROGRESS_LINES.calendarNoNotes, { date: monthDayLabel(date) })}</p>
      )}
      {habit && <DayEdit cell={cell} habitId={habit.id} habitName={habit.name} />}
      <NoteSheet target={note} onClose={() => setNoteTarget(null)} onFocusLost={() => panel.current?.parentElement?.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus({ preventScroll: true })} />
    </section>
  );
}

/** Keeps the last month view while its content is the same, so a coin or a pet moving elsewhere doesn't redo the month. */
function useStable<T>(v: T): T {
  const last = useRef<{ key: string; v: T } | null>(null);
  const key = JSON.stringify(v);
  if (!last.current || last.current.key !== key) last.current = { key, v };
  return last.current.v;
}

const capitalFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function DayEdit({ cell, habitId, habitName }: { cell: CalendarCell; habitId: string; habitName: string }) {
  const date = cell.date;
  if (cell.edit === 'window') {
    return (
      <div class={s.edit}>
        <p class={s.quiet}>{C.windowNote}</p>
        {/* A link, so it reads and opens as one; the hand-off closes Habit Detail, selects the day on
            Today and puts focus on this habit's ring there (WP-C7). */}
        <a
          class={s.link}
          href="#/today"
          onClick={(e) => {
            e.preventDefault();
            handOff({ target: 'today', entityId: habitId, date });
          }}
        >
          {C.openToday}
        </a>
      </div>
    );
  }
  if (cell.edit === 'start-earlier') {
    return (
      <div class={s.edit}>
        <p class={s.body}>{fillLine(TODAY_LINES.startEarlier, { habit: habitName, date: shortDateLabel(date) })}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setStartedOn(habitId, date);
            haptic('light');
            announce(fillLine(TODAY_LINES.startFrom, { date: monthDayLabel(date) }));
          }}
        >
          {fillLine(TODAY_LINES.startFrom, { date: monthDayLabel(date) })}
        </Button>
      </div>
    );
  }
  const done = cell.state === 'done' || cell.state === 'tiny';
  const allowed = done ? cell.history?.canRemove : cell.history?.canAdd;
  if (!allowed) {
    const reason = cell.history?.reason;
    const line = reason === 'open-period' ? C.periodLocked : reason === 'archived' || reason === 'before-start' ? C.outsideDates : null;
    return line ? <p class={s.quiet}>{line}</p> : null;
  }
  return (
    <div class={s.edit}>
      <Button
        variant={done ? 'quiet' : 'secondary'}
        size="sm"
        icon={done ? undefined : 'watering-can'}
        onClick={() => {
          const ok = editHistory(habitId, date, !done);
          if (!ok) {
            toast({ message: C.refused, key: 'calendar-history' });
            return;
          }
          haptic(done ? 'light' : 'success');
          toast({
            message: done ? fillLine(CHECKIN_TOASTS.uncheckedNoCoins, { habit: habitName }) : fillLine(CHECKIN_TOASTS.history, { habit: habitName, date: monthDayLabel(date) }),
            key: 'calendar-history',
          });
        }}
      >
        {done ? C.unwater : fillLine(C.water, { date: monthDayLabel(date) })}
      </Button>
      <p class={s.fine}>{TODAY_LINES.historyNote}</p>
    </div>
  );
}

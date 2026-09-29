/**
 * You › Habits (DESIGN §9.5): every habit on the sill in her order, the archived ones with
 * "Bring it back", and "Add a habit". "Arrange" turns the list into a reorderable one: drag a
 * row by its grip, use the arrow keys on the grip (Home and End too), or the up and down buttons
 * (for VoiceOver on a phone, where there are no arrow keys). Each move is saved at once
 * (`reorderHabits`) and read out ("Walk, 2 of 5.").
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { DATA, EMPTY, TODAY_LINES, fillLine } from '@/catalog/lines';
import { scheduleText } from '@/catalog/format';
import { HabitIcon } from '@/art/habit-icons';
import { Icon } from '@/art/icons';
import { isPausedOn } from '@/domain/pauses';
import { openHabitEditor } from '@/features/habits/open';
import { reorderHabits, restoreHabit, state, today } from '@/state/store';
import type { Habit } from '@/state/types';
import { announce } from '@/ui/announce';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { prefersReducedMotion } from '@/fx/motion';
import { haptic } from '@/fx/haptics';
import { Group } from './parts';
import { HABITS_COPY, YOU, movedLine } from './copy';
import { keyStep, moveBy, moveTo, slotAt } from './reorder';
import s from './You.module.css';

const byOrder = (a: Habit, b: Habit) => a.order - b.order;

function habitMeta(h: Habit, weekStart: 0 | 1, day: string): string {
  const rule = h.rules[h.rules.length - 1];
  const parts = [rule ? scheduleText(rule.schedule, weekStart) : null, TODAY_LINES.blocks[h.timeOfDay]];
  if (isPausedOn(h.pauses, day)) parts.push(HABITS_COPY.resting);
  return parts.filter(Boolean).join(' · ');
}

function Tile({ habit }: { habit: Habit }) {
  return (
    <span class={cx(s.tile, toneClass(habit.color))} aria-hidden="true">
      <HabitIcon id={habit.icon} size={26} tone={habit.color} />
    </span>
  );
}

interface Drag {
  id: string;
  pointerId: number;
  startY: number;
  /** The row's layout top when the drag began (offsetTop: transforms don't move it). */
  startTop: number;
  y: number;
}

function ArrangeList({ habits }: { habits: Habit[] }) {
  const [order, setOrder] = useState<readonly string[]>(() => habits.map((h) => h.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const drag = useRef<Drag | null>(null);
  const focusAfter = useRef<{ id: string; which: 'grip' | 'up' | 'down' } | null>(null);
  const tops = useRef(new Map<string, number>());
  const byId = new Map(habits.map((h) => [h.id, h]));
  // A habit added or archived elsewhere while arranging: follow the save.
  const ids = order.filter((id) => byId.has(id)).concat(habits.filter((h) => !order.includes(h.id)).map((h) => h.id));

  // FLIP: rows that changed place glide there (the dragged row follows the finger instead).
  useLayoutEffect(() => {
    const quick = prefersReducedMotion();
    for (const [id, el] of rows.current) {
      const before = tops.current.get(id);
      const now = el.offsetTop;
      tops.current.set(id, now);
      if (before === undefined || before === now || quick) continue;
      if (drag.current?.id === id) continue;
      el.animate?.([{ transform: `translateY(${before - now}px)` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    const d = drag.current;
    if (d) {
      const el = rows.current.get(d.id);
      if (el) el.style.transform = `translateY(${d.y - d.startY - (el.offsetTop - d.startTop)}px)`;
    }
    const f = focusAfter.current;
    if (f) {
      focusAfter.current = null;
      const el = rows.current.get(f.id);
      const target = el?.querySelector<HTMLButtonElement>(`[data-move="${f.which}"]:not([disabled])`) ?? el?.querySelector<HTMLButtonElement>('[data-move="grip"]');
      target?.focus({ preventScroll: false });
    }
  });

  const commit = (next: readonly string[], id: string, focus?: 'grip' | 'up' | 'down') => {
    if (next === ids) return;
    setOrder(next);
    reorderHabits([...next]);
    haptic('tick');
    const habit = byId.get(id);
    if (habit) announce(movedLine(habit.name, next.indexOf(id) + 1, next.length));
    if (focus) focusAfter.current = { id, which: focus };
  };

  const onPointerDown = (id: string) => (e: PointerEvent) => {
    if (e.button !== 0 || drag.current) return;
    const el = rows.current.get(id);
    if (!el) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id, pointerId: e.pointerId, startY: e.clientY, startTop: el.offsetTop, y: e.clientY };
    setDragging(id);
    haptic('light');
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.y = e.clientY;
    const el = rows.current.get(d.id);
    if (!el) return;
    el.style.transform = `translateY(${d.y - d.startY - (el.offsetTop - d.startTop)}px)`;
    const center = d.startTop + (d.y - d.startY) + el.offsetHeight / 2;
    const current = ids.indexOf(d.id);
    const mids = ids.map((id) => {
      const r = rows.current.get(id);
      return r ? r.offsetTop + r.offsetHeight / 2 : 0;
    });
    const slot = slotAt(center, mids, current);
    if (slot !== current) {
      setOrder(moveTo(ids, d.id, slot));
      haptic('tick');
    }
  };

  const endDrag = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    setDragging(null);
    const el = rows.current.get(d.id);
    if (el) {
      const from = el.style.transform;
      el.style.transform = '';
      if (from && !prefersReducedMotion()) el.animate?.([{ transform: from }, { transform: 'none' }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    const saved = [...habits].sort(byOrder).map((h) => h.id);
    if (saved.join() !== ids.join()) commit(ids, d.id);
  };

  return (
    <ol class={s.habits} aria-describedby="you-arrange-hint">
      {ids.map((id, i) => {
        const h = byId.get(id)!;
        return (
          <li
            key={id}
            class={cx(s.habit, dragging === id && s.dragging)}
            ref={(el) => {
              if (el) rows.current.set(id, el);
              else rows.current.delete(id);
            }}
          >
            <Tile habit={h} />
            <span class={s.habitText}>
              <span class={s.habitName}>{h.name}</span>
            </span>
            <span class={s.stepButtons}>
              <IconButton
                icon="chevron-up"
                label={fillLine(HABITS_COPY.moveUp, { habit: h.name })}
                size="md"
                disabled={i === 0}
                data-move="up"
                onClick={() => commit(moveBy(ids, id, -1), id, 'up')}
              />
              <IconButton
                icon="chevron-down"
                label={fillLine(HABITS_COPY.moveDown, { habit: h.name })}
                size="md"
                disabled={i === ids.length - 1}
                data-move="down"
                onClick={() => commit(moveBy(ids, id, 1), id, 'down')}
              />
            </span>
            <button
              type="button"
              class={s.grip}
              data-move="grip"
              aria-label={fillLine(HABITS_COPY.move, { habit: h.name })}
              aria-describedby="you-arrange-hint"
              onPointerDown={onPointerDown(id)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => {
                const step = keyStep(e.key);
                if (step === null) return;
                e.preventDefault();
                commit(moveBy(ids, id, step), id, 'grip');
              }}
            >
              <Icon name="grip" size={22} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function HabitList({ habits }: { habits: Habit[] }) {
  const weekStart = state.value.settings.weekStart;
  const day = today.value;
  return (
    <ul class={s.habits}>
      {habits.map((h) => (
        <li key={h.id} class={s.habit}>
          <button type="button" class={s.habitMain} aria-label={fillLine(HABITS_COPY.edit, { habit: h.name })} onClick={() => openHabitEditor({ id: h.id })}>
            <Tile habit={h} />
            <span class={s.habitText}>
              <span class={s.habitName}>{h.name}</span>
              <span class={s.habitMeta}>{habitMeta(h, weekStart, day)}</span>
            </span>
            <span class={s.chev} aria-hidden="true">
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function bringBack(h: Habit) {
  restoreHabit(h.id);
  toast({ key: `restored-${h.id}`, message: fillLine(DATA.restored, { habit: h.name }), tone: 'sage' });
}

export function HabitsSection() {
  const all = state.value.habits;
  const live = all.filter((h) => h.archivedOn === undefined).sort(byOrder);
  const archived = all.filter((h) => h.archivedOn !== undefined).sort(byOrder);
  const [arranging, setArranging] = useState(false);
  const canArrange = live.length > 1;
  const on = arranging && canArrange;

  return (
    <Group
      id="habits"
      title={YOU.sections.habits}
      action={
        canArrange && (
          <Button variant="quiet" size="sm" aria-pressed={on} onClick={() => setArranging(!on)}>
            {on ? HABITS_COPY.done : HABITS_COPY.arrange}
          </Button>
        )
      }
      footer={on ? <span id="you-arrange-hint">{HABITS_COPY.moveHint}</span> : archived.length === 0 ? EMPTY.archived : undefined}
    >
      {live.length === 0 ? <p class={s.empty}>{EMPTY.today}</p> : on ? <ArrangeList habits={live} /> : <HabitList habits={live} />}
      {!on && (
        <div class={s.addRow}>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => openHabitEditor()}>
            {EMPTY.addHabit}
          </Button>
        </div>
      )}
      {!on && archived.length > 0 && (
        <>
          <h3 class={s.subhead}>{HABITS_COPY.archived}</h3>
          <ul class={s.archivedList}>
            {archived.map((h) => (
              <li key={h.id} class={s.habit}>
                <Tile habit={h} />
                <span class={s.habitText}>
                  <span class={s.habitName}>{h.name}</span>
                </span>
                <Button variant="secondary" size="sm" aria-label={fillLine(HABITS_COPY.bringBackLabel, { habit: h.name })} onClick={() => bringBack(h)}>
                  {HABITS_COPY.bringBack}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Group>
  );
}

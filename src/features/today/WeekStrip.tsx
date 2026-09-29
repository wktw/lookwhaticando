/**
 * The week strip (DESIGN §9.1): the last 7 app days. A day is a flower sized by how full it was, a
 * moon for a rest or a day off, and just the date for a day with nothing. Today has a dot. It is a
 * radiogroup with roving focus: arrows move the selection, and picking a past day lets her log it
 * (the "Logging for Sat, Sep 27" banner follows).
 */
import { useRef } from 'preact/hooks';
import { DayGlyph } from '@/art/progress';
import { weekDayAria } from '@/catalog/format';
import type { DateKey } from '@/state/types';
import type { WeekStripDay } from '@/state/selectors';
import { cx } from '@/ui/cx';
import { TODAY_COPY } from './copy';
import s from './WeekStrip.module.css';

export interface WeekStripProps {
  days: readonly WeekStripDay[];
  onSelect: (date: DateKey) => void;
}

/** What a day shows: its flower (or moon, sprout, bud), or only its date. */
export function dayMark(d: Pick<WeekStripDay, 'state' | 'offDay'>): 'glyph' | 'date' {
  if (d.offDay) return 'glyph';
  return d.state === 'done' || d.state === 'partial' || d.state === 'tiny' || d.state === 'rest' || d.state === 'off' ? 'glyph' : 'date';
}

export function WeekStrip({ days, onSelect }: WeekStripProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(0, days.findIndex((d) => d.selected));

  const move = (to: number) => {
    const i = Math.max(0, Math.min(days.length - 1, to));
    onSelect(days[i]!.date);
    refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: days.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    move(next);
  };

  return (
    <div class={s.strip} role="radiogroup" aria-label={TODAY_COPY.week}>
      {days.map((d, i) => {
        const mark = dayMark(d);
        return (
          <button
            key={d.date}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={d.selected}
            aria-label={weekDayAria(d)}
            tabIndex={i === selected ? 0 : -1}
            class={cx(s.day, d.selected && s.selected, d.isToday && s.today, d.weekStart && s.weekStart)}
            onClick={() => move(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span class={s.letter} aria-hidden="true">
              {d.letter}
            </span>
            <span class={s.mark} aria-hidden="true">
              {mark === 'glyph' ? <DayGlyph state={d.offDay ? 'off' : d.state} fraction={d.fraction} size={26} /> : <span class={s.num}>{d.day}</span>}
            </span>
            <span class={s.dot} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

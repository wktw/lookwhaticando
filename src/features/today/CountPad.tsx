/**
 * The number pad for a count habit (DESIGN §5.2), opened by a long press on its ring: the water
 * level in words, − and + by the step, quick adds (+1, +step, +2×step), the tiny version, and Done.
 * Over-target values are allowed ("10 / 8") and earn nothing extra.
 *
 * The pad counts the day it was opened for, and on any day but today its title says which
 * ("Drink water for Saturday"), so the day is plain even after Today has gone back to today.
 */
import { CHECKIN_TOASTS, fillLine } from '@/catalog/lines';
import { forDayLabel, num } from '@/catalog/format';
import type { DateKey } from '@/state/types';
import type { HabitCardVM } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { Stepper } from '@/ui/Stepper';
import { Button } from '@/ui/Button';
import { CheckRingArt } from '@/ui/CheckRing';
import { waterLevel } from '@/ui/checkRing';
import { TODAY_COPY } from './copy';
import s from './TodaySheets.module.css';

export interface CountPadProps {
  /** The habit on the pad's day (null: closed). */
  card: HabitCardVM | null;
  /** The day the pad counts, and whether it is before today (the title then names it). */
  date: DateKey;
  past: boolean;
  onCount: (card: HabitCardVM, count: number) => void;
  onTiny: (card: HabitCardVM) => void;
  onClose: () => void;
}

/** The quick adds: +1, +step, +2×step, without repeats. */
export function quickAdds(step: number): number[] {
  return [...new Set([1, step, step * 2])].filter((n) => n > 0);
}

export function CountPad({ card, date, past, onCount, onTiny, onClose }: CountPadProps) {
  const c = card;
  const name = c ? (past ? forDayLabel(c.name, date) : c.name) : '';
  return (
    <Sheet open={c !== null} onClose={onClose} title={name} detents={['content']} size="sm" initialFocus="[data-autofocus]">
      {c && (
        <div class={s.pad}>
          <div class={s.padLevel}>
            <CheckRingArt level={waterLevel({ count: c.count, target: c.target })} mark={c.count >= c.target ? 'check' : null} tone={c.color} size={64} full={c.count >= c.target} />
            <p class={s.padCount} aria-live="polite">
              {fillLine(CHECKIN_TOASTS.progress, { count: num(c.count), target: num(c.target), unit: c.unit ?? '' }).trim()}
            </p>
          </div>
          <Stepper value={c.count} onChange={(v) => onCount(c, v)} label={fillLine(TODAY_COPY.howMany, { habit: name })} min={0} max={100_000} step={c.step} unit={c.unit ?? undefined} />
          <div class={s.padQuick}>
            {quickAdds(c.step).map((n, i) => (
              <Button key={n} variant="tint" tone={c.color} onClick={() => onCount(c, c.count + n)} {...(i === 0 ? { 'data-autofocus': '' } : {})}>
                +{num(n)}
              </Button>
            ))}
          </div>
          <div class={s.padFoot}>
            {c.tinyLabel && c.canTiny && (
              <Button variant="secondary" icon="tiny" onClick={() => onTiny(c)}>
                {TODAY_COPY.pad.tiny}
              </Button>
            )}
            <Button onClick={onClose}>{TODAY_COPY.pad.done}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

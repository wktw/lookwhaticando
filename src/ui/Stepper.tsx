import { useEffect, useRef } from 'preact/hooks';
import { cx } from './cx';
import { keyboardClick, onInterrupt } from './gesture';
import s from './Stepper.module.css';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name ("Glasses per day"); buttons read "Decrease …" / "Increase …". */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Small unit after the number ("glasses"). */
  unit?: string;
  /** Show the label above the control. */
  showLabel?: boolean;
  class?: string;
}

const HOLD_DELAY = 420;
const HOLD_EVERY = 90;

/** − value + on a paper strip, with press-and-hold repeat. */
export function Stepper({ value, onChange, label, min = 0, max = 99, step = 1, unit, showLabel, class: cls }: StepperProps) {
  const latest = useRef({ value, onChange, min, max, step });
  latest.current = { value, onChange, min, max, step };
  const timer = useRef<number>(0);
  /**
   * A pointer press counts on pointerdown, so the click it ends with is not another step. The
   * suppression belongs to that one press, on that one button: a press that is cancelled, released
   * elsewhere or disables its button (at min or max) sends no click, and must never eat a later
   * keyboard activation, of this button or the other one. (The click's own pointerId is not
   * compared: engines disagree on what a click carries.)
   */
  const pressed = useRef<1 | -1 | null>(null);

  const nudge = (dir: 1 | -1) => {
    const { value: v, onChange: set, min: lo, max: hi, step: st } = latest.current;
    const next = Math.min(hi, Math.max(lo, v + dir * st));
    if (next === v) return false;
    latest.current.value = next;
    set(next);
    return true;
  };

  /** Stops watching for the window losing focus mid-hold. */
  const unwatch = useRef<(() => void) | null>(null);

  const stopHold = () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
    unwatch.current?.();
    unwatch.current = null;
  };
  useEffect(() => stopHold, []);

  const startHold = (dir: 1 | -1) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    pressed.current = dir;
    nudge(dir);
    stopHold();
    // A hold that loses the window (a call, an app switch) may never see its pointerup: it stops
    // repeating. Its click, if one still comes, is still this press's.
    unwatch.current = onInterrupt(stopHold);
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => {
        if (!nudge(dir)) stopHold();
      }, HOLD_EVERY);
    }, HOLD_DELAY);
  };

  /** The press was cancelled: no click follows, so nothing is left to suppress. */
  const abort = () => {
    stopHold();
    pressed.current = null;
  };

  /** Keyboard activation (pointer presses are handled on pointerdown). */
  const onClick = (dir: 1 | -1) => (e: MouseEvent) => {
    const press = pressed.current;
    pressed.current = null;
    if (press === dir && !keyboardClick(e)) return;
    nudge(dir);
  };

  const button = (dir: 1 | -1) => (
    <button
      type="button"
      class={s.btn}
      aria-label={`${dir < 0 ? 'Decrease' : 'Increase'} ${label}`}
      disabled={dir < 0 ? value <= min : value >= max}
      onPointerDown={startHold(dir)}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={abort}
      onClick={onClick(dir)}
    >
      <span class={s.face}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path d={dir < 0 ? 'M6 12h12' : 'M6 12h12M12 6v12'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span>
    </button>
  );

  return (
    <div class={cx(s.wrap, cls)}>
      {showLabel && <span class={s.label}>{label}</span>}
      <div class={s.stepper} role="group" aria-label={label}>
        {button(-1)}
        <output class={s.value} aria-live="polite">
          <span key={value} class={s.num}>
            {value}
          </span>
          {unit && <span class={s.unit}>{unit}</span>}
        </output>
        {button(1)}
      </div>
    </div>
  );
}

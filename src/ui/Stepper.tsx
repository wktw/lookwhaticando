import { useEffect, useRef } from 'preact/hooks';
import { cx } from './cx';
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
  const fromPointer = useRef(false);

  const nudge = (dir: 1 | -1) => {
    const { value: v, onChange: set, min: lo, max: hi, step: st } = latest.current;
    const next = Math.min(hi, Math.max(lo, v + dir * st));
    if (next === v) return false;
    latest.current.value = next;
    set(next);
    return true;
  };

  const stopHold = () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
  };
  useEffect(() => stopHold, []);

  const startHold = (dir: 1 | -1) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    fromPointer.current = true;
    nudge(dir);
    stopHold();
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(() => {
        if (!nudge(dir)) stopHold();
      }, HOLD_EVERY);
    }, HOLD_DELAY);
  };

  /** Keyboard activation (pointer presses are handled on pointerdown). */
  const onClick = (dir: 1 | -1) => () => {
    if (fromPointer.current) {
      fromPointer.current = false;
      return;
    }
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
      onPointerCancel={stopHold}
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

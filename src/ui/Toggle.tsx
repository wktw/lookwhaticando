import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ComponentChildren;
  description?: ComponentChildren;
  /** Keep the label for screen readers only (e.g. inside a ListRow that shows it). */
  hideLabel?: boolean;
  disabled?: boolean;
  tone?: Tone;
  class?: string;
}

/** Marks the input as a native switch: Safari 17.4+ answers it with a real system haptic. */
function markSwitch(el: HTMLInputElement | null) {
  el?.setAttribute('switch', '');
}

/** iOS-style switch built on a real checkbox (role="switch"), so forms, labels and AT all just work. */
export function Toggle({ checked, onChange, label, description, hideLabel, disabled, tone = 'sage', class: cls }: ToggleProps) {
  const descId = useId();
  return (
    <label class={cx(s.row, hideLabel && s.bare, disabled && s.disabled, toneClass(tone), cls)}>
      <span class={cx(s.text, hideLabel && 'sr-only')}>
        <span class={s.label}>{label}</span>
        {description && (
          <span class={s.desc} id={descId}>
            {description}
          </span>
        )}
      </span>
      <span class={s.switch}>
        <input
          ref={markSwitch}
          class={s.input}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? descId : undefined}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
        <span class={s.track} aria-hidden="true">
          <span class={s.thumb} />
        </span>
      </span>
    </label>
  );
}

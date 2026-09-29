/**
 * A set of choices as tiles or chips: a real radiogroup with roving focus (arrows, Home, End), each
 * choice a button that says what it is. Used for the icon, the colour, the plant and pot, how often,
 * the habit to follow and who keeps it company.
 */
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { cx } from '@/ui/cx';
import s from './HabitEditor.module.css';

export interface RadioTile<T extends string> {
  value: T;
  /** The accessible name (and the visible label unless `hideLabel`). */
  label: string;
  art?: ComponentChildren;
  /** A second line (a pet's current habit, a locked plant's series). */
  hint?: string;
  /** Shown but not choosable (a plant still in a capsule). */
  disabled?: boolean;
}

export interface RadioTilesProps<T extends string> {
  label: string;
  labelledBy?: string;
  options: readonly RadioTile<T>[];
  value: T | null;
  onChange: (value: T) => void;
  variant: 'tile' | 'chip' | 'swatch' | 'icon';
  hideLabels?: boolean;
  class?: string;
}

export function RadioTiles<T extends string>({ label, labelledBy, options, value, onChange, variant, hideLabels, class: cls }: RadioTilesProps<T>) {
  const group = useRef<HTMLDivElement>(null);
  const enabled = options.filter((o) => !o.disabled);
  const current = enabled.findIndex((o) => o.value === value);
  const focusable = current >= 0 ? enabled[current]!.value : enabled[0]?.value;

  const onKeyDown = (e: KeyboardEvent) => {
    const i = enabled.findIndex((o) => o.value === (document.activeElement as HTMLElement | null)?.dataset.value);
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: enabled.length - 1 }[e.key];
    if (to === undefined || enabled.length === 0) return;
    e.preventDefault();
    const next = enabled[(to + enabled.length) % enabled.length]!;
    onChange(next.value);
    group.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
  };

  return (
    <div ref={group} role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} class={cx(s.tiles, s[`tiles-${variant}`], cls)} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            data-value={o.value}
            aria-checked={checked}
            aria-disabled={o.disabled || undefined}
            aria-label={hideLabels || o.hint ? [o.label, o.hint].filter(Boolean).join(', ') : undefined}
            tabIndex={o.value === focusable && !o.disabled ? 0 : -1}
            class={cx(s.tile, s[`tile-${variant}`], checked && s.checked, o.disabled && s.locked)}
            onClick={() => !o.disabled && onChange(o.value)}
          >
            {o.art && (
              <span class={s.tileArt} aria-hidden="true">
                {o.art}
              </span>
            )}
            {!hideLabels && (
              <span class={s.tileWords} aria-hidden={o.hint ? 'true' : undefined}>
                <span class={s.tileLabel}>{o.label}</span>
                {o.hint && <span class={s.tileHint}>{o.hint}</span>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

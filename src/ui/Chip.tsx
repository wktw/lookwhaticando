import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './Chip.module.css';

export interface ChipProps {
  tone?: Tone;
  icon?: IconName | JSX.Element;
  /** Shows a small remove button with this accessible label ("Remove Yoga"). */
  onRemove?: () => void;
  removeLabel?: string;
  class?: string;
  children?: ComponentChildren;
}

function renderIcon(icon: IconName | JSX.Element) {
  return typeof icon === 'string' ? <Icon name={icon} size={18} /> : icon;
}

/** A soft, rounded tag. */
export function Chip({ tone = 'blush', icon, onRemove, removeLabel, class: cls, children }: ChipProps) {
  return (
    <span class={cx(s.chip, s.static, toneClass(tone), cls)}>
      {icon && <span class={s.icon}>{renderIcon(icon)}</span>}
      <span class={s.text}>{children}</span>
      {onRemove && (
        <button type="button" class={s.remove} aria-label={removeLabel ?? 'Remove'} onClick={onRemove}>
          <Icon name="close" size={14} />
        </button>
      )}
    </span>
  );
}

export interface FilterChipProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'onChange' | 'selected' | 'type'> {
  selected: boolean;
  onChange: (selected: boolean) => void;
  tone?: Tone;
  icon?: IconName | JSX.Element;
  /** Optional trailing count ("Cats 4"). */
  count?: number;
  children?: ComponentChildren;
}

/** A toggleable chip for filters and multi-select (aria-pressed). */
export function FilterChip({ selected, onChange, tone = 'blush', icon, count, class: cls, children, ...rest }: FilterChipProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={selected}
      class={cx(s.chip, s.filter, selected && s.selected, toneClass(tone), cls as string)}
      onClick={() => onChange(!selected)}
    >
      <span class={s.check} aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
      {icon && <span class={s.icon}>{renderIcon(icon)}</span>}
      <span class={s.text}>{children}</span>
      {count !== undefined && <span class={s.count}>{count}</span>}
    </button>
  );
}

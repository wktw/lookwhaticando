import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './CandyButton.module.css';

export type CandyVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
export type CandySize = 'sm' | 'md' | 'lg';

export interface CandyButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'size' | 'loading' | 'type' | 'disabled'> {
  variant?: CandyVariant;
  size?: CandySize;
  /** Pastel family for primary/soft faces (default blush). */
  tone?: Tone;
  /** Leading icon: an icon name or any element (art, currency icon…). */
  icon?: IconName | JSX.Element;
  /** Trailing icon. */
  iconRight?: IconName | JSX.Element;
  /** Shows bouncing dots and ignores presses (the label keeps the width steady). */
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ComponentChildren;
}

const ICON_PX: Record<CandySize, number> = { sm: 18, md: 20, lg: 22 };

function renderIcon(icon: IconName | JSX.Element, size: CandySize) {
  return typeof icon === 'string' ? <Icon name={icon} size={ICON_PX[size]} /> : icon;
}

/**
 * The signature toy-like button: a pastel face sitting on a darker 4px "lip".
 * Pressing drops the face 3px onto the lip; hovering (desktop) lifts it a hair.
 */
export function CandyButton({
  variant = 'primary',
  size = 'md',
  tone,
  icon,
  iconRight,
  loading = false,
  block = false,
  disabled,
  type = 'button',
  class: cls,
  children,
  onClick,
  ...rest
}: CandyButtonProps) {
  const resolvedTone: Tone = tone ?? (variant === 'danger' ? 'danger' : 'blush');
  const iconOnly = !children;
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      class={cx(s.candy, s[variant], s[size], block && s.block, iconOnly && s.iconOnly, loading && s.loading, toneClass(resolvedTone), cls as string)}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {variant !== 'ghost' && <span class={s.lip} aria-hidden="true" />}
      <span class={s.face}>
        {icon && <span class={s.icon}>{renderIcon(icon, size)}</span>}
        {children && <span class={s.label}>{children}</span>}
        {iconRight && <span class={s.icon}>{renderIcon(iconRight, size)}</span>}
        {loading && (
          <span class={s.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
    </button>
  );
}

import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './Button.module.css';

/**
 * primary: a flat pastel face (blush by default) with a graphite label · secondary: paper with a
 * hairline · quiet: text only · tint: the family's palest wash. The older names still work:
 * soft = tint, ghost = quiet, danger = primary in terracotta.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'tint' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'size' | 'loading' | 'type' | 'disabled'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Pastel family for the face (primary, tint) or the label (quiet). Default blush. */
  tone?: Tone;
  /** Leading icon: an icon name or any element (a currency token, a small drawing). */
  icon?: IconName | JSX.Element;
  /** Trailing icon. */
  iconRight?: IconName | JSX.Element;
  /** Shows three quiet dots and ignores presses; the label keeps the width steady. */
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ComponentChildren;
}

const ICON_PX: Record<ButtonSize, number> = { sm: 18, md: 20, lg: 22 };

const CANONICAL: Record<ButtonVariant, 'primary' | 'secondary' | 'quiet' | 'tint'> = {
  primary: 'primary',
  danger: 'primary',
  secondary: 'secondary',
  quiet: 'quiet',
  ghost: 'quiet',
  tint: 'tint',
  soft: 'tint',
};

function renderIcon(icon: IconName | JSX.Element, size: ButtonSize) {
  return typeof icon === 'string' ? <Icon name={icon} size={ICON_PX[size]} /> : icon;
}

/**
 * The catkin button: a pill with a flat fill. Pressing sinks it 1px and deepens the face 6%,
 * a matte press with no glossy lip (DESIGN §10.3). Every size offers a 44px target.
 */
export function Button({
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
}: ButtonProps) {
  const look = CANONICAL[variant];
  const resolvedTone: Tone = tone ?? (variant === 'danger' ? 'danger' : 'blush');
  const iconOnly = !children;
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      class={cx(s.btn, s[look], s[size], block && s.block, iconOnly && s.iconOnly, loading && s.loading, toneClass(resolvedTone), cls as string)}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
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
    </button>
  );
}

import type { JSX } from 'preact';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './IconButton.module.css';

export interface IconButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'size' | 'label' | 'type' | 'disabled'> {
  /** Icon name, or custom art. */
  icon: IconName | JSX.Element;
  /** Accessible name (required: the button has no visible text). */
  label: string;
  /**
   * plain: transparent until hovered · soft: pastel tint · candy: a tiny candy button ·
   * card: a white disc that floats over scenes and art.
   */
  variant?: 'plain' | 'soft' | 'candy' | 'card';
  /** Visual size; the touch target is always at least 44px. */
  size?: 'sm' | 'md' | 'lg';
  tone?: Tone;
  /** Toggle buttons: pass a boolean to expose aria-pressed. */
  pressed?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const ICON_PX = { sm: 18, md: 22, lg: 26 } as const;

export function IconButton({ icon, label, variant = 'plain', size = 'md', tone = 'blush', pressed, type = 'button', class: cls, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={rest.title ?? label}
      class={cx(s.btn, s[variant], s[size], toneClass(tone), cls as string)}
    >
      {variant === 'candy' && <span class={s.lip} aria-hidden="true" />}
      <span class={s.face}>{typeof icon === 'string' ? <Icon name={icon} size={ICON_PX[size]} /> : icon}</span>
    </button>
  );
}

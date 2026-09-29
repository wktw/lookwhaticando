import type { ComponentChildren, JSX, Ref } from 'preact';
import s from './ui.module.css';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export interface CandyColors {
  face: string;
  lip: string;
  ink: string;
}

type ButtonAttrs = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'class'>;

export interface CandyButtonProps extends ButtonAttrs {
  variant?: 'candy' | 'soft' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  /** Theme colors (e.g. per machine); defaults to blush. */
  colors?: CandyColors;
  buttonRef?: Ref<HTMLButtonElement>;
  class?: string;
  children: ComponentChildren;
}

/** Toy-like button: a solid pastel face sitting on a 4px darker lip that squishes on press. */
export function CandyButton({ variant = 'candy', size = 'md', colors, buttonRef, class: cls, style, children, type = 'button', ...rest }: CandyButtonProps) {
  const vars = colors ? ({ '--face': colors.face, '--lip': colors.lip, '--ink': colors.ink } as JSX.CSSProperties) : undefined;
  return (
    <button
      ref={buttonRef}
      type={type}
      class={cx(s.candy, variant !== 'candy' && s[variant], size !== 'md' && s[size], cls)}
      style={{ ...vars, ...(typeof style === 'object' ? style : null) }}
      {...rest}
    >
      {children}
    </button>
  );
}

export type PillTone = 'neutral' | 'common' | 'uncommon' | 'rare' | 'ultra' | 'butter' | 'blush';

export function Pill({ tone = 'neutral', class: cls, children, title }: { tone?: PillTone; class?: string; children: ComponentChildren; title?: string }) {
  return (
    <span class={cx(s.pill, tone !== 'neutral' && s[tone], cls)} title={title}>
      {children}
    </span>
  );
}

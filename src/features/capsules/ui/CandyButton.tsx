import type { ComponentChildren, JSX, Ref } from 'preact';
import s from './ui.module.css';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** A pill's own fill and label colours (e.g. a series' painted colour with a graphite label). */
export interface CandyColors {
  face: string;
  ink: string;
  /** Kept for older callers; the catkin pill has no lip. */
  lip?: string;
}

type ButtonAttrs = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'class'>;

export interface PillButtonProps extends ButtonAttrs {
  /** primary: a flat filled pill · secondary: card with a hairline · quiet: text only. */
  variant?: 'primary' | 'secondary' | 'quiet' | 'candy' | 'soft' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  /** Fill and label (e.g. per series); defaults to strawberry milk with a graphite label. */
  colors?: CandyColors;
  buttonRef?: Ref<HTMLButtonElement>;
  class?: string;
  children: ComponentChildren;
}

const VARIANT = { primary: 'primary', candy: 'primary', secondary: 'secondary', soft: 'secondary', quiet: 'quiet', plain: 'quiet' } as const;

/**
 * The catkin pill button (DESIGN §10.3): a flat matte fill that sinks 1 px and deepens 6% when
 * pressed. No glossy lip, no bounce.
 */
export function PillButton({ variant = 'primary', size = 'md', colors, buttonRef, class: cls, style, children, type = 'button', ...rest }: PillButtonProps) {
  const vars = colors ? ({ '--face': colors.face, '--label': colors.ink } as JSX.CSSProperties) : undefined;
  return (
    <button
      ref={buttonRef}
      type={type}
      class={cx(s.pill, s[VARIANT[variant]], size !== 'md' && s[size], cls)}
      style={{ ...vars, ...(typeof style === 'object' ? style : null) }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The old name, kept for callers. */
export const CandyButton = PillButton;
export type CandyButtonProps = PillButtonProps;

export type PillTone = 'neutral' | 'common' | 'uncommon' | 'rare' | 'ultra' | 'secret' | 'butter' | 'blush' | 'sage' | 'lavender';

/** A small printed chip. Tier chips carry their finish: matte, two-colour, foil edge, holographic. */
export function Pill({ tone = 'neutral', class: cls, children, title }: { tone?: PillTone; class?: string; children: ComponentChildren; title?: string }) {
  return (
    <span class={cx(s.chip, tone !== 'neutral' && s[`chip-${tone}`], cls)} title={title}>
      {children}
    </span>
  );
}

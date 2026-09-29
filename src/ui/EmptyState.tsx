import type { ComponentChildren } from 'preact';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './EmptyState.module.css';

export interface EmptyStateProps {
  /** A small drawing (an empty pot, a cutting in a glass), shown on a paper tile. */
  art?: ComponentChildren;
  title: string;
  children?: ComponentChildren;
  /** One action, usually a Button. */
  action?: ComponentChildren;
  /** Tints the art tile with a pastel family (default: plain oat paper). */
  tone?: Tone;
  /** Tighter spacing for use inside cards. */
  compact?: boolean;
  class?: string;
}

/** A quiet "nothing here yet": a drawing, a Castoro title, one plain line, one action. */
export function EmptyState({ art, title, children, action, tone, compact, class: cls }: EmptyStateProps) {
  return (
    <div class={cx(s.empty, compact && s.compact, tone && s.toned, tone && toneClass(tone), cls)}>
      {art && (
        <div class={s.tile} aria-hidden="true">
          {art}
        </div>
      )}
      <h3 class={s.title}>{title}</h3>
      {children && <p class={s.text}>{children}</p>}
      {action && <div class={s.action}>{action}</div>}
    </div>
  );
}

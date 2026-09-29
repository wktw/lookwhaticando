import type { ComponentChildren } from 'preact';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import { Sparkle } from './Sparkle';
import s from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Illustration (a pet, a plant…), shown on a soft pastel blob. */
  art?: ComponentChildren;
  title: string;
  children?: ComponentChildren;
  /** Call to action, usually a CandyButton. */
  action?: ComponentChildren;
  tone?: Tone;
  /** Tighter spacing for use inside cards. */
  compact?: boolean;
  class?: string;
}

/** Friendly "nothing here yet" moment: art, a warm title, one line, one action. */
export function EmptyState({ art, title, children, action, tone = 'blush', compact, class: cls }: EmptyStateProps) {
  return (
    <div class={cx(s.empty, compact && s.compact, toneClass(tone), cls)}>
      {art && (
        <div class={s.stage}>
          <span class={s.blob} aria-hidden="true" />
          <Sparkle size={14} class={cx(s.spark, s.spark1)} />
          <Sparkle size={10} class={cx(s.spark, s.spark2)} />
          <div class={s.art}>{art}</div>
        </div>
      )}
      <h3 class={s.title}>{title}</h3>
      {children && <p class={s.text}>{children}</p>}
      {action && <div class={s.action}>{action}</div>}
    </div>
  );
}

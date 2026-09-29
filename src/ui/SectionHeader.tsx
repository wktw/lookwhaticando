import type { ComponentChildren } from 'preact';
import { cx } from './cx';
import s from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: ComponentChildren;
  /** A quiet line under the header. */
  subtitle?: ComponentChildren;
  /** A short fact on the header line, right-aligned ("3 of 5 · +18 coins"). */
  meta?: ComponentChildren;
  /** Trailing action ("See all", a small button). */
  action?: ComponentChildren;
  /** Small leading art or icon. */
  icon?: ComponentChildren;
  /**
   * caps (default): a small-caps label with +8% tracking over a hairline, like the section
   * labels on a nursery order form · display: a Castoro headline ("This afternoon").
   */
  variant?: 'caps' | 'display';
  as?: 'h2' | 'h3';
  id?: string;
  class?: string;
}

export function SectionHeader({ title, subtitle, meta, action, icon, variant = 'caps', as: Tag = 'h2', id, class: cls }: SectionHeaderProps) {
  return (
    <header class={cx(s.header, s[variant], cls)}>
      <div class={s.line}>
        {icon && <span class={s.icon}>{icon}</span>}
        <Tag class={s.title} id={id}>
          {title}
        </Tag>
        {meta && <span class={s.meta}>{meta}</span>}
        {action && <div class={s.action}>{action}</div>}
      </div>
      {subtitle && <p class={s.subtitle}>{subtitle}</p>}
    </header>
  );
}

import type { ComponentChildren } from 'preact';
import { cx } from './cx';
import s from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  /** Trailing action ("See all", a small button). */
  action?: ComponentChildren;
  /** Small leading art or icon. */
  icon?: ComponentChildren;
  as?: 'h2' | 'h3';
  id?: string;
  class?: string;
}

export function SectionHeader({ title, subtitle, action, icon, as: Tag = 'h2', id, class: cls }: SectionHeaderProps) {
  return (
    <header class={cx(s.header, cls)}>
      {icon && <span class={s.icon}>{icon}</span>}
      <div class={s.text}>
        <Tag class={s.title} id={id}>
          {title}
        </Tag>
        {subtitle && <p class={s.subtitle}>{subtitle}</p>}
      </div>
      {action && <div class={s.action}>{action}</div>}
    </header>
  );
}

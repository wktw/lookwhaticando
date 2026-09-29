import type { ComponentChildren, JSX } from 'preact';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './ListRow.module.css';

export interface ListRowProps {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  /** Leading icon name (drawn in a pastel tile) or any art. */
  leading?: IconName | JSX.Element;
  leadingTone?: Tone;
  /** Trailing value, toggle, pill… */
  trailing?: ComponentChildren;
  /** Show a chevron (defaults to true for rows with onClick/href). */
  chevron?: boolean;
  onClick?: (e: MouseEvent) => void;
  href?: string;
  disabled?: boolean;
  /** Title in the gentle danger color ("Reset everything"). */
  destructive?: boolean;
  class?: string;
}

/** One row of a settings-style list. Interactive rows are real buttons/links with 56px targets. */
export function ListRow({ title, subtitle, leading, leadingTone = 'blush', trailing, chevron, onClick, href, disabled, destructive, class: cls }: ListRowProps) {
  const interactive = !!(onClick || href);
  const showChevron = chevron ?? interactive;
  const body = (
    <>
      {leading && (
        <span class={cx(s.leading, typeof leading === 'string' && s.tile, toneClass(leadingTone))}>
          {typeof leading === 'string' ? <Icon name={leading} size={20} /> : leading}
        </span>
      )}
      <span class={s.text}>
        <span class={cx(s.title, destructive && s.destructive)}>{title}</span>
        {subtitle && <span class={s.subtitle}>{subtitle}</span>}
      </span>
      {trailing && <span class={s.trailing}>{trailing}</span>}
      {showChevron && (
        <span class={s.chevron} aria-hidden="true">
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </>
  );
  const classes = cx(s.row, interactive && s.interactive, disabled && s.disabled, cls);
  if (href) {
    return (
      <a class={classes} href={href} aria-disabled={disabled || undefined} onClick={onClick}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" class={classes} disabled={disabled} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div class={classes}>{body}</div>;
}

export interface ListGroupProps {
  /** Small caption above the group. */
  title?: ComponentChildren;
  /** Footnote under the group. */
  footer?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
}

/** A card of ListRows with inset hairlines, iOS grouped-list style. */
export function ListGroup({ title, footer, children, class: cls }: ListGroupProps) {
  return (
    <section class={cx(s.group, cls)}>
      {title && <h3 class={s.groupTitle}>{title}</h3>}
      <div class={s.card}>{children}</div>
      {footer && <p class={s.footer}>{footer}</p>}
    </section>
  );
}

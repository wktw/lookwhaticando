import type { ComponentChildren, JSX } from 'preact';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './Card.module.css';

export interface CardProps extends JSX.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'li' | 'aside' | 'button' | 'a';
  /** Pastel tint for the surface; 'plain' is the white card. */
  tone?: Tone | 'plain';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Hover lift + press squish (use with as="button" or as="a"). */
  interactive?: boolean;
  /** Flat cards sit in wells without a shadow. */
  flat?: boolean;
  children?: ComponentChildren;
}

/** The rounded 22px surface everything sits on. */
export function Card({ as = 'div', tone = 'plain', padding = 'md', interactive, flat, class: cls, children, ...rest }: CardProps) {
  const Tag = as as 'div';
  return (
    <Tag
      // A button card never submits the form around it by accident.
      {...(as === 'button' ? { type: 'button' } : {})}
      {...(rest as JSX.HTMLAttributes<HTMLDivElement>)}
      class={cx(s.card, s[padding], tone !== 'plain' && s.tinted, tone !== 'plain' && toneClass(tone), interactive && s.interactive, flat && s.flat, cls as string)}
    >
      {children}
    </Tag>
  );
}

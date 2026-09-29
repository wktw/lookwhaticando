import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import s from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName | JSX.Element;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group ("Theme"). */
  label: string;
  size?: 'sm' | 'md';
  /** Stretch to the container width. */
  block?: boolean;
  class?: string;
}

/** A paper track with a sliding card thumb. Radio-group semantics with arrow-key navigation. */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md', block, class: cls }: SegmentedProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const select = (i: number) => {
    const n = options.length;
    const next = options[((i % n) + n) % n]!;
    onChange(next.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      select(index + step);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(e.key === 'Home' ? 0 : options.length - 1);
    }
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      class={cx(s.track, s[size], block && s.block, cls)}
      style={{ '--n': options.length, '--i': index } as JSX.CSSProperties}
      onKeyDown={onKeyDown}
    >
      <span class={s.thumb} aria-hidden="true" />
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            class={cx(s.option, checked && s.checked)}
            onClick={() => onChange(o.value)}
          >
            {o.icon && (typeof o.icon === 'string' ? <Icon name={o.icon} size={size === 'sm' ? 16 : 18} /> : o.icon)}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

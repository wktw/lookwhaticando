import type { ComponentChildren, JSX } from 'preact';
import { useId, useLayoutEffect, useRef } from 'preact/hooks';
import { Icon, type IconName } from '@/art/icons';
import { cx } from './cx';
import s from './TextField.module.css';

interface FieldChrome {
  label: string;
  /** Visually hide the label (it still names the field). */
  hideLabel?: boolean;
  hint?: ComponentChildren;
  /** Gentle inline message; also sets aria-invalid. */
  error?: string;
  value: string;
  onValue: (value: string) => void;
  /** Show "12 / 40" when maxLength is set. */
  showCount?: boolean;
  class?: string;
}

export interface TextFieldProps extends FieldChrome, Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'label' | 'icon' | 'class' | 'type' | 'maxLength'> {
  icon?: IconName | JSX.Element;
  /** Trailing element inside the field (unit text, clear button). */
  trailing?: ComponentChildren;
  type?: 'text' | 'search' | 'email' | 'url' | 'tel' | 'time' | 'number' | 'password';
  maxLength?: number;
}

export interface TextAreaProps extends FieldChrome, Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'label' | 'class' | 'rows' | 'maxLength'> {
  /** Grow with the content up to maxRows (default true). */
  autoGrow?: boolean;
  rows?: number;
  maxRows?: number;
  maxLength?: number;
}

function Frame({ id, label, hideLabel, hint, error, count, class: cls, children }: { id: string; label: string; hideLabel?: boolean; hint?: ComponentChildren; error?: string; count?: string; class?: string; children: ComponentChildren }) {
  return (
    <div class={cx(s.field, error && s.invalid, cls)}>
      <div class={cx(s.top, hideLabel && 'sr-only')}>
        <label class={s.label} for={id}>
          {label}
        </label>
        {count && (
          <span class={s.count} aria-hidden="true">
            {count}
          </span>
        )}
      </div>
      {children}
      {(error || hint) && (
        <p class={cx(s.note, error && s.error)} id={`${id}-note`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, hideLabel, hint, error, value, onValue, showCount, icon, trailing, class: cls, type = 'text', maxLength, ...rest }: TextFieldProps) {
  const id = useId();
  const count = showCount && maxLength ? `${value.length} / ${maxLength}` : undefined;
  return (
    <Frame id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} count={count} class={cls}>
      <div class={s.control}>
        {icon && <span class={s.icon}>{typeof icon === 'string' ? <Icon name={icon} size={20} /> : icon}</span>}
        <input
          {...rest}
          id={id}
          type={type}
          class={s.input}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          onInput={(e) => onValue(e.currentTarget.value)}
        />
        {trailing && <span class={s.trailing}>{trailing}</span>}
      </div>
    </Frame>
  );
}

export function TextArea({ label, hideLabel, hint, error, value, onValue, showCount, autoGrow = true, rows = 3, maxRows = 10, maxLength, class: cls, ...rest }: TextAreaProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const count = showCount && maxLength ? `${value.length} / ${maxLength}` : undefined;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoGrow || !el) return;
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + 24)}px`;
  }, [value, autoGrow, maxRows]);

  return (
    <Frame id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} count={count} class={cls}>
      <div class={cx(s.control, s.multi)}>
        <textarea
          {...rest}
          ref={ref}
          id={id}
          rows={rows}
          class={cx(s.input, s.area)}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          onInput={(e) => onValue(e.currentTarget.value)}
        />
      </div>
    </Frame>
  );
}

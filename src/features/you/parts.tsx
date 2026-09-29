/** The You screen's building blocks: a titled group of rows, and the rows it holds. */
import type { ComponentChildren } from 'preact';
import { useId, useLayoutEffect, useRef } from 'preact/hooks';
import { SectionHeader } from '@/ui/SectionHeader';
import { Toggle } from '@/ui/Toggle';
import { Segmented } from '@/ui/Segmented';
import { cx } from '@/ui/cx';
import s from './You.module.css';

/** A section: a small-caps h2 over a paper card of rows, with an optional footnote. */
export function Group({ id, title, footer, children, action }: { id: string; title: string; footer?: ComponentChildren; children: ComponentChildren; action?: ComponentChildren }) {
  const headingId = `you-${id}`;
  return (
    <section class={s.group} aria-labelledby={headingId} data-section={id}>
      <SectionHeader title={title} id={headingId} action={action} />
      <div class={s.card}>{children}</div>
      {footer && <p class={s.footer}>{footer}</p>}
    </section>
  );
}

/** A plain row: label and helper at the start, a control at the end (or below, with `stack`). */
export function Row({ label, helper, helperId, children, stack, labelFor, class: cls }: { label?: ComponentChildren; helper?: ComponentChildren; helperId?: string; children?: ComponentChildren; stack?: boolean; labelFor?: string; class?: string }) {
  const text = label !== undefined && (
    <span class={s.rowText}>
      {labelFor ? (
        <label class={s.label} for={labelFor}>
          {label}
        </label>
      ) : (
        <span class={s.label}>{label}</span>
      )}
      {helper && (
        <span class={s.helper} id={helperId}>
          {helper}
        </span>
      )}
    </span>
  );
  return (
    <div class={cx(s.row, stack ? s.stack : s.inline, cls)}>
      {text}
      {children}
    </div>
  );
}

/** A switch row (the kit's Toggle is the whole row). */
export function ToggleRow({ label, helper, checked, onChange, disabled }: { label: string; helper?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div class={s.row}>
      <Toggle class={s.toggle} label={label} description={helper} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

/** A native select in a row: the label names it, the helper describes it. */
export function SelectRow<T extends string | number>({
  label,
  helper,
  value,
  options,
  onChange,
}: {
  label: string;
  helper?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <Row label={label} helper={helper} helperId={`${id}-help`} labelFor={id} class={s.selectRow}>
      <select
        id={id}
        class={s.select}
        value={String(value)}
        aria-describedby={helper ? `${id}-help` : undefined}
        onChange={(e) => {
          const raw = e.currentTarget.value;
          const hit = options.find((o) => String(o.value) === raw);
          if (hit) onChange(hit.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  );
}

/** A segmented choice under its label (a radiogroup). */
export function SegmentRow<T extends string>({ label, helper, value, options, onChange }: { label: string; helper?: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  // The kit's Segmented takes no aria-describedby: the helper is tied to its radiogroup here.
  useLayoutEffect(() => {
    const group = wrap.current?.querySelector('[role="radiogroup"]');
    if (!group) return;
    if (helper) group.setAttribute('aria-describedby', `${id}-help`);
    else group.removeAttribute('aria-describedby');
  }, [helper]);
  return (
    <Row label={label} helper={helper} helperId={`${id}-help`} stack>
      <div ref={wrap} class={s.segWrap}>
        <Segmented options={options} value={value} onChange={onChange} label={label} block />
      </div>
    </Row>
  );
}

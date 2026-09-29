import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  /** Accessible name ("Collection progress"). */
  label: string;
  /** Readable value for AT ("7 of 18"). */
  valueText?: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

/** A rounded pill bar. The fill slides (transform only) and always shows a round tip once started. */
export function ProgressBar({ value, label, valueText, tone = 'sage', size = 'md', class: cls }: ProgressBarProps) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const visible = v > 0 ? Math.max(v, 0.05) : 0;
  return (
    <div
      class={cx(s.bar, s[size], toneClass(tone), cls)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={valueText}
    >
      <span class={s.fill} style={{ transform: `translateX(${(visible - 1) * 100}%)` }} />
    </div>
  );
}

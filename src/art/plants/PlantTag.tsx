/**
 * The plant tag (DESIGN §9.1, §10.4): a small paper nursery tag stuck in the soil, carrying the habit's name in
 * Castoro and, like the Latin name on a nursery label, an optional line in Castoro italic ("after coffee").
 * Real text, so screen readers read it whole; a long name ends in an ellipsis instead of being cut off.
 */
import type { JSX } from 'preact';
import s from './PlantTag.module.css';

export interface PlantTagProps {
  /** The habit's name. */
  name: string;
  /** An optional italic line under the name, e.g. the anchor ("after coffee"). */
  note?: string;
  /** The name's font size in px; the tag, its hole and its stake scale with it. Default 14. */
  size?: number;
  /** Stuck in the soil on a little stake (default), or propped against the pot with no stake. */
  stand?: 'stake' | 'propped';
  /** Widest the tag gets, in em of the name; longer names are truncated with an ellipsis. Default 9. */
  maxWidth?: number;
  class?: string;
  style?: JSX.CSSProperties;
}

export function PlantTag({ name, note, size = 14, stand = 'stake', maxWidth = 9, class: cls, style }: PlantTagProps) {
  const vars = { '--tag-size': `${size}px`, '--tag-max': `${maxWidth}em` } as JSX.CSSProperties;
  return (
    <span class={[s.tag, stand === 'propped' ? s.propped : s.staked, cls].filter(Boolean).join(' ')} style={{ ...vars, ...style }} data-stand={stand}>
      <span class={s.card}>
        <span class={s.hole} aria-hidden="true" />
        <span class={s.lines}>
          <span class={s.name} title={name}>
            {name}
          </span>
          {note && (
            <span class={s.note} title={note}>
              {note}
            </span>
          )}
        </span>
      </span>
      {stand === 'stake' && <span class={s.stake} aria-hidden="true" />}
    </span>
  );
}

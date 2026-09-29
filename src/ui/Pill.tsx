import type { ComponentChildren, JSX } from 'preact';
import { RARITY_FINISH, RARITY_LABEL as TIER_LABEL, type Rarity } from '@/catalog/types';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import { SecretSparkle } from './SecretSparkle';
import s from './Pill.module.css';

export interface PillProps {
  tone?: Tone | 'neutral';
  /** soft: the family's palest wash · solid: a pastel face with a graphite label. */
  variant?: 'soft' | 'solid';
  size?: 'sm' | 'md';
  icon?: JSX.Element;
  class?: string;
  children?: ComponentChildren;
}

/** A small label for counts, prices, states and tags. */
export function Pill({ tone = 'neutral', variant = 'soft', size = 'md', icon, class: cls, children }: PillProps) {
  return (
    <span class={cx(s.pill, s[variant], s[size], tone === 'neutral' ? s.neutral : toneClass(tone), cls)}>
      {icon && <span class={s.icon}>{icon}</span>}
      {children}
    </span>
  );
}

/** Display tier names (DESIGN §7.1): Classic · Special · Rare · Super rare. A series Secret prints "Secret". */
export const RARITY_LABEL: Record<Rarity, string> = TIER_LABEL;

/**
 * A printed tier label with its static finish, so rarity never rests on colour alone and
 * survives reduced motion: Classic matte paper · Special two-colour print · Rare foil edge ·
 * Super rare holographic stripes · Secret holo stripes with its one sparkle.
 */
export function RarityPill({ rarity, label, secret = false, size = 'md', class: cls }: { rarity: Rarity; label?: string; secret?: boolean; size?: 'sm' | 'md'; class?: string }) {
  const text = label ?? (secret ? 'Secret' : RARITY_LABEL[rarity]);
  return (
    <span class={cx(s.pill, s.tier, s[rarity], secret && s.secret, s[size], cls)} title={`${text}, ${secret ? 'holographic, blind-embossed' : RARITY_FINISH[rarity]}`}>
      {secret && <SecretSparkle size={size === 'sm' ? 8 : 10} class={s.sparkle} />}
      {text}
    </span>
  );
}

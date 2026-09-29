import type { ComponentChildren, JSX } from 'preact';
import type { Rarity } from '@/catalog/types';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import { Sparkle } from './Sparkle';
import s from './Pill.module.css';

export interface PillProps {
  tone?: Tone | 'neutral';
  /** soft: tinted · solid: pastel face with cocoa text. */
  variant?: 'soft' | 'solid';
  size?: 'sm' | 'md';
  icon?: JSX.Element;
  class?: string;
  children?: ComponentChildren;
}

/** Small rounded label for counts, prices, states and tags. */
export function Pill({ tone = 'neutral', variant = 'soft', size = 'md', icon, class: cls, children }: PillProps) {
  return (
    <span class={cx(s.pill, s[variant], s[size], tone === 'neutral' ? s.neutral : toneClass(tone), cls)}>
      {icon && <span class={s.icon}>{icon}</span>}
      {children}
    </span>
  );
}

export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', ultra: 'Secret' };

/** Rarity sticker: common sage, uncommon sky, rare lavender, ultra a holographic "Secret". */
export function RarityPill({ rarity, label, size = 'md', class: cls }: { rarity: Rarity; label?: string; size?: 'sm' | 'md'; class?: string }) {
  const sparkle = rarity === 'rare' || rarity === 'ultra';
  return (
    <span class={cx(s.pill, s.rarity, s[rarity], s[size], cls)}>
      {sparkle ? <Sparkle size={size === 'sm' ? 9 : 11} class={s.sparkle} /> : <span class={s.dot} aria-hidden="true" />}
      {label ?? RARITY_LABEL[rarity]}
    </span>
  );
}

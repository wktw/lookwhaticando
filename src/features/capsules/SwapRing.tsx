import { STARDUST_PER_STAR } from '@/catalog/machines';
import { StarIcon } from '@/art/icons';

const f = (n: number) => n.toFixed(2);

/** Ten ring segments around the stamp, one per swap (DESIGN §9.3). Precomputed path data. */
const SEGMENTS = Array.from({ length: STARDUST_PER_STAR }, (_, i) => {
  const gap = 5;
  const a0 = ((i * 360) / STARDUST_PER_STAR - 90 + gap / 2) * (Math.PI / 180);
  const a1 = (((i + 1) * 360) / STARDUST_PER_STAR - 90 - gap / 2) * (Math.PI / 180);
  const R = 19;
  const r = 15.2;
  const p = (a: number, rad: number) => `${f(20 + Math.cos(a) * rad)} ${f(20 + Math.sin(a) * rad)}`;
  return `M${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)} L${p(a1, r)} A${r} ${r} 0 0 0 ${p(a0, r)} Z`;
});

export interface SwapRingProps {
  /** Swaps toward the next stamp (internally stardust), 0–10. */
  swaps: number;
  size?: number;
  class?: string;
}

/**
 * The swap shelf's ring (DESIGN §6): duplicates become swaps, and every ten make a stamp. The
 * stamp sits in the middle; each swap fills one of the ten segments around it.
 */
export function SwapRing({ swaps, size = 40, class: cls }: SwapRingProps) {
  const n = Math.max(0, Math.min(STARDUST_PER_STAR, Math.floor(swaps)));
  return (
    <span class={cls} style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: `${size}px`, height: `${size}px`, flex: 'none' }}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0 }}>
        {SEGMENTS.map((d, i) => (
          <path key={i} d={d} style={{ fill: i < n ? 'color-mix(in srgb, var(--lavender-500) 50%, var(--lavender-700))' : 'var(--line)' }} />
        ))}
      </svg>
      <StarIcon size={Math.round(size * 0.5)} />
    </span>
  );
}

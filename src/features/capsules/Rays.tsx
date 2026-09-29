import { useId } from 'preact/hooks';
import type { Rarity } from '@/catalog/types';
import { HOLO_STOPS } from '@/art/machines/CapsuleArt';

const RAY_COLORS: Record<Rarity, string[]> = {
  common: ['#FFF3C4', '#E3F2D9'],
  uncommon: ['#E1F0FD', '#FFF3C4'],
  rare: ['#E6DCFF', '#FFF0B8'],
  ultra: HOLO_STOPS,
};

/** Soft light rays that rotate slowly behind a reveal (CSS transform only). */
export function Rays({ rarity, class: cls }: { rarity: Rarity; class?: string }) {
  const uid = `ray${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const colors = RAY_COLORS[rarity];
  const n = 16;
  const R = 50;
  const wedge = (i: number) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / n / 1.9;
    const p = (a: number) => `${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)}`;
    return `M0 0 L${p(a0)} A${R} ${R} 0 0 1 ${p(a1)} Z`;
  };
  return (
    <svg class={cls} viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      <defs>
        {colors.map((c, i) => (
          <radialGradient key={c} id={`${uid}-${i}`} cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
            <stop offset="0.12" stop-color={c} stop-opacity="0.95" />
            <stop offset="1" stop-color={c} stop-opacity="0" />
          </radialGradient>
        ))}
      </defs>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={wedge(i)} fill={`url(#${uid}-${i % colors.length})`} />
      ))}
    </svg>
  );
}

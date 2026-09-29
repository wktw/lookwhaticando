/** Badge medal art. STUB: the icons module draws illustrated medals (ribbon + medallion + emblem). */
export interface BadgeMedalProps {
  badgeId: string;
  earned: boolean;
  size?: number | string;
  title?: string;
}

export function BadgeMedal({ size = 64, earned, title }: BadgeMedalProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} opacity={earned ? 1 : 0.35}>
      <circle cx={50} cy={56} r={30} fill="#FFE593" stroke="#5A3E45" stroke-width={2.4} />
    </svg>
  );
}

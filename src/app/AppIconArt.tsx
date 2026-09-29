import { useId } from 'preact/hooks';
import { PetArt } from '@/art/pets/PetArt';
import { SPARKLE_PATH } from '@/ui/Sparkle';

/**
 * The app icon: Mochi, face-forward, on a blush-to-peach squircle with a little sparkle.
 * Used by scripts/generate-icons.mjs (PNG icons) and inside the install guide.
 *  - squircle: transparent corners (desktop / "any" icons)
 *  - square:   full-bleed (iOS applies its own mask)
 *  - maskable: full-bleed, Mochi kept inside the 80% safe circle (Android)
 */
export type AppIconShape = 'squircle' | 'square' | 'maskable';

/** Superellipse (n = 5) path, the continuous-corner "squircle" shape. */
export function squirclePath(cx: number, cy: number, r: number, n = 5, steps = 96): string {
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const SQUIRCLE = squirclePath(50, 50, 45);

/** Mochi placement per shape: [x, y, size] on the 100-unit canvas. */
const MOCHI: Record<AppIconShape, [number, number, number]> = {
  square: [10, 14, 80],
  squircle: [14, 16, 72],
  maskable: [20, 22, 60],
};

export function AppIconArt({ size = 96, shape = 'squircle', title, class: cls }: { size?: number | string; shape?: AppIconShape; title?: string; class?: string }) {
  const uid = `ai${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  const [mx, my, ms] = MOCHI[shape];
  const bg = shape === 'squircle' ? <path d={SQUIRCLE} /> : <rect width="100" height="100" />;
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} class={cls} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFD7E2" />
          <stop offset="0.5" stop-color="#FFC6D2" />
          <stop offset="1" stop-color="#FFC9A6" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.3" cy="0.22" r="0.6">
          <stop offset="0" stop-color="#fff" stop-opacity="0.75" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>{bg}</clipPath>
      </defs>
      <g clip-path={`url(#${uid}-clip)`}>
        <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
        <rect width="100" height="100" fill={`url(#${uid}-glow)`} />
        {/* a soft meadow hill for Mochi to sit on */}
        <ellipse cx="50" cy={my + ms * 0.99} rx={ms * 0.62} ry={ms * 0.13} fill="#FFF3EA" opacity="0.7" />
      </g>
      <g fill="#fff">
        <path d={SPARKLE_PATH} transform={`translate(${shape === 'maskable' ? 72 : 79} ${shape === 'maskable' ? 30 : 22}) scale(${shape === 'maskable' ? 0.62 : 0.8})`} fill="#FFF7D9" stroke="#F6C544" stroke-width="1.6" />
        <path d={SPARKLE_PATH} transform={`translate(${shape === 'maskable' ? 28 : 20} ${shape === 'maskable' ? 34 : 33}) scale(0.38)`} opacity="0.9" />
      </g>
      <svg x={mx} y={my} width={ms} height={ms} viewBox="0 0 100 100" overflow="visible">
        <PetArt petId="pet-mochi" size="100" />
      </svg>
    </svg>
  );
}

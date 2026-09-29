/** Rewards and reactions layered over any plant: the Evergreen ribbon, charm and sparkles, and watering FX. */
import { OUTLINE, Sparkle } from './parts';
import { f } from './math';

const GOLD = '#FFD65C';
const GOLD_DEEP = '#F2B93B';

/** The gold ribbon band an Evergreen plant's pot wears (pots without a face; character pots just get the bow). */
export function Ribbon({ d }: { d: string }) {
  return <path d={d} fill={GOLD} stroke={OUTLINE} stroke-width={1.4} stroke-linejoin="round" />;
}

/**
 * A gold bow tied at (x, y) with a tiny golden watering can dangling from its knot (the Evergreen reward).
 * `s` scales it up for small icons; `swing` lets it sway (only worth it at sizes where you can see it).
 */
export function WateringCanCharm({ x, y, s = 1.3, swing }: { x: number; y: number; s?: number; swing: boolean }) {
  const place = `translate(${f(x)} ${f(y)}) scale(${f(s)})`;
  return (
    <g stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      {/* Swings from the knot; kept free of ancestor transforms so the origin is in canvas units. */}
      <g class={swing ? 'plant-charm' : undefined} style={swing ? { transformOrigin: `${f(x)}px ${f(y)}px` } : undefined}>
        <g transform={place}>
          <path d="M0 0.6 C0.5 1.6 0.4 2.2 0.8 3" fill="none" stroke-width={0.9} />
          <path d="M4.2 8.6 L8.8 3.6 L10 4.6 L5 10.2 Z" fill={GOLD_DEEP} stroke-width={1.2} />
          <ellipse cx={9.6} cy={3.8} rx={1.9} ry={1.2} transform="rotate(-42 9.6 3.8)" fill={GOLD} stroke-width={1.1} />
          <path d="M-2.4 5.4 Q0.8 0 4 5.4" fill="none" stroke-width={2.9} />
          <path d="M-2.4 5.4 Q0.8 0 4 5.4" fill="none" stroke={GOLD} stroke-width={1} />
          <rect x={-3.8} y={4.6} width={9} height={7.6} rx={2.2} fill={GOLD} stroke-width={1.3} />
          <path d="M-2.4 6.6 L-2.4 9.6" fill="none" stroke="#fff" stroke-width={1} opacity={0.85} />
        </g>
      </g>
      <g transform={place} stroke-width={0.9}>
        <path d="M-0.4 0.6 L-2.2 3.6 L-0.6 3.2 Z M0.4 0.6 L2.2 3.6 L0.6 3.2 Z" fill={GOLD_DEEP} />
        <path d="M0 0 C-1.6 -2.4 -4.4 -2.4 -4.4 -0.2 C-4.4 1.6 -1.6 1.4 0 0 Z" fill={GOLD} />
        <path d="M0 0 C1.6 -2.4 4.4 -2.4 4.4 -0.2 C4.4 1.6 1.6 1.4 0 0 Z" fill={GOLD} />
        <circle r={1.1} fill={GOLD_DEEP} />
      </g>
    </g>
  );
}

/**
 * Soft sparkles around an Evergreen plant; `gold` adds the capped-blooms crown sparkle.
 * `twinkle` animates them (skipped on small icons, where it only costs repaints); `s` enlarges them there.
 */
export function EvergreenSparkles({ gold, twinkle, s = 1 }: { gold: boolean; twinkle: boolean; s?: number }) {
  const cls = twinkle ? 'plant-twinkle' : undefined;
  return (
    <g class="plant-sparkles">
      <Sparkle x={13} y={30} s={1.3 * s} cls={cls} />
      <Sparkle x={87} y={22} s={1.05 * s} cls={cls} />
      <Sparkle x={88} y={50} s={0.85 * s} cls={cls} />
      <Sparkle x={12} y={54} s={0.75 * s} cls={cls} />
      {gold && <Sparkle x={81} y={10} s={1.5 * s} fill={GOLD} cls={cls} />}
    </g>
  );
}

/**
 * Warm glow behind an Evergreen plant (a gradient, not a filter, so it stays cheap). Its colors come
 * from CSS (`--plant-glow*` in plant.css) so night mode gets a warm gold instead of a muddy cream.
 */
export function EvergreenGlow({ uid, gold }: { uid: string; gold: boolean }) {
  const id = `${uid}-glow`;
  return (
    <g>
      <radialGradient id={id}>
        <stop offset="0" class={gold ? 'plant-glow-core is-gold' : 'plant-glow-core'} />
        <stop offset="0.55" class="plant-glow-mid" />
        <stop offset="1" class="plant-glow-edge" />
      </radialGradient>
      <ellipse cx={50} cy={40} rx={46} ry={40} fill={`url(#${id})`} />
    </g>
  );
}

const DROP = 'M0 -4.6 C1.6 -2 3.2 -0.2 3.2 1.8 A3.2 3.2 0 0 1 -3.2 1.8 C-3.2 -0.2 -1.6 -2 0 -4.6 Z';

/**
 * Two droplets and a sparkle, played once per watering. `top` is roughly the plant's highest point;
 * `s` enlarges them on small icons so the reaction still reads where check-ins happen.
 */
export function WaterFx({ top, s = 1 }: { top: number; s?: number }) {
  const y = Math.max(10 + 4 * s, Math.min(46, top));
  const drops: [number, number][] = [
    [50 - 8 * s, y - 2],
    [50 + 7.5 * s, y - 6 * s],
  ];
  return (
    <g class="plant-water" aria-hidden="true">
      {drops.map(([x, dy], i) => (
        <g key={i} transform={`translate(${f(x)} ${f(dy)}) scale(${f(s)})`}>
          <g class="plant-drop">
            <path d={DROP} fill="#BBDCF6" stroke={OUTLINE} stroke-width={1.5} stroke-linejoin="round" />
            <ellipse cx={-1.1} cy={0.6} rx={0.8} ry={1.2} fill="#fff" opacity={0.9} />
          </g>
        </g>
      ))}
      <g transform={`translate(${f(50 + 16 * s)} ${f(y - 4)}) scale(${f(s)})`}>
        <g class="plant-pop">
          <Sparkle x={0} y={0} s={1.1} />
        </g>
      </g>
    </g>
  );
}

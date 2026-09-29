/** Rewards and reactions layered over any plant: the Evergreen charm, sparkles, and watering FX. */
import { OUTLINE, Sparkle } from './parts';
import { f } from './math';

/** Tiny golden watering can tied to the rim with a pink bow (Evergreen reward). */
export function WateringCanCharm({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
      {/* Swings from the tie point; kept free of ancestor transforms so the origin is in canvas units. */}
      <g class="plant-charm" style={{ transformOrigin: `${f(x)}px ${f(y)}px` }}>
        <g transform={`translate(${f(x)} ${f(y)}) scale(1.3)`}>
          <path d="M0 0 C0.4 1.6 0.2 3 0.6 4.6" fill="none" stroke-width={0.9} />
          <path d="M4.2 10.6 L8.8 5.6 L10 6.6 L5 12.2 Z" fill="#F6C544" stroke-width={1.2} />
          <ellipse cx={9.6} cy={5.8} rx={1.9} ry={1.2} transform="rotate(-42 9.6 5.8)" fill="#FFD65C" stroke-width={1.1} />
          <path d="M-2.4 7.4 Q0.8 2 4 7.4" fill="none" stroke-width={2.9} />
          <path d="M-2.4 7.4 Q0.8 2 4 7.4" fill="none" stroke="#FFD65C" stroke-width={1} />
          <rect x={-3.8} y={6.6} width={9} height={7.6} rx={2.2} fill="#FFD65C" stroke-width={1.3} />
          <path d="M-2.4 8.6 L-2.4 11.6" fill="none" stroke="#fff" stroke-width={1} opacity={0.85} />
        </g>
      </g>
      <g transform={`translate(${f(x)} ${f(y)}) scale(1.3)`} fill="#FF9FB8" stroke-width={0.9}>
        <path d="M0 0 C-1.4 -2 -3.8 -2 -3.8 -0.2 C-3.8 1.4 -1.4 1.2 0 0 Z" />
        <path d="M0 0 C1.4 -2 3.8 -2 3.8 -0.2 C3.8 1.4 1.4 1.2 0 0 Z" />
        <circle r={1} />
      </g>
    </g>
  );
}

/** Soft sparkles around an Evergreen plant; `gold` adds the capped-blooms crown sparkle. */
export function EvergreenSparkles({ gold }: { gold: boolean }) {
  return (
    <g class="plant-sparkles">
      <Sparkle x={16} y={26} s={1.3} cls="plant-twinkle" />
      <Sparkle x={85} y={17} s={1.05} cls="plant-twinkle" />
      <Sparkle x={86} y={50} s={0.8} cls="plant-twinkle" />
      <Sparkle x={14} y={52} s={0.7} cls="plant-twinkle" />
      {gold && <Sparkle x={74} y={6} s={1.8} fill="#FFD65C" cls="plant-twinkle" />}
    </g>
  );
}

/** Warm glow behind an Evergreen plant (a gradient, not a filter, so it stays cheap). */
export function EvergreenGlow({ uid, gold }: { uid: string; gold: boolean }) {
  const id = `${uid}-glow`;
  return (
    <g>
      <radialGradient id={id}>
        <stop offset="0" stop-color={gold ? '#FFE08A' : '#FFF1C2'} stop-opacity={gold ? 0.75 : 0.65} />
        <stop offset="1" stop-color="#FFF1C2" stop-opacity={0} />
      </radialGradient>
      <ellipse cx={50} cy={36} rx={46} ry={38} fill={`url(#${id})`} />
    </g>
  );
}

const DROP = 'M0 -4.6 C1.6 -2 3.2 -0.2 3.2 1.8 A3.2 3.2 0 0 1 -3.2 1.8 C-3.2 -0.2 -1.6 -2 0 -4.6 Z';

/** Two droplets and a sparkle, played once per watering. `top` is roughly the plant's highest point. */
export function WaterFx({ top }: { top: number }) {
  const y = Math.max(10, Math.min(46, top));
  return (
    <g class="plant-water" aria-hidden="true">
      {[
        [42, y - 2],
        [57.5, y - 6],
      ].map(([x, dy], i) => (
        <g key={i} transform={`translate(${x} ${f(dy!)})`}>
          <g class="plant-drop">
            <path d={DROP} fill="#BBDCF6" stroke={OUTLINE} stroke-width={1.5} stroke-linejoin="round" />
            <ellipse cx={-1.1} cy={0.6} rx={0.8} ry={1.2} fill="#fff" opacity={0.9} />
          </g>
        </g>
      ))}
      <g transform={`translate(66 ${f(y - 4)})`}>
        <g class="plant-pop">
          <Sparkle x={0} y={0} s={1.1} />
        </g>
      </g>
    </g>
  );
}

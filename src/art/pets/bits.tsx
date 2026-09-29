import { OUTLINE, STROKE } from './geometry';
import { petalPath, sparklePath } from './shapes';

/** Small drawn motifs shared by traits and wearables. All are centered on (0, 0). */

/** Five-petal blossom (sakura, daisy-ish) with a butter center. */
export function Blossom({
  r = 6,
  color = '#F7A8C0',
  center = '#FFE08A',
  stroke = STROKE * 0.6,
}: {
  r?: number;
  color?: string;
  center?: string;
  stroke?: number;
}) {
  return (
    <g stroke={OUTLINE} stroke-width={stroke} stroke-linejoin="round">
      {[0, 72, 144, 216, 288].map((deg) => (
        <path key={deg} d={petalPath(0, -r * 0.52, r * 0.52)} transform={`rotate(${deg})`} fill={color} />
      ))}
      <circle r={r * 0.3} fill={center} />
    </g>
  );
}

/** White daisy: many slim petals and a sunny center. */
export function Daisy({ r = 6 }: { r?: number }) {
  return (
    <g stroke={OUTLINE} stroke-width={STROKE * 0.5} stroke-linejoin="round">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <ellipse key={deg} cx={0} cy={-r * 0.55} rx={r * 0.26} ry={r * 0.5} transform={`rotate(${deg})`} fill="#FFFFFF" />
      ))}
      <circle r={r * 0.34} fill="#FFD65C" />
    </g>
  );
}

/** A rose: a spiral of petals in a soft cup. */
export function Rose({ r = 6, color = '#F58CAA' }: { r?: number; color?: string }) {
  const k = r / 6;
  return (
    <g transform={`scale(${k})`} stroke={OUTLINE} stroke-width={(STROKE * 0.6) / k} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-5.6 -0.6 C-6.4 -4.6 -3 -6.6 0 -6.2 C3.4 -6.6 6.6 -4.4 5.8 -0.4 C5.2 3.6 2.6 5.8 0 5.8 C-2.8 5.8 -5 3.6 -5.6 -0.6 Z" fill={color} />
      <path d="M-2.6 -1.8 C-2 -4 2.4 -4.2 2.8 -1.4 C3.2 1.2 0.4 2.6 -1.2 1.4 C-2.4 0.4 -1.2 -1.2 0.2 -0.6" fill="none" stroke-width={(STROKE * 0.45) / k} />
      <path d="M-5.2 1.2 C-3 3.4 3 3.4 5.4 1" fill="none" stroke-width={(STROKE * 0.45) / k} opacity={0.6} />
    </g>
  );
}

export function Leaf({ len = 7, color = '#9CCB86' }: { len?: number; color?: string }) {
  return (
    <path
      d={`M0 0 C${len * 0.25} ${-len * 0.4} ${len * 0.75} ${-len * 0.42} ${len} 0 C${len * 0.75} ${len * 0.42} ${len * 0.25} ${len * 0.4} 0 0 Z`}
      fill={color}
      stroke={OUTLINE}
      stroke-width={STROKE * 0.55}
      stroke-linejoin="round"
    />
  );
}

/** A ✦ sparkle with a white rim. */
export function Sparkle({ r = 3, color = '#FFE593', twinkle }: { r?: number; color?: string; twinkle?: boolean }) {
  return <path class={twinkle ? 'pet-twinkle' : undefined} d={sparklePath(0, 0, r)} fill={color} stroke="#fff" stroke-width={0.6} />;
}

/** Tiny gold crown with jewels, base centered on (0, 0), about 18 wide. */
export function Crown({ gold = '#FFD65C', jewel = '#F58CAA' }: { gold?: string; jewel?: string }) {
  return (
    <g stroke={OUTLINE} stroke-width={STROKE * 0.8} stroke-linejoin="round">
      <path d="M-9 1 L-9.6 -6.4 L-4.6 -2.2 L0 -9 L4.6 -2.2 L9.6 -6.4 L9 1 C3 2.4 -3 2.4 -9 1 Z" fill={gold} />
      <circle cx={0} cy={-2.2} r={1.6} fill={jewel} stroke-width={0.9} />
      <g fill="#FFF3B0" stroke-width={0.8}>
        <circle cx={-9.6} cy={-6.9} r={1.2} />
        <circle cx={0} cy={-9.6} r={1.3} />
        <circle cx={9.6} cy={-6.9} r={1.2} />
      </g>
      <path d="M-6.6 -1.4 L-7 -3.6" stroke="#fff" stroke-width={1.1} stroke-linecap="round" opacity={0.8} />
    </g>
  );
}

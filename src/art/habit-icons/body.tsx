/** Habit icons: body & health. */
import { ACCENT } from '@/art/icons/palette';
import { crescentPath, heartPath } from '@/art/icons/shapes';
import { Cheeks, ClosedEyes, Eyes, FINE, Shine, Smile, Sparkle, Tube, type HabitDrawing } from './kit';

const GLASS = 'M8.5 7h15l-1.7 19a2.2 2.2 0 0 1-2.2 2h-7.2a2.2 2.2 0 0 1-2.2-2z';
const WATER = 'M9.17 14.5c2.2-1.3 4.5 1.3 6.83 0s4.6-1.3 6.83 0L21.8 26a2.2 2.2 0 0 1-2.2 2h-7.2a2.2 2.2 0 0 1-2.2-2z';

const TABLET_HEART = heartPath(23.5, 24.1, 4);
const SLEEPY_MOON = crescentPath(15, 16, 10.5, 20.5, 11, 8.5);

/** A sneaker sole print centered on its origin (toe up). */
const SOLE =
  'M0-8.6c2.7 0 4.1 2 4.1 4.6 0 2.2-1.2 3.4-1.5 5.2-.3 1.6.8 3 .8 4.6 0 1.9-1.4 3-3.4 3s-3.4-1.1-3.4-3c0-1.6 1-3 .7-4.6-.3-1.8-1.4-3-1.4-5.2 0-2.6 1.4-4.6 4.1-4.6z';

const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${(16 + r * Math.cos(a)).toFixed(2)} ${(16 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(9.6)}L${p(12)}`;
}).join('');

export const BODY_ICONS: Record<string, HabitDrawing> = {
  water: (c) => (
    <g>
      <path d={GLASS} fill={c.soft} />
      <Tube d="M17.5 20L21.8 5.2l3.4-1" color={ACCENT.white} width={1.8} ink={c.ink} />
      <path d={WATER} fill={c.fill} stroke="none" />
      <path d="M9.17 14.5c2.2-1.3 4.5 1.3 6.83 0s4.6-1.3 6.83 0" fill="none" stroke-width={FINE} />
      <g fill="#fff" stroke="none">
        <circle cx={13} cy={22.5} r={1.1} />
        <circle cx={15.4} cy={19} r={0.8} />
      </g>
      <path d={GLASS} fill="none" />
      <Shine d="M11 10.2l.8 11" />
    </g>
  ),
  vitamins: (c) => (
    <g>
      <g transform="rotate(-40 16 15)">
        <path d="M9 11h7v8H9a4 4 0 0 1 0-8z" fill={c.fill} />
        <path d="M16 11h7a4 4 0 0 1 0 8h-7z" fill={c.soft} />
        <Shine d="M8.6 13.6h4" />
      </g>
      <circle cx={23.5} cy={23.8} r={4.2} fill={c.soft} />
      <path d={TABLET_HEART} fill={c.fill} stroke-width={1.2} />
      <Sparkle x={7} y={23.5} r={2.6} fill={c.fill} />
    </g>
  ),
  walk: (c) => (
    <g fill={c.fill}>
      <path d={SOLE} transform="translate(10.6 19.4) rotate(-12)" />
      <path d={SOLE} transform="translate(21.4 11.6) rotate(12)" />
      <Shine d="M8.3 14.4c.3-1.3 1.1-2.2 2.2-2.5" width={1.3} />
      <Shine d="M18.9 6.4c.4-1.2 1.2-2 2.3-2.2" width={1.3} />
    </g>
  ),
  run: (c) => (
    <g>
      <path d="M1.8 12.5h3.2M1.2 16.5h3" stroke-width={FINE} />
      <g transform="rotate(-8 16 18)">
        <path d="M5 22.5h22.2c1.1 0 1.7 1.2 1.2 2.2l-.3.6a2.4 2.4 0 0 1-2.2 1.4H7a2 2 0 0 1-2-2z" fill={c.soft} />
        <path
          d="M5.4 22.5v-10a2 2 0 0 1 2-2h2.7c1 0 1.5.9 1.9 1.7.8 1.6 2.4 2.4 4 2l1.6-.4c4 1.7 8.8 3.2 10 6 .4 1 .4 1.9.1 2.7z"
          fill={c.fill}
        />
        <path d="M13.4 17.6l2.5-1.4M15.6 19.4l2.6-1.6M18 21l2.4-1.4" stroke-width={FINE} />
        <Shine d="M7.6 13.6v4.2" />
      </g>
    </g>
  ),
  stretch: (c) => (
    <g>
      {/* A cat in a big front stretch: paws forward, bottom up, tail high. */}
      <path d="M26 13.2c1.3-2.3 1.4-5.5-.3-8.3" fill="none" stroke-width={2.6} />
      <path
        d="M4.2 27.2h7.3c1-.9 2.2-1.5 3.6-1.8 2.8-.6 5.2-1.6 7-3.2l.4 4.6c.1 .6.6 1 1.2 1h2.2c.6 0 1-.5 1-1.1l-.3-6.4c1.6-2 2.1-4.6 1.1-6.7-1.4-2.8-5-3.3-7.3-1.2-2.4 2.2-5 4.3-8 5.2l-1.8-2.5-1.2 2.9c-1.6.1-3 .8-3.8 2l-2.7-.6 1 2.5c-.5 1-.6 2.2-.3 3.3-1.9.3-3.3 1.1-3.3 2z"
        fill={c.fill}
      />
      <path d="M10.8 22.4l.1.1M8 23.1l.1.1" stroke-width={2} />
      <Cheeks l={7.2} r={11.8} y={25} />
      <Shine d="M18.2 16.4c1.2-.9 2.4-1.8 3.4-2.8" width={1.3} />
    </g>
  ),
  yoga: (c) => (
    <g>
      {/* A mat unrolled toward us, its roll resting on the far edge. */}
      <path d="M8.8 18.6h17.6c.9 0 1.5.9 1.1 1.7l-3.2 6.6c-.3.6-.9 1-1.6 1H4.6c-.9 0-1.5-.9-1.1-1.7l3.7-6.6c.3-.6 1-1 1.6-1z" fill={c.fill} />
      <path d="M7.4 25.4h15" fill="none" stroke="#fff" stroke-width={1.5} opacity={0.85} />
      <path d="M9 12.4h15.6a3.8 3.8 0 0 1 0 7.6H9z" fill={c.fill} />
      <ellipse cx={9} cy={16.2} rx={3.4} ry={3.8} fill={c.soft} />
      <path d="M9 17.8a1.6 1.6 0 1 1 1.6-1.6" fill="none" stroke-width={FINE} />
      <path d="M17.8 12.4v7.6" fill="none" stroke-width={FINE} />
      <Sparkle x={24} y={6} r={2.8} fill={c.soft} />
    </g>
  ),
  dumbbell: (c) => (
    <g transform="rotate(-24 16 16)">
      <rect x={9.5} y={14.4} width={13} height={3.2} rx={1} fill={c.soft} />
      <rect x={2.8} y={11.2} width={3.6} height={9.6} rx={1.5} fill={c.fill} />
      <rect x={5.6} y={8} width={4.4} height={16} rx={2} fill={c.fill} />
      <rect x={25.6} y={11.2} width={3.6} height={9.6} rx={1.5} fill={c.fill} />
      <rect x={22} y={8} width={4.4} height={16} rx={2} fill={c.fill} />
      <Shine d="M7.8 10.5v4" width={1.3} />
      <Shine d="M24.2 10.5v4" width={1.3} />
    </g>
  ),
  bike: (c) => (
    <g>
      <circle cx={8} cy={21.5} r={5.4} fill={c.soft} />
      <circle cx={24} cy={21.5} r={5.4} fill={c.soft} />
      <Tube d="M8 21.5l4.8-8.3h8.4L24 21.5M12.8 13.2l3.4 8.3 5-8.3" color={c.fill} width={1.6} ink={c.ink} />
      <path d="M12.3 9.8l.9 3.4M21.2 13.2l-1-4h2.9" fill="none" />
      <path d="M9.8 9.6h4.6" stroke-width={2.4} />
      <circle cx={16.2} cy={21.5} r={1.5} fill={c.fill} stroke-width={FINE} />
      <g fill={c.ink} stroke="none">
        <circle cx={8} cy={21.5} r={1} />
        <circle cx={24} cy={21.5} r={1} />
      </g>
    </g>
  ),
  swim: (c) => (
    <g>
      <circle cx={16} cy={14} r={6.3} fill="none" stroke={c.ink} stroke-width={4.6 + 3.8} />
      <circle cx={16} cy={14} r={6.3} fill="none" stroke="#fff" stroke-width={4.6} />
      <circle cx={16} cy={14} r={6.3} fill="none" stroke={c.fill} stroke-width={4.6} stroke-dasharray="4.95 4.95" stroke-linecap="butt" />
      <path d="M2.5 21.5c2.3-1.6 4.4-1.6 6.7 0s4.4 1.6 6.8 0 4.4-1.6 6.8 0 4.4 1.6 6.7 0V29H2.5z" fill={c.soft} stroke="none" />
      <path d="M2.5 21.5c2.3-1.6 4.4-1.6 6.7 0s4.4 1.6 6.8 0 4.4-1.6 6.8 0 4.4 1.6 6.7 0" fill="none" />
      <path d="M7 26h4M17.5 26.5h5" stroke-width={FINE} />
      <Shine d="M10.9 9.4a6.4 6.4 0 0 1 3-2.6" width={1.3} />
    </g>
  ),
  'moon-sleep': (c) => (
    <g>
      <path d={SLEEPY_MOON} fill={c.fill} />
      <ClosedEyes l={8.6} r={13.4} y={18.4} sleepy />
      <Cheeks l={7.6} r={14.6} y={21.2} />
      <Shine d="M6.6 12.6a9 9 0 0 1 3.2-4.6" />
      <path d="M20 4.5h4l-4 4.5h4M25.5 11h2.6l-2.6 3h2.6" fill="none" stroke-width={FINE} />
      <Sparkle x={27} y={25} r={2.2} fill={c.soft} />
    </g>
  ),
  apple: (c) => (
    <g>
      <path d="M16 11c.2-2.3 1-4.2 2.4-5.7" fill="none" />
      <path d="M17.2 8.6c1.4-3 4.8-3.8 7.5-2.8-1.2 3-4.6 4.2-7.5 2.8z" fill={c.fill} />
      <path
        d="M16 10.4c-2.6-1.6-9-1.8-10 4.3-.8 5 2.5 12.4 6.5 12.9 1.5.2 2.5-.5 3.5-.5s2 .7 3.5.5c4-.5 7.3-7.9 6.5-12.9-1-6.1-7.4-5.9-10-4.3z"
        fill={ACCENT.red}
      />
      <Shine d="M9 14.4c.4-1.6 1.5-2.5 3-2.8" />
    </g>
  ),
  salad: (c) => (
    <g>
      <path d="M5.2 16.5c-.6-3.4 2.8-5 4.9-3.6.6-3 4.8-3.9 6.3-1.2 1.5-2.6 5.6-1.8 5.7 1.3 2.2-1.2 5.4.5 4.6 3.5z" fill={ACCENT.leaf} />
      <path d="M10.1 12.9c.8 1 1.2 2.2 1.2 3.6M16.2 11.7c-.3 1.6-.2 3.2.3 4.8" fill="none" stroke-width={FINE} />
      <circle cx={21.3} cy={13.4} r={2.6} fill={ACCENT.red} stroke-width={FINE} />
      <path d="M4.3 16.5h23.4c0 6-4.9 10.6-11.7 10.6S4.3 22.5 4.3 16.5z" fill={c.fill} />
      <path d="M13 29h6" />
      <Shine d="M7.6 19.4c.7 1.9 1.9 3.3 3.5 4.2" />
    </g>
  ),
  tea: (c) => (
    <g>
      <path d="M12 9.2c-1-1.4 1-2.4 0-4.2M17 9.2c-1-1.4 1-2.4 0-4.2" fill="none" stroke-width={FINE} />
      <path d="M22 14c3.4-.6 4.6 1.7 3.6 3.8-.7 1.5-2 2.2-4.1 2.2" fill="none" />
      <path d="M4.5 25.4h21.5c-.4 1.9-2.9 3.1-5.9 3.1h-9.7c-3 0-5.5-1.2-5.9-3.1z" fill={c.soft} />
      <path d="M7 11.8h15v5.7c0 4.4-3.4 7.7-7.5 7.7S7 21.9 7 17.5z" fill={c.fill} />
      <path d="M14.5 21.2c-.6-.5-2.3-1.6-2.3-3 0-.8.6-1.4 1.3-1.4.5 0 .8.3 1 .6.2-.3.5-.6 1-.6.7 0 1.3.6 1.3 1.4 0 1.4-1.7 2.5-2.3 3z" fill={c.soft} stroke-width={FINE} />
      <Shine d="M9.4 14.4v2.8" />
    </g>
  ),
  tooth: (c) => (
    <g>
      <path
        d="M16 6.8c-2.4 0-3.4-1-5.9-1-3.5 0-5.1 3-4.6 6.6.5 3.4 2 4.9 2.5 7.9.5 3.5.8 7 2.5 7 1.8 0 2.3-2.5 3-5 .5-1.6 1.3-2.5 2.5-2.5s2 .9 2.5 2.5c.7 2.5 1.2 5 3 5 1.7 0 2-3.5 2.5-7 .5-3 2-4.5 2.5-7.9.5-3.6-1.1-6.6-4.6-6.6-2.5 0-3.5 1-5.9 1z"
        fill={c.soft}
      />
      <Eyes l={12.3} r={19.7} y={12.6} ink={c.ink} />
      <Cheeks l={10.2} r={21.8} y={15.4} />
      <Smile x={16} y={15} />
      <Shine d="M8 10.2c.3-1.3 1.1-2.1 2.2-2.4" />
      <Sparkle x={26.2} y={5.6} r={3} fill={c.fill} />
    </g>
  ),
  skincare: (c) => (
    <g>
      <path d="M16 7.5V4.2h5.3" fill="none" />
      <rect x={12.2} y={7.3} width={7.6} height={3} rx={1} fill={c.soft} />
      <rect x={13.4} y={10.3} width={5.2} height={3} fill={c.soft} />
      <rect x={8.5} y={13.3} width={15} height={15.2} rx={4} fill={c.fill} />
      <rect x={11.3} y={17.3} width={9.4} height={7.2} rx={1.6} fill={c.soft} stroke-width={FINE} />
      <path d="M16 18.8c1.2 1.4 1.8 2.3 1.8 3a1.8 1.8 0 0 1-3.6 0c0-.7.6-1.6 1.8-3z" fill={c.fill} stroke-width={FINE} />
      <Shine d="M10.6 16v3.4" />
      <Sparkle x={26.5} y={10} r={2.6} fill={c.soft} />
    </g>
  ),
  'no-phone': (c) => (
    <g>
      <rect x={8.5} y={4} width={15} height={24.5} rx={3.6} fill={c.fill} />
      <rect x={10.8} y={7} width={10.4} height={16.6} rx={1.6} fill={c.soft} stroke-width={FINE} />
      <ClosedEyes l={13.8} r={18.2} y={14.2} sleepy />
      <Cheeks l={12.9} r={19.1} y={16.8} />
      <circle cx={16} cy={25.9} r={0.9} fill={c.ink} stroke="none" />
      <path d="M24.8 4.6h3.4l-3.4 3.8h3.4" fill="none" stroke-width={FINE} />
    </g>
  ),
  sun: (c) => (
    <g>
      <path d={SUN_RAYS} />
      <circle cx={16} cy={16} r={7.2} fill={c.fill} />
      <Eyes l={13.4} r={18.6} y={15.4} ink={c.ink} />
      <Cheeks l={11.9} r={20.1} y={18.2} />
      <Smile x={16} y={18.2} w={2.2} />
      <Shine d="M10.9 13.2a6 6 0 0 1 2.4-3" />
    </g>
  ),
};

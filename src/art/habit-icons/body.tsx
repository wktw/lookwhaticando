/** Habit icons: body and health. Small real objects: a glass, shoes, a mat, a bowl, a toothbrush. */
import { Thin, type HabitDrawing } from './kit';

/** Moons with a bite taken out (computed offline, committed). */
const SLEEP_MOON = 'M13.11 4.66A10.6 10.6 0 1 0 24.37 18.17A9 9 0 0 1 13.11 4.66Z';
const SCREEN_MOON = 'M14.71 10.46A4.2 4.2 0 1 0 19.46 15.68A3.6 3.6 0 0 1 14.71 10.46Z';

/** A low sneaker, side view, toe to the right, sole on y 24. */
const SHOE = 'M3.4 22.2c0-3.6.9-7 2.4-9.2.6-.9 1.8-1.1 2.6-.3l2.4 2.1c1.4 1.2 3.4 1.2 4.6-.1l.6-.6c1.4 1.1 4 2.6 7.4 3.4 3.4.8 5.4 2.2 5.4 4.7z';
const SOLE = 'M3 21.8h26.2v1.2a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 23z';
const LACES = 'M13.2 16.2l1.8-1.8M16 17.4l1.6-1.8M18.8 18.2l1.4-1.6';

const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${(16 + r * Math.cos(a)).toFixed(2)} ${(16 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(10)}L${p(13)}`;
}).join('');

export const BODY_ICONS: Record<string, HabitDrawing> = {
  water: (c) => (
    <g>
      <path d="M8.2 5.2h15.6l-2 21.2a2.8 2.8 0 0 1-2.8 2.6h-6a2.8 2.8 0 0 1-2.8-2.6z" fill={c.light} />
      <path d="M9.1 13.8h13.8l-1.1 12.6a2.8 2.8 0 0 1-2.8 2.6h-6a2.8 2.8 0 0 1-2.8-2.6z" fill={c.fill} />
      <path d="M18.6 13.8h4.3l-1.1 12.6a2.8 2.8 0 0 1-2.8 2.6h-.4z" fill={c.shade} />
      <path d="M10.2 26.6h11.6l-.1.6a2.8 2.8 0 0 1-2.7 1.8h-6a2.8 2.8 0 0 1-2.7-1.8z" fill={c.ink} />
      <ellipse cx={16} cy={5.2} rx={7.8} ry={1.3} fill="none" stroke={c.ink} stroke-width={1.5} />
    </g>
  ),
  vitamins: (c) => (
    <g>
      <g transform="rotate(-40 13.4 12.6)">
        <rect x={4} y={8.4} width={18.8} height={8.4} rx={4.2} fill={c.fill} />
        <path d="M13.4 8.4h5.2a4.2 4.2 0 0 1 0 8.4h-5.2z" fill={c.ink} />
      </g>
      <circle cx={22.4} cy={22.4} r={6.6} fill={c.light} />
      <path d="M22.4 15.8a6.6 6.6 0 0 1 0 13.2 4.6 6.6 0 0 0 0-13.2z" fill={c.shade} />
      <rect x={16.6} y={21.6} width={11.6} height={1.7} rx={0.85} transform="rotate(-40 22.4 22.4)" fill={c.ink} />
    </g>
  ),
  walk: (c) => (
    <g>
      <g transform="translate(7.4 .6) scale(.8)">
        <path d={SHOE} fill={c.light} />
        <path d={SOLE} fill={c.shade} />
      </g>
      <path d={SHOE} fill={c.fill} />
      <path d={SOLE} fill={c.ink} />
      <Thin d={LACES} c={c} w={1.4} />
    </g>
  ),
  run: (c) => (
    <g>
      <Thin d="M2.4 11.6h4.4M1.6 16h3.6" c={c} w={1.8} />
      <g transform="rotate(-14 16 18)">
        <path d={SHOE} fill={c.fill} />
        <path d="M17.4 15.6c1.8 1.2 4.2 2.2 6.4 2.7M9.6 19.2h6" fill="none" stroke={c.light} stroke-width={1.6} stroke-linecap="round" />
        <path d={SOLE} fill={c.ink} />
        <Thin d={LACES} c={c} w={1.4} />
      </g>
    </g>
  ),
  /** A resistance band: an elastic sagging between two foam grips. */
  stretch: (c) => (
    <g>
      <path d="M7.4 13.4C10.4 26.4 21.6 26.4 24.6 13.4" fill="none" stroke={c.fill} stroke-width={3.4} stroke-linecap="round" />
      <path d="M16 23.2c3.4 0 7-3.2 8.6-9.8" fill="none" stroke={c.shade} stroke-width={3.4} stroke-linecap="round" />
      <rect x={3.4} y={6.4} width={4.6} height={13.4} rx={2.3} transform="rotate(-12 5.7 13.1)" fill={c.ink} />
      <rect x={24} y={6.4} width={4.6} height={13.4} rx={2.3} transform="rotate(12 26.3 13.1)" fill={c.ink} />
    </g>
  ),
  /** A yoga mat half unrolled: the flat end toward us, the rest still in a roll at the back. */
  yoga: (c) => (
    <g>
      <path d="M6 16.2h20l4.2 10.2H1.8z" fill={c.fill} />
      <path d="M1.8 26.4h28.4l-.3 1.7H2.1z" fill={c.shade} />
      <path d="M6 16.2h20l.6 2.2H5.4z" fill={c.shade} />
      <rect x={5.4} y={8} width={21.2} height={8.6} rx={4.3} fill={c.fill} />
      <path d="M5.4 12.3a4.3 4.3 0 0 0 4.3 4.3h12.6a4.3 4.3 0 0 0 4.3-4.3z" fill={c.shade} />
      <rect x={10} y={7.6} width={2.2} height={9.4} rx={0.8} fill={c.ink} />
      <circle cx={22.3} cy={12.3} r={4.3} fill={c.light} />
      <path d="M22.3 12.9a.8.8 0 0 1-.5-1.4 1.8 1.8 0 0 1 2.4 1.1 2.9 2.9 0 0 1-2.6 3.1 3.8 3.8 0 0 1-3.6-3" fill="none" stroke={c.ink} stroke-width={1.2} stroke-linecap="round" />
    </g>
  ),
  dumbbell: (c) => (
    <g transform="rotate(-24 16 16)">
      <rect x={10} y={14.4} width={12} height={3.2} rx={1.2} fill={c.ink} />
      <rect x={3} y={8.4} width={5.4} height={15.2} rx={2.2} fill={c.fill} />
      <rect x={23.6} y={8.4} width={5.4} height={15.2} rx={2.2} fill={c.fill} />
      <rect x={8} y={11} width={2.6} height={10} rx={1} fill={c.shade} />
      <rect x={21.4} y={11} width={2.6} height={10} rx={1} fill={c.shade} />
    </g>
  ),
  bike: (c) => (
    <g>
      <circle cx={8.2} cy={21.2} r={6} fill="none" stroke={c.ink} stroke-width={2.2} />
      <circle cx={23.8} cy={21.2} r={6} fill="none" stroke={c.ink} stroke-width={2.2} />
      <path d="M8.2 21.2l5-9h8.6l2 9.2M13.2 12.2l3 9h7.6M16.2 21.2l5.6-9" fill="none" stroke={c.fill} stroke-width={2.4} stroke-linecap="round" stroke-linejoin="round" />
      <rect x={10.2} y={9} width={6} height={2.4} rx={1.2} fill={c.ink} />
      <Thin d="M21.8 12.2l-1-3.4h3.4" c={c} w={1.8} />
      <circle cx={16.2} cy={21.2} r={1.6} fill={c.ink} />
    </g>
  ),
  swim: (c) => (
    <g>
      <Thin d="M5.6 14.6C2.8 14.8 2.2 19.6 4.8 21.6M26.4 14.6c2.8.2 3.4 5 .8 7" c={c} w={1.8} />
      <rect x={5} y={11.2} width={9.6} height={8.4} rx={4.2} fill={c.fill} />
      <rect x={17.4} y={11.2} width={9.6} height={8.4} rx={4.2} fill={c.fill} />
      <path d="M11 11.2h-.2a4.2 4.2 0 0 1 0 8.4h.2a4.2 4.2 0 0 0 0-8.4zM23.4 11.2h-.2a4.2 4.2 0 0 1 0 8.4h.2a4.2 4.2 0 0 0 0-8.4z" fill={c.shade} />
      <rect x={7} y={13} width={5.6} height={4.8} rx={2.4} fill={c.light} />
      <rect x={19.4} y={13} width={5.6} height={4.8} rx={2.4} fill={c.light} />
      <Thin d="M14.4 15.2q1.6-1.6 3.2 0" c={c} w={1.8} />
      <Thin d="M4 26.6c2-1.4 3.8-1.4 5.8 0s3.8 1.4 5.8 0 3.8-1.4 5.8 0 3.8 1.4 5.8 0" c={c} w={1.5} color={c.fill} />
    </g>
  ),
  'moon-sleep': (c) => (
    <g>
      <path d={SLEEP_MOON} fill={c.fill} />
      <path d="M17.6 28.2h9.2a2.6 2.6 0 0 0 .2-5.2 3.4 3.4 0 0 0-6.4-1.4 2.8 2.8 0 0 0-4.4 2.4 2.1 2.1 0 0 0 1.4 4.2z" fill={c.light} />
    </g>
  ),
  apple: (c) => (
    <g>
      <path d="M16 10.4c-2.6-1.6-7.6-1.6-9.4 2.8-2.2 5.4.4 13 5 14.6 1.6.6 3 .2 4.4-.4 1.4.6 2.8 1 4.4.4 4.6-1.6 7.2-9.2 5-14.6-1.8-4.4-6.8-4.4-9.4-2.8z" fill={c.fill} />
      <path d="M19.8 9.4c2.4-.2 4.8 1.2 5.6 3.8 2.2 5.4-.4 13-5 14.6-1.6.6-3 .2-4.4-.4 3.4-2.6 5.4-7.6 5.4-12 0-2.4-.6-4.4-1.6-6z" fill={c.shade} />
      <Thin d="M16 10.6c-.2-2.4.4-4.2 1.8-5.6" c={c} w={1.9} />
      <path d="M17.6 7.4c1.2-2.6 3.8-3.6 6.4-2.8-1 2.6-3.6 3.8-6.4 2.8z" fill={c.ink} />
    </g>
  ),
  salad: (c) => (
    <g>
      <path d="M7.2 17c-.6-3.8 1.4-6.8 5-7.2.8 3.4-1 6.4-5 7.2z" fill={c.ink} />
      <path d="M11.6 16.8c.2-4.8 3-8.2 7-8.8.6 4.4-2 8-7 8.8z" fill={c.ink} />
      <circle cx={21.8} cy={14.4} r={2.8} fill={c.light} />
      <path d="M18.8 16.8c1-3.6 3.8-5.4 7.2-5-.2 3.4-3 5.2-7.2 5z" fill={c.ink} />
      <path d="M3.8 16.4h24.4c0 6.8-5.4 11.8-12.2 11.8S3.8 23.2 3.8 16.4z" fill={c.fill} />
      <path d="M22.6 16.4h5.6c0 5.6-3.6 10-8.8 11.4 2.2-3.2 3.2-7 3.2-11.4z" fill={c.shade} />
    </g>
  ),
  tea: (c) => (
    <g>
      <Thin d="M11.8 12.6V7l3.6-1.4" c={c} w={1.2} />
      <rect x={14.8} y={2.8} width={4.8} height={4.8} rx={0.8} fill={c.light} />
      <path d="M21.4 14.2h1.8a3.2 3.2 0 0 1 0 6.4h-2" fill="none" stroke={c.ink} stroke-width={2.2} />
      <path d="M5.8 12.4h16v6a6.6 6.6 0 0 1-6.6 6.6h-2.8a6.6 6.6 0 0 1-6.6-6.6z" fill={c.fill} />
      <path d="M17.4 12.4h4.4v6a6.6 6.6 0 0 1-5.8 6.56c1-2 1.4-4.4 1.4-6.6z" fill={c.shade} />
      <rect x={2.6} y={25} width={25.2} height={2.8} rx={1.4} fill={c.ink} />
    </g>
  ),
  tooth: (c) => (
    <g transform="rotate(-34 16 17)">
      <rect x={1.6} y={17.4} width={17.4} height={3.6} rx={1.8} fill={c.fill} />
      <rect x={17.6} y={17.8} width={4.4} height={2.8} fill={c.fill} />
      <rect x={21} y={16.6} width={8.8} height={4.4} rx={1.6} fill={c.fill} />
      <rect x={21.6} y={11.2} width={7.6} height={5.4} rx={1} fill={c.ink} />
      <path d="M21.4 11.2c0-2.2 1.6-3.4 3.6-3.4s3.8 1.2 3.6 3.4z" fill={c.light} />
      <rect x={3.4} y={18.6} width={8} height={1.3} rx={0.65} fill={c.shade} />
    </g>
  ),
  skincare: (c) => (
    <g>
      <rect x={15} y={5.4} width={2.2} height={4.6} fill={c.ink} />
      <path d="M13 3.2h8.4a1.2 1.2 0 0 1 1.2 1.2v.4h3v1.8h-3v.4a1.2 1.2 0 0 1-1.2 1.2H13z" fill={c.ink} />
      <rect x={12.2} y={9.4} width={7.6} height={4.2} rx={1} fill={c.ink} />
      <rect x={9} y={13} width={14} height={15.8} rx={3.2} fill={c.fill} />
      <path d="M19.4 13h.4a3.2 3.2 0 0 1 3.2 3.2v9.4a3.2 3.2 0 0 1-3.2 3.2h-.4z" fill={c.shade} />
      <rect x={11.2} y={17.2} width={8.6} height={6.8} rx={1.2} fill={c.light} />
    </g>
  ),
  'no-phone': (c) => (
    <g>
      <rect x={8.6} y={2.8} width={14.8} height={26.4} rx={3.4} fill={c.ink} />
      <rect x={10.6} y={5.6} width={10.8} height={19.8} rx={1.4} fill={c.fill} />
      <path d={SCREEN_MOON} fill={c.light} />
      <rect x={13.8} y={26.4} width={4.4} height={1.3} rx={0.65} fill={c.light} />
    </g>
  ),
  sun: (c) => (
    <g>
      <path d={SUN_RAYS} fill="none" stroke={c.ink} stroke-width={2.6} stroke-linecap="round" />
      <circle cx={16} cy={16} r={7} fill={c.fill} />
      <path d="M16 9a7 7 0 0 1 0 14 5.4 7 0 0 0 0-14z" fill={c.shade} />
    </g>
  ),
};

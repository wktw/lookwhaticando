/** Habit icons: home and chores. A broom, a spray bottle, a tub, a washer, plates, a can, tools. */
import { circlePath } from '@/art/icons/shapes';
import { Thin, type HabitDrawing } from './kit';

/** A small paw print centred on its pad (a decal). */
const PAW = 'M0-1C2.6-1 4.4 1.4 4.4 3.4 4.4 5 3 5.6 0 5.6S-4.4 5-4.4 3.4C-4.4 1.4-2.6-1 0-1z';
const TOES: [number, number][] = [
  [-4.4, -2.8],
  [-1.6, -5.4],
  [1.6, -5.4],
  [4.4, -2.8],
];

export const HOME_ICONS: Record<string, HabitDrawing> = {
  broom: (c) => (
    <g>
      <Thin d="M25.8 3.2L15.2 17.4" c={c} w={2.4} />
      <path d="M11.2 15.4l7 5-4.2 8.4c-.5 1-1.7 1.3-2.6.7L3.8 24c-.9-.6-1-1.8-.3-2.6z" fill={c.fill} />
      <path d="M14.6 18l3.6 2.4-4.2 8.4c-.5 1-1.7 1.3-2.6.7l-1.4-1z" fill={c.shade} />
      <path d="M11.2 15.4l7 5-1.3 2.6-7.1-5z" fill={c.ink} />
      <Thin d="M7.4 22.8l5.4 3.8M9.2 20.6l5 3.6" c={c} w={1.1} color={c.light} />
    </g>
  ),
  'sparkle-clean': (c) => (
    <g>
      <g fill={c.light}>
        <circle cx={27} cy={6.4} r={1.2} />
        <circle cx={28.4} cy={10.2} r={1.2} />
        <circle cx={25.4} cy={2.8} r={1.1} />
      </g>
      <path d="M10.2 5.2h9.4a1.4 1.4 0 0 1 1.4 1.4v.6h3v2.6h-3v.6a1.4 1.4 0 0 1-1.4 1.4h-9.4z" fill={c.ink} />
      <Thin d="M13.6 11.6l-2.8 4.2" c={c} w={2} />
      <rect x={12.4} y={11} width={6} height={3.4} rx={0.6} fill={c.ink} />
      <path d="M10.4 14h10.2l1.4 12.6a2.4 2.4 0 0 1-2.4 2.6h-8.2a2.4 2.4 0 0 1-2.4-2.6z" fill={c.fill} />
      <path d="M17.8 14h2.8l1.4 12.6a2.4 2.4 0 0 1-2.4 2.6h-.6z" fill={c.shade} />
      <rect x={12} y={17.6} width={6.6} height={6.4} rx={1} fill={c.light} />
    </g>
  ),
  bathtub: (c) => (
    <g>
      <Thin d="M6.4 13.8V7.6a2.4 2.4 0 0 1 4.8 0v.6" c={c} w={1.9} />
      <circle cx={14.4} cy={11.8} r={2.4} fill={c.light} />
      <circle cx={18.8} cy={10.6} r={3} fill={c.light} />
      <circle cx={23.2} cy={11.8} r={2.2} fill={c.light} />
      <Thin d="M7.6 25.4l-1.4 3.6M24.4 25.4l1.4 3.6" c={c} w={2.4} />
      <path d="M3.4 15.8h25.2v3.4c0 4.2-3.4 7.4-7.6 7.4H11c-4.2 0-7.6-3.2-7.6-7.4z" fill={c.fill} />
      <path d="M23 15.8h5.6v3.4c0 4-3 7.2-7 7.4 1-2.4 1.4-5.6 1.4-10.8z" fill={c.shade} />
      <rect x={2.2} y={13.6} width={27.6} height={2.8} rx={1.4} fill={c.ink} />
    </g>
  ),
  laundry: (c) => (
    <g>
      <rect x={5} y={3.2} width={22} height={25.8} rx={3.4} fill={c.fill} />
      <path d="M22.4 3.2h1.2a3.4 3.4 0 0 1 3.4 3.4v19a3.4 3.4 0 0 1-3.4 3.4h-1.2z" fill={c.shade} />
      <circle cx={9} cy={7.2} r={1.3} fill={c.ink} />
      <circle cx={12.8} cy={7.2} r={1.3} fill={c.ink} />
      <rect x={17} y={6.2} width={6.4} height={2} rx={1} fill={c.ink} />
      <circle cx={16} cy={18.8} r={7.2} fill={c.ink} />
      <circle cx={16} cy={18.8} r={5} fill={c.light} />
      <path d="M11 19.6c1.6 1.2 3.4 1.2 5 0s3.4-1.2 5 0a5 5 0 0 1-10 0z" fill={c.fill} />
    </g>
  ),
  dishes: (c) => (
    <g>
      <path d="M11.2 5.6h9.6v3.8a4.2 4.2 0 0 1-4.2 4.2h-1.2a4.2 4.2 0 0 1-4.2-4.2z" fill={c.light} />
      <path d="M20.8 6.8h.8a2.2 2.2 0 0 1 0 4.4h-1.2" fill="none" stroke={c.light} stroke-width={1.8} />
      <path d="M3.2 14.4h25.6c-.4 2.6-2.6 4.2-5 4.2H8.2c-2.4 0-4.6-1.6-5-4.2z" fill={c.fill} />
      <path d="M4.4 19.6h23.2c-.4 2.4-2.4 3.8-4.6 3.8H9c-2.2 0-4.2-1.4-4.6-3.8z" fill={c.ink} />
      <path d="M3.2 24.4h25.6c-.4 2.6-2.6 4.2-5 4.2H8.2c-2.4 0-4.6-1.6-5-4.2z" fill={c.fill} />
      <path d="M22 24.4h6.8c-.4 2.6-2.6 4.2-5 4.2h-3.4c.8-1 1.4-2.4 1.6-4.2zM22 14.4h6.8c-.4 2.6-2.6 4.2-5 4.2h-3.4c.8-1 1.4-2.4 1.6-4.2z" fill={c.shade} />
    </g>
  ),
  'watering-can': (c) => (
    <g>
      <Thin d="M7.2 12c0-5.6 9.4-5.6 9.4 0" c={c} w={2.4} />
      <path d="M18.4 22.8l7.2-10.4 2.3 1.5-8 12z" fill={c.fill} />
      <rect x={24.2} y={8.2} width={6.4} height={3.4} rx={1.2} transform="rotate(34 27.4 9.9)" fill={c.ink} />
      <path d="M4.2 13.8a2 2 0 0 1 2-2h11.4a2 2 0 0 1 2 2v10.6a3.6 3.6 0 0 1-3.6 3.6H7.8a3.6 3.6 0 0 1-3.6-3.6z" fill={c.fill} />
      <path d="M15.4 11.8h2.2a2 2 0 0 1 2 2v10.6a3.6 3.6 0 0 1-3.6 3.6h-.6z" fill={c.shade} />
      <g fill={c.light}>
        <ellipse cx={29.4} cy={16.4} rx={1} ry={1.5} />
        <ellipse cx={27.4} cy={19.6} rx={1} ry={1.5} />
      </g>
    </g>
  ),
  wrench: (c) => (
    <g transform="rotate(-45 16 16)">
      <rect x={8} y={13.8} width={15} height={4.4} rx={1.6} fill={c.fill} />
      <path d={`${circlePath(6.8, 16, 4.8)}${circlePath(6.8, 16, 2)}`} fill={c.fill} fill-rule="evenodd" />
      <path d="M29 12.8L25.2 14.3V17.7L29 19.2A6 6 0 1 1 29 12.8Z" fill={c.fill} />
      <path d="M8 16h15v2.2H8zM2 16h2.8a2 2 0 0 0 4 0h2.8a4.8 4.8 0 0 1-9.6 0zM17.6 16h7.6v1.7l3.8 1.5a6 6 0 0 1-11.4-3.2z" fill={c.shade} />
      <rect x={11.4} y={15.2} width={8.4} height={1.6} rx={0.8} fill={c.ink} />
    </g>
  ),
  cart: (c) => (
    <g>
      <rect x={13.4} y={1.6} width={4.6} height={15} rx={2.3} transform="rotate(24 15.7 9.1)" fill={c.light} />
      <path d="M9.6 12.2c-1.8-3-1.2-6.4 1.4-8.2 1.4 2.8.8 6-1.4 8.2zM11.6 12.4c.2-3.2 2.4-5.4 5.2-5.8 0 3-2 5.2-5.2 5.8z" fill={c.ink} />
      <path d="M6.2 11.4h19.6l-1.4 15.6a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8z" fill={c.fill} />
      <path d="M21 11.4h4.8l-1.4 15.6a2 2 0 0 1-2 1.8h-1.2z" fill={c.shade} />
      <rect x={5.8} y={10.8} width={20.4} height={2.8} rx={0.6} fill={c.ink} />
    </g>
  ),
  house: (c) => (
    <g>
      <rect x={20.8} y={5.2} width={3.2} height={6.2} fill={c.shade} />
      <rect x={6.4} y={13.6} width={19.2} height={14.8} rx={1.4} fill={c.light} />
      <path d="M21.2 13.6h3a1.4 1.4 0 0 1 1.4 1.4v12a1.4 1.4 0 0 1-1.4 1.4h-3z" fill={c.fill} />
      <rect x={6.4} y={17} width={19.2} height={1.4} fill={c.ink} />
      <path d="M3.4 15.2L16 4.2l12.6 11c.8.7.3 2-.8 2H4.2c-1.1 0-1.6-1.3-.8-2z" fill={c.fill} />
      <path d="M16 4.2l12.6 11c.8.7.3 2-.8 2H16z" fill={c.shade} />
      <rect x={13.8} y={20} width={4.4} height={8.4} rx={1.2} fill={c.ink} />
      <rect x={8.8} y={20} width={3.6} height={3.6} rx={0.6} fill={c.soft} />
    </g>
  ),
  paw: (c) => (
    <g>
      <circle cx={11.4} cy={13.2} r={2.4} fill={c.light} />
      <circle cx={16} cy={12} r={2.6} fill={c.light} />
      <circle cx={20.6} cy={13.2} r={2.2} fill={c.light} />
      <path d="M4.2 16.4h23.6l-2.2 9.8a2.4 2.4 0 0 1-2.4 1.8H8.8a2.4 2.4 0 0 1-2.4-1.8z" fill={c.fill} />
      <path d="M22.2 16.4h5.6l-2.2 9.8a2.4 2.4 0 0 1-2.4 1.8h-2.4z" fill={c.shade} />
      <rect x={3} y={14.4} width={26} height={3.4} rx={1.7} fill={c.ink} />
      <g transform="translate(14.6 21.8) scale(.62)" fill={c.light}>
        <path d={PAW} />
        {TOES.map(([x, y]) => (
          <ellipse key={x} cx={x} cy={y} rx={1.6} ry={2} />
        ))}
      </g>
    </g>
  ),
};

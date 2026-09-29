/** Habit icons: people, feelings and plans. A telephone, a letter, a piggy bank, yarn, a candle, a flag. */
import { flowerPath, heartPath, scallopPath } from '@/art/icons/shapes';
import { Thin, type HabitDrawing } from './kit';

const SEAL = heartPath(16, 17.6, 7);
const BLOOM = flowerPath(16, 12.2, 3.8, 9.8, 8, 22.5);
/** A vanity mirror's scalloped frame. */
const MIRROR_FRAME = scallopPath(16, 11.8, 9.2, 16, 0.75);

export const HEART_ICONS: Record<string, HabitDrawing> = {
  phone: (c) => (
    <g>
      <path d="M5.2 18.8c0-3.4 2.6-5.6 6-5.6h9.6c3.4 0 6 2.2 6 5.6v6a3 3 0 0 1-3 3H8.2a3 3 0 0 1-3-3z" fill={c.fill} />
      <path d="M22 13.4c2.8.6 4.8 2.6 4.8 5.4v6a3 3 0 0 1-3 3h-1.4c1-1.6 1.4-3.8 1.4-6.6 0-3.4-.6-6-1.8-7.8z" fill={c.shade} />
      <circle cx={16} cy={20.6} r={4.8} fill={c.light} />
      <circle cx={16} cy={20.6} r={1.7} fill={c.ink} />
      <path d="M3.6 11.4c0-3.6 5.6-5.6 12.4-5.6s12.4 2 12.4 5.6c0 1.2-.8 1.9-2 1.7l-3.2-.6c-.8-.2-1.2-.8-1.2-1.6v-.7c-1.8-.6-3.8-.8-6-.8s-4.2.2-6 .8v.7c0 .8-.4 1.4-1.2 1.6l-3.2.6c-1.2.2-2-.5-2-1.7z" fill={c.ink} />
    </g>
  ),
  'heart-date': (c) => (
    <g>
      <rect x={3.2} y={7.4} width={25.6} height={18.4} rx={2.4} fill={c.fill} />
      <path d="M24 7.4h2.4a2.4 2.4 0 0 1 2.4 2.4v13.6a2.4 2.4 0 0 1-2.4 2.4H24z" fill={c.shade} />
      <path d="M4.4 9.2L16 18.4l11.6-9.2" fill="none" stroke={c.light} stroke-width={1.8} stroke-linecap="round" stroke-linejoin="round" />
      <path d={SEAL} fill={c.ink} />
    </g>
  ),
  'piggy-bank': (c) => (
    <g>
      <circle cx={15.6} cy={4.6} r={3.2} fill={c.light} />
      <path d="M6.4 17.6c0-5.2 4.4-8.8 10.2-8.8 4.8 0 8.6 2.4 9.8 6h1.4a1.4 1.4 0 0 1 1.4 1.4v3.2a1.4 1.4 0 0 1-1.4 1.4h-1.8c-.8 1.8-2.2 3.2-3.8 4.2v3a1.2 1.2 0 0 1-1.2 1.2h-2.2a1.2 1.2 0 0 1-1.2-1.2v-1.8c-.8.1-1.6.2-2.4.2s-1.6-.1-2.4-.2v1.8a1.2 1.2 0 0 1-1.2 1.2H9.4a1.2 1.2 0 0 1-1.2-1.2v-3.4c-1.2-1.4-1.8-3.4-1.8-6z" fill={c.fill} />
      <path d="M8.4 22.4c2 2.2 5 3.4 8.2 3.4 3.4 0 6.4-1.2 8.4-3.6-1 3.2-4.4 5.2-8.4 5.2-3.4 0-6.4-1.8-8.2-5z" fill={c.shade} />
      <path d="M17.8 10l2.6-3.8 1.4 4.8z" fill={c.ink} />
      <rect x={12.6} y={10.2} width={5.8} height={1.8} rx={0.9} fill={c.ink} />
      <circle cx={22.6} cy={14.2} r={1} fill={c.ink} />
      <Thin d="M6.6 15.6c-1.8-.4-2.8-1.8-2-3.2" c={c} w={1.6} />
      <rect x={26.8} y={16.4} width={1.1} height={1.8} rx={0.5} fill={c.ink} />
    </g>
  ),
  yarn: (c) => (
    <g>
      <Thin d="M17 15.6L28.4 4.2M19.8 18.2L29.6 7.8" c={c} w={1.8} />
      <circle cx={28.6} cy={4} r={1.6} fill={c.ink} />
      <circle cx={29.8} cy={7.6} r={1.6} fill={c.ink} />
      <circle cx={13.8} cy={18.2} r={9.6} fill={c.fill} />
      <path d="M18.2 9.6a9.6 9.6 0 0 1-9.4 16.8 12 12 0 0 0 9.4-16.8z" fill={c.shade} />
      <Thin d="M7 11.6c4.6 2 8.2 6.6 9.8 15.6M11.2 9c5 3.2 8.4 8.2 9.4 15.2M5 18c5.4-.4 11.6 1.8 16.2 6" c={c} w={1.3} />
      <Thin d="M11.6 27.6c-2.4 1.4-5.6 1.4-8-.2" c={c} w={1.5} color={c.fill} />
    </g>
  ),
  gift: (c) => (
    <g>
      <rect x={5} y={13.4} width={22} height={15} rx={1.8} fill={c.fill} />
      <path d="M22.8 13.4h2.4a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8h-2.4z" fill={c.shade} />
      <rect x={3.6} y={9.4} width={24.8} height={5.2} rx={1.6} fill={c.light} />
      <rect x={14.4} y={9.4} width={3.2} height={19} fill={c.ink} />
      <path d="M16 9.2c-1.6-3.4-5-5.2-6.6-3.8-1.4 1.2-.2 3.6 6.6 3.8zM16 9.2c1.6-3.4 5-5.2 6.6-3.8 1.4 1.2.2 3.6-6.6 3.8z" fill={c.ink} />
    </g>
  ),
  pray: (c) => (
    <g>
      <path d="M16 2.8c2 2.4 3.2 4.2 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-1.6 1.2-3.4 3.2-5.8z" fill={c.light} />
      <path d="M16 6.6c.9 1.1 1.4 2 1.4 2.8a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.7 1.4-2.8z" fill={c.fill} />
      <Thin d="M16 12.4v-1.6" c={c} w={1.4} />
      <rect x={11.4} y={12.4} width={9.2} height={14} rx={1.4} fill={c.fill} />
      <path d="M17.4 12.4h1.8a1.4 1.4 0 0 1 1.4 1.4v12.6h-3.2z" fill={c.shade} />
      <path d="M11.4 13.8a1.4 1.4 0 0 1 1.4-1.4h3.4v3c0 .8-.6 1.4-1.2 1.4s-1.2-.6-1.2-1.4v-.8c0-.6-.4-1-.8-1s-.8.4-.8 1v2.2c0 .6-.4 1-.8 1z" fill={c.light} />
      <rect x={4.8} y={25.8} width={22.4} height={3.4} rx={1.7} fill={c.ink} />
    </g>
  ),
  smile: (c) => (
    <g>
      <rect x={14} y={20.4} width={4} height={9.8} rx={2} fill={c.ink} />
      <circle cx={16} cy={21.4} r={2.4} fill={c.ink} />
      <path d={MIRROR_FRAME} fill={c.fill} />
      <path d="M21 3.8a9.6 9.6 0 0 1-8.6 16.8c7 .8 12.4-5.8 8.6-16.8z" fill={c.shade} />
      <circle cx={16} cy={11.8} r={6.6} fill={c.light} />
      <Thin d="M12.4 10.8l3-3M13 14.2l5.4-5.4" c={c} w={1.4} color={c.soft} />
    </g>
  ),
  calendar: (c) => (
    <g>
      <path d="M4.2 12h23.6v13.2a3 3 0 0 1-3 3H7.2a3 3 0 0 1-3-3z" fill={c.light} />
      <path d="M7.2 5.6h17.6a3 3 0 0 1 3 3v4H4.2v-4a3 3 0 0 1 3-3z" fill={c.fill} />
      <rect x={9} y={3} width={2.6} height={5.6} rx={1.3} fill={c.ink} />
      <rect x={20.4} y={3} width={2.6} height={5.6} rx={1.3} fill={c.ink} />
      {[
        [7.8, 15.4],
        [13.8, 15.4],
        [19.8, 15.4],
        [7.8, 21.2],
        [13.8, 21.2],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={4.4} height={4} rx={1} fill={c.ink} />
      ))}
      <rect x={19.8} y={21.2} width={4.4} height={4} rx={1} fill={c.fill} />
    </g>
  ),
  star: (c) => (
    <g>
      <ellipse cx={9} cy={28.4} rx={5} ry={1.6} fill={c.shade} />
      <Thin d="M9 28.4V3.8" c={c} w={2.3} />
      <path d="M10.2 4.6h15.6c.9 0 1.4 1 .8 1.7l-3.6 4.5 3.6 4.5c.6.7.1 1.7-.8 1.7H10.2z" fill={c.fill} />
      <path d="M10.2 12.8h13.3l2.3 2.5c.6.7.1 1.7-.8 1.7H10.2z" fill={c.shade} />
    </g>
  ),
  leaf: (c) => (
    <g>
      <path d="M4.8 27.2C4.8 15.8 12.2 6 27.2 4.8c-.4 13.8-8.6 22.4-22.4 22.4z" fill={c.fill} />
      <path d="M4.8 27.2C11.6 20.6 19.6 13 27.2 4.8c-.4 13.8-8.6 22.4-22.4 22.4z" fill={c.shade} />
      <Thin d="M3.4 28.6C11 21.4 18.6 13.6 24.4 7.6M13.6 18.4l.2-5.6M17.8 14.2l.4-4.6M13.8 18.2l5.4.2M18 14l4.6.4" c={c} w={1.3} color={c.light} />
    </g>
  ),
  flower: (c) => (
    <g>
      <Thin d="M16 19.8v9.2" c={c} w={2} />
      <path d="M15.8 25.6c-3.6-.2-5.8-2.6-6.2-5.8 3.6 0 5.8 2.4 6.2 5.8z" fill={c.ink} />
      <path d="M16.2 23.4c.4-3.2 2.4-5 5.4-5-.2 3.2-2.4 5-5.4 5z" fill={c.ink} />
      <path d={BLOOM} fill={c.fill} />
      <circle cx={16} cy={12.2} r={3.6} fill={c.ink} />
    </g>
  ),
  sparkle: (c) => (
    <g>
      <Thin d="M16 5.6C14 3 10.6 2.4 8.4 4" c={c} w={1.3} />
      <path d="M10 5.2h12a1.8 1.8 0 0 1 1.8 1.8v13.6l-7.8 8.8-7.8-8.8V7A1.8 1.8 0 0 1 10 5.2z" fill={c.fill} />
      <path d="M19.8 5.2H22a1.8 1.8 0 0 1 1.8 1.8v13.6L19.8 25z" fill={c.shade} />
      <circle cx={16} cy={8.8} r={1.4} fill={c.light} />
      <rect x={11.4} y={12.4} width={9.2} height={2.2} rx={1.1} fill={c.ink} />
      <rect x={11.4} y={16.6} width={6.4} height={2.2} rx={1.1} fill={c.ink} />
    </g>
  ),
};

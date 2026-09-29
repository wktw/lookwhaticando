/** Habit icons: heart & life, plus the general-purpose shapes. */
import { ACCENT } from '@/art/icons/palette';
import { flowerPath, heartPath, sparklePath, starPath } from '@/art/icons/shapes';
import { Cheeks, ClosedEyes, FINE, Shine, Sparkle, type HabitDrawing } from './kit';

const CALL_HEART = heartPath(22.8, 9, 8.4);
const BIG_HEART = heartPath(13.6, 18.2, 21);
const SMALL_HEART = heartPath(24.2, 8.4, 8.4);
const CAL_HEART = heartPath(16, 22.6, 6.6);
const STAR = starPath(16, 17.2, 12.8, 7.1, 5, 0.3);
const STAR_INNER = starPath(16, 17.6, 7.6, 4.2, 5, 0.3);
const PETALS = flowerPath(16, 11.5, 3.6, 8.4, 5);
const BIG_SPARKLE = sparklePath(13.5, 17.5, 11, 0.22);

export const HEART_ICONS: Record<string, HabitDrawing> = {
  phone: (c) => (
    <g>
      <path
        d="M8.5 6.5l3.2-.5c.8-.1 1.5.4 1.8 1.2l1.4 4c.3.8 0 1.7-.7 2.1l-2 1.3c1.1 3 3.1 5 6.1 6.1l1.3-2c.4-.7 1.3-1 2.1-.7l4 1.4c.8.3 1.3 1 1.2 1.8l-.5 3.2c-.1 1-1 1.8-2 1.8C14.5 26.2 6.7 18.4 6.7 8.5c0-1 .8-1.9 1.8-2z"
        fill={c.fill}
      />
      <Shine d="M9.5 9.2c.2 2.6 1 5 2.2 7" />
      <path d={CALL_HEART} fill={c.soft} />
    </g>
  ),
  'heart-date': (c) => (
    <g>
      <path d={SMALL_HEART} transform="rotate(14 24.2 8.4)" fill={c.soft} />
      <path d={BIG_HEART} fill={c.fill} />
      <Shine d="M7 14.2c.3-1.6 1.4-2.8 2.9-3.2" />
      <Sparkle x={26.4} y={20.6} r={2.2} fill={c.soft} />
    </g>
  ),
  'piggy-bank': (c) => (
    <g>
      <circle cx={13.5} cy={7.4} r={3.6} fill={ACCENT.gold} />
      <path d="M12.4 6.1v2.6M14.6 6.1v2.6" fill="none" stroke={ACCENT.goldDeep} stroke-width={1.1} />
      <path d="M4.2 17.2c-1.6-.1-2-1.8-.8-2.4" fill="none" stroke-width={FINE} />
      <path d="M8.8 23.5v3.3M18.8 23.5v3.3" stroke-width={3.4} />
      <path d="M8.8 23.5v3.3M18.8 23.5v3.3" stroke={c.fill} stroke-width={1.2} />
      <path d="M17.6 11.4c.2-2.3 1.3-3.9 2.8-4.3.9 1.6.9 3.4.3 5" fill={c.fill} />
      <ellipse cx={14.5} cy={18} rx={11} ry={8.2} fill={c.fill} />
      <ellipse cx={25.2} cy={18.4} rx={2.5} ry={3.1} fill={c.soft} />
      <g fill={c.ink} stroke="none">
        <ellipse cx={24.6} cy={17.6} rx={0.5} ry={0.8} />
        <ellipse cx={25.9} cy={17.6} rx={0.5} ry={0.8} />
        <circle cx={20.6} cy={15.4} r={1} />
      </g>
      <ellipse cx={20.8} cy={19.2} rx={1.5} ry={0.9} fill={ACCENT.cheek} opacity={0.75} stroke="none" />
      <path d="M11 11.6h5" stroke-width={1.6} />
      <Shine d="M6.5 15.2c.6-1.6 1.8-2.8 3.4-3.4" />
    </g>
  ),
  yarn: (c) => (
    <g>
      <path d="M14 13L26.4 3.6M17 14.5l11.4-6.6" fill="none" stroke-width={2.4} />
      <g fill={c.soft} stroke-width={FINE}>
        <circle cx={27} cy={3.2} r={1.8} />
        <circle cx={29} cy={7.6} r={1.8} />
      </g>
      <path d="M21.5 24.5c3.4 1 4.6 3.3 2.8 4.8" fill="none" />
      <circle cx={14} cy={17.5} r={10} fill={c.fill} />
      <g fill="none" stroke-width={FINE}>
        <path d="M6.2 12.4c4.6 1.2 8.4 5.6 9.2 14.9" />
        <path d="M9.2 9c5.5 1.4 10 6.8 11 16.6" />
        <path d="M4.3 17.4c3.5 1.2 6 4.6 6.6 9" />
        <path d="M16.6 7.8c.6 3.2 3.2 5.9 7.3 6.7" />
      </g>
      <Shine d="M7.4 10.2a9 9 0 0 1 3.4-2" />
    </g>
  ),
  gift: (c) => (
    <g>
      <path d="M16 10.3C13.2 5 8.6 4.6 8.6 7.6c0 2.2 4 2.7 7.4 2.7zM16 10.3c2.8-5.3 7.4-5.7 7.4-2.7 0 2.2-4 2.7-7.4 2.7z" fill={c.soft} />
      <path d="M6.3 15.2h19.4V26a2.3 2.3 0 0 1-2.3 2.3H8.6A2.3 2.3 0 0 1 6.3 26z" fill={c.fill} />
      <rect x={4.5} y={10.3} width={23} height={5} rx={1.6} fill={c.fill} />
      <path d="M14 10.3h4v18h-4z" fill={c.soft} />
      <Shine d="M8.6 18v3.8" />
    </g>
  ),
  pray: (c) => (
    <g>
      <circle cx={16} cy={8.4} r={6.2} fill={c.soft} stroke="none" opacity={0.9} />
      <path d="M16 3.5c2.5 3 3 4.8 3 5.8 0 1.7-1.3 2.7-3 2.7s-3-1-3-2.7c0-1 .5-2.8 3-5.8z" fill={ACCENT.star} />
      <path d="M16 7.4c1 1.2 1.2 1.9 1.2 2.3 0 .7-.5 1.1-1.2 1.1s-1.2-.4-1.2-1.1c0-.4.2-1.1 1.2-2.3z" fill={ACCENT.flame} stroke="none" />
      <path d="M16 12.2v2" fill="none" stroke-width={FINE} />
      <path d="M5.5 26.6c0-1 .8-1.6 1.8-1.6h17.4c1 0 1.8.6 1.8 1.6 0 1.2-1 2-2.2 2H7.7c-1.2 0-2.2-.8-2.2-2z" fill={c.soft} />
      <rect x={11} y={14.2} width={10} height={11} rx={1.8} fill={c.fill} />
      <path d="M11 16.8c1.2 0 1.6.6 1.6 1.6v.8c0 .7.5 1.1 1 1.1s1-.4 1-1.1v-1.4c0-.6.5-1 1-1h4.4" fill="none" stroke-width={FINE} />
      <Shine d="M13 21.6v1.6" width={1.3} />
    </g>
  ),
  smile: (c) => (
    <g>
      <circle cx={16} cy={16} r={12} fill={c.fill} />
      <ClosedEyes l={11.4} r={20.6} y={13.8} />
      <Cheeks l={9} r={23} y={17.8} />
      <path d="M11.8 18.4h8.4c-.3 2.8-2.1 4.5-4.2 4.5s-3.9-1.7-4.2-4.5z" fill={ACCENT.mouth} stroke-width={FINE} />
      <path d="M13.9 21.8c1.3-.9 2.9-.9 4.2 0-1.3 1-2.9 1-4.2 0z" fill={ACCENT.cheek} stroke="none" />
      <Shine d="M7.2 11.2a10 10 0 0 1 3.8-4" />
    </g>
  ),
  calendar: (c) => (
    <g>
      <rect x={4.5} y={6} width={23} height={22} rx={3.6} fill={c.soft} />
      <path d="M4.5 12.6V9.6A3.6 3.6 0 0 1 8.1 6h15.8a3.6 3.6 0 0 1 3.6 3.6v3z" fill={c.fill} />
      <path d="M4.5 12.6h23" fill="none" />
      <path d="M11 3.8v4.6M21 3.8v4.6" fill="none" />
      <g fill={c.ink} stroke="none" opacity={0.35}>
        <circle cx={9.8} cy={16.8} r={1.2} />
        <circle cx={16} cy={16.8} r={1.2} />
        <circle cx={22.2} cy={16.8} r={1.2} />
        <circle cx={9.8} cy={22.6} r={1.2} />
        <circle cx={22.2} cy={22.6} r={1.2} />
      </g>
      <path d={CAL_HEART} fill={c.fill} stroke-width={FINE} />
    </g>
  ),
  star: (c) => (
    <g>
      <path d={STAR} fill={c.fill} />
      <path d={STAR_INNER} fill={c.soft} stroke="none" opacity={0.7} />
      <Shine d="M11.4 13.4c.6-.8 1.3-1.3 2.2-1.6" />
      <Sparkle x={27} y={5} r={2.2} fill={c.soft} />
    </g>
  ),
  leaf: (c) => (
    <g>
      <path d="M6.5 25.5l-3 3" fill="none" />
      <path d="M6.5 25.5C5.5 15 11.5 6 26.5 5.5c.5 15-9 21-20 20z" fill={c.fill} />
      <path d="M6.5 25.5c4.5-5.5 9.5-11 15-15.5M11.8 19.4l-.6-4.2M15.6 15.4l-.3-4.6M11.8 19.4l4.4.8M15.6 15.4l4.6.4" fill="none" stroke-width={FINE} />
      <Shine d="M9.6 16.2c1-3.6 3.4-6.4 6.8-7.8" />
    </g>
  ),
  flower: (c) => (
    <g>
      <path d="M16 18v10.5" fill="none" />
      <path d="M16 25.2c.8-3 3.6-4.6 6.9-4.2-.5 3.4-3.5 5-6.9 4.2z" fill={ACCENT.leaf} />
      <path d={PETALS} fill={c.fill} />
      <circle cx={16} cy={11.5} r={3} fill={ACCENT.star} stroke-width={FINE} />
      <Shine d="M10.3 6.8c.5-.8 1.2-1.4 2-1.6" width={1.3} />
    </g>
  ),
  sparkle: (c) => (
    <g>
      <path d={BIG_SPARKLE} fill={c.fill} />
      <Shine d="M11.5 12.2c.6-1.4 1-3 1.2-4.6" width={1.3} />
      <Sparkle x={25} y={7} r={4} fill={c.soft} />
      <circle cx={26} cy={21} r={1.4} fill={c.soft} stroke-width={FINE} />
    </g>
  ),
};

/** Habit icons: home & chores. */
import { ACCENT } from '@/art/icons/palette';
import { heartPath } from '@/art/icons/shapes';
import { FINE, Shine, Sparkle, Tube, type HabitDrawing } from './kit';

const BOTTLE_HEART = heartPath(14.5, 21.4, 5.2);
const CAN_HEART = heartPath(13.8, 20.2, 5.2);
const HOUSE_HEART = heartPath(22.4, 21.2, 3.8);
const PAD_HEART = heartPath(16, 21, 4.4);

export const HOME_ICONS: Record<string, HabitDrawing> = {
  broom: (c) => (
    <g>
      <g transform="translate(-1.8 -1.2) rotate(28 16 16)">
        <rect x={14.9} y={3.5} width={2.2} height={11.5} rx={1.1} fill={ACCENT.wood} />
        <path d="M12.7 17.3h6.6c.9 2.3 2.5 5.7 4.1 8.1.4.6 0 1.4-.7 1.4H9.3c-.7 0-1.1-.8-.7-1.4 1.6-2.4 3.2-5.8 4.1-8.1z" fill={c.fill} />
        <path d="M13.3 21l-1.5 5.8M16 21v5.8M18.7 21l1.5 5.8" fill="none" stroke-width={FINE} />
        <rect x={12.2} y={14.5} width={7.6} height={2.8} rx={1} fill={c.soft} />
      </g>
      <Sparkle x={24.6} y={24.4} r={2.6} fill={c.soft} />
      <Sparkle x={28} y={18.6} r={1.8} fill={c.fill} />
    </g>
  ),
  'sparkle-clean': (c) => (
    <g>
      <path d="M10 11V7.6A2.1 2.1 0 0 1 12.1 5.5h7.2l2.7 3.2h-3.5V11" fill={c.soft} />
      <path d="M18.5 11l1.8 3" fill="none" />
      <rect x={11} y={11} width={7.5} height={3} fill={c.soft} />
      <path d="M10 14h9a2.5 2.5 0 0 1 2.5 2.5V26a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 7.5 26v-9.5A2.5 2.5 0 0 1 10 14z" fill={c.fill} />
      <path d={BOTTLE_HEART} fill={c.soft} stroke-width={FINE} />
      <Shine d="M9.8 17v3.6" />
      <Sparkle x={26.5} y={6.5} r={3.2} fill={c.soft} />
      <Sparkle x={27.5} y={15} r={2} fill={c.fill} />
    </g>
  ),
  bathtub: (c) => (
    <g>
      <g fill="#fff">
        <circle cx={8.2} cy={11.4} r={2.6} />
        <circle cx={12.6} cy={9.6} r={3.2} />
        <circle cx={17} cy={11.2} r={2.4} />
      </g>
      <g stroke-width={FINE}>
        <path d="M27.4 7.8l2 .5-2 .9z" fill={ACCENT.redDeep} />
        <path d="M20.2 13c0-2 1.4-3.2 3.2-3.2h.2c-.3-.5-.4-1-.4-1.5a2.4 2.4 0 0 1 4.8 0c0 1.2-.7 2-1.3 2.4 1 .5 1.5 1.3 1.5 2.3z" fill={ACCENT.star} />
        <circle cx={25.7} cy={8} r={0.55} fill={c.ink} stroke="none" />
      </g>
      <path d="M8 26.5v1.8M24 26.5v1.8" />
      <path d="M4 15.5h24v2.8a7.7 7.7 0 0 1-7.7 7.7h-8.6A7.7 7.7 0 0 1 4 18.3z" fill={c.fill} />
      <rect x={2.5} y={13} width={27} height={3} rx={1.5} fill={c.soft} />
      <Shine d="M7.2 19c.5 1.7 1.5 3 2.9 3.8" />
    </g>
  ),
  laundry: (c) => (
    <g>
      <rect x={5} y={3.5} width={22} height={25} rx={4} fill={c.soft} />
      <path d="M5 9.3h22" fill="none" stroke-width={FINE} />
      <g fill={c.ink} stroke="none">
        <circle cx={9} cy={6.4} r={1.1} />
        <circle cx={12.4} cy={6.4} r={1.1} />
      </g>
      <rect x={18.5} y={5.1} width={5.5} height={2.6} rx={1.3} fill={c.fill} stroke-width={FINE} />
      <circle cx={16} cy={18.8} r={6.9} fill={c.fill} />
      <circle cx={16} cy={18.8} r={4.5} fill="#fff" stroke-width={FINE} />
      <path d="M11.5 19.4c1.5-1 3-1 4.5 0s3 1 4.5 0a4.5 4.5 0 0 1-9 0z" fill={c.fill} stroke="none" />
      <path d="M11.5 19.4c1.5-1 3-1 4.5 0s3 1 4.5 0" fill="none" stroke-width={FINE} />
      <circle cx={16} cy={18.8} r={4.5} fill="none" stroke-width={FINE} />
      <Shine d="M13.2 15.9a3.4 3.4 0 0 1 1.9-1" width={1.2} />
    </g>
  ),
  dishes: (c) => (
    <g>
      <circle cx={13.5} cy={17.5} r={10.5} fill={c.fill} />
      <circle cx={13.5} cy={17.5} r={6.8} fill="#fff" stroke-width={FINE} />
      <Shine d="M5.6 14.4a8.8 8.8 0 0 1 3.8-4.9" />
      <Sparkle x={13.5} y={17.5} r={2.8} fill={c.soft} />
      <g fill="#fff">
        <circle cx={24.5} cy={8} r={3} />
        <circle cx={28} cy={13} r={1.7} />
        <circle cx={20.4} cy={4.6} r={1.6} />
      </g>
      <g transform="rotate(-18 24 25)">
        <rect x={19} y={21.8} width={10} height={6.4} rx={1.8} fill={ACCENT.star} />
        <path d="M19 24.3h10" fill="none" stroke-width={FINE} />
        <path d="M19.9 21.8h8.2a.9.9 0 0 1 .9.9v1.6H19v-1.6a.9.9 0 0 1 .9-.9z" fill={ACCENT.leaf} stroke="none" />
        <rect x={19} y={21.8} width={10} height={6.4} rx={1.8} fill="none" />
      </g>
    </g>
  ),
  'watering-can': (c) => (
    <g>
      <path d="M7.4 14.4C3.4 14 2.2 19.6 6.2 21.8" fill="none" stroke-width={2.6} />
      <Tube d="M19 24.2l7.6-10.6" color={c.fill} width={2.2} ink={c.ink} />
      <path d="M24.2 11.6l4.9 3.6 1-1.4c.8-1.1.4-2.6-.8-3.3l-2-1.3c-1.2-.7-2.7-.4-3.4.8z" fill={c.soft} />
      <path d="M8 12.6h11.4l1.4 12.8a2.4 2.4 0 0 1-2.4 2.6H9a2.4 2.4 0 0 1-2.4-2.6z" fill={c.fill} />
      <ellipse cx={13.7} cy={12.6} rx={5.7} ry={1.6} fill={c.soft} stroke-width={FINE} />
      <path d={CAN_HEART} fill={c.soft} stroke-width={FINE} />
      <Shine d="M9.3 16.2l-.3 4" />
      <g fill={c.soft} stroke-width={1.2}>
        <path d="M27.8 18.6c.7 1 1 1.6 1 2a1 1 0 0 1-2 0c0-.4.3-1 1-2z" />
        <path d="M24.6 20.4c.7 1 1 1.6 1 2a1 1 0 0 1-2 0c0-.4.3-1 1-2z" />
      </g>
    </g>
  ),
  wrench: (c) => (
    <g>
      <g transform="rotate(45 16 16)">
        <path
          d="M13.8 12.8c-2.2-1-3.5-3-3.3-5.5.2-2.1 1.5-3.7 3.3-4.3v4.6h4.4V3c1.8.6 3.1 2.2 3.3 4.3.2 2.5-1.1 4.5-3.3 5.5V26a2.2 2.2 0 0 1-4.4 0z"
          fill={c.fill}
        />
        <circle cx={16} cy={25.6} r={1} fill={c.soft} stroke-width={FINE} />
        <Shine d="M15 14.5v6.5" width={1.2} />
      </g>
      <Sparkle x={7.5} y={7.5} r={2.6} fill={c.soft} />
    </g>
  ),
  cart: (c) => (
    <g>
      <path d="M13.4 8.6c-.6-2.6.7-5 3.3-5.6.5 2.6-.9 4.9-3.3 5.6z" fill={ACCENT.leaf} />
      <circle cx={19.2} cy={6.4} r={2.8} fill={ACCENT.red} stroke-width={FINE} />
      <path d="M2.5 5h2a1.8 1.8 0 0 1 1.8 1.4l3 14.1c.2.9 1 1.5 1.9 1.5H24" fill="none" />
      <path d="M6 8.5h20.5c.8 0 1.3.8 1 1.5l-2.7 8c-.3.9-1.1 1.5-2 1.5H9.2z" fill={c.fill} />
      <path d="M7.4 13.5h18.4M14 8.5l.6 11M20.2 8.5l-.5 11" fill="none" stroke-width={FINE} />
      <circle cx={12} cy={25.6} r={2.3} fill={c.soft} />
      <circle cx={22} cy={25.6} r={2.3} fill={c.soft} />
    </g>
  ),
  house: (c) => (
    <g>
      <path d="M20.5 10.5V6.8h3.6v6.9" fill={c.soft} />
      <circle cx={24.6} cy={3.8} r={1.4} fill="#fff" stroke-width={FINE} />
      <path d="M6.5 16v10a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V16" fill={c.soft} />
      <path d="M3.5 15.5L14.6 5.9a2.1 2.1 0 0 1 2.8 0l11.1 9.6c.5.5.2 1.3-.5 1.3H4c-.7 0-1-.8-.5-1.3z" fill={c.fill} />
      <path d="M13.3 28v-5.2a2.7 2.7 0 0 1 5.4 0V28" fill={c.fill} />
      <path d={HOUSE_HEART} fill={c.fill} stroke-width={FINE} />
      <Shine d="M8.2 13.2l4.6-4" width={1.3} />
    </g>
  ),
  paw: (c) => (
    <g fill={c.fill}>
      <path d="M16 14.6c4.1 0 7.2 3.7 7.2 6.8 0 2.9-2.3 4.1-7.2 4.1s-7.2-1.2-7.2-4.1c0-3.1 3.1-6.8 7.2-6.8z" />
      <ellipse cx={7.4} cy={13.4} rx={2.7} ry={3.2} transform="rotate(-25 7.4 13.4)" />
      <ellipse cx={12.3} cy={8} rx={2.8} ry={3.4} transform="rotate(-8 12.3 8)" />
      <ellipse cx={19.7} cy={8} rx={2.8} ry={3.4} transform="rotate(8 19.7 8)" />
      <ellipse cx={24.6} cy={13.4} rx={2.7} ry={3.2} transform="rotate(25 24.6 13.4)" />
      <path d={PAD_HEART} fill={c.soft} stroke-width={FINE} />
      <Shine d="M11.2 18.2c.6-1.1 1.5-1.8 2.6-2.1" width={1.3} />
    </g>
  ),
};

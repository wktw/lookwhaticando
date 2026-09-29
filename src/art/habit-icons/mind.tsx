/** Habit icons: mind & creativity. */
import { ACCENT, PASTEL } from '@/art/icons/palette';
import { heartPath } from '@/art/icons/shapes';
import { FINE, Shine, Sparkle, type HabitDrawing } from './kit';

const SCREEN_HEART = heartPath(16, 13.2, 5.6);
const JOURNAL_HEART = heartPath(13.75, 19.5, 6);
const CAMERA_HEART = heartPath(7.2, 13.6, 3.6);
const BULB_HEART = 'M16 17.5c-.9-.8-2.6-2-2.6-3.4 0-.9.7-1.5 1.4-1.5.6 0 1 .3 1.2.8.2-.5.6-.8 1.2-.8.7 0 1.4.6 1.4 1.5 0 1.4-1.7 2.6-2.6 3.4z';

export const MIND_ICONS: Record<string, HabitDrawing> = {
  book: (c) => (
    <g>
      <path d="M3 9.5V26c4.5-1 9.5-.5 13 1.5 3.5-2 8.5-2.5 13-1.5V9.5" fill={c.fill} />
      <path d="M16 8.6C13 6.6 8.8 6 5 7v17c3.8-.9 8-.4 11 1.6z" fill={c.soft} />
      <path d="M16 8.6c3-2 7.2-2.6 11-1.6v17c-3.8-.9-8-.4-11 1.6z" fill={c.soft} />
      <path d="M22 7.3v6.2l1.6-1.3 1.6 1.3V6.9" fill={PASTEL.blush[500]} stroke-width={FINE} />
      <path d="M7.5 12c2-.3 4 0 6 .9M7.5 15.5c2-.3 4 0 6 .9M7.5 19c2-.3 4 0 6 .9M18.5 16.4c2-.9 4-1.2 6-.9M18.5 19.9c2-.9 4-1.2 6-.9" fill="none" stroke-width={FINE} />
      <path d="M16 8.6v17" fill="none" />
    </g>
  ),
  journal: (c) => (
    <g>
      <rect x={5} y={4.5} width={16.5} height={23.5} rx={2.6} fill={c.fill} />
      <rect x={9.5} y={8.5} width={8.5} height={4.6} rx={1.2} fill={c.soft} stroke-width={FINE} />
      <path d={JOURNAL_HEART} fill={c.soft} stroke-width={FINE} />
      <path d="M5 8.5h-1.3M5 13h-1.3M5 17.5h-1.3M5 22h-1.3" />
      <Shine d="M7.6 7.2v3.6" />
      <g transform="rotate(12 26 16)">
        <path d="M24 9h4v14l-2 3.6-2-3.6z" fill={c.soft} />
        <path d="M24 9V7a2 2 0 0 1 4 0v2z" fill={PASTEL.blush[500]} />
        <path d="M24 23h4" stroke-width={FINE} />
        <path d="M25.3 25.3l.7 1.3.7-1.3z" fill={c.ink} stroke-width={1} />
      </g>
    </g>
  ),
  lotus: (c) => (
    <g>
      <path d="M16 21.5c-5 .9-9.4-.5-12.2-3.7-.5-.7-.2-1 .3-1 4.3-1.2 8.9.2 11.9 4.7zM16 21.5c5 .9 9.4-.5 12.2-3.7.5-.7.2-1-.3-1-4.3-1.2-8.9.2-11.9 4.7z" fill={c.soft} />
      <path d="M16 21c-4 0-7.8-3.4-8.2-8.6 0-1 .4-1 1-.8 3.8.8 6.4 3.8 7.2 9.4zM16 21c4 0 7.8-3.4 8.2-8.6 0-1-.4-1-1-.8-3.8.8-6.4 3.8-7.2 9.4z" fill={c.fill} />
      <path d="M15 7.6q1-1.2 2 0c2.8 3.4 2.4 9-1 13.4-3.4-4.4-3.8-10-1-13.4z" fill={c.fill} />
      <Shine d="M14.6 11.6c.1-1.1.4-2.1.9-2.9" width={1.3} />
      <path d="M7.5 25h17M11 28.4h10" fill="none" stroke-width={FINE} />
      <Sparkle x={25.5} y={6} r={2.4} fill={c.soft} />
    </g>
  ),
  lightbulb: (c) => (
    <g>
      <path d="M3.6 8.2l2 1.1M3.6 16.4l2-1.1M28.4 8.2l-2 1.1M28.4 16.4l-2-1.1M16 1.2v1.6" fill="none" />
      <path
        d="M16 4.3c-4.8 0-8.3 3.6-8.3 8 0 3.1 1.7 5 3.2 6.8.8.9 1.1 1.9 1.1 3v.4h8v-.4c0-1.1.3-2.1 1.1-3 1.5-1.8 3.2-3.7 3.2-6.8 0-4.4-3.5-8-8.3-8z"
        fill={c.fill}
      />
      <path d={BULB_HEART} fill={c.soft} stroke-width={FINE} />
      <path d="M16 17.5v5" fill="none" stroke-width={FINE} />
      <rect x={12} y={22.5} width={8} height={4} rx={1} fill={c.soft} />
      <path d="M12.5 24.5h7" stroke-width={FINE} />
      <path d="M14 26.5h4c0 1.4-.9 2.2-2 2.2s-2-.8-2-2.2z" fill={c.ink} stroke-width={1.2} />
      <Shine d="M10.6 10.6c.5-1.8 1.8-3.1 3.5-3.6" />
    </g>
  ),
  language: (c) => (
    <g>
      <path d="M18.5 4.5h7a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1-3.5 3.5h-.5l.8 3-4-3h-3.3a3.5 3.5 0 0 1-3.5-3.5V8a3.5 3.5 0 0 1 3.5-3.5z" fill={c.soft} />
      <path d="M21.8 6.3v1M18.3 8.3h7M24.1 9.4c-1 2.4-2.8 3.9-5.2 4.5M19.5 9.4c1 2.4 2.8 3.9 5.2 4.5" fill="none" stroke-width={FINE} />
      <path d="M6.5 11.5h8.5a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5H9.8l-4.3 3.2.9-3.2A3.5 3.5 0 0 1 3 21v-6a3.5 3.5 0 0 1 3.5-3.5z" fill={c.fill} />
      <path d="M7.8 21.5l3-7 3 7M8.9 19h3.8" fill="none" stroke-width={1.7} />
    </g>
  ),
  music: (c) => (
    <g>
      <path d="M12.7 22.5V9.2l12-2.8v13.3" fill="none" />
      <path d="M12.7 9.2l12-2.8v3.9l-12 2.8z" fill={c.fill} />
      <ellipse cx={9.6} cy={23} rx={3.7} ry={2.9} transform="rotate(-18 9.6 23)" fill={c.fill} />
      <ellipse cx={21.6} cy={20.2} rx={3.7} ry={2.9} transform="rotate(-18 21.6 20.2)" fill={c.fill} />
      <Shine d="M7.6 22.1c.4-.9 1.2-1.4 2.2-1.6" width={1.3} />
      <Shine d="M19.6 19.3c.4-.9 1.2-1.4 2.2-1.6" width={1.3} />
      <Sparkle x={5.5} y={9} r={2.6} fill={c.soft} />
    </g>
  ),
  palette: (c) => (
    <g>
      <path
        d="M16 4.5C9 4.5 3.5 9.5 3.5 16s5.3 11.5 11.5 11.5c2.5 0 3.5-1.3 3.5-2.7s-1-1.8-1-3.2c0-1.4 1.1-2.3 2.5-2.3h3c3 0 5.5-2.3 5.5-5.5 0-5.3-5.7-9.3-12.5-9.3z"
        fill={c.fill}
      />
      <g stroke-width={FINE}>
        <circle cx={9} cy={13} r={2.3} fill={PASTEL.blush[500]} />
        <circle cx={14.8} cy={9.2} r={2.3} fill={PASTEL.butter[500]} />
        <circle cx={21.3} cy={10.2} r={2.3} fill={PASTEL.sky[500]} />
        <circle cx={9.6} cy={19.8} r={2.3} fill={PASTEL.sage[500]} />
      </g>
      <circle cx={23.4} cy={14.4} r={1.4} fill={c.soft} stroke-width={FINE} />
    </g>
  ),
  camera: (c) => (
    <g>
      <path d="M9 9.5V7.6A1.6 1.6 0 0 1 10.6 6h3.8A1.6 1.6 0 0 1 16 7.6v1.9" fill={c.soft} />
      <path d="M21.5 9.5V8.2h3.6v1.3" fill={c.soft} />
      <rect x={3.5} y={9.5} width={25} height={17} rx={4} fill={c.fill} />
      <circle cx={16} cy={18} r={5.8} fill={c.soft} />
      <circle cx={16} cy={18} r={3} fill={c.fill} stroke-width={FINE} />
      <circle cx={17.1} cy={16.9} r={1} fill="#fff" stroke="none" />
      <rect x={21.8} y={12.3} width={3.8} height={2.4} rx={1} fill={c.soft} stroke-width={FINE} />
      <path d={CAMERA_HEART} fill={ACCENT.cheek} stroke="none" />
      <Shine d="M6 20.5v2.8" />
    </g>
  ),
  laptop: (c) => (
    <g>
      <rect x={6} y={5.5} width={20} height={15} rx={2.5} fill={c.fill} />
      <rect x={8.6} y={8} width={14.8} height={10} rx={1.2} fill={c.soft} stroke-width={FINE} />
      <path d={SCREEN_HEART} fill={c.fill} stroke-width={FINE} />
      <path d="M3 21h26v1.5a3.5 3.5 0 0 1-3.5 3.5h-19A3.5 3.5 0 0 1 3 22.5z" fill={c.soft} />
      <path d="M13.5 21v.6c0 .5.4.9.9.9h3.2c.5 0 .9-.4.9-.9V21" fill="none" stroke-width={FINE} />
      <Shine d="M10.4 10v2.5" width={1.3} />
    </g>
  ),
};

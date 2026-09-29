/** Habit icons: mind and making. A book, a journal, a lotus, a bulb, cards, an ukulele, a palette. */
import { Thin, type HabitDrawing } from './kit';

export const MIND_ICONS: Record<string, HabitDrawing> = {
  book: (c) => (
    <g>
      <path d="M2.4 9.4c4.4-1.4 9.4-1 13.6 1.8 4.2-2.8 9.2-3.2 13.6-1.8v17c-4.4-1.2-9.4-.8-13.6 2-4.2-2.8-9.2-3.2-13.6-2z" fill={c.fill} />
      <path d="M4.2 7.8c4-1 8.2-.4 11.2 2.2v15.8c-3-2.4-7.2-3-11.2-2.2z" fill={c.light} />
      <path d="M27.8 7.8c-4-1-8.2-.4-11.2 2.2v15.8c3-2.4 7.2-3 11.2-2.2z" fill={c.soft} />
      <Thin d="M6.8 12.8c2-.4 4.2-.2 6.2.8M6.8 16.6c2-.4 4.2-.2 6.2.8M19 13.6c2-1 4.2-1.2 6.2-.8M19 17.4c2-1 4.2-1.2 6.2-.8" c={c} w={1.3} />
      <Thin d="M16 10.6v15.6" c={c} w={1.2} />
    </g>
  ),
  journal: (c) => (
    <g>
      <rect x={5.4} y={3.4} width={17.6} height={25.2} rx={2.4} fill={c.fill} />
      <path d="M18.6 3.4h2a2.4 2.4 0 0 1 2.4 2.4v20.4a2.4 2.4 0 0 1-2.4 2.4h-2z" fill={c.shade} />
      <rect x={5.4} y={3.4} width={3.4} height={25.2} rx={1.4} fill={c.ink} />
      <rect x={11.2} y={7.8} width={7.4} height={4.8} rx={0.8} fill={c.light} />
      <rect x={17.2} y={3.4} width={1.8} height={25.2} fill={c.ink} />
      <g transform="rotate(14 26.4 16)">
        <rect x={24.8} y={4.4} width={3.2} height={20} rx={1.4} fill={c.ink} />
        <path d="M24.8 24.2h3.2l-1.6 3.6z" fill={c.light} />
      </g>
    </g>
  ),
  lotus: (c) => (
    <g>
      <path d="M15.2 23c-4.6.8-9-.6-11.8-4.2 4.6-1.4 8.8-.4 11.8 4.2zM16.8 23c4.6.8 9-.6 11.8-4.2-4.6-1.4-8.8-.4-11.8 4.2z" fill={c.ink} />
      <path d="M15.4 22C10.2 21 6.6 16.8 6.2 11.4c4.8.4 8.2 4 9.2 10.6z" fill={c.fill} />
      <path d="M16.6 22c5.2-1 8.8-5.2 9.2-10.6-4.8.4-8.2 4-9.2 10.6z" fill={c.shade} />
      <path d="M16 6.2c3.4 3.6 4.2 8.8 0 15.4-4.2-6.6-3.4-11.8 0-15.4z" fill={c.fill} />
      <path d="M16 6.2c3.4 3.6 4.2 8.8 0 15.4 1.4-5 1.4-10.4 0-15.4z" fill={c.shade} />
      <Thin d="M5 27.2c2-1.2 3.8-1.2 5.6 0s3.6 1.2 5.4 0 3.6-1.2 5.4 0 3.6 1.2 5.6 0" c={c} w={1.5} color={c.fill} />
    </g>
  ),
  lightbulb: (c) => (
    <g>
      <path d="M16 3.2c-5 0-8.8 3.6-8.8 8.6 0 3.2 1.6 5.4 3.2 7 1 1 1.4 2 1.4 3.2v.8h8.4v-.8c0-1.2.4-2.2 1.4-3.2 1.6-1.6 3.2-3.8 3.2-7 0-5-3.8-8.6-8.8-8.6z" fill={c.fill} />
      <path d="M18.6 3.6c3.6.9 6.2 4 6.2 8.2 0 3.2-1.6 5.4-3.2 7-1 1-1.4 2-1.4 3.2v.8h-2.6v-.8c0-1.4.6-2.6 1.6-3.8 1.6-1.8 2.6-4 2.6-6.8 0-3.2-1.2-6-3.2-7.8z" fill={c.shade} />
      <Thin d="M13.2 15.2l1.4 2.4 1.4-2.4 1.4 2.4 1.4-2.4" c={c} w={1.2} color={c.light} />
      <rect x={11.4} y={23.2} width={9.2} height={2.3} rx={1.1} fill={c.ink} />
      <rect x={11.8} y={26.1} width={8.4} height={2.3} rx={1.1} fill={c.ink} />
      <path d="M13.8 28.6h4.4a2.2 2.2 0 0 1-4.4 0z" fill={c.ink} />
    </g>
  ),
  language: (c) => (
    <g>
      <path d="M5.6 3.6h13a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8H10l-4.2 3.4v-3.4h-.2a2.8 2.8 0 0 1-2.8-2.8V6.4a2.8 2.8 0 0 1 2.8-2.8z" fill={c.ink} />
      <rect x={6.6} y={7.4} width={9} height={1.8} rx={0.9} fill={c.light} />
      <rect x={6.6} y={11} width={6} height={1.8} rx={0.9} fill={c.light} />
      <path d="M13.4 12.8h13a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8h-.2v3.4L22 25.8h-8.6a2.8 2.8 0 0 1-2.8-2.8v-7.4a2.8 2.8 0 0 1 2.8-2.8z" fill={c.fill} />
      <path d="M24 12.8h2.4a2.8 2.8 0 0 1 2.8 2.8v7.4a2.8 2.8 0 0 1-2.8 2.8h-.2v3.4L24 27.4z" fill={c.shade} />
      <rect x={14.6} y={16.6} width={9.4} height={1.8} rx={0.9} fill={c.soft} />
      <rect x={14.6} y={20.2} width={6.4} height={1.8} rx={0.9} fill={c.soft} />
    </g>
  ),
  music: (c) => (
    <g>
      <path d="M15.4 17.8l10.8-11" fill="none" stroke={c.ink} stroke-width={3} stroke-linecap="round" />
      <rect x={23.6} y={2.4} width={5} height={6.6} rx={1.4} transform="rotate(45 26.1 5.7)" fill={c.ink} />
      <circle cx={16.4} cy={16.4} r={5.4} fill={c.fill} />
      <circle cx={11.2} cy={21.6} r={7.2} fill={c.fill} />
      <path d="M14.6 25.6c3.4-1.8 5.8-5.4 5.6-9.4a5.4 5.4 0 0 1-2.4 7.2 7.2 7.2 0 0 1-3.2 2.2z" fill={c.shade} />
      <circle cx={13.4} cy={19.4} r={2.2} fill={c.ink} />
      <rect x={6.4} y={23.4} width={5.4} height={2} rx={1} transform="rotate(-45 9.1 24.4)" fill={c.ink} />
    </g>
  ),
  palette: (c) => (
    <g>
      <path d="M16 4.4C8.6 4.4 3.2 9.4 3.2 16c0 6.4 5.2 11.6 11.8 11.6 2.2 0 3.2-1.2 3.2-2.6 0-1.8-1.6-2.4-1.6-4 0-1.4 1.2-2.2 3-2.2h3.4c3.6 0 5.8-2.2 5.8-5.6 0-5.6-6-8.8-12.8-8.8z" fill={c.fill} />
      <path d="M21.4 5.4c3.4 1.4 5.6 3.8 5.6 7.8 0 3.4-2.2 5.6-5.8 5.6h-3.4c-.8 0-1.4.2-2 .4.4-1.2 1.6-1.8 3-1.8h1.8c3.4 0 5-2 5-5 0-3-1.6-5.4-4.2-7z" fill={c.shade} />
      <circle cx={9.4} cy={13} r={2.4} fill={c.ink} />
      <circle cx={14.6} cy={9.2} r={2.4} fill={c.light} />
      <circle cx={20.6} cy={10} r={2.3} fill={c.ink} />
      <circle cx={9.2} cy={19.8} r={2.4} fill={c.light} />
    </g>
  ),
  camera: (c) => (
    <g>
      <path d="M3.6 12.4a3 3 0 0 1 3-3h3.2l1.6-2.6c.4-.6 1-1 1.8-1h5.6c.8 0 1.4.4 1.8 1l1.6 2.6h3.2a3 3 0 0 1 3 3v11.4a3 3 0 0 1-3 3H6.6a3 3 0 0 1-3-3z" fill={c.fill} />
      <path d="M24.2 9.4h1.2a3 3 0 0 1 3 3v11.4a3 3 0 0 1-3 3h-1.2z" fill={c.shade} />
      <circle cx={15.6} cy={17.8} r={6.2} fill={c.ink} />
      <circle cx={15.6} cy={17.8} r={3.6} fill={c.light} />
      <rect x={21.4} y={11.8} width={3.4} height={2.1} rx={1} fill={c.ink} />
    </g>
  ),
  laptop: (c) => (
    <g>
      <rect x={5.2} y={5.4} width={21.6} height={15} rx={2} fill={c.ink} />
      <rect x={7.2} y={7.4} width={17.6} height={11} rx={0.8} fill={c.light} />
      <rect x={9.4} y={10} width={9} height={1.8} rx={0.9} fill={c.fill} />
      <rect x={9.4} y={13.6} width={12.4} height={1.8} rx={0.9} fill={c.fill} />
      <path d="M2.4 21.4h27.2l-1.4 3.6a2 2 0 0 1-1.9 1.3H5.7a2 2 0 0 1-1.9-1.3z" fill={c.fill} />
      <path d="M24 21.4h5.6l-1.4 3.6a2 2 0 0 1-1.9 1.3h-2.3z" fill={c.shade} />
      <rect x={13} y={21.4} width={6} height={1.4} rx={0.7} fill={c.shade} />
    </g>
  ),
};

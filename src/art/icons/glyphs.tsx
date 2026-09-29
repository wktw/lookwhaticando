/**
 * UI glyphs on a 24-unit grid. The parent <svg> sets stroke=currentColor, width 2, round caps
 * and joins, so each glyph only draws geometry. Straight 2-unit strokes are centred on whole
 * units, so both edges land on pixel boundaries at 24 px on 1x screens. Key shapes carry a
 * gentle currentColor tint for a chunky feel.
 */
import type { JSX } from 'preact';
import { cogPath, flowerPath, heartPath, sparklePath, starPath } from './shapes';

export interface GlyphState {
  /** Solid/active variant (hearts, tabs). Glyphs without one ignore it. */
  filled: boolean;
  /** The icon's stroke width; fine details are drawn relative to it. */
  sw: number;
}

export type Glyph = (s: GlyphState) => JSX.Element;

/** The soft body tint used on key shapes. */
export const TINT = { fill: 'currentColor', 'fill-opacity': 0.16 } as const;
/** Solid currentColor dots and details. */
export const SOLID = { fill: 'currentColor', stroke: 'none' } as const;

const GEAR = cogPath(12, 12, 6.6, 9.2, 8);
const STREAK_PETALS = flowerPath(12, 12, 3.4, 9, 8, 22.5);
const HEART = heartPath(12, 12.6, 18);
const CAL_HEART = heartPath(12, 15.3, 6.2);
const SPARKLE_BIG = sparklePath(10.5, 13, 8.5, 0.2);
const SPARKLE_SMALL = sparklePath(18.5, 5.5, 3, 0.22);
const WAND_STAR = starPath(16.2, 7.9, 5, 2.6, 5, 0.3);
const MOON_STAR = sparklePath(17.6, 5.4, 2.4, 0.24);

const chevron = (d: string): Glyph => () => <path d={d} />;

export const UI_GLYPHS = {
  plus: () => <path d="M12 5v14M5 12h14" />,
  check: () => <path d="M4.5 12.5l5 5L19.5 7" />,
  close: () => <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  'chevron-left': chevron('M14.5 5.5L8 12l6.5 6.5'),
  'chevron-right': chevron('M9.5 5.5L16 12l-6.5 6.5'),
  'chevron-down': chevron('M5.5 9L12 15.5 18.5 9'),
  more: () => (
    <g {...SOLID}>
      <circle cx={5.5} cy={12} r={2} />
      <circle cx={12} cy={12} r={2} />
      <circle cx={18.5} cy={12} r={2} />
    </g>
  ),
  edit: () => (
    <g>
      <path d="M4 20l1-4.5L15 5.5c.8-.8 2.2-.8 3 0l.5.5c.8.8.8 2.2 0 3L8.5 19z" {...TINT} />
      <path d="M13 7.5l3.5 3.5M5 15.5L8.5 19" />
    </g>
  ),
  pause: () => (
    <g {...TINT}>
      <rect x={6} y={5} width={4} height={14} rx={1.6} />
      <rect x={14} y={5} width={4} height={14} rx={1.6} />
    </g>
  ),
  play: () => <path d="M8 5.9c0-.9 1-1.5 1.8-1L19 11c.7.5.7 1.5 0 2l-9.2 6.1c-.8.5-1.8-.1-1.8-1z" {...TINT} />,
  archive: () => (
    <g>
      <path d="M5 9v8.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V9" {...TINT} />
      <rect x={4} y={4} width={16} height={5} rx={1.8} {...TINT} />
      <path d="M10 13h4" />
    </g>
  ),
  trash: () => (
    <g>
      <path d="M6 7l.9 11.4A2 2 0 0 0 8.9 20h6.2a2 2 0 0 0 2-1.6L18 7" {...TINT} />
      <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M10 11v5M14 11v5" />
    </g>
  ),
  calendar: () => (
    <g>
      <rect x={4} y={5} width={16} height={15} rx={3.5} {...TINT} />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <path d={CAL_HEART} {...SOLID} />
    </g>
  ),
  bell: () => (
    <g>
      <path d="M4.5 17h15c-1.3-1-2-2.4-2-4.5v-2A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-5.5 5.5v2c0 2.1-.7 3.5-2 4.5z" {...TINT} />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0M12 3v2" />
    </g>
  ),
  share: () => (
    <g>
      <path d="M8.5 10h-1A2.5 2.5 0 0 0 5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5a2.5 2.5 0 0 0-2.5-2.5h-1" {...TINT} />
      <path d="M12 14V3.5M8.5 7L12 3.5 15.5 7" />
    </g>
  ),
  camera: () => (
    <g>
      <path
        d="M3 10.5A3.5 3.5 0 0 1 6.5 7H8l1.3-2a1.4 1.4 0 0 1 1.2-.6h3a1.4 1.4 0 0 1 1.2.6L16 7h1.5a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 16.5z"
        {...TINT}
      />
      <circle cx={12} cy={13.5} r={3.5} />
      <circle cx={17.6} cy={10.2} r={1} {...SOLID} />
    </g>
  ),
  gear: () => (
    <g>
      <path d={GEAR} {...TINT} />
      <circle cx={12} cy={12} r={2.5} />
    </g>
  ),
  info: () => (
    <g>
      <circle cx={12} cy={12} r={9} {...TINT} />
      <circle cx={12} cy={7.9} r={1.3} {...SOLID} />
      <path d="M12 11.5v5" />
    </g>
  ),
  sparkle: () => (
    <g>
      <path d={SPARKLE_BIG} {...TINT} />
      <path d={SPARKLE_SMALL} {...SOLID} />
    </g>
  ),
  heart: ({ filled }) => <path d={HEART} {...(filled ? { fill: 'currentColor' } : TINT)} />,
  streak: () => (
    <g>
      <path d={STREAK_PETALS} {...TINT} />
      <circle cx={12} cy={12} r={2.4} fill="currentColor" />
    </g>
  ),
  moon: () => (
    <g>
      <path d="M19.6 14.6A8.3 8.3 0 1 1 9.4 4.4a6.8 6.8 0 0 0 10.2 10.2z" {...TINT} />
      <path d={MOON_STAR} {...SOLID} />
    </g>
  ),
  sun: () => (
    <g>
      <circle cx={12} cy={12} r={4.5} {...TINT} />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
    </g>
  ),
  undo: () => <path d="M9 14.5L4.5 10 9 5.5M4.5 10h10a5 5 0 0 1 0 10H10" />,
  note: () => (
    <g>
      <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8l6-6V6a2 2 0 0 0-2-2z" {...TINT} />
      <path d="M14 20v-4a2 2 0 0 1 2-2h4M8 9h8M8 13h4" />
    </g>
  ),
  search: () => (
    <g>
      <circle cx={10.5} cy={10.5} r={6.5} {...TINT} />
      <path d="M15.5 15.5L20 20" />
    </g>
  ),
  grip: () => (
    <g {...SOLID}>
      <circle cx={9} cy={6} r={1.7} />
      <circle cx={15} cy={6} r={1.7} />
      <circle cx={9} cy={12} r={1.7} />
      <circle cx={15} cy={12} r={1.7} />
      <circle cx={9} cy={18} r={1.7} />
      <circle cx={15} cy={18} r={1.7} />
    </g>
  ),
  download: () => <path d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 4v10M7.5 9.5L12 14l4.5-4.5" />,
  upload: () => <path d="M4 15v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2M12 14V4M7.5 8.5L12 4l4.5 4.5" />,
  lock: () => (
    <g>
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      <rect x={5} y={10} width={14} height={10} rx={3} {...TINT} />
      <circle cx={12} cy={14.4} r={1.5} {...SOLID} />
      <path d="M12 15v2" />
    </g>
  ),
  gift: () => (
    <g>
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...TINT} />
      <rect x={4} y={8} width={16} height={4} rx={1.6} {...TINT} />
      <path d="M12 8v12M12 8C10.8 5.7 8.6 4.2 7.5 5.1 6.4 6 7.5 7.8 12 8c4.5-.2 5.6-2 4.5-2.9-1.1-.9-3.3.6-4.5 2.9z" />
    </g>
  ),
  wand: ({ sw }) => (
    <g>
      <path d="M4 20l8.2-8.2" />
      <path d={WAND_STAR} {...TINT} />
      <path d="M6.5 5v2.5M5.25 6.25h2.5" stroke-width={sw * 0.8} />
      <circle cx={20} cy={16} r={1.1} {...SOLID} />
    </g>
  ),
  volume: () => (
    <g>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5l4 3.4c.4.3 1 .1 1-.4V6c0-.5-.6-.7-1-.4L7.5 9H5a1 1 0 0 0-1 1z" {...TINT} />
      <path d="M15.5 9.5a3.4 3.4 0 0 1 0 5M18 7a7 7 0 0 1 0 10" />
    </g>
  ),
  mute: () => (
    <g>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5l4 3.4c.4.3 1 .1 1-.4V6c0-.5-.6-.7-1-.4L7.5 9H5a1 1 0 0 0-1 1z" {...TINT} />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </g>
  ),
} satisfies Record<string, Glyph>;

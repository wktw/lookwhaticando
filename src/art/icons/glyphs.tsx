/**
 * UI glyphs on a 24-unit grid, in the catkin language: flat solid shapes in currentColor, with a
 * second, softer tone (the same ink at a lower opacity) for duotone parts. Genuinely thin things
 * (arrows, chevrons, a hanger's wire, sound waves) are round-capped strokes that inherit the icon's
 * stroke width. No faces, no gloss, no outlines around shapes.
 */
import type { JSX } from 'preact';
import { circlePath, cogPath, flowerPath, heartPath, roundRectPath, sparklePath } from './shapes';

export interface GlyphState {
  /** Solid/active variant (hearts, tabs). Glyphs without one ignore it. */
  filled: boolean;
  /** The icon's stroke width; fine details are drawn relative to it. */
  sw: number;
}

export type Glyph = (s: GlyphState) => JSX.Element;

/** The duotone second tone: the same ink, quieter. */
export const SOFT_OPACITY = 0.36;
export const SOFT = { 'fill-opacity': SOFT_OPACITY } as const;
/** A round-capped line in currentColor (width, caps and joins come from the parent <svg>). */
export const LINE = { fill: 'none', stroke: 'currentColor' } as const;
/** Even-odd fill, for shapes with holes cut through them. */
const HOLED = { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd' } as const;

const GEAR = `${cogPath(12, 12, 6.9, 9.5, 8)}${circlePath(12, 12, 2.9)}`;
const ROSETTE = `${flowerPath(12, 12, 3.8, 9.4, 8, 22.5)}${circlePath(12, 12, 2.3)}`;
const HEART = heartPath(12, 12.6, 19);
const SPARKLE_BIG = sparklePath(11, 13, 8.6, 0.22);
const SPARKLE_SMALL = sparklePath(18.9, 5.1, 2.9, 0.24);
const WAND_GLINT = sparklePath(16.6, 7.4, 4.6, 0.22);
const MAGNIFIER_RING = `${circlePath(10.5, 10.5, 7.1)}${circlePath(10.5, 10.5, 4.7)}`;
const CAMERA =
  'M3 9.6A3 3 0 0 1 6 6.6h1.7l1.2-1.9c.3-.5.8-.7 1.3-.7h3.6c.5 0 1 .2 1.3.7l1.2 1.9H18a3 3 0 0 1 3 3v7.4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z' +
  circlePath(12, 13.3, 4.3) +
  circlePath(17.7, 9.7, 1);
const LOCK_BODY = `${roundRectPath(5, 10, 14, 10.6, 2.8)}${circlePath(12, 14.4, 1.6)}M11.2 15.2h1.6v2.4a.8.8 0 0 1-1.6 0z`;
const FRAME = `${roundRectPath(3.5, 4, 17, 16, 2.2)}${roundRectPath(6.4, 6.9, 11.2, 10.2, 0.8)}`;
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(7.4)}L${p(9.6)}`;
}).join('');

const chevron = (d: string): Glyph => () => <path d={d} {...LINE} />;

/** A pencil lying at 45°: graphite tip, body, and a softer eraser end. */
const PENCIL = 'rotate(-45 12 12)';

export const UI_GLYPHS = {
  plus: () => <path d="M12 5v14M5 12h14" {...LINE} />,
  check: () => <path d="M5 12.6l4.4 4.4L19 7.4" {...LINE} />,
  close: () => <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...LINE} />,
  'chevron-left': chevron('M14.5 5.5L8 12l6.5 6.5'),
  'chevron-right': chevron('M9.5 5.5L16 12l-6.5 6.5'),
  'chevron-down': chevron('M5.5 9L12 15.5 18.5 9'),
  'chevron-up': chevron('M5.5 15L12 8.5 18.5 15'),
  more: () => (
    <g>
      <circle cx={5.5} cy={12} r={2.1} />
      <circle cx={12} cy={12} r={2.1} />
      <circle cx={18.5} cy={12} r={2.1} />
    </g>
  ),
  edit: () => (
    <g transform={PENCIL}>
      <path d="M7 9.5v5L2.8 12.6a.7.7 0 0 1 0-1.2z" />
      <rect x={7.8} y={9.5} width={9.2} height={5} rx={0.6} />
      <rect x={17.8} y={9.5} width={3.6} height={5} rx={1.4} {...SOFT} />
    </g>
  ),
  pause: () => (
    <g>
      <rect x={6} y={5} width={4.2} height={14} rx={1.8} />
      <rect x={13.8} y={5} width={4.2} height={14} rx={1.8} />
    </g>
  ),
  play: () => <path d="M8 6c0-1.1 1.2-1.8 2.1-1.2l8.9 6c.8.6.8 1.8 0 2.4l-8.9 6c-.9.6-2.1-.1-2.1-1.2z" />,
  archive: () => (
    <g>
      <rect x={3.5} y={4} width={17} height={5} rx={1.6} />
      <path d="M5 10.4h14v7.6a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18z" {...SOFT} />
      <rect x={9.4} y={12.6} width={5.2} height={2.2} rx={1.1} />
    </g>
  ),
  trash: () => (
    <g>
      <rect x={4} y={5.4} width={16} height={2.4} rx={1.2} />
      <path d="M9.6 5.4V4.3c0-.7.5-1.2 1.2-1.2h2.4c.7 0 1.2.5 1.2 1.2v1.1z" />
      <path d="M5.8 9.2h12.4l-1 10.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8z" {...SOFT} />
      <rect x={9.5} y={11.4} width={1.6} height={6.6} rx={0.8} />
      <rect x={12.9} y={11.4} width={1.6} height={6.6} rx={0.8} />
    </g>
  ),
  calendar: () => (
    <g>
      <path d="M3.5 10h17v7.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z" {...SOFT} />
      <path d="M6.5 5h11a3 3 0 0 1 3 3v1H3.5V8a3 3 0 0 1 3-3z" />
      <rect x={7} y={2.8} width={1.9} height={4.4} rx={0.95} />
      <rect x={15.1} y={2.8} width={1.9} height={4.4} rx={0.95} />
      <rect x={13.4} y={13} width={4} height={4} rx={1} />
    </g>
  ),
  bell: () => (
    <g>
      <path d="M12 3.4c-3.6 0-6 2.7-6 6.3v3.4c0 1.3-.6 2.4-1.6 3.1l-.3.2c-.7.5-.4 1.6.5 1.6h14.8c.9 0 1.2-1.1.5-1.6l-.3-.2c-1-.7-1.6-1.8-1.6-3.1V9.7c0-3.6-2.4-6.3-6-6.3z" />
      <path d="M9.7 19.4a2.3 2.3 0 0 0 4.6 0z" {...SOFT} />
    </g>
  ),
  share: () => (
    <g>
      <rect x={4.5} y={9.5} width={15} height={11} rx={2.6} {...SOFT} />
      <path d="M12 14.6V3.8M8.3 7.3L12 3.6l3.7 3.7" {...LINE} />
    </g>
  ),
  /** Export: an open box at lower left, the arrow leaving it up and out to the right. */
  export: () => (
    <g>
      <rect x={3.2} y={9.4} width={13} height={11.4} rx={2.6} {...SOFT} />
      <path d="M9.2 15L19.6 4.6M13.6 4.4h6.2v6.2" {...LINE} />
    </g>
  ),
  /** Import: an in-tray across the bottom, the arrow dropping into it from the upper right. */
  import: () => (
    <g>
      <path d="M2.8 13.4h5l1.5 2.5h5.4l1.5-2.5h5v4.1a3.4 3.4 0 0 1-3.4 3.4H6.2a3.4 3.4 0 0 1-3.4-3.4z" {...SOFT} />
      <path d="M19.8 3.4l-8.2 8.2M11.4 5.4v6.4h6.4" {...LINE} />
    </g>
  ),
  camera: () => (
    <g>
      <path d={CAMERA} {...HOLED} />
      <circle cx={12} cy={13.3} r={2.5} {...SOFT} />
    </g>
  ),
  gear: () => <path d={GEAR} {...HOLED} />,
  info: () => (
    <g>
      <circle cx={12} cy={12} r={9.2} {...SOFT} />
      <circle cx={12} cy={7.8} r={1.5} />
      <rect x={10.9} y={10.6} width={2.2} height={6.8} rx={1.1} />
    </g>
  ),
  sparkle: () => (
    <g>
      <path d={SPARKLE_BIG} />
      <path d={SPARKLE_SMALL} {...SOFT} />
    </g>
  ),
  heart: ({ filled }) => <path d={HEART} {...(filled ? {} : SOFT)} />,
  streak: () => <path d={ROSETTE} {...HOLED} />,
  moon: () => <path d="M19.8 14.7A8.4 8.4 0 1 1 9.3 4.2a6.9 6.9 0 0 0 10.5 10.5z" />,
  sun: () => (
    <g>
      <circle cx={12} cy={12} r={4.8} />
      <path d={SUN_RAYS} {...LINE} />
    </g>
  ),
  undo: () => <path d="M9 14.5L4.5 10 9 5.5M4.5 10h10a5 5 0 0 1 0 10H10" {...LINE} />,
  note: () => (
    <g>
      <path d="M5.5 3.5h9.8l4.2 4.2V19a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" {...SOFT} />
      <path d="M15.3 3.5v3.4a.8.8 0 0 0 .8.8h3.4z" />
      <rect x={6.5} y={11} width={9.5} height={1.9} rx={0.95} />
      <rect x={6.5} y={14.8} width={6.2} height={1.9} rx={0.95} />
    </g>
  ),
  search: () => (
    <g>
      <circle cx={10.5} cy={10.5} r={4.7} {...SOFT} />
      <path d={MAGNIFIER_RING} {...HOLED} />
      <path d="M15.9 15.9l4.2 4.2" {...LINE} stroke-width={3} />
    </g>
  ),
  grip: () => (
    <g>
      <circle cx={9} cy={6} r={1.7} />
      <circle cx={15} cy={6} r={1.7} />
      <circle cx={9} cy={12} r={1.7} />
      <circle cx={15} cy={12} r={1.7} />
      <circle cx={9} cy={18} r={1.7} />
      <circle cx={15} cy={18} r={1.7} />
    </g>
  ),
  download: () => (
    <g>
      <path d="M3.5 14.6h17v2.4a3.4 3.4 0 0 1-3.4 3.4H6.9A3.4 3.4 0 0 1 3.5 17z" {...SOFT} />
      <path d="M12 3.8v10M7.8 10l4.2 4.2 4.2-4.2" {...LINE} />
    </g>
  ),
  upload: () => (
    <g>
      <path d="M3.5 14.6h17v2.4a3.4 3.4 0 0 1-3.4 3.4H6.9A3.4 3.4 0 0 1 3.5 17z" {...SOFT} />
      <path d="M12 14V4M7.8 8.2L12 4l4.2 4.2" {...LINE} />
    </g>
  ),
  lock: () => (
    <g>
      <path d="M8 10.4V8a4 4 0 0 1 8 0v2.4" {...LINE} />
      <path d={LOCK_BODY} {...HOLED} />
    </g>
  ),
  gift: () => (
    <g>
      <rect x={5} y={11} width={14} height={9.5} rx={1.8} {...SOFT} />
      <rect x={4} y={7.4} width={16} height={3.6} rx={1.3} />
      <rect x={11} y={7.4} width={2} height={13.1} />
      <path d="M12 7.2C10.9 4.9 8.6 3.6 7.5 4.6c-1 .9-.1 2.5 4.5 2.6zM12 7.2c1.1-2.3 3.4-3.6 4.5-2.6 1 .9.1 2.5-4.5 2.6z" />
    </g>
  ),
  wand: ({ sw }) => (
    <g>
      <path d="M4.4 19.6l8.8-8.8" {...LINE} stroke-width={sw * 1.15} />
      <path d={WAND_GLINT} />
      <circle cx={20} cy={15.6} r={1.2} {...SOFT} />
    </g>
  ),
  volume: () => (
    <g>
      <path d="M4 9.6v4.8a1 1 0 0 0 1 1h2.6l4.3 3.5c.5.4 1.2 0 1.2-.6V5.7c0-.6-.7-1-1.2-.6L7.6 8.6H5a1 1 0 0 0-1 1z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.7 6.6a7.6 7.6 0 0 1 0 10.8" {...LINE} />
    </g>
  ),
  mute: () => (
    <g>
      <path d="M4 9.6v4.8a1 1 0 0 0 1 1h2.6l4.3 3.5c.5.4 1.2 0 1.2-.6V5.7c0-.6-.7-1-1.2-.6L7.6 8.6H5a1 1 0 0 0-1 1z" />
      <path d="M15.8 9.6l4.8 4.8M20.6 9.6l-4.8 4.8" {...LINE} />
    </g>
  ),
  'watering-can': () => (
    <g>
      <path d="M5.4 11.4c0-4.6 7.6-4.6 7.6 0" {...LINE} />
      <path d="M2.6 12.6a1.8 1.8 0 0 1 1.8-1.8h9.6a1.8 1.8 0 0 1 1.8 1.8v5.4a2.8 2.8 0 0 1-2.8 2.8h-7.6A2.8 2.8 0 0 1 2.6 18z" />
      <path d="M14.8 14.6l4.9-5.8 1.9 1.6-5.2 7.6z" />
      <rect x={17.9} y={6.9} width={5.4} height={2.6} rx={1.3} transform="rotate(40 20.6 8.2)" />
      <circle cx={21.8} cy={13.6} r={1} {...SOFT} />
      <circle cx={20.2} cy={16.4} r={1} {...SOFT} />
    </g>
  ),
  sprout: () => (
    <g>
      <path d="M6 20.8c1.8-2 10.2-2 12 0z" {...SOFT} />
      <path d="M12 19.6v-6.4" {...LINE} />
      <path d="M11.9 14.4C8.4 14.9 5.3 13 4.9 9.1c3.8-.6 6.8 1.4 7 5.3z" />
      <path d="M12.1 12c.2-4 3-6.7 7-6.5.1 4-2.8 6.7-7 6.5z" />
    </g>
  ),
  drop: () => <path d="M12 3.2c3.6 4.2 6.4 7.8 6.4 11.3a6.4 6.4 0 0 1-12.8 0c0-3.5 2.8-7.1 6.4-11.3z" />,
  lamp: () => (
    <g>
      <path d="M8.8 3h6.4c.6 0 1.1.4 1.3.9l2.6 6.2c.3.7-.2 1.4-.9 1.4H5.8c-.7 0-1.2-.7-.9-1.4l2.6-6.2c.2-.5.7-.9 1.3-.9z" />
      <path d="M12 11.5v7.2" {...LINE} />
      <rect x={7.6} y={18.4} width={8.8} height={2.6} rx={1.3} />
      <ellipse cx={12} cy={21.6} rx={6.8} ry={1.2} {...SOFT} />
    </g>
  ),
  hanger: () => (
    <g>
      <path d="M12 8.2l-8 6.2c-1 .8-.5 2.3.8 2.3h14.4c1.3 0 1.8-1.5.8-2.3z" {...SOFT} />
      <path d="M12 8.2V7.4a2 2 0 1 0-2-2M12 8.2l-8 6.2c-1 .8-.5 2.3.8 2.3h14.4c1.3 0 1.8-1.5.8-2.3z" {...LINE} />
    </g>
  ),
  bowl: () => (
    <g>
      <circle cx={8.6} cy={11} r={2.2} {...SOFT} />
      <circle cx={12.6} cy={10.2} r={2.5} {...SOFT} />
      <circle cx={16.2} cy={11.2} r={2} {...SOFT} />
      <path d="M3.4 12.2h17.2c0 4.6-3.7 7.9-8.6 7.9s-8.6-3.3-8.6-7.9z" />
      <rect x={8.8} y={19} width={6.4} height={2} rx={1} />
    </g>
  ),
  frame: () => (
    <g>
      <rect x={6.4} y={6.9} width={11.2} height={10.2} {...SOFT} />
      <path d="M7.2 16.4l3.4-4.2 2.6 2.8 1.6-1.6 2.4 3z" />
      <circle cx={14.6} cy={9.8} r={1.3} />
      <path d={FRAME} {...HOLED} />
    </g>
  ),
  pot: () => (
    <g>
      <path d="M11.6 9C8.8 9.4 6.4 8 6 5c3-.4 5.3 1 5.6 4zM12.4 8.2c.1-3.2 2.3-5.3 5.4-5.2.1 3.2-2.2 5.3-5.4 5.2z" {...SOFT} />
      <rect x={5} y={9.6} width={14} height={3.4} rx={1.2} />
      <path d="M6.3 13.8h11.4l-1.3 6.2a1.6 1.6 0 0 1-1.6 1.3H9.2a1.6 1.6 0 0 1-1.6-1.3z" />
    </g>
  ),
  book: () => (
    <g>
      <path d="M7 3h11a1.5 1.5 0 0 1 1.5 1.5V17H7a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
      <path d="M7 17.8h12.5V21H7a1.6 1.6 0 0 1 0-3.2z" {...SOFT} />
      <rect x={9} y={6.6} width={7.6} height={3} rx={0.8} {...SOFT} />
      <path d="M14.6 17.8h2.8v5.4l-1.4-1.1-1.4 1.1z" />
    </g>
  ),
} satisfies Record<string, Glyph>;

/** Other names screens reach for: the same drawings. */
export const GLYPH_ALIASES = {
  magnifier: UI_GLYPHS.search,
  'field-guide': UI_GLYPHS.book,
  rest: UI_GLYPHS.moon,
  tiny: UI_GLYPHS.sprout,
} satisfies Record<string, Glyph>;

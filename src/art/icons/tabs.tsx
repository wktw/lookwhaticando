/**
 * Tab bar icons (DESIGN §4), flat shapes on the 24-unit grid. Each is drawn as "mass" (the body of
 * the thing: a pot, a leaf, a cabinet) and "structure" (what holds it: the sill, the stem, the cat).
 *  - Inactive: quiet. Everything in currentColor (the shell sets --ink-2); the mass is the soft tone.
 *  - Active: filled in the accent family. The mass takes strawberry milk, the structure the deep
 *    text-safe blush (tabs.module.css switches both for lamplight, where the deep ink turns pale).
 */
import { circlePath, roundRectPath } from './shapes';
import { LINE, SOFT, type Glyph, type GlyphState } from './glyphs';
import css from './tabs.module.css';

const mass = (s: GlyphState) => (s.filled ? { class: css.mass } : SOFT);
const structure = (s: GlyphState) => (s.filled ? { class: css.structure } : {});
const line = (s: GlyphState) => (s.filled ? { ...LINE, class: css.structureLine } : LINE);
const HOLED = { 'fill-rule': 'evenodd', 'clip-rule': 'evenodd' } as const;

/* ---------- Today: a pot on the sill, two leaves ---------- */
const today: Glyph = (s) => (
  <g>
    <rect x={1.8} y={18.8} width={20.4} height={2.8} rx={1.2} {...structure(s)} />
    <path d="M12 9.8V6.6" {...line(s)} stroke-width={s.sw * 0.72} />
    <path d="M11.6 7.9C8.8 8.6 6.1 7.2 5.6 4.1c3.1-.6 5.7.9 6 3.8zM12.4 6.6c.1-3.3 2.5-5.5 5.9-5.4.1 3.3-2.4 5.6-5.9 5.4z" {...structure(s)} />
    <rect x={5.8} y={9.6} width={12.4} height={2.8} rx={1.1} {...mass(s)} />
    <path d="M6.8 13h10.4l-1.1 5.1a1 1 0 0 1-1 .7H8.9a1 1 0 0 1-1-.7z" {...mass(s)} />
  </g>
);

/* ---------- Progress: a pressed leaf, taped at the stem ---------- */
const PRESSED_LEAF = 'M0 7.2C-5.5 5.6-7.6 1.6-7.1-2.8-6.6-6.9-3.4-9.6 0-10.8c3.4 1.2 6.6 3.9 7.1 8 .5 4.4-1.6 8.4-7.1 10z';
const progress: Glyph = (s) => (
  <g transform="translate(12.4 11.2) rotate(34)">
    <path d={PRESSED_LEAF} {...mass(s)} />
    <path d="M0 10.8V-7.6M0 .8l-3.6-3M0 .8l3.6-3" {...line(s)} stroke-width={s.sw * 0.66} />
    <rect x={-3.4} y={7.9} width={6.8} height={2.2} rx={0.5} {...structure(s)} />
  </g>
);

/* ---------- Capsules: a small capsule cabinet, glass front, knob and chute ---------- */
const CABINET = `${roundRectPath(4.8, 2.4, 14.4, 17.8, 2.4)}${roundRectPath(7, 4.6, 10, 7.4, 1.3)}`;
const capsules: Glyph = (s) => (
  <g>
    <path d={CABINET} {...HOLED} {...mass(s)} />
    <g {...structure(s)}>
      <circle cx={9.6} cy={10} r={1.75} />
      <circle cx={13.2} cy={10.1} r={1.75} />
      <circle cx={11.5} cy={7.2} r={1.6} />
      <path d={`${circlePath(9.8, 15.6, 2.2)}M8.6 15.1h2.4v1H8.6z`} {...HOLED} />
      <rect x={13.4} y={14.1} width={3.6} height={3.2} rx={0.9} />
      <rect x={6.4} y={20.2} width={2.4} height={1.6} rx={0.6} />
      <rect x={15.2} y={20.2} width={2.4} height={1.6} rx={0.6} />
    </g>
  </g>
);

/* ---------- Shelf: a cat loafing on a pot rim, tail over the side ---------- */
const CAT =
  `${circlePath(8.9, 9.6, 3.3)}` +
  'M6 8.4l-.3-3.7c0-.5.5-.8.9-.5l2.6 2.1zM9.6 6.1l2.4-2c.4-.3 1 0 .9.5l-.3 3.6z' +
  'M8.4 13.2c-.6-3.2 1.7-5.2 5.4-5.2 3.2 0 5.3 1.7 5.3 4v1.2z';
const shelf: Glyph = (s) => (
  <g>
    <rect x={5.2} y={13.2} width={13.6} height={2.6} rx={1} {...mass(s)} />
    <path d="M6.1 16.4h11.8l-.9 5.1a1.1 1.1 0 0 1-1.1.9H8.1a1.1 1.1 0 0 1-1.1-.9z" {...mass(s)} />
    <path d={CAT} {...structure(s)} />
    <path d="M18.6 12c1.4.7 1.8 2.3 1.3 3.9-.3 1-.2 1.9.5 2.3" {...line(s)} stroke-width={s.sw * 0.7} />
  </g>
);

/* ---------- You: a catkin sprig ---------- */
const CATKINS: [number, number, number][] = [
  [6.5, 10.3, -22],
  [15.1, 12.9, 38],
  [16.9, 5.1, 14],
];
const you: Glyph = (s) => (
  <g>
    <path d="M8.2 21.8C9 16.6 11.1 12 15.2 7.4M9.9 15.4c-1.3-.7-2.3-1.9-2.8-3.4" {...line(s)} stroke-width={s.sw * 0.82} />
    {CATKINS.map(([x, y, a]) => (
      <ellipse key={a} cx={x} cy={y} rx={2.35} ry={4.7} transform={`rotate(${a} ${x} ${y})`} {...mass(s)} />
    ))}
  </g>
);

export const TAB_GLYPHS = {
  'tab-today': today,
  'tab-progress': progress,
  'tab-capsules': capsules,
  'tab-shelf': shelf,
  /** The old name for the Shelf tab (the routes still use it). */
  'tab-meadow': shelf,
  'tab-you': you,
} satisfies Record<string, Glyph>;

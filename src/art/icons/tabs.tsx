/**
 * Tab bar icons: small illustrations with two states. Outline (inactive) is pure currentColor
 * like every UI glyph; filled (active) blooms into brand pastels while keeping the currentColor
 * outline, and inner details switch to cocoa so they stay readable on the pastel fills.
 */
import { PASTEL, ACCENT, COCOA } from './palette';
import { flowerPath } from './shapes';
import { SOLID, TINT, type Glyph, type GlyphState } from './glyphs';

/** Fill for a key shape: a pastel when active, the soft currentColor tint when not. */
const paint = (s: GlyphState, color: string, tint: number = TINT['fill-opacity']) =>
  s.filled ? { fill: color } : { fill: 'currentColor', 'fill-opacity': tint };

const detail = (s: GlyphState) => (s.filled ? COCOA : 'currentColor');

/* ---------- Today: the sun rising behind a hill, a sprout in front ---------- */

const HILL = 'M2.5 20.5C4.8 17.6 8.2 16.2 12 16.2s7.2 1.4 9.5 4.3z';

const today: Glyph = (s) => {
  const mask = `${s.uid}-today`;
  return (
    <g>
      <defs>
        {/* Hide the sun behind the hill so the outlines never cross. */}
        <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
          <rect width={24} height={24} fill="#fff" />
          <path d={HILL} fill="#000" stroke="#000" stroke-width={2} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <circle cx={12} cy={13.2} r={6.7} {...paint(s, PASTEL.butter[300])} />
        <path d="M3.4 11.7l-1.65-.3M6.4 6.5L5.3 5.2M12 4.5V2.8M17.6 6.5l1.1-1.3M20.6 11.7l1.65-.3" />
      </g>
      <path d={HILL} {...paint(s, PASTEL.sage[300])} />
      <g stroke-width={1.6}>
        <path d="M12 16.2v-3" />
        <path d="M12 14.8c-1.7.1-3-.9-3.2-2.8 1.9-.1 3.1.9 3.2 2.8z" {...paint(s, ACCENT.leaf, 0.3)} />
        <path d="M12 13.5c.1-2 1.6-3.2 3.6-3.1 0 2-1.6 3.3-3.6 3.1z" {...paint(s, ACCENT.leaf, 0.3)} />
      </g>
    </g>
  );
};

/* ---------- Progress: a patchwork quilt that rises like a bar chart ---------- */

const PATCHES: { x: number; y: number; color: string; strong: boolean }[] = [
  { x: 3, y: 15, color: PASTEL.peach[300], strong: true },
  { x: 9.5, y: 15, color: PASTEL.mint[300], strong: false },
  { x: 9.5, y: 9.5, color: PASTEL.blush[300], strong: true },
  { x: 16, y: 15, color: PASTEL.butter[300], strong: true },
  { x: 16, y: 9.5, color: PASTEL.sky[300], strong: false },
  { x: 16, y: 4, color: PASTEL.lilac[300], strong: true },
];

const progress: Glyph = (s) => (
  <g>
    {PATCHES.map((p) => (
      <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={5} height={5.5} stroke="none" {...paint(s, p.color, p.strong ? 0.32 : 0.12)} />
    ))}
    <rect x={3} y={15} width={5} height={5.5} rx={1.8} />
    <rect x={9.5} y={9.5} width={5} height={11} rx={1.8} />
    <rect x={16} y={4} width={5} height={16.5} rx={1.8} />
    <path d="M9.5 15h5M16 9.5h5M16 15h5" stroke-width={1.5} />
  </g>
);

/* ---------- Capsules: a gumball machine ---------- */

const CAPSULE_BALLS = [
  { cx: 9.6, cy: 11.9, color: PASTEL.blush[300] },
  { cx: 14.3, cy: 12.1, color: PASTEL.mint[300] },
  { cx: 12, cy: 8.3, color: PASTEL.butter[300] },
];

const capsules: Glyph = (s) => (
  <g>
    <path d="M10 4.5v-.7a1.3 1.3 0 0 1 1.3-1.3h1.4A1.3 1.3 0 0 1 14 3.8v.7" {...paint(s, PASTEL.blush[300])} />
    <path d="M8.47 14.8A5.8 5.8 0 1 1 15.53 14.8" {...paint(s, PASTEL.sky[100], 0.08)} />
    {s.filled ? (
      <g stroke={COCOA} stroke-width={1.2}>
        {CAPSULE_BALLS.map((b) => (
          <circle key={b.color} cx={b.cx} cy={b.cy} r={1.9} fill={b.color} />
        ))}
        <path d="M7.6 8.9a4.8 4.8 0 0 1 2.2-3" stroke="#fff" stroke-width={1.4} />
      </g>
    ) : (
      <g {...SOLID} fill-opacity={0.5}>
        {CAPSULE_BALLS.map((b) => (
          <circle key={b.color} cx={b.cx} cy={b.cy} r={1.7} />
        ))}
      </g>
    )}
    <path d="M7.2 14.8h9.6l1.4 5.1c.2.8-.4 1.6-1.2 1.6H7c-.8 0-1.4-.8-1.2-1.6z" {...paint(s, PASTEL.blush[300])} />
    <circle cx={12} cy={18.1} r={1.5} fill={s.filled ? '#fff' : 'none'} stroke={detail(s)} stroke-width={1.5} />
  </g>
);

/* ---------- Meadow: a little cottage with a paw print ---------- */

const meadow: Glyph = (s) => (
  <g>
    <path
      d="M4.8 10.8l5.8-5.3a2.1 2.1 0 0 1 2.8 0l5.8 5.3c.5.5.8 1.1.8 1.8V18a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18v-5.4c0-.7.3-1.3.8-1.8z"
      {...paint(s, PASTEL.sage[300])}
    />
    <g fill={s.filled ? PASTEL.blush[500] : 'currentColor'} stroke="none">
      <path d="M12 13.6c1.8 0 3.2 1.7 3.2 3.1 0 1.2-1.1 1.6-3.2 1.6s-3.2-.4-3.2-1.6c0-1.4 1.4-3.1 3.2-3.1z" />
      <ellipse cx={8.6} cy={12.9} rx={1.15} ry={1.35} transform="rotate(-20 8.6 12.9)" />
      <ellipse cx={10.7} cy={10.9} rx={1.15} ry={1.4} transform="rotate(-8 10.7 10.9)" />
      <ellipse cx={13.3} cy={10.9} rx={1.15} ry={1.4} transform="rotate(8 13.3 10.9)" />
      <ellipse cx={15.4} cy={12.9} rx={1.15} ry={1.35} transform="rotate(20 15.4 12.9)" />
    </g>
  </g>
);

/* ---------- You: a flower on a stem ---------- */

const PETALS = flowerPath(12, 9.3, 3, 6.2, 5);

const you: Glyph = (s) => (
  <g>
    <path d="M12 14.4v6.4" />
    <path d="M12 18.8c.5-2.5 2.8-3.9 5.6-3.6-.1 2.6-2.4 4.1-5.6 3.6z" stroke-width={1.6} {...paint(s, ACCENT.leaf, 0.3)} />
    <path d={PETALS} {...paint(s, PASTEL.blush[300])} />
    <circle cx={12} cy={9.3} r={1.9} fill={s.filled ? PASTEL.butter[500] : 'currentColor'} stroke={s.filled ? COCOA : 'none'} stroke-width={1.2} />
  </g>
);

export const TAB_GLYPHS = {
  'tab-today': today,
  'tab-progress': progress,
  'tab-capsules': capsules,
  'tab-meadow': meadow,
  'tab-you': you,
} satisfies Record<string, Glyph>;

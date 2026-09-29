/**
 * Tab bar icons (DESIGN §4), flat shapes on the 24-unit grid. Each is drawn as "mass" (the body of
 * the thing: a pot, a leaf, a cabinet) and "structure" (what holds it: the sill, the stem, the cat).
 *  - Inactive: quiet. Everything in currentColor (the shell sets --ink-2); the mass is the soft tone.
 *  - Active: filled in the accent family. The mass takes strawberry milk, the structure the deep
 *    text-safe blush (tabs.module.css switches both for lamplight, where the deep ink turns pale).
 */
import { circlePath, roundRectPath } from './shapes';
import { LINE, SOFT, type Glyph, type GlyphState } from './glyphs';
import type { Species } from '@/catalog/types';
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

/* ---------- Capsules: a small capsule cabinet, capsules behind the glass, knob and chute ---------- */
const CABINET = `${roundRectPath(4.8, 2.4, 14.4, 17.8, 2.4)}${roundRectPath(7, 4.6, 10, 7.4, 1.3)}`;
/** Two-tone capsules behind the glass: [cx, cy, r]. The top half is solid, the lower half soft. */
const GLASS_CAPSULES: [number, number, number][] = [
  [9.7, 9.9, 1.9],
  [14.3, 9.9, 1.9],
  [12, 6.9, 1.7],
];
const capTop = ([x, y, r]: [number, number, number]) => `M${x - r} ${y}a${r} ${r} 0 0 1 ${2 * r} 0z`;
const capBottom = ([x, y, r]: [number, number, number]) => `M${x - r} ${y + 0.45}h${2 * r}a${r} ${r} 0 0 1 ${-2 * r} 0z`;
const CAPSULE_TOPS = GLASS_CAPSULES.map(capTop).join('');
const CAPSULE_BOTTOMS = GLASS_CAPSULES.map(capBottom).join('');
/** The chute: a hooded mouth with a dark opening. */
const CHUTE = `${roundRectPath(12.8, 13.9, 4.6, 4, 1.1)}${roundRectPath(13.7, 15.5, 2.8, 1.6, 0.5)}`;
const capsules: Glyph = (s) => (
  <g>
    <path d={CABINET} {...HOLED} {...mass(s)} />
    <path d={CAPSULE_BOTTOMS} {...mass(s)} />
    <g {...structure(s)}>
      <path d={CAPSULE_TOPS} />
      <path d={`${circlePath(9.4, 15.9, 2.2)}M8.2 15.4h2.4v1H8.2z`} {...HOLED} />
      <path d={CHUTE} {...HOLED} />
      <rect x={6.4} y={20.2} width={2.4} height={1.6} rx={0.6} />
      <rect x={15.2} y={20.2} width={2.4} height={1.6} rx={0.6} />
    </g>
  </g>
);

/* ---------- Shelf: your closest pet loafing on a pot rim (DESIGN §1: "the silhouette of your closest pet") ---------- */
/*
 * Each animal is separate shapes (head, ears, body…) rather than one compound path: overlapping subpaths that wind in
 * opposite directions would cancel under the nonzero rule and punch holes. All eight sit on the same rim (y 13.2),
 * head to the left, and read as their species from the outline alone at 20 px: ears, horns, a snout, a beak.
 */
const CAT_HEAD = circlePath(8.9, 9.6, 3.3);
const CAT_EARS = 'M6 8.4l-.3-3.7c0-.5.5-.8.9-.5l2.6 2.1zM9.6 6.1l2.4-2c.4-.3 1 0 .9.5l-.3 3.6z';
const CAT_BODY = 'M8.4 13.2c-.6-3.2 1.7-5.2 5.4-5.2 3.2 0 5.3 1.7 5.3 4v1.2z';
/** Every piece of the Shelf cat, for tests: each must be its own element. */
export const SHELF_CAT_PARTS = [CAT_HEAD, CAT_EARS, CAT_BODY] as const;

/** One animal on the rim: its solid parts, and a tail drawn as a line (or none). */
interface RimPet {
  parts: readonly string[];
  tail?: string;
}

const LOAF = 'M8.8 13.2c-.5-3.1 1.7-5 5.2-5 3.1 0 5.2 1.6 5.2 3.9v1.1z';

/** The eight species' rim silhouettes (exported for tests and the gallery). */
export const SHELF_PETS: Readonly<Record<Species, RimPet>> = {
  cat: { parts: SHELF_CAT_PARTS, tail: 'M18.6 12c1.4.7 1.8 2.3 1.3 3.9-.3 1-.2 1.9.5 2.3' },
  cow: {
    parts: [
      'M9.2 13.2c-.4-3.3 2-5 5.1-5 3.1 0 5.2 1.6 5.2 3.9v1.1z',
      `${circlePath(8.6, 9.3, 2.9)}`,
      'M6 11.2c0-1.1 1.2-1.9 2.6-1.9s2.6.8 2.6 1.9-1.2 1.9-2.6 1.9S6 12.3 6 11.2z',
      'M5.9 8.4l-2.5-.3c-.5 0-.6.6-.2.8l2.4 1.1zM11.3 8.4l2.5-.3c.5 0 .6.6.2.8l-2.4 1.1z',
      'M7.1 6.8l-.8-1.9c-.2-.4.3-.7.6-.4l1.4 1.6zM10.1 6.8l.8-1.9c.2-.4-.3-.7-.6-.4l-1.4 1.6z',
    ],
    tail: 'M19.2 11.6c.6 1.3.6 2.9.2 4.6',
  },
  dog: {
    parts: [LOAF, circlePath(8.9, 9.7, 3.1), 'M6.3 11.4c0-1 1.1-1.6 2.3-1.6s1.9.6 1.9 1.4-.9 1.6-2.1 1.6-2.1-.5-2.1-1.4z', 'M6.2 7.2c-1.3.2-2.1 1.6-1.9 3.4.1.9.9 1.1 1.4.5l1-2.6zM11.6 7.2c1.3.2 2.1 1.6 1.9 3.4-.1.9-.9 1.1-1.4.5l-1-2.6z'],
    tail: 'M19 11.4c.9-.6 1.2-1.9.8-3.1',
  },
  bunny: {
    parts: ['M8.9 13.2c-.3-3 1.8-4.6 4.6-4.6 2.8 0 4.8 1.6 4.8 3.6v1z', circlePath(8.8, 10.2, 3), 'M7 7.8l-1-4.6c-.2-1 1.1-1.4 1.5-.4l1.4 4.6zM9.4 7.5l.5-4.7c.1-1 1.5-.9 1.5.1l-.4 4.8z', circlePath(18.8, 11.7, 1.2)],
  },
  frog: {
    parts: ['M5.2 13.2c0-3.3 3-5.4 6.8-5.4s6.8 2.1 6.8 5.4z', circlePath(8.9, 8.1, 1.9), circlePath(15.1, 8.1, 1.9)],
  },
  duck: {
    parts: ['M8.2 13.2c-.2-2.8 1.8-4.3 4.9-4.3 2.5 0 4.4 1 5.4 2.6l1.3-.9c.4 1.5-.3 2.6-1.3 2.6z', circlePath(8.7, 8.4, 2.7), 'M6.2 8.5l-2.6.4c-.5.1-.5.8 0 .9l2.8.4z'],
  },
  bear: {
    parts: ['M8.6 13.2c-.5-3.3 1.9-5.4 5.5-5.4 3.3 0 5.4 1.8 5.4 4.2v1.2z', circlePath(8.9, 9.8, 3.3), circlePath(6.4, 6.9, 1.4), circlePath(11.4, 6.9, 1.4)],
  },
  hamster: {
    parts: ['M7 13.2c-.5-3.2 1.9-5.3 5.3-5.3 3.3 0 5.6 2 5.3 5.3z', circlePath(9, 8.1, 1.1), circlePath(13.4, 7.8, 1.1)],
  },
};

/** No pets yet: the pot waits with a sprig in it. */
const SPRIG_STEM = 'M12 13V9.6';
const SPRIG_LEAVES = 'M11.6 10.4C9 10.9 6.6 9.6 6.2 6.8c2.8-.5 5.2.9 5.4 3.6zM12.4 9.4c.2-3 2.4-5 5.4-4.8 0 3-2.3 5-5.4 4.8z';

const shelfFor =
  (species: Species | null | undefined): Glyph =>
  (s) => {
    const pet = species === null ? null : SHELF_PETS[species ?? 'cat'];
    return (
      <g data-species={species === null ? 'none' : (species ?? 'cat')}>
        <rect x={5.2} y={13.2} width={13.6} height={2.6} rx={1} {...mass(s)} />
        <path d="M6.1 16.4h11.8l-.9 5.1a1.1 1.1 0 0 1-1.1.9H8.1a1.1 1.1 0 0 1-1.1-.9z" {...mass(s)} />
        {pet ? (
          <>
            <g {...structure(s)}>
              {pet.parts.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            {pet.tail && <path d={pet.tail} {...line(s)} stroke-width={s.sw * 0.7} />}
          </>
        ) : (
          <g {...structure(s)}>
            <path d={SPRIG_STEM} {...line(s)} stroke-width={s.sw * 0.72} />
            <path d={SPRIG_LEAVES} />
          </g>
        )}
      </g>
    );
  };

/** The Shelf tab: the closest pet's silhouette when the state names one (`GlyphState.species`), else the cat. */
const shelf: Glyph = (s) => shelfFor(s.species)(s);

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

import { CAT_EARS, CAT_RIG } from './cat.rig';
import type { DrawCtx, SpeciesArt } from './art';
import { Blush, Eyes, Mouth, Whiskers } from '../face';
import { band, blotch, dots, heart } from './marks';
import { circle, ellipse, fmt, rrect, tube } from '../shape';
import { mix } from '../palette';

/**
 * A colourpoint's mask (head frame, clipped to the head). The point colour covers the face below
 * the brow, out to the head outline at the cheeks and whisker pads and under the chin, and meets
 * the ears at the sides. Over the brow it fades in one flat step (half coat, half point) to the
 * coat colour, which stays only on the crown. Even-odd: the head's box with the brow cut out.
 */
const BROW =
  'M-26 -28H26V-9L18.4 -8.2C16 -7.2 13.6 -6.8 11.4 -6.6C8 -6.2 5.4 -5.2 3 -2.2C0.6 -5.2 -2 -6.2 -6 -6.4C-9 -6.6 -13 -8 -17.6 -9.2L-26 -9.2Z';
const CROWN = 'M-12 -28H16L13.4 -15.4C11.4 -12.4 7.4 -10.4 3 -9.6C-1.4 -10.4 -5.6 -12.6 -8 -15.8Z';
const POINT_MASK = 'M-26 -28H26V24H-26Z' + BROW;
const POINT_BROW = BROW + CROWN;
/** Cat nose: a small rounded triangle. */
const NOSE = 'M-1.9 -1C-0.2 -1.8 1.8 -1.2 2 -0.8C1.4 0.5 0.7 1.2 0 1.3C-0.8 1.2 -1.5 0.5 -1.9 -1Z';

function ears(c: DrawCtx) {
  const t = c.tones;
  const fold = c.trait('fold');
  const lift = c.face.expr === 'surprised' ? 'translate(0 -1.4)' : c.face.expr === 'happy' ? 'rotate(-3)' : undefined;
  const near = t.ear;
  const far = c.has('patches') ? t.mark2 : t.ear;
  const nearCol = c.has('patches') ? t.mark : near;
  if (fold) {
    return (
      <g transform={lift}>
        <path d={CAT_EARS.foldNear} fill={nearCol} />
        <path d={CAT_EARS.foldFar} fill={far} />
      </g>
    );
  }
  const inner = c.face.full && !c.silhouette && !c.tones.dark;
  return (
    <g transform={lift}>
      {c.trait('tufts') && <path d={CAT_EARS.tuftNear + CAT_EARS.tuftFar} fill={t.point} />}
      <g class={c.animated ? 'pet-earflick' : undefined}>
        <path d={CAT_EARS.near} fill={nearCol} />
        {inner && <path d={CAT_EARS.nearIn} fill={t.earIn} />}
      </g>
      <path d={CAT_EARS.far} fill={far} />
      {inner && <path d={CAT_EARS.farIn} fill={t.earIn} />}
    </g>
  );
}

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = CAT_RIG.head;
  const [nx, ny] = a.nose;
  return (
    <g>
      {c.trait('sphynx') && f.full && (
        <path class="pet-line" d="M-2 -13.5Q3 -15 8 -13.5M-1 -10.6Q3.4 -11.8 7.4 -10.6" fill="none" stroke={t.ink} stroke-opacity={0.22} stroke-width="0.8" stroke-linecap="round" />
      )}
      <Blush f={f} y={7.6} left={-9.4} right={14.4} rx={3} ry={1.7} />
      <Eyes f={{ ...f, slit: true }} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      <path d={NOSE} transform={`translate(${nx} ${ny})`} fill={t.nose} />
      <Mouth f={f} x={nx} y={ny + 2} s={0.9} />
      <Whiskers f={f} left={-7} right={13.2} y={8.6} len={10} spread={2.6} />
    </g>
  );
}

/** Tabby stripes as one path each for the body (rump → chest) and the head (an M on the brow, cheek bars). */
const TABBY_BODY = [16, 33, 50, 67].map((u, i) => band(u, 7.4 - i * 0.4, 3.4, -8, 44 - i * 4, -6)).join('');
const TABBY_HEAD =
  'M1.6 -19L4.2 -19L3.4 -11.4C3.3 -10.6 2.4 -10.6 2.3 -11.4Z' +
  'M-4.4 -18.2L-1.8 -18.6L-2.6 -11.8C-2.8 -11 -3.6 -11.1 -3.7 -11.8Z' +
  'M7.8 -18.6L10.2 -18L8.6 -11.8C8.4 -11.1 7.6 -11.2 7.6 -11.9Z' +
  'M-20.5 1L-14.6 2.4C-14 2.6 -14 3.3 -14.6 3.4L-20.5 4.6Z' +
  'M-20.5 6.2L-15.2 7C-14.6 7.2 -14.6 7.8 -15.2 7.9L-20 9.4Z';

/** Cats: stripes, patches, points, bibs. Body marks are in the canonical frame (rump → chest, back → belly). */
const marks: SpeciesArt['marks'] = {
  tabby: {
    body: (c) => <path d={TABBY_BODY} fill={c.tones.mark} />,
    head: (c) => <path d={TABBY_HEAD} fill={c.tones.mark} />,
  },
  patches: {
    body: (c) => (
      <g>
        <path d={blotch(64, 2, 50, 42, 0.2)} fill={c.tones.mark2} />
        <path d={blotch(8, 52, 44, 64, -0.4)} fill={c.tones.mark} />
      </g>
    ),
    head: (c) => (
      <g>
        <path d="M-22 -2C-20 -12 -12 -19.5 -3 -19C-2.6 -13 -5.4 -7.8 -10.6 -5C-14.4 -3 -18.6 -2 -22 -2Z" fill={c.tones.mark} />
        <path d="M6 -20C14 -20 22 -12 22 -3C17.6 -4.4 13.6 -7 10.8 -10.6C8.4 -13.6 6.4 -16.8 6 -20Z" fill={c.tones.mark2} />
      </g>
    ),
  },
  tuxedo: {
    chest: true,
    head: (c) => (
      <path d="M3 -3.6C6.6 -3.6 9.2 1 10.6 4.6C12.4 9.4 12.6 14 10 17C7 20.4 -1 20.4 -4.4 17.4C-7 15 -6.6 9.8 -4.6 5.2C-3.2 1.2 -0.6 -3.6 3 -3.6Z" fill={c.tones.under} />
    ),
  },
  points: {
    head: (c) => (
      <g fill-rule="evenodd">
        <path d={POINT_MASK} fill={c.tones.point} />
        <path d={POINT_BROW} fill={mix(c.tones.head, c.tones.point, 0.45)} />
      </g>
    ),
    body: (c) => <path d={blotch(40, 2, 60, 22, 0)} fill={c.tones.point} opacity={0.35} />,
  },
  van: {
    head: (c) => (
      <g fill={c.tones.mark}>
        <path d="M-21 -4C-20 -13 -13 -19.5 -3.4 -19.6C-3 -15.4 -4.6 -11.4 -8.2 -9C-12 -6.4 -17 -5 -21 -4Z" />
        <path d="M7.6 -20C15 -19.6 21.4 -13 21.6 -5C17.4 -6 13.8 -8.2 11.4 -11.2C9.4 -13.8 8 -16.8 7.6 -20Z" />
      </g>
    ),
  },
  heart: {
    // One heart-ish patch on the flank, kept upright and unsquashed whatever the pose.
    body: (c) => {
      const fr = c.p.frame;
      return (
        <g transform={`translate(44 34) scale(${fmt(100 / fr.w)} ${fmt(100 / fr.h)}) rotate(${fmt(-(fr.a ?? 0))})`}>
          <path d={heart(0, 0, 13, 11.5)} transform="rotate(-12)" fill={c.tones.mark} />
        </g>
      );
    },
  },
  ticked: {
    // Abyssinian ticking: many fine flecks, a quiet texture rather than spots.
    body: (c) => <path d={dots(8, 2, 88, 50, 46, 0.9, 11)} fill={c.tones.mark} opacity={0.55} />,
    head: (c) => <path d="M-3 -17.5L0.2 -17.6L-0.8 -12.4ZM4.6 -18L7.4 -17.4L5.4 -12.6Z" fill={c.tones.mark} />,
  },
  brindle: {
    body: (c) => (
      <g>
        <path d={blotch(14, 6, 26, 22, 0.6)} fill={c.tones.mark} />
        <path d={blotch(52, 24, 22, 20, -0.3)} fill={c.tones.mark} />
        <path d={blotch(34, 2, 18, 16, 0.1)} fill={c.tones.mark2} />
        <path d={blotch(76, 6, 18, 18, 0.9)} fill={c.tones.mark2} />
        <path d={blotch(4, 54, 20, 18, 0.4)} fill={c.tones.mark2} />
      </g>
    ),
    head: (c) => (
      <g>
        <path d="M-20 -6C-17 -14 -10 -18.8 -2 -18.6C-3 -13 -8 -9 -13.6 -7.6C-16 -7 -18.4 -6.6 -20 -6Z" fill={c.tones.mark} />
        <path d="M8 -19.6C14 -18 19.4 -13.4 20.6 -7.6C16 -9 12.4 -11.8 10.2 -14.8C9 -16.4 8.4 -18 8 -19.6Z" fill={c.tones.mark2} />
      </g>
    ),
  },
  blaze: {
    head: (c) => <path d="M3.2 -6C5.2 -2 9.4 3 12.4 8C13.8 11 12.6 17.6 3 17.8C-6.4 17.6 -7.4 11 -6 8C-3.2 3 1.2 -2 3.2 -6Z" fill={c.tones.under} />,
  },
  belly: { chest: true },
  gloves: {},
  mitts: {},
  muzzle: {
    head: (c) => <path d={ellipse(3.4, 9.2, 7.6, 5.4)} fill={c.tones.muzzle} />,
  },
  socks: {},
};

/** A ruff: a soft bib of long fur at the chest (Maine Coon, Norwegian, Ragdoll, Birman, Smoke). */
function overBody(c: DrawCtx) {
  if (!c.trait('ruff') && !c.trait('longhair')) return null;
  const n = c.p.neck;
  const col = c.trait('ruff') || c.has('tuxedo') ? c.tones.under : c.tones.coat;
  return (
    <path
      transform={`translate(${n.x} ${n.y}) rotate(${n.r})`}
      d="M-12 -4C-10 3 -7 7.6 -3.6 8.6C-2.6 11.6 0.6 12.4 2.2 10C4.4 12.4 7.6 11.4 8 8.4C11 6.6 12.8 2.4 12.4 -4Z"
      fill={col}
    />
  );
}

function sprite({ tones: t, has }: { tones: DrawCtx['tones']; has: DrawCtx['has'] }) {
  const earHead = `${circle(62, 58, 17)}M48.6 52L49 37.6C49.2 35.4 51 35 52.6 36.4L60.6 43.4ZM63.4 42.6L73.2 36.8C75 35.8 76.6 36.8 76.4 38.8L75.6 52Z`;
  return (
    <g>
      <path d={rrect(14, 62, 58, 32, 16)} fill={t.coat} />
      <path d={tube([[18, 72], [12, 84], [20, 91], [42, 92]], 7, 6)} fill={has('tabby') || has('van') || has('patches') ? t.mark : t.tail} />
      <path d={earHead} fill={has('patches') || has('van') ? t.mark : t.head} />
      <circle cx={57} cy={60} r={3} fill={t.ink} />
      <circle cx={69} cy={60} r={3} fill={t.ink} />
    </g>
  );
}

export const CAT_ART: SpeciesArt = {
  species: 'cat',
  rigFor: () => ({ id: 'cat', rig: CAT_RIG }),
  ears,
  face,
  marks,
  overBody,
  sprite,
};


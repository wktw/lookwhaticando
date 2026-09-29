import { COW_PARTS, COW_RIG, COW_SPRITE } from './cow.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { mix, TONGUE } from '../palette';
import { blotch, dots, star } from './marks';
import { ellipse } from '../shape';

/**
 * Cows: horns and a pale muzzle always (they read at 32 px), ears out to the side, a nose-lick
 * for happy (DESIGN §10.4), cud for chewing.
 */

function ears(c: DrawCtx) {
  const t = c.tones;
  const up = c.face.expr === 'happy' || c.face.expr === 'surprised';
  const big = c.trait('long-ears');
  const L = big ? COW_PARTS.earBigL : up ? COW_PARTS.earUpL : COW_PARTS.earL;
  const R = big ? COW_PARTS.earBigR : up ? COW_PARTS.earUpR : COW_PARTS.earR;
  const inner = c.face.full && !c.silhouette;
  const earCol = c.has('holstein') || c.has('stars') ? t.mark : t.ear;
  return (
    <g>
      {c.trait('long-horns') ? (
        <g fill={t.horn}>
          <path d={COW_PARTS.longHornL} />
          <path d={COW_PARTS.longHornR} />
        </g>
      ) : (
        <g fill={t.horn}>
          <path d={COW_PARTS.hornL} />
          <path d={COW_PARTS.hornR} />
        </g>
      )}
      <g transform="translate(-12.5 -5.5)">
        <g class={c.animated ? 'pet-earflick' : undefined}>
          <g transform="translate(12.5 5.5)">
            <path d={L} fill={earCol} />
            {inner && <path d={COW_PARTS.earInL} fill={t.earIn} />}
          </g>
        </g>
      </g>
      <path d={R} fill={earCol} />
      {inner && <path d={COW_PARTS.earInR} fill={t.earIn} />}
    </g>
  );
}

const MUZ_X = 1.4;

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = COW_RIG.head;
  const fringe = c.trait('fringe');
  const ring = c.has('ring') && !c.silhouette;
  return (
    <g>
      {ring ? (
        <>
          {/* A Jersey's muzzle: a dark nose pad inside a wide pale mealy ring. */}
          <path d={COW_PARTS.muzzle} fill={t.under} />
          <path d={COW_PARTS.pad} fill={t.muzzle} />
        </>
      ) : (
        <path d={COW_PARTS.muzzle} fill={t.muzzle} />
      )}
      <g fill={ring ? mix(t.muzzle, t.ink, 0.5) : t.dark ? t.ink : t.nose} opacity={0.85}>
        <ellipse cx={MUZ_X - (ring ? 4.4 : 5.8)} cy={10.6} rx={1.35} ry={1.7} />
        <ellipse cx={MUZ_X + (ring ? 4.4 : 5.8)} cy={10.6} rx={1.35} ry={1.7} />
      </g>
      {fringe ? (
        <path d={COW_PARTS.fringe} fill={t.mark} />
      ) : (
        <>
          <Blush f={f} y={3.8} left={-10.4} right={12.6} rx={2.8} ry={1.6} />
          <Eyes f={f} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
        </>
      )}
      {fringe && <Blush f={f} y={4} left={-10.4} right={12.6} rx={2.8} ry={1.6} />}
      {f.expr === 'happy' && !f.closed && <path d="M1.6 18.4C5.4 18.2 8.6 16 8.4 12.2C8.3 10.5 6.1 10.4 5.9 12C5.6 14.4 4.2 15.8 1.2 16.2Z" fill={TONGUE} />}
      <Mouth f={f} x={MUZ_X} y={f.expr === 'yawn' ? 13.6 : f.expr === 'blep' ? 17.4 : 16.4} s={f.expr === 'yawn' ? 1.3 : 1.1} />
    </g>
  );
}

/** Holstein map patches (body frame) and the head patch, each as one path. */
const HOLSTEIN = blotch(46, 14, 30, 64, 0.3) + blotch(-2, 26, 30, 96, -0.2) + blotch(80, 68, 14, 34, 0.8);
const HOLSTEIN_NIGHT = blotch(46, 14, 32, 64, 0.3) + blotch(-2, 26, 30, 96, -0.2) + blotch(80, 68, 14, 34, 0.8);
const HOLSTEIN_HEAD = 'M-5 -18C-13 -19 -18 -12 -16.4 -3.4C-12.6 -5.2 -8.6 -7.8 -5.6 -10C-3.8 -12.4 -3.6 -16 -5 -18Z';
/** The Night-sky Cow's static star field, inside its patches. */
const STAR_FIELD =
  star(42, 10, 2.4) + star(52, 26, 1.6) + star(38, 34, 1.3) + star(4, 20, 2) + star(8, 50, 1.4) + dots(34, 0, 26, 40, 5, 0.6, 7.7, 1) + dots(-6, 10, 16, 60, 4, 0.6, 3.1, 1);

const marks: SpeciesArt['marks'] = {
  holstein: {
    body: (c) => <path d={HOLSTEIN} fill={c.tones.mark} />,
    head: (c) => <path d={HOLSTEIN_HEAD} fill={c.tones.mark} />,
  },
  stars: {
    body: (c) => (
      <>
        <path d={HOLSTEIN_NIGHT} fill={c.tones.mark} />
        <path d={STAR_FIELD} fill={c.tones.mark2} />
      </>
    ),
    head: (c) => (
      <>
        <path d={HOLSTEIN_HEAD} fill={c.tones.mark} />
        <path d={star(-11, -9, 1.3)} fill={c.tones.mark2} />
      </>
    ),
  },
  belt: {
    body: (c) => <path d="M36 -10H62V110H36Z" fill={c.tones.under} />,
  },
  roan: {
    body: (c) => <path d={dots(0, 0, 100, 100, 46, 1.6, 2.2)} fill={c.tones.mark} />,
    head: (c) => <path d={dots(-14, -15, 28, 18, 12, 0.9, 4.4)} fill={c.tones.mark} />,
  },
  whiteface: {
    body: (c) => (
      <g fill={c.tones.under}>
        <path d="M60 78C74 70 92 72 110 80V110H56Z" />
        <path d="M88 -10C96 -8 104 0 110 4V30C102 22 94 12 88 -10Z" />
      </g>
    ),
  },
  ring: {},
  shag: {
    body: (c) => <path d={[4, 16, 28, 40, 52, 64, 76, 88, 100].map((u) => ellipse(u, 98, 7.4, 9)).join('')} fill={c.tones.mark} />,
  },
  belly: {
    body: (c) => <path d="M10 82C40 74 70 74 104 82V110H10Z" fill={c.tones.under} />,
  },
};

function sprite({ tones: t, has }: SpriteCtx) {
  return (
    <g transform="translate(4 0)">
      <path d={COW_SPRITE.body} fill={t.far} />
      {has('belt') && <path d="M58 46H70V76H58Z" fill={t.under} />}
      {has('holstein') && <path d={ellipse(70, 56, 9, 7)} fill={t.mark} />}
      <path d={COW_SPRITE.head} fill={t.head} />
      <path d="M17 24C12 17 20 13 21 20ZM37 24C42 17 34 13 33 20Z" fill={t.horn} />
      <path d={COW_SPRITE.muzzle} fill={t.muzzle} />
      {COW_SPRITE.eyes.map((d, i) => (
        <path key={i} d={d} fill={t.dark ? t.ring ?? t.ink : t.ink} />
      ))}
    </g>
  );
}

export const COW_ART: SpeciesArt = {
  species: 'cow',
  rigFor: () => ({ id: 'cow', rig: COW_RIG }),
  ears,
  face,
  marks,
  sprite,
};


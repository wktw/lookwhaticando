import { DOG_EARS, DOG_FLAT_RIG, DOG_LONG_RIG, DOG_RIG } from './dog.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { blotch, dots, heart } from './marks';
import { circle, ellipse, rrect } from '../shape';

/**
 * Dogs: the muzzle and the ears carry the breed. Happy is a squint, a blush and a wagging tail.
 */

type EarKind = 'floppy' | 'long' | 'pointy' | 'bat';
const earKind = (c: DrawCtx): EarKind =>
  c.trait('bat-ears') ? 'bat' : c.trait('pointy-ears') ? 'pointy' : c.trait('long-ears') ? 'long' : 'floppy';

/** Upright ears stand behind the head; the far floppy ear peeks out behind it. */
function ears(c: DrawCtx) {
  const t = c.tones;
  const kind = earKind(c);
  const lift = c.face.expr === 'surprised' ? 'translate(0 -1.2)' : undefined;
  if (kind === 'pointy' || kind === 'bat') {
    const inner = c.face.full && !c.silhouette;
    const E = kind === 'pointy' ? [DOG_EARS.pointyNear, DOG_EARS.pointyFar, DOG_EARS.pointyNearIn, DOG_EARS.pointyFarIn] : [DOG_EARS.batNear, DOG_EARS.batFar, DOG_EARS.batNearIn, DOG_EARS.batFarIn];
    return (
      <g transform={lift}>
        <path d={E[0]} fill={t.ear} />
        <path d={E[1]} fill={t.ear} />
        {inner && (
          <g fill={t.earIn}>
            <path d={E[2]} />
            <path d={E[3]} />
          </g>
        )}
      </g>
    );
  }
  return <path d={kind === 'long' ? DOG_EARS.longFar : DOG_EARS.floppyFar} fill={t.earFar} transform={lift} />;
}

/** Pomeranian and Samoyed fluff: a scalloped ruff at the neck and cheeks. */
const RUFF = 'M-13 -5C-15.6 -1 -15.6 4 -13.4 7.6C-15 10.6 -12.6 14 -9.6 13.2C-8.4 16.4 -4.4 17 -2.6 14.6C-0.6 17.4 3.4 17.2 4.6 14.2C6.8 16.4 10.4 15.4 11 12.4C13.8 12.8 15.6 9.4 13.8 6.8C16 4.6 15.8 0 13.2 -2.6Z';
function overBody(c: DrawCtx) {
  if (!c.trait('fluffy')) return null;
  const n = c.p.neck;
  return <path d={RUFF} transform={`translate(${n.x} ${n.y}) rotate(${n.r})`} fill={c.tones.under} />;
}

/** The near floppy ear hangs over the side of the head. */
function overHead(c: DrawCtx) {
  const kind = earKind(c);
  if (kind === 'pointy' || kind === 'bat') return null;
  const up = c.face.expr === 'surprised' ? 'translate(0.6 -1.6) rotate(-6)' : c.face.expr === 'happy' ? 'rotate(4)' : undefined;
  return <path d={kind === 'long' ? DOG_EARS.longNear : DOG_EARS.floppyNear} fill={c.tones.ear} transform={up} />;
}

const NOSE = 'M-2.8 -1.6C-1 -2.6 1.6 -2.4 2.8 -1.2C3 1 1.4 2.4 0 2.6C-1.6 2.4 -3.2 0.8 -2.8 -1.6Z';

/** A narrow white blaze from the crown between the eyes, opening into the muzzle (head frame). */
const BLAZE =
  'M1.2 -15.6C2.6 -15.8 3.6 -15.4 3.8 -14C4.2 -10 4.4 -6.4 5.2 -3.4C6.2 0 8.8 2 12 2.4L23 2.6V17H4C1.8 12.6 0.4 8 0.6 3C0.8 -2 0.6 -8 0.2 -13.4C0.1 -14.8 0.5 -15.5 1.2 -15.6Z';
/** The muzzle patch. */
const MUZZLE = ellipse(14.6, 8.4, 9.4, 6.8);

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = c.rig.head;
  const flat = c.trait('short-muzzle');
  return (
    <g>
      <Blush f={f} y={4.6} left={-9.6} right={12.4} rx={2.8} ry={1.6} />
      <Eyes f={f} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      <path d={NOSE} transform={`translate(${a.nose[0]} ${a.nose[1]})${flat ? ' scale(0.8)' : ''}`} fill={t.nose} />
      <Mouth f={f} x={flat ? 15.2 : 17.4} y={flat ? 10 : 10.6} s={flat ? 0.9 : 1} />
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  muzzle: {
    head: (c) => <path d={MUZZLE} fill={c.tones.muzzle} />,
  },
  belly: { chest: true },
  socks: {},
  blaze: {
    head: (c) => <path d={BLAZE} fill={c.tones.under} />,
  },
  saddle: {
    body: (c) => <path d={blotch(44, 4, 78, 46, 0.2)} fill={c.tones.mark} />,
  },
  tricolour: {
    // Bernese: a black head with a narrow white blaze and a white muzzle, rust brows and cheeks;
    // a white bib, and rust on the legs above the white paws.
    chest: true,
    body: (c) => <path d={blotch(70, 92, 20, 18, 0)} fill={c.tones.mark} />,
    head: (c) => (
      <g>
        <g fill={c.tones.mark}>
          <ellipse cx={-6.6} cy={6} rx={4.4} ry={3.4} />
          <ellipse cx={9.6} cy={12.4} rx={4} ry={3} />
        </g>
        <path d={BLAZE} fill={c.tones.under} />
        <path d={MUZZLE} fill={c.tones.under} />
        <g fill={c.tones.mark}>
          <circle cx={-3.6} cy={-7} r={1.9} />
          <circle cx={8.4} cy={-7.4} r={1.7} />
        </g>
      </g>
    ),
  },
  spots: {
    body: (c) => (
      <g fill={c.tones.mark}>
        <path d={dots(4, 4, 92, 70, 13, 3.4, 9.2)} />
        <path d={heart(44, 30, 10, 9)} />
      </g>
    ),
    head: (c) => <path d={`${circle(-8, -6, 1.8)}${circle(-2, -11, 1.4)}${circle(10.4, -9.4, 1.5)}${circle(-11, 6, 1.4)}`} fill={c.tones.mark} />,
  },
  urajiro: {
    chest: true,
    head: (c) => (
      <g fill={c.tones.under}>
        <path d="M-15.6 3.6C-10 2 -3 4 3 5C8 5.6 12 3 17 2.2C21 2 22.6 6 22 9C21.4 12.6 18 14.6 14 14.8C10 15.4 5 16 0 15.8C-7 15.4 -13 11 -15.6 3.6Z" />
        <ellipse cx={-3.4} cy={-7.2} rx={1.9} ry={1.3} />
        <ellipse cx={8.4} cy={-7.6} rx={1.8} ry={1.2} />
      </g>
    ),
  },
  mask: {
    chest: true,
    head: (c) => (
      <g fill={c.tones.under}>
        <path d="M-16 1.4C-12 -1.4 -8.6 -0.4 -6.8 2.2C-5 -1.6 0 -2.8 2.6 -8.4C4.4 -3 8.6 -1 11.4 -1.2C14 -0.8 16 1 18 2C21.4 3.6 22.6 7 22 9.6C21.2 12.6 18 14.6 14 14.8C10 15.4 5 16 0 15.8C-8.4 15.4 -14 10 -16 1.4Z" />
      </g>
    ),
  },
  blenheim: {
    head: (c) => (
      <g fill={c.tones.mark}>
        <path d="M-15.6 -3C-15 -11 -9 -16 -2 -16C0 -11 -0.6 -5 -3 -1.6C-6 2.2 -12 1.6 -15.6 -3Z" />
        <path d="M5 -15.4C11 -14 15.6 -9.6 15.6 -3C12.6 0.4 8.4 0 6.4 -2.6C4.6 -5.6 4.2 -11 5 -15.4Z" />
      </g>
    ),
    body: (c) => <path d={blotch(22, 16, 30, 30, 0.4)} fill={c.tones.mark} />,
  },
};

function sprite({ tones: t, trait, has }: SpriteCtx) {
  const pointy = trait('pointy-ears') || trait('bat-ears');
  return (
    <g>
      <path d={rrect(14, 60, 58, 34, 17)} fill={t.far} />
      <path d={`${circle(64, 52, 20)}${rrect(66, 50, 30, 20, 10)}`} fill={t.head} />
      {pointy ? (
        <path d="M46 44L50 22C51 19 54 19 56 22L62 34ZM66 32L74 20C76 18 78 19 79 22L82 40Z" fill={t.ear} />
      ) : (
        <path d="M44 40C38 42 36 58 42 66C46 70 52 62 52 50Z" fill={t.ear} />
      )}
      <path d={rrect(72, 56, 24, 16, 8)} fill={has('muzzle') || has('urajiro') || has('mask') ? t.muzzle : t.head} />
      <circle cx={91} cy={58} r={4} fill={t.nose} />
      <circle cx={60} cy={50} r={3.2} fill={t.ink} />
      <circle cx={75} cy={49} r={3.2} fill={t.ink} />
    </g>
  );
}

export const DOG_ART: SpeciesArt = {
  species: 'dog',
  rigFor: (look) =>
    look.traits?.includes('long-body')
      ? { id: 'dog-long', rig: DOG_LONG_RIG }
      : look.traits?.includes('short-muzzle')
        ? { id: 'dog-flat', rig: DOG_FLAT_RIG }
        : { id: 'dog', rig: DOG_RIG },
  ears,
  overHead,
  face,
  marks,
  overBody,
  sprite,
};


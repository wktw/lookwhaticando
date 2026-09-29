import { BEAR_PARTS, BEAR_RIG } from './bear.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import type { Pose } from '../types';
import { Blush, Eyes, Mouth } from '../face';
import { circle, ellipse, rrect } from '../shape';

/** Bear cubs: round ears, a pale muzzle, a dark nose. */

function ears(c: DrawCtx) {
  const t = c.tones;
  const col = c.has('panda') ? t.mark : t.ear;
  const inner = c.face.full && !c.silhouette && !c.has('panda');
  const lift = c.face.expr === 'surprised' ? 'translate(0 -1)' : undefined;
  return (
    <g transform={lift}>
      <path d={BEAR_PARTS.earNear} fill={col} />
      <path d={BEAR_PARTS.earFar} fill={col === t.ear ? t.earFar : col} />
      {inner && (
        <g fill={t.earIn}>
          <path d={BEAR_PARTS.earNearIn} />
          <path d={BEAR_PARTS.earFarIn} />
        </g>
      )}
    </g>
  );
}

const NOSE = 'M-2.6 -1.4C-1 -2.4 1.4 -2.4 2.8 -1.2C2.8 0.8 1.4 2 0 2.2C-1.4 2 -2.8 0.8 -2.6 -1.4Z';

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = BEAR_RIG.head;
  // A panda's eyes sit on black patches: give them the pale ring a dark coat gets.
  const eyeTones = c.has('panda') && !t.ring ? { ...t, ring: '#6C6468' } : t;
  return (
    <g>
      <path d={BEAR_PARTS.muzzle} fill={t.muzzle} />
      <Blush f={f} y={4.2} left={-9.4} right={17.2} rx={2.6} ry={1.5} />
      <Eyes f={{ ...f, tones: eyeTones }} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      <path d={NOSE} transform={`translate(${a.nose[0]} ${a.nose[1]})`} fill={t.nose} />
      <Mouth f={f} x={11.4} y={8} s={0.95} />
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  panda: {
    body: (c) => <path d="M62 -10C70 20 72 60 66 110H96V-10Z" fill={c.tones.mark} />,
    head: (c) => (
      <g fill={c.tones.mark}>
        <ellipse cx={-3.8} cy={-1.4} rx={4.4} ry={5.6} transform="rotate(-24 -3.8 -1.4)" />
        <ellipse cx={7.8} cy={-1.8} rx={4} ry={5.2} transform="rotate(24 7.8 -1.8)" />
      </g>
    ),
  },
  // Drawn per pose in bodyDetail: a broad U across the upper chest.
  crescent: {},
  spectacles: {
    head: (c) => (
      <g fill={c.tones.mark}>
        <path d={`${circle(-3.6, -2.4, 4.8)}${circle(-3.6, -2.4, 3)}`} fill-rule="evenodd" />
        <path d={`${circle(7.4, -2.8, 4.4)}${circle(7.4, -2.8, 2.8)}`} fill-rule="evenodd" />
      </g>
    ),
    // A pale bib on the chest.
    chest: true,
  },
  belly: { chest: true },
};

function sprite({ tones: t, has }: SpriteCtx) {
  return (
    <g>
      {/* A panda reads by its dark shoulders and legs, so its body is the mark colour. */}
      <path d={rrect(14, 58, 60, 36, 18)} fill={has('panda') ? t.mark : t.far} />
      <path d={`${circle(62, 54, 19)}${circle(48, 38, 7.6)}${circle(74, 36, 7)}`} fill={has('panda') ? t.coat : t.head} />
      {has('panda') && <path d={`${circle(48, 38, 7.6)}${circle(74, 36, 7)}`} fill={t.mark} />}
      <path d={ellipse(72, 62, 12, 9)} fill={t.muzzle} />
      <circle cx={79} cy={58} r={3.4} fill={t.nose} />
      {/* A panda's eyes read as its eye patches at this size. */}
      <circle cx={58} cy={51} r={has('panda') ? 4.4 : 3} fill={has('panda') ? t.mark : t.ink} />
      <circle cx={71} cy={50} r={has('panda') ? 4.4 : 3} fill={has('panda') ? t.mark : t.ink} />
    </g>
  );
}

/**
 * The Sun Bear's pale-gold bib: a broad, shallow crescent across the chest, about 60% of its
 * width, per pose (canvas frame, clipped to the torso). It is drawn over the near foreleg's
 * shoulder so the whole crescent shows; lying down it sits low on the chest, in front of the
 * forelegs, not under the chin.
 */
const BIB: Record<Pose, string> = {
  sit: 'M40.6 58.6C43.4 66 50 69.6 57.4 69.6C64.8 69.6 70.4 66 73 59L68 57.8C66 62 62.2 64.2 57.4 64.2C52.6 64.2 48.4 62 46 57.4Z',
  loaf: 'M53 79.6C55.4 85.8 61 89.4 67.4 89.4C73 89.4 77 86.8 78.6 82.2L74.2 81C72.8 83.8 70.4 85 67.4 85C63.4 85 60 83 58.2 78.8Z',
  stand: 'M58.6 70.4C60.6 76.4 65.2 79.8 70.4 79.8C74.6 79.8 77.4 77.4 78.6 73.2L74.6 72.2C73.6 74.6 72.2 75.6 70.4 75.6C67.2 75.6 64.6 73.4 63.4 69.6Z',
  walk: 'M58.6 70.4C60.6 76.4 65.2 79.8 70.4 79.8C74.6 79.8 77.4 77.4 78.6 73.2L74.6 72.2C73.6 74.6 72.2 75.6 70.4 75.6C67.2 75.6 64.6 73.4 63.4 69.6Z',
  sleep: '',
};

function overBody(c: DrawCtx) {
  const bib = !c.silhouette && c.has('crescent') && BIB[c.pose];
  if (!bib) return null;
  return (
    <>
      <clipPath id={`${c.uid}-bib`}>
        <path d={c.p.body} />
      </clipPath>
      <path d={bib} fill={c.tones.mark} clip-path={`url(#${c.uid}-bib)`} />
    </>
  );
}

/** A panda's black hindquarters, so the hind leg reads as part of the body, not a loose ball. */
const PANDA_HAUNCH: Record<Pose, string> = {
  sit: 'M14 70C22 66 34 68 42 74C50 80 54 88 54 100H14Z',
  loaf: 'M10 76C16 72 26 72 34 77C40 81 44 88 44 100H10Z',
  sleep: 'M10 76C16 72 26 72 34 77C40 81 44 88 44 100H10Z',
  stand: '',
  walk: '',
};

function bodyDetail(c: DrawCtx) {
  if (c.silhouette) return null;
  const haunch = c.has('panda') && PANDA_HAUNCH[c.pose];
  return haunch ? <path d={haunch} fill={c.tones.mark} /> : null;
}

export const BEAR_ART: SpeciesArt = {
  species: 'bear',
  rigFor: () => ({ id: 'bear', rig: BEAR_RIG }),
  ears,
  face,
  marks,
  bodyDetail,
  overBody,
  sprite,
};

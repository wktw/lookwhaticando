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
 * The Sun Bear's pale-gold bib: a broad U across the upper chest, per pose (canvas frame). It is
 * drawn over the near foreleg's shoulder so the whole U shows on the chest.
 */
const BIB: Record<Pose, string> = {
  sit: 'M47.6 57C48.6 65.4 53 70.4 58.8 70.4C64 70.4 66.8 66 67.2 59.2L62.4 58.6C62 62.4 60.8 64.4 58.6 64.4C55.4 64.4 53.4 61.4 53 56.6Z',
  loaf: 'M58 74C58.8 81.4 62.6 86 67.4 86C72 86 75 82 75.4 75.6L70.8 75.2C70.4 78.8 69.4 80.4 67.4 80.4C64.6 80.4 63 77.6 62.6 73.6Z',
  stand: 'M62.6 68.6C63.2 75.2 66.4 79.4 70.6 79.4C74.4 79.4 76.6 75.8 77 70.6L72.8 70.2C72.6 73 71.8 74.4 70.6 74.4C68.4 74.4 67.2 71.8 67 68.2Z',
  walk: 'M62.6 68.6C63.2 75.2 66.4 79.4 70.6 79.4C74.4 79.4 76.6 75.8 77 70.6L72.8 70.2C72.6 73 71.8 74.4 70.6 74.4C68.4 74.4 67.2 71.8 67 68.2Z',
  sleep: '',
};

function overBody(c: DrawCtx) {
  const bib = !c.silhouette && c.has('crescent') && BIB[c.pose];
  return bib ? <path d={bib} fill={c.tones.mark} /> : null;
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

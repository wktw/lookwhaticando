import { BEAR_PARTS, BEAR_RIG } from './bear.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { blotch } from './marks';
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
  crescent: {
    body: (c) => <path d="M76 26C84 34 90 34 98 28C96 40 88 46 80 42C76 40 74 32 76 26Z" fill={c.tones.mark} />,
  },
  spectacles: {
    head: (c) => (
      <g fill={c.tones.mark}>
        <path d={`${circle(-3.6, -2.4, 4.8)}${circle(-3.6, -2.4, 3)}`} fill-rule="evenodd" />
        <path d={`${circle(7.4, -2.8, 4.4)}${circle(7.4, -2.8, 2.8)}`} fill-rule="evenodd" />
      </g>
    ),
    body: (c) => <path d={blotch(90, 50, 22, 60, 0)} fill={c.tones.mark} />,
  },
  belly: {
    body: (c) => <path d={blotch(84, 76, 40, 60, 0)} fill={c.tones.under} />,
  },
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

export const BEAR_ART: SpeciesArt = {
  species: 'bear',
  rigFor: () => ({ id: 'bear', rig: BEAR_RIG }),
  ears,
  face,
  marks,
  sprite,
};

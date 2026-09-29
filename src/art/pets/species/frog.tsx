import { FROG_HAUNCH, FROG_RIG } from './frog.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { dots, rng } from './marks';
import { circle, ellipse, tube, twoCircles } from '../shape';
import type { Pose } from '../types';

/**
 * Frogs: the wide mouth line (the one line a frog always has), big eye bumps, a pale throat
 * that pulses and puffs when pleased (DESIGN §10.4), a folded haunch.
 */

const BELLY: Record<Pose, string> = {
  sit: ellipse(59, 93, 17, 11),
  loaf: ellipse(60, 94, 18, 9.5),
  sleep: ellipse(60, 94, 18, 9.5),
  stand: ellipse(52, 90.5, 24, 6.5),
  walk: ellipse(52, 90.5, 24, 6.5),
};

/** The Red-eyed Tree Frog's flank: a blue patch along the side, crossed by thin cream bars. */
const FLANK_SIT = {
  patch: 'M20 73C27 67.6 38 67.6 46 73.6C45.8 76 45 78 44 79C38 74.4 28 73 20 75.6Z',
  bars: 'M26.3 70.6H27.7V73.8H26.3ZM32.3 69.8H33.7V74.4H32.3ZM38.3 70.4H39.7V75.4H38.3Z',
};
const FLANK_LOAF = {
  patch: 'M16 76C24 70.8 36 70.8 44 76.4C43.8 78.6 43 80.4 42 81.2C36 77.2 26 76 16 78.4Z',
  bars: 'M23.3 73.6H24.7V77H23.3ZM29.3 72.6H30.7V77H29.3ZM35.3 73H36.7V78H35.3Z',
};
const FLANK_SIDE = {
  patch: 'M39 76C46 72.4 56 72.2 64 75.2C57 78.8 47 79.6 39 76Z',
  bars: 'M45.3 74.4H46.7V77.8H45.3ZM51.3 73.6H52.7V78.2H51.3ZM57.3 74H58.7V77.8H57.3Z',
};
/** The Red-eyed Tree Frog's flank: a blue lens along the side over the haunch, crossed by thin cream bars. */
const FLANK: Record<Pose, { patch: string; bars: string }> = { sit: FLANK_SIT, loaf: FLANK_LOAF, sleep: FLANK_LOAF, stand: FLANK_SIDE, walk: FLANK_SIDE };

function bodyDetail(c: DrawCtx) {
  const t = c.tones;
  const flank = c.has('flanks') ? FLANK[c.pose] : null;
  return (
    <g>
      {flank && (
        <>
          <path d={flank.patch} fill={t.mark} />
          <path d={flank.bars} fill={t.mark2} />
        </>
      )}
      <path d={BELLY[c.pose]} fill={c.has('glass') ? '#F6F7EC' : t.under} />
      {c.has('glass') && <circle cx={c.pose === 'stand' || c.pose === 'walk' ? 56 : 61} cy={c.pose === 'stand' || c.pose === 'walk' ? 87.4 : 88.6} r={1.5} fill="#E7939A" />}
      <path d={FROG_HAUNCH[c.pose]} fill={t.legFar} />
    </g>
  );
}

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = FROG_RIG.head;
  const happy = f.expr === 'happy';
  // Happy is a throat puff (DESIGN §10.4): the throat fills out; the mouth line keeps its rest curve.
  const throat = happy ? ellipse(3, 23.6, 11.8, 6.8) : ellipse(3, 22.6, 11, 5.4);
  const glassEdge = c.has('glass') ? c.crescent('head', `rim-${c.lit}`) : '';
  return (
    <g>
      {glassEdge && <path d={glassEdge} fill="#F4F8E6" opacity={0.7} />}
      <g transform="translate(3 19)">
        <g class={c.animated && !happy ? 'pet-throat' : undefined}>
          <path d={throat} transform="translate(-3 -19)" fill={t.under} />
        </g>
      </g>
      <Blush f={f} y={13.4} left={-12.4} right={17} rx={3.2} ry={1.8} opacity={0.85} />
      <Eyes f={f} y={a.eyes.y} y2={a.eyes.y + 3} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} r2={a.eyes.r * 0.94} />
      <g fill={t.far}>
        <circle cx={4.4} cy={9} r={0.7} />
        <circle cx={8.4} cy={9.6} r={0.7} />
      </g>
      <path
        class="pet-line"
        d="M-9 12.8Q2.8 15 15 13.4"
        fill="none"
        stroke={t.dark ? t.line : t.ink}
        stroke-opacity={0.5}
        stroke-width={0.85}
        stroke-linecap="round"
      />
      <Mouth f={f} x={2.8} y={15.6} s={1.1} />
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  throat: {},
  belly: {},
  dots: {
    body: (c) => <path d={dots(8, 4, 84, 60, 14, 3, 6.1)} fill={c.tones.mark} />,
    head: (c) => <path d={`${circle(-9, -7, 1.8)}${circle(10, -4, 1.6)}${circle(-13, 2, 1.3)}`} fill={c.tones.mark} />,
  },
  x: {
    // A Spring Peeper's X sits on its back, behind the head: thin and quiet.
    body: (c) => <path d={`${tube([[13, 12], [33, 44]], 3.2, 2.8)}${tube([[33, 12], [13, 44]], 3.2, 2.8)}`} fill={c.tones.mark} opacity={0.8} />,
  },
  moss: {
    body: (c) => {
      const rand = rng(4.2);
      let d1 = '';
      let d2 = '';
      for (let i = 0; i < 26; i++) {
        const u = rand() * 100;
        const v = rand() * 70;
        const r = 1.6 + rand() * 2.4;
        if (i % 3 === 0) d2 += ellipse(u, v, r, r * 0.9);
        else d1 += ellipse(u, v, r, r * 0.9);
      }
      return (
        <g>
          <path d={d1} fill={c.tones.mark} />
          <path d={d2} fill={c.tones.mark2} />
        </g>
      );
    },
    head: (c) => <path d={`${circle(-12, -4, 1.8)}${circle(-4, -8, 1.5)}${circle(12, -2, 1.4)}${circle(5, -3, 1)}`} fill={c.tones.mark} />,
  },
  glass: {},
  jeans: {},
  // Drawn in bodyDetail, under the haunch.
  flanks: {},
};

function top(c: DrawCtx) {
  if (!c.trait('wave') || c.face.expr !== 'happy' || c.silhouette) return null;
  const x = c.pose === 'stand' || c.pose === 'walk' ? 71 : 70;
  const y = c.pose === 'stand' || c.pose === 'walk' ? 78 : 80;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g class={c.animated ? 'pet-wave' : undefined}>
        <path d={tube([[0, 0], [3, -8], [4, -15]], 4.4, 3.6)} fill={c.tones.leg} />
        <path d={`${circle(4.2, -16.4, 1.2)}${circle(2.4, -16.2, 1)}${circle(6, -15.6, 1)}`} fill={c.tones.foot} />
      </g>
    </g>
  );
}

function sprite({ tones: t }: SpriteCtx) {
  return (
    <g>
      <path d="M8 92C8 66 26 50 50 50C74 50 92 66 92 92Z" fill={t.coat} />
      <path d={twoCircles([36, 50], 14, [62, 45], 16)} fill={t.head} />
      <path d={ellipse(58, 93, 24, 12)} fill={t.under} />
      <circle cx={36} cy={50} r={4.2} fill={t.ink} />
      <circle cx={62} cy={45} r={4.6} fill={t.ink} />
    </g>
  );
}

export const FROG_ART: SpeciesArt = {
  species: 'frog',
  rigFor: () => ({ id: 'frog', rig: FROG_RIG }),
  ears: () => null,
  face,
  marks,
  bodyDetail,
  top,
  sprite,
};


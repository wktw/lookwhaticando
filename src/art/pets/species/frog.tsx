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

function bodyDetail(c: DrawCtx) {
  const t = c.tones;
  return (
    <g>
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
  const throat = happy ? ellipse(3, 21.4, 12, 8.2) : ellipse(3, 22.6, 11, 5.4);
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
        d={happy ? 'M-9.4 12.6Q2.6 18.4 15.2 13.4' : 'M-9 12.8Q2.8 15 15 13.4'}
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
    body: (c) => (
      <path d={`${tube([[36, 6], [64, 44]], 5, 5)}${tube([[64, 6], [36, 44]], 5, 5)}`} fill={c.tones.mark} />
    ),
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
  flanks: {
    body: (c) => (
      <g>
        <path d="M-5 56C12 51 30 50 52 53V70C30 67 12 68 -5 72Z" fill={c.tones.mark} />
        <path d="M14 51.6L18.4 51.2L17.6 67.6L13.2 68ZM32 50.6L36.4 50.6L36 66.8L31.6 66.8Z" fill={c.tones.mark2} />
      </g>
    ),
  },
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


import { BUNNY_EARS, BUNNY_RIG, EAR_BASE } from './bunny.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { blotch, dots } from './marks';
import { ellipse, rrect, scallop } from '../shape';

/**
 * Rabbits: long ears are the cue (lop, short or standing). Happy twitches the nose. Asleep, the
 * ears lie back along the body.
 */

function earSet(c: DrawCtx) {
  const t = c.tones;
  const short = c.trait('short-ears');
  const near = short ? BUNNY_EARS.shortNear : BUNNY_EARS.near;
  const far = short ? BUNNY_EARS.shortFar : BUNNY_EARS.far;
  const inner = c.face.full && !c.silhouette && !short;
  const e = c.face.expr;
  const rot = c.pose === 'sleep' || c.face.closed ? -64 : e === 'surprised' ? 5 : e === 'happy' ? -10 : 0;
  const nearCol = c.has('harlequin') ? t.mark : c.has('dutch') || c.has('points') ? t.mark : t.ear;
  const farCol = c.has('harlequin') ? t.mark2 : nearCol;
  return (
    <g transform={rot ? `rotate(${rot} ${EAR_BASE[0]} ${EAR_BASE[1]})` : undefined}>
      <path d={far} fill={farCol === t.ear ? t.earFar : farCol} />
      {inner && <path d={BUNNY_EARS.farIn} fill={t.earIn} opacity={0.8} />}
      <path d={near} fill={nearCol} />
      {inner && <path d={BUNNY_EARS.nearIn} fill={t.earIn} />}
    </g>
  );
}

/** Standing ears behind the head (unless a hat is on: then they come through the brim, after it). */
function ears(c: DrawCtx) {
  const t = c.tones;
  const fluff = c.trait('mane') || c.trait('angora');
  return (
    <g>
      {fluff && <path d={scallop(0, 1, c.trait('angora') ? 21 : 19.5, c.trait('angora') ? 19.5 : 18, 11, 0.14)} fill={c.trait('angora') ? t.coat : t.under} />}
      {c.trait('lop') ? <path d={BUNNY_EARS.lopFar} fill={t.earFar} /> : !c.hat && earSet(c)}
    </g>
  );
}

function earsOverHat(c: DrawCtx) {
  return !c.trait('lop') && c.hat ? earSet(c) : null;
}

function overHead(c: DrawCtx) {
  if (!c.trait('lop')) return null;
  const col = c.has('dutch') || c.has('points') ? c.tones.mark : c.tones.ear;
  return <path d={BUNNY_EARS.lopNear} fill={col} transform={c.face.expr === 'surprised' ? 'rotate(-5 -6 -12)' : undefined} />;
}

const NOSE = 'M-1.6 -0.9C-0.6 -1.5 0.8 -1.5 1.7 -0.9C1.5 0.3 0.8 1 0 1.2C-0.8 1 -1.5 0.3 -1.6 -0.9Z';

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = BUNNY_RIG.head;
  const twitch = f.expr === 'happy' && c.animated;
  return (
    <g>
      <Blush f={f} y={4.8} left={-8.6} right={12.6} rx={2.6} ry={1.5} />
      <Eyes f={f} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      <g transform={`translate(${a.nose[0]} ${a.nose[1]})`}>
        <g class={twitch ? 'pet-twitch' : undefined}>
          <path d={NOSE} fill={t.nose} />
          {f.full && <path class="pet-line" d="M0 1.2V2.8M0 2.8Q-1.2 3.8 -2.2 3.4M0 2.8Q1.2 3.8 2.2 3.4" fill="none" stroke={t.line} stroke-opacity={0.45} stroke-width="0.55" stroke-linecap="round" />}
        </g>
      </g>
      <Mouth f={f} x={a.nose[0]} y={a.nose[1] + 3} s={0.8} />
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  belly: {
    body: (c) => <path d={blotch(86, 80, 40, 60, 0)} fill={c.tones.under} />,
  },
  dutch: {
    body: (c) => <path d="M-10 -10H52C50 30 52 70 56 110H-10Z" fill={c.tones.mark} />,
    head: (c) => (
      <g fill={c.tones.mark}>
        <path d="M-16 -2C-15 -10 -8 -15 -1 -14.6C1 -9 0.4 -2 -2.6 3.6C-5 8 -10 9 -16 6Z" />
        <path d="M5 -14C11 -13 15.6 -7 15.8 -1C12.6 2 9.6 1.4 8 -1C6 -4.6 5 -9.4 5 -14Z" />
      </g>
    ),
  },
  harlequin: {
    body: (c) => (
      <g>
        <path d="M-10 -10H34V110H-10Z" fill={c.tones.mark} />
        <path d="M34 -10H68V110H34Z" fill={c.tones.mark2} />
      </g>
    ),
    head: (c) => <path d="M-17 -16H2.6V16H-17Z" fill={c.tones.mark} />,
  },
  points: {
    head: (c) => <path d={ellipse(11.4, 4.6, 5.6, 4.4)} fill={c.tones.point} />,
  },
  silver: {
    body: (c) => <path d={dots(4, 2, 92, 90, 30, 0.9, 5.3, 1)} fill={c.tones.mark} />,
    head: (c) => <path d={dots(-12, -12, 22, 12, 6, 0.6, 2.2, 1)} fill={c.tones.mark} />,
  },
};

/** Angora fluff: a soft scalloped halo behind the whole body. */
function behindBody(c: DrawCtx) {
  if (!c.trait('angora')) return null;
  const fr = c.p.frame;
  const cx = fr.x + fr.w / 2;
  const cy = fr.a ? 76 : fr.y + fr.h / 2 + 2;
  return <path d={scallop(cx, cy, fr.a ? 28 : fr.w / 2 + 3, fr.a ? 22 : fr.h / 2 + 2, 12, 0.1)} fill={c.tones.coat} />;
}

/** A snowshoe hare's big hind feet. */
function overBody(c: DrawCtx) {
  if (!c.trait('big-feet') || c.pose === 'loaf' || c.pose === 'sleep') return null;
  const x = c.pose === 'sit' ? 52 : c.pose === 'walk' ? 45 : 41;
  return <path d={rrect(x, 88.6, 9, 5.4, 2.7)} fill={c.tones.paw ?? c.tones.leg} />;
}

function sprite({ tones: t, trait, has }: SpriteCtx) {
  const lop = trait('lop');
  // A Dutch or harlequin rabbit is known by its coloured hindquarters.
  const body = has('dutch') || has('harlequin') ? t.mark : t.far;
  return (
    <g>
      <path d={rrect(16, 60, 58, 34, 17)} fill={body} />
      <path d={ellipse(64, 60, 19, 18)} fill={t.head} />
      {lop ? (
        <path d="M50 46C40 46 36 62 40 74C42 80 50 78 50 70Z" fill={t.ear} />
      ) : (
        <path d="M52 46C46 34 46 16 52 10C56 8 58 16 60 44ZM66 44C68 30 72 16 78 12C82 12 80 28 72 48Z" fill={t.ear} />
      )}
      <circle cx={60} cy={58} r={3} fill={t.ink} />
      <circle cx={73} cy={57} r={3} fill={t.ink} />
    </g>
  );
}

export const BUNNY_ART: SpeciesArt = {
  species: 'bunny',
  rigFor: () => ({ id: 'bunny', rig: BUNNY_RIG }),
  ears,
  earsOverHat,
  overHead,
  face,
  marks,
  behindBody,
  overBody,
  sprite,
};


import { HAMSTER_PARTS, HAMSTER_RIG } from './hamster.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { circle, ellipse, scallop } from '../shape';

/** Hamsters: full cheeks are the cue; chewing stuffs them fuller. */

function ears(c: DrawCtx) {
  const t = c.tones;
  const inner = c.face.full && !c.silhouette;
  return (
    <g transform={c.face.expr === 'surprised' ? 'translate(0 -1)' : undefined}>
      <path d={HAMSTER_PARTS.earNear} fill={t.ear} />
      <path d={HAMSTER_PARTS.earFar} fill={t.earFar} />
      {inner && (
        <g fill={t.earIn}>
          <path d={HAMSTER_PARTS.earNearIn} />
          <path d={HAMSTER_PARTS.earFarIn} />
        </g>
      )}
    </g>
  );
}

const NOSE = 'M-1.3 -0.8C-0.5 -1.3 0.6 -1.3 1.4 -0.8C1.2 0.3 0.6 0.9 0 1C-0.6 0.9 -1.2 0.3 -1.3 -0.8Z';

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = HAMSTER_RIG.head;
  const stuffed = f.expr === 'chew';
  return (
    <g>
      <path d={ellipse(6.4, 6.6, 7.4, 5.6)} fill={t.muzzle} />
      {stuffed && (
        <g transform="translate(0 5)">
          <g class={c.animated ? 'pet-chew' : undefined}>
            <path d={HAMSTER_PARTS.cheeks} transform="translate(0 -5)" fill={t.muzzle} />
          </g>
        </g>
      )}
      <Blush f={f} y={4.4} left={-8.4} right={13.2} rx={2.4} ry={1.4} />
      <Eyes f={{ ...f, expr: stuffed ? 'rest' : f.expr }} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      <path d={NOSE} transform={`translate(${a.nose[0]} ${a.nose[1]})`} fill={t.nose} />
      {!stuffed && <Mouth f={f} x={a.nose[0] - 0.6} y={a.nose[1] + 2.4} s={0.8} />}
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  belly: { chest: true },
  dorsal: {
    body: (c) => <path d="M-5 -4C30 1 70 1 105 -4V10C70 15 30 15 -5 10Z" fill={c.tones.mark} />,
  },
  brows: {
    head: (c) => (
      <g fill={c.tones.under}>
        <ellipse cx={-3.6} cy={-5.4} rx={2.2} ry={1.4} />
        <ellipse cx={6.4} cy={-5.8} rx={2} ry={1.3} />
      </g>
    ),
  },
};

/** A long-haired coat: a soft skirt of fur round the bottom. */
function behindBody(c: DrawCtx) {
  if (!c.trait('longhair')) return null;
  const fr = c.p.frame;
  const cx = fr.a ? 46 : fr.x + fr.w / 2;
  const cy = fr.a ? 80 : fr.y + fr.h / 2 + 3;
  return <path d={scallop(cx, cy, fr.a ? 25 : fr.w / 2 + 2.6, fr.a ? 16 : fr.h / 2 + 1.6, 10, 0.12, 0.3)} fill={c.tones.coat} />;
}

function sprite({ tones: t }: SpriteCtx) {
  return (
    <g>
      <path d={ellipse(44, 76, 34, 19)} fill={t.far} />
      <path d={`${circle(64, 66, 20)}${circle(50, 48, 6)}${circle(74, 46, 5.4)}`} fill={t.head} />
      <path d={`${ellipse(52, 76, 8, 7)}${ellipse(79, 74, 8, 7)}`} fill={t.muzzle} />
      <circle cx={60} cy={63} r={3} fill={t.ink} />
      <circle cx={73} cy={62} r={3} fill={t.ink} />
    </g>
  );
}

export const HAMSTER_ART: SpeciesArt = {
  species: 'hamster',
  rigFor: () => ({ id: 'hamster', rig: HAMSTER_RIG }),
  ears,
  face,
  marks,
  behindBody,
  sprite,
};

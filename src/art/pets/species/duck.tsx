import { DUCK_PARTS, DUCK_RIG, DUCK_RUNNER_RIG, DUCK_WING, WING_FOR } from './duck.rig';
import type { DrawCtx, SpeciesArt, SpriteCtx } from './art';
import { Blush, Eyes, Mouth } from '../face';
import { blotch } from './marks';
import { ellipse, scallop, tube } from '../shape';
import { mix } from '../palette';

/** Ducks: the bill is the cue. A folded wing on the near side; a Mallard's hood and ring. */

function overHead(c: DrawCtx) {
  if (!c.trait('crest')) return null;
  return <path d={scallop(0, -12.6, 7.4, 6.4, 8, 0.14)} fill={c.tones.head} />;
}

function face(c: DrawCtx) {
  const f = c.face;
  const t = c.tones;
  const a = DUCK_RIG.head;
  if (c.pose === 'sleep') {
    return <Eyes f={f} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />;
  }
  const open = f.expr === 'yawn';
  return (
    <g>
      <Blush f={f} y={3.4} left={-5.6} right={9.4} rx={2.4} ry={1.4} />
      <Eyes f={f} y={a.eyes.y} left={a.eyes.left} right={a.eyes.right} r={a.eyes.r} />
      {open && <path d="M9 5.4C13 5.6 17 7.6 19 10C15 11.2 11 10.2 8.6 7.4Z" fill={mix(t.bill, '#7C4854', 0.3)} />}
      <path d={DUCK_PARTS.bill} fill={t.bill} transform={open ? 'rotate(-8 9 4)' : undefined} />
      {f.full && !open && <path class="pet-line" d={DUCK_PARTS.billLine} fill="none" stroke={mix(t.bill, '#7C4854', 0.45)} stroke-width="0.6" stroke-linecap="round" />}
      {f.expr === 'blep' && <Mouth f={f} x={15} y={6.6} s={0.8} />}
    </g>
  );
}

const marks: SpeciesArt['marks'] = {
  mallard: {
    body: (c) => <path d={blotch(94, 66, 34, 56, 0)} fill={c.tones.mark} />,
  },
  mandarin: {
    body: (c) => <path d={blotch(94, 60, 30, 52, 0)} fill={c.tones.mark} />,
    head: (c) => (
      <g>
        <path d="M-12 -2C-8 -8 0 -8.6 6.4 -5.2C4 -3 0 -3.4 -3 -2.6C-6 -1.8 -9 0 -12 -2Z" fill={c.tones.under} />
        <path d="M-6 2C-2 3 4 5 8 8C6 11.4 0 12.4 -6 11C-8 8 -8 4 -6 2Z" fill={c.tones.point} />
      </g>
    ),
  },
  sheen: {
    head: (c) => <path d={ellipse(-3, -3, 7, 5.4)} fill={c.tones.mark} opacity={0.55} />,
  },
  speculum: {},
  belly: { chest: true },
};

/** Where a Mandarin's sail rises from the top of the folded wing, per wing. */
const SAIL_AT: Readonly<Record<string, readonly [number, number]>> = { tall: [45, 69], nest: [42, 76], relaxed: [39, 68], runner: [49.6, 64] };

/** A Mandarin's sail: a broad orange fan standing up off the back, its top edge a soft arc. */
const sail = ([x, y]: readonly [number, number]) =>
  `M${x - 3} ${y}L${x - 9} ${y - 9}C${x - 8.4} ${y - 14.4} ${x + 1} ${y - 16.4} ${x + 6.6} ${y - 11.4}L${x + 3.4} ${y}Z`;

/** The folded wing, with a Mallard's blue flash or a Mandarin's sail. */
function overBody(c: DrawCtx) {
  const t = c.tones;
  const upright = c.trait('upright') && c.pose !== 'loaf' && c.pose !== 'sleep';
  const key = upright ? 'runner' : WING_FOR[c.pose];
  const wing = DUCK_WING[key]!;
  const col = c.has('mallard') || c.has('mandarin') ? t.mark2 : c.has('sheen') ? mix(t.coat, '#2E4A3A', 0.4) : t.far;
  const flash = c.has('speculum') || c.has('mallard');
  const n = c.p.neck;
  return (
    <g>
      {c.has('mandarin') && <path d={sail(SAIL_AT[key]!)} fill={t.point} />}
      <path d={wing} fill={col} />
      {flash && <path d={key === 'tall' ? 'M40 78C45 76 51 77 55 79.6C51 81.6 45 82 40 80.6Z' : key === 'runner' ? 'M45 76C49 75 53 75.6 56.4 77.4C53 79 49 79.4 45 78.6Z' : key === 'nest' ? 'M34 84C40 82 48 82 54 84C48 86 40 86.6 34 85.6Z' : 'M30 75C36 73 44 73 50 75C44 77 36 77.6 30 76.6Z'} fill={t.point} />}
      {c.has('mallard') && <path d={tube([[n.x - n.w + 1.2, n.y + 1], [n.x + n.w - 1.2, n.y + 1]], 2.2, 2.2)} fill="#FBF7F0" />}
    </g>
  );
}

function sprite({ tones: t }: SpriteCtx) {
  return (
    <g>
      <path d="M10 70C10 60 24 56 40 58C54 60 66 66 72 76C76 86 66 94 50 94C30 94 10 86 10 70Z" fill={t.far} />
      <path d={ellipse(62, 44, 18, 17)} fill={t.head} />
      <path d="M72 44C80 42 92 43 96 47C98 50 94 54 88 54C82 55 76 54 72 52Z" fill={t.bill} />
      <circle cx={60} cy={40} r={3} fill={t.ink} />
      <circle cx={72} cy={39} r={2.8} fill={t.ink} />
    </g>
  );
}

export const DUCK_ART: SpeciesArt = {
  species: 'duck',
  rigFor: (look) => (look.traits?.includes('upright') ? { id: 'duck-runner', rig: DUCK_RUNNER_RIG } : { id: 'duck', rig: DUCK_RIG }),
  ears: () => null,
  overHead,
  face,
  marks,
  overBody,
  sprite,
};

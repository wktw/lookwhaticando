import type { Anchors, BodyShape } from '../geometry';
import type { TraitArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { lighten, shade } from '../color';
import { mapPath, outlinePoints, scallopPath, smoothPath, type Pt } from '../outline';
import { RAINBOW } from '../shapes';
import { OutlinedStroke, puffPath } from '../species/parts';

/** Body traits: reshaped silhouettes (fluff, sheet, ghost wisps) and body surfaces. */

/** Memoize a reshaped silhouette per source path (bodies are static). */
function reshaper(make: (shape: BodyShape, anchors: Anchors) => BodyShape) {
  const cache = new Map<string, BodyShape>();
  return (shape: BodyShape, anchors: Anchors) => {
    let out = cache.get(shape.path);
    if (!out) cache.set(shape.path, (out = make(shape, anchors)));
    return out;
  };
}

const fluff = (bumps: number, amp: number) =>
  reshaper((shape) => ({ ...shape, path: scallopPath(shape.path, bumps, amp), halfWidthAt: (y) => shape.halfWidthAt(y) + amp }));

/** Puffy cloud outline (Cloud Kitty, Snowdrift Bunny). */
export const cloudFluff: TraitArt = { body: fluff(15, 1.7) };

/** Dog fluff (Pom, Samoyed): a scalloped coat and a soft chest ruff. */
export const fluffy: TraitArt = {
  body: fluff(19, 1.35),
  surface: (ctx) => {
    const p = ctx.look.palette;
    return <path d={puffPath(50, ctx.anchors.neck.y + 5, 12.5, 9, 0.16)} fill={p.belly ?? lighten(p.body, 0.55)} />;
  },
};

/** Boo Bunny's sheet: ear bumps on top, a scalloped hem, feet peeking out, eye holes. */
export const ghostSheet: TraitArt = {
  replaces: ['ears', 'tail', 'mouth'],
  body: reshaper((shape, anchors) => {
    const hw = shape.halfWidthAt;
    const top = anchors.head.y;
    const f = anchors.headFeatures;
    const [bl, br] = f.length >= 2 ? [f[0]!.x, f[1]!.x] : [anchors.head.x - 9, anchors.head.x + 9];
    const pad = 2.2;
    const right: Pt[] = [
      [50, top - 1.5],
      [br - 5.6, top - 3],
      [br - 4.4, top - 8.8],
      [br - 1.2, top - 11.6],
      [br + 2.6, top - 11.6],
      [br + 5.4, top - 8.6],
      [br + 6.6, top - 3.2],
      [50 + hw(top + 10) + pad, top + 10],
      [50 + hw(top + 24) + pad, top + 24],
      [50 + hw(62) + pad, 62],
      [50 + hw(76) + pad + 0.4, 76],
    ];
    const xr = 50 + hw(84) + pad + 1.4;
    const hem: Pt[] = Array.from({ length: 9 }, (_, i) => [xr - (i * 2 * (xr - 50)) / 8, i % 2 ? 92.4 : 89.6]);
    const left: Pt[] = right
      .slice(1)
      .reverse()
      .map(([x, y]) => [100 - x, y]);
    left.forEach((p, i) => {
      // Mirror the ear bump onto the left ear's own x.
      if (p[1] < top) left[i] = [p[0] - (100 - br - bl), p[1]];
    });
    return { ...shape, path: smoothPath([...right, ...hem, ...left]), halfWidthAt: (y) => hw(y) + pad };
  }),
  surface: (ctx) => {
    const { eyes } = ctx.anchors;
    const fur = ctx.look.palette.pattern ?? '#E7D8F2';
    return (
      <g>
        <g fill={fur} stroke={OUTLINE} stroke-width={1.2} stroke-opacity={0.35}>
          <ellipse cx={eyes.left} cy={eyes.y} rx={5.2} ry={6} />
          <ellipse cx={eyes.right} cy={eyes.y} rx={5.2} ry={6} />
        </g>
        <g fill="none" stroke={OUTLINE} stroke-width={1.2} stroke-linecap="round" opacity={0.18}>
          <path d="M30 72 C28 78 28 84 30 90" />
          <path d="M68 70 C71 77 72 83 70 90" />
        </g>
      </g>
    );
  },
  front: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    const e = ctx.expression;
    if (e === 'eat' || e === 'surprised') return <ellipse cx={x} cy={y + 0.6} rx={1.8} ry={2.2} fill={OUTLINE} opacity={0.8} />;
    return <path d={`M${x - 2.4} ${y} Q${x} ${y + (e === 'sleep' ? 1.2 : 2.4)} ${x + 2.4} ${y}`} fill="none" stroke={OUTLINE} stroke-width={1.5} stroke-linecap="round" />;
  },
};

/** Jack-o'-Kitty sits inside a carved pumpkin; only the body above the rim shows. */
export const pumpkinShell: TraitArt = {
  replaces: ['feet', 'tail'],
  back: (ctx) => {
    const c = ctx.look.palette.accent ?? '#FFB26B';
    return <ellipse cx={50} cy={71} rx={35} ry={6.4} fill={shade(c, 0.28)} stroke={OUTLINE} stroke-width={STROKE} />;
  },
  front: (ctx) => {
    const c = ctx.look.palette.accent ?? '#FFB26B';
    const glow = '#FFE08A';
    return (
      <g stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
        <path d="M89.6 71.4 C92.6 67.4 97 67.4 98.6 69.6 C96 71.4 92.8 72.4 89.6 71.4 Z" fill="#9CCB86" stroke-width={STROKE * 0.7} />
        <path d="M15 71 C7 74 5.5 90 15 95 C28 100.6 72 100.6 85 95 C94.5 90 93 74 85 71 C73 76.6 27 76.6 15 71 Z" fill={c} stroke-width={STROKE} />
        <g fill="none" stroke-width={1.4} opacity={0.3}>
          <path d="M29 75.6 C26 82.6 26 90.6 29.6 98" />
          <path d="M71 75.6 C74 82.6 74 90.6 70.4 98" />
        </g>
        <path d="M20 76 C16.6 80 16.4 86 18.4 89.6" fill="none" stroke="#fff" stroke-width={1.6} opacity={0.5} />
        <g fill={glow} stroke-width={1.3}>
          <path d="M35 86.4 L38.4 80.8 L41.8 86.4 Z" />
          <path d="M58.2 86.4 L61.6 80.8 L65 86.4 Z" />
          <path d="M40.5 89.2 L43.4 91.4 L46.6 89.6 L50 92 L53.4 89.6 L56.6 91.4 L59.5 89.2 C57 94.6 43 94.6 40.5 89.2 Z" />
        </g>
      </g>
    );
  },
};

/** Boo-vine: the bottom trails off into three wisps, fading out (no feet, no tail). */
export const ghostTail: TraitArt = {
  replaces: ['feet', 'tail'],
  body: reshaper((shape) => {
    const cut = 68;
    const pts = outlinePoints(shape.path, 72);
    const first = pts.findIndex((p) => p[1] > cut);
    let last = first;
    pts.forEach((p, i) => {
      if (p[1] > cut) last = i;
    });
    const hw = shape.halfWidthAt(cut);
    const hem: Pt[] = (
      [
        [0.99, 75],
        [0.9, 82.5],
        [0.76, 88.4],
        [0.63, 95.4],
        [0.46, 89.6],
        [0.2, 90.4],
        [0.02, 96.4],
        [-0.2, 90.4],
        [-0.44, 89.6],
        [-0.6, 95.4],
        [-0.76, 88.4],
        [-0.9, 82.5],
        [-0.99, 75],
      ] as Pt[]
    ).map(([k, y]) => [50 + k * hw, y]);
    return {
      ...shape,
      path: smoothPath([...pts.slice(0, first), ...hem, ...pts.slice(last + 1)]),
      halfWidthAt: (y) => (y <= cut ? shape.halfWidthAt(y) : shape.halfWidthAt(y) * 0.94),
    };
  }),
  surface: (ctx) => {
    const id = `${ctx.uid}-wisp`;
    return (
      <g>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FFFFFF" stop-opacity={0} />
          <stop offset="1" stop-color="#F2EDFE" stop-opacity={0.75} />
        </linearGradient>
        <rect x={0} y={68} width={100} height={32} fill={`url(#${id})`} />
      </g>
    );
  },
};

/** Mermaid Kitty: a scaly lower half and a fin tail curled to the side. */
export const mermaidTail: TraitArt = {
  replaces: ['feet', 'tail'],
  back: (ctx) => {
    const p = ctx.look.palette;
    const fin = p.tail ?? p.pattern ?? '#9FDCCB';
    return (
      <g class="pet-tail" style={{ '--tail-origin': '80px 88px' }} stroke={OUTLINE} stroke-linejoin="round">
        <OutlinedStroke d="M74 90 C83 90.6 88.6 85 90 77.6" color={fin} width={6.4} />
        <path d="M90.4 78.4 C86.4 73.4 86.8 66.4 91 63 C92.4 67.4 93.2 70.6 91.8 74.6 C94.6 70.8 98.2 69.4 100.8 70.6 C98.6 75.2 95.4 78.4 90.4 78.4 Z" fill={fin} stroke-width={STROKE} />
        <path d="M90.6 75.6 C89.4 72 89.6 68.6 90.8 66.4 M92.4 76.2 C94.4 74 96.4 72.6 98.6 72" fill="none" stroke-width={1} opacity={0.4} />
      </g>
    );
  },
  surface: (ctx) => {
    const p = ctx.look.palette;
    const scales = p.pattern ?? '#9FDCCB';
    const y0 = ctx.anchors.neck.y + 2;
    const wave = `M0 ${y0} Q12.5 ${y0 - 2.6} 25 ${y0} Q37.5 ${y0 + 2.6} 50 ${y0} Q62.5 ${y0 - 2.6} 75 ${y0} Q87.5 ${y0 + 2.6} 100 ${y0}`;
    return (
      <g>
        <path d={`${wave} L100 100 L0 100 Z`} fill={scales} />
        <g fill="none" stroke={lighten(scales, 0.5)} stroke-width={1.2} stroke-linecap="round">
          {[5, 10.5, 16].map((dy, row) =>
            Array.from({ length: 13 }, (_, i) => {
              const x = 4 + i * 7.6 + (row % 2 ? 3.8 : 0);
              return <path key={`${row}-${i}`} d={`M${x - 3.4} ${y0 + dy} Q${x} ${y0 + dy + 3.2} ${x + 3.4} ${y0 + dy}`} />;
            }),
          )}
        </g>
        <path d={wave} fill="none" stroke={shade(scales, 0.2)} stroke-width={1.4} />
      </g>
    );
  },
};

/** Daifuku: a squishier, rounder silhouette with an anko bean on the forehead and a dusting of starch. */
export const daifukuBean: TraitArt = {
  body: reshaper((shape) => {
    const sx = 1.06;
    const sy = 0.94;
    return {
      path: mapPath(shape.path, ([x, y]) => [50 + (x - 50) * sx, 93 - (93 - y) * sy]),
      halfWidthAt: (y) => sx * shape.halfWidthAt(93 - (93 - y) / sy),
      sheen: shape.sheen && { ...shape.sheen, cx: 50 + (shape.sheen.cx - 50) * sx, cy: 93 - (93 - shape.sheen.cy) * sy },
    };
  }),
  surface: (ctx) => {
    const { head } = ctx.anchors;
    return (
      <g>
        <g fill="#FFFFFF" opacity={0.8}>
          {[
            [40, 8],
            [57, 6],
            [63, 11],
            [35, 13],
            [52, 12],
          ].map(([x, dy]) => (
            <circle key={x} cx={x} cy={head.y + dy!} r={0.7} />
          ))}
        </g>
        <ellipse cx={head.x} cy={head.y + 8.5} rx={2.6} ry={1.9} fill="#A4606E" />
        <ellipse cx={head.x - 0.8} cy={head.y + 7.9} rx={0.8} ry={0.5} fill="#fff" opacity={0.6} />
      </g>
    );
  },
};

/** Gingerbread: piped icing trim just inside the outline, plus two gumdrop buttons. */
export const gingerbread: TraitArt = {
  surface: (ctx) => {
    const trim = mapPath(ctx.body.path, ([x, y]) => [50 + (x - 50) * 0.87, 64 + (y - 64) * 0.87]);
    const { neck } = ctx.anchors;
    return (
      <g>
        <path d={trim} fill="none" stroke="#FFFFFF" stroke-width={1.9} stroke-dasharray="2.6 2" stroke-linecap="round" />
        <g stroke={OUTLINE} stroke-width={1}>
          <circle cx={50} cy={neck.y + 4.5} r={2.3} fill="#F58CAA" />
          <circle cx={50} cy={neck.y + 11} r={2.3} fill="#6CCBAE" />
        </g>
      </g>
    );
  },
};

/** A little rainbow arching over the tummy (Sunshower Frog). */
export const rainbowBelly: TraitArt = {
  surface: () => (
    <g>
      <g fill="none" stroke-width={3.6}>
        {RAINBOW.slice(0, 5).map((c, i) => (
          <circle key={c} cx={50} cy={96} r={22 - i * 3.5} stroke={c} />
        ))}
      </g>
      <g fill="#FFFFFF" stroke={OUTLINE} stroke-width={1.2}>
        <path d={puffPath(29.5, 93.5, 3.6, 6, 0.3)} />
        <path d={puffPath(70.5, 93.5, 3.6, 6, 0.3)} />
      </g>
    </g>
  ),
};

/** Hamster cheek pouches: soft volume lines and a shine on each stuffed cheek. */
export const cheeks: TraitArt = {
  front: (ctx) => {
    const c = ctx.anchors.cheeks ?? { y: 67, left: 27, right: 73 };
    const cy = c.y + 2.4;
    return (
      <g>
        <g fill="none" stroke={OUTLINE} stroke-width={1.2} stroke-linecap="round" opacity={0.2}>
          <path d={`M${c.left - 1.6} ${cy - 7.4} C${c.left - 4.2} ${cy - 3} ${c.left - 4} ${cy + 3} ${c.left - 0.6} ${cy + 7.4}`} />
          <path d={`M${c.right + 1.6} ${cy - 7.4} C${c.right + 4.2} ${cy - 3} ${c.right + 4} ${cy + 3} ${c.right + 0.6} ${cy + 7.4}`} />
        </g>
        <g fill="#FFFFFF" opacity={0.9}>
          <ellipse cx={c.left + 1.8} cy={c.y - 2.2} rx={1.4} ry={0.9} />
          <ellipse cx={c.right + 1.8} cy={c.y - 2.2} rx={1.4} ry={0.9} />
        </g>
      </g>
    );
  },
};

/** Onigiri: a seaweed wrap across the bottom, over the white tummy. */
export const nori: TraitArt = {
  surface: () => (
    <g>
      <path d="M35 80 C35 78.2 36.2 77.4 38 77.4 L62 77.4 C63.8 77.4 65 78.2 65 80 L65.6 98 L34.4 98 Z" fill="#4F5F55" />
      <path d="M40 81 L40 93 M60 81 L60 93" stroke="#FFFFFF" stroke-width={0.8} stroke-linecap="round" opacity={0.18} />
    </g>
  ),
};

import type { ArtCtx, TraitArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { shade } from '../color';
import { headTransform } from '../placement';
import { smoothPath, type Pt } from '../outline';
import { starPath } from '../shapes';
import { Blossom, Crown, Leaf, Rose } from '../bits';
import { hasTrait, OutlinedStroke, puffPath } from '../species/parts';

/** Head traits: caps, crowns and hair, drawn in head-local coordinates (see placement.ts). */

const LEAF = '#9CCB86';
const LEAF_DARK = '#6FA35C';
const GOLD_LEAF = '#F6CF5A';
const GOLD_LEAF_DARK = '#D9A93A';

/** Mochi's sprout: a short stem with two round leaves (golden on Golden Mochi). */
export const sprout: TraitArt = {
  front: (ctx) => {
    const golden = hasTrait(ctx, 'golden');
    const leaf = golden ? GOLD_LEAF : LEAF;
    const vein = golden ? GOLD_LEAF_DARK : LEAF_DARK;
    const { x, y } = ctx.anchors.head;
    return (
      <g transform={`translate(${x - 50} ${y - 29})`}>
        <g class="pet-sprout" stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round" stroke-linecap="round">
          <path d="M50 29.5 C50 25 50.6 21.5 51.6 18.5" fill="none" />
          <path d="M51.3 19.5 C47 13.5 40 13.2 37.2 16.8 C41 21.5 47.2 22.4 51.3 19.5 Z" fill={leaf} />
          <path d="M51.6 18.8 C54.6 12.2 61.8 10.8 65 14 C61.8 19.4 55.8 21 51.6 18.8 Z" fill={leaf} />
          <path d="M49 18.4 C45.8 17.2 43 16.8 40.6 17" fill="none" stroke={vein} stroke-width={1.2} />
          <path d="M53.6 17.2 C56.4 15.6 59 14.8 61.6 14.6" fill="none" stroke={vein} stroke-width={1.2} />
        </g>
      </g>
    );
  },
};

/** Leafy strawberry calyx lying on top of the head, with a little stem. */
export const strawberryCap: TraitArt = {
  occupies: 'head',
  front: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: 1.5 })} stroke={OUTLINE} stroke-width={STROKE * 0.8} stroke-linejoin="round" stroke-linecap="round">
      {[-160, -128, -96, -64, -32, 0].map((deg, i) => (
        <path key={deg} d="M0 0 C3 -2.6 8 -2.8 12 0 C8 2.8 3 2.6 0 0 Z" transform={`rotate(${deg + 16}) scale(${i % 2 ? 0.85 : 1})`} fill={LEAF} />
      ))}
      <path d="M0 -1 C0.2 -4 1.4 -6.4 3.4 -7.8" fill="none" stroke-width={STROKE * 0.9} />
      <path d="M0 -1 C0.2 -4 1.4 -6.4 3.4 -7.8" fill="none" stroke={LEAF_DARK} stroke-width={1.2} />
    </g>
  ),
};

/** A tiny mushroom worn as a hat: rosy cap, white spots. */
export const mushroomCap: TraitArt = {
  occupies: 'head',
  front: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: -0.5, rotate: -4, scale: 1.15 })} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round">
      <path d="M-16.5 1.5 C-17.5 -12 -8 -17.5 0 -17.5 C8 -17.5 17.5 -12 16.5 1.5 C10 4.2 -10 4.2 -16.5 1.5 Z" fill="#F79C9C" />
      <path d="M-15.8 0.4 C-9.6 2.8 9.6 2.8 15.8 0.4" fill="none" stroke="#FFE3E3" stroke-width={2.2} />
      <g fill="#FFFFFF" stroke="none">
        <ellipse cx={-7.5} cy={-8.5} rx={3.2} ry={2.6} />
        <ellipse cx={4.5} cy={-12} rx={2.4} ry={1.9} />
        <ellipse cx={10.5} cy={-4.5} rx={2.3} ry={2} />
        <ellipse cx={-1.5} cy={-3} rx={1.6} ry={1.3} />
      </g>
    </g>
  ),
};

/** Frog Prince's crown, set at a jaunty angle. */
export const crown: TraitArt = {
  occupies: 'head',
  front: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: -0.5, rotate: 5, scale: 1.35 })}>
      <Crown />
    </g>
  ),
};

/** A soft-serve frosting swirl with sprinkles and a cherry on top. */
export const frosting: TraitArt = {
  occupies: 'head',
  front: (ctx) => {
    const cream = ctx.look.palette.accent ?? '#FFC4D8';
    return (
      <g transform={headTransform(ctx.anchors, { dy: 2 })} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" stroke-linecap="round">
        <path d="M-17 1.5 C-19.5 -4.5 -12 -8 -2 -7 C9 -8 19 -5 16.5 1.5 C9 4 -9 4 -17 1.5 Z" fill={cream} />
        <path d="M-11.5 -5 C-13 -11 -6 -13.5 1 -13 C8 -13.5 13 -10 10.5 -5.4" fill={cream} />
        <path d="M-5.5 -11.6 C-6.5 -17.6 1 -20 5.5 -16.4 C7.4 -14.8 7 -12.6 5.6 -11.8" fill={cream} />
        <g stroke-width={1.5}>
          <path d="M-9 -1 L-6.6 -2" stroke="#7DB7E8" />
          <path d="M3 -2.4 L5 -0.8" stroke="#F6C544" />
          <path d="M10 -2 L11.6 -3.6" stroke="#6CCBAE" />
          <path d="M-3 -9 L-1 -10.2" stroke="#A993EA" />
          <path d="M4 -8.6 L6.2 -8" stroke="#F58CAA" />
        </g>
        <path d="M1.6 -21.5 C2 -24.6 3.8 -26.6 6.4 -27.4" fill="none" stroke-width={1.4} />
        <circle cx={1} cy={-19.6} r={3.6} fill="#F0607F" />
        <circle cx={-0.2} cy={-20.8} r={1} fill="#fff" stroke="none" opacity={0.85} />
      </g>
    );
  },
};

/** A lily pad worn like a little umbrella hat, with a sprig of stem. */
export const lilypadHat: TraitArt = {
  occupies: 'head',
  front: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dy: -1, rotate: -10, scale: 1.25 })} stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round" stroke-linecap="round">
      <path d="M0.5 -3.5 C0.5 -7 1.4 -9.6 3 -11.2" fill="none" />
      <path d="M-17 1 C-18 -6 -9 -9 0 -9 C9 -9 18 -6 17 1 C13 3.4 5 3.2 2.2 2.2 L0 -3 L-1.8 2.4 C-6 3.4 -13 3.2 -17 1 Z" fill="#9DD48C" />
      <path d="M0 -3 L-9 -4.4 M0 -3 L8.6 -5 M0 -3 L-12 0.2 M0 -3 L12.4 -0.6" fill="none" stroke="#6FA35C" stroke-width={1} opacity={0.8} />
      <path d="M-12 -5.6 C-8 -7.4 -4 -7.8 -1.6 -7.6" fill="none" stroke="#fff" stroke-width={1.1} opacity={0.7} />
      <circle cx={3} cy={-12.2} r={2.4} fill="#FFC4D3" stroke-width={1.2} />
    </g>
  ),
};

/** An acorn cap with a crosshatch texture and a stubby stem. */
export const acornCap: TraitArt = {
  occupies: 'head',
  front: (ctx) => {
    const id = `${ctx.uid}-acorn`;
    const cap = 'M-15 3 C-16 -7 -8.5 -11.5 0 -11.5 C8.5 -11.5 16 -7 15 3 C8.5 5.2 -8.5 5.2 -15 3 Z';
    return (
      <g transform={headTransform(ctx.anchors, { dy: 0.5, rotate: 6 })} stroke-linejoin="round" stroke-linecap="round">
        <clipPath id={id}>
          <path d={cap} />
        </clipPath>
        <path d="M0.4 -11 C0.8 -13.6 2.2 -15.4 4 -16" fill="none" stroke={OUTLINE} stroke-width={STROKE * 1.5} />
        <path d="M0.4 -11 C0.8 -13.6 2.2 -15.4 4 -16" fill="none" stroke="#A8744F" stroke-width={1.4} />
        <path d={cap} fill="#D2A077" />
        <g clip-path={`url(#${id})`} stroke="#A8744F" stroke-width={1} fill="none" opacity={0.75}>
          {[-16, -10, -4, 2, 8, 14].map((x) => (
            <path key={x} d={`M${x} 6 L${x + 12} -12 M${x + 6} 6 L${x - 6} -12`} />
          ))}
        </g>
        <path d={cap} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
      </g>
    );
  },
};

/** A droopy striped nightcap with a pom-pom. */
export const nightcap: TraitArt = {
  occupies: 'head',
  front: (ctx) => {
    const id = `${ctx.uid}-nightcap`;
    const cone = 'M-14.5 0.5 C-14 -11 -5 -19 7 -18.4 C15 -18 21 -12 24.4 -3.6 C20.6 -6.8 16.4 -8.6 12.6 -7.6 C13.6 -4.8 14 -2 14 0.5 Z';
    return (
      <g transform={headTransform(ctx.anchors, { dy: 1.5, rotate: -6 })} stroke-linejoin="round">
        <clipPath id={id}>
          <path d={cone} />
        </clipPath>
        <path d={cone} fill="#D6C8F8" />
        <g clip-path={`url(#${id})`} fill="#FFFFFF" opacity={0.9}>
          {[-10, -1, 8, 17].map((x) => (
            <path key={x} d={`M${x} 4 L${x + 4} 4 L${x + 12} -22 L${x + 8} -22 Z`} />
          ))}
        </g>
        <path d={cone} fill="none" stroke={OUTLINE} stroke-width={STROKE} />
        <path d="M-17 3.4 C-17 -1.6 17 -1.6 17 3.4 C9 6.2 -9 6.2 -17 3.4 Z" fill="#FFF6EC" stroke={OUTLINE} stroke-width={STROKE} />
        <path d={puffPath(25, -2.4, 3.4, 7, 0.3)} fill="#FFFFFF" stroke={OUTLINE} stroke-width={STROKE * 0.9} />
      </g>
    );
  },
};

/** A floating golden halo with a soft glow. */
export const haloGlow: TraitArt = {
  occupies: 'head',
  top: (ctx) => {
    const id = `${ctx.uid}-halo`;
    return (
      <g transform={headTransform(ctx.anchors, { dy: -8 })}>
        <g class="pet-halo">
        <radialGradient id={id}>
          <stop offset="0%" stop-color="#FFF3B0" stop-opacity={0.9} />
          <stop offset="100%" stop-color="#FFE593" stop-opacity={0} />
        </radialGradient>
        <ellipse cx={0} cy={0} rx={19} ry={8} fill={`url(#${id})`} />
        <ellipse cx={0} cy={0} rx={11.5} ry={3.4} fill="none" stroke={OUTLINE} stroke-width={2.4 + STROKE * 1.4} />
        <ellipse cx={0} cy={0} rx={11.5} ry={3.4} fill="none" stroke="#FFD65C" stroke-width={2.4} />
        <path d="M-7 -2.6 C-4 -3.6 0 -3.8 3 -3.4" fill="none" stroke="#FFF8D6" stroke-width={1} stroke-linecap="round" />
        </g>
      </g>
    );
  },
};

/** Witchy Cat's tiny crooked hat with a star buckle. */
export const witchHat: TraitArt = {
  occupies: 'head',
  front: (ctx) => (
    <g transform={headTransform(ctx.anchors, { dx: 3, dy: 1, rotate: 10 })} stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" stroke-linecap="round">
      <path d="M-8.6 0 C-7 -7 -4.6 -13 -0.4 -19 C1.6 -21.6 5.4 -22 8.6 -20 C6 -19.4 4.4 -17.8 4 -15.4 C3.8 -10 5.6 -5 8.6 0 Z" fill="#A08BD6" />
      <path d="M-7.6 -3.4 C-3 -1.8 3.4 -1.8 7.4 -3.4 L8.2 -0.6 C3.8 1 -3.8 1 -8.4 -0.6 Z" fill="#7B67B8" stroke-width={STROKE * 0.7} />
      <path d="M-15.5 1.4 C-15.5 -2.4 15.5 -2.4 15.5 1.4 C15.5 4.4 -15.5 4.4 -15.5 1.4 Z" fill="#A08BD6" />
      <path d={starPath(0, -2, 2.3)} fill="#FFE08A" stroke-width={1} />
    </g>
  ),
};

/** Three curly locks between a cow's horns. */
export const forelock: TraitArt = {
  occupies: 'head',
  front: (ctx) => {
    const p = ctx.look.palette;
    return (
      <g transform={headTransform(ctx.anchors, { dy: 2.5 })} fill={p.pattern ?? shade(p.body, 0.18)} stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d="M-7.4 1 C-9.6 -2.6 -7.6 -6.6 -3.6 -6.4 C-5 -4.2 -4.4 -2 -2.2 -1 Z" />
        <path d="M7.4 1 C9.6 -2.6 7.6 -6.6 3.6 -6.4 C5 -4.2 4.4 -2 2.2 -1 Z" />
        <path d="M-3.2 0.6 C-4.6 -4.4 -1.4 -9.4 2.4 -9.6 C1 -7 1.6 -3.6 3.4 0.6 C1.4 1.6 -1.2 1.6 -3.2 0.6 Z" />
      </g>
    );
  },
};

/** Where a flower tucks in: at the base of the right ear (or eye bump), else beside the head. */
function earSpot(ctx: ArtCtx): [number, number] {
  const { head, headFeatures } = ctx.anchors;
  const ear = headFeatures[1];
  if (ear) return [ear.x + ear.width * 0.25, head.y + 4];
  return [head.x + head.width * 0.4, head.y + 5];
}

/** A blossom tucked beside the ear (sakura pink unless the palette says otherwise). */
export const flower: TraitArt = {
  front: (ctx) => {
    const [x, y] = earSpot(ctx);
    return (
      <g transform={`translate(${x} ${y}) rotate(12)`}>
        <Blossom r={6.4} color={ctx.look.palette.accent ?? '#F7A8C0'} />
      </g>
    );
  },
};

/** A rose with two leaves, tucked by the ear. */
export const rose: TraitArt = {
  front: (ctx) => {
    const [x, y] = earSpot(ctx);
    return (
      <g transform={`translate(${x} ${y})`}>
        <g transform="rotate(30)">
          <g transform="translate(3 3) rotate(20)">
            <Leaf len={7} />
          </g>
          <g transform="translate(-3 4) rotate(130)">
            <Leaf len={6} />
          </g>
        </g>
        <Rose r={6} color={ctx.look.palette.accent ?? '#F58CAA'} />
      </g>
    );
  },
};

/** Sandy Cat's pink starfish hair clip. */
export const starfish: TraitArt = {
  front: (ctx) => {
    const { head } = ctx.anchors;
    const x = head.x - head.width * 0.36;
    return (
      <g transform={`translate(${x} ${head.y + 5}) rotate(-14)`} stroke={OUTLINE} stroke-linejoin="round">
        <path d={starPath(0, 0, 6.4, 0.46)} fill="#FFA99A" stroke-width={STROKE * 0.75} />
        <g fill="#FFE3D6" stroke="none">
          <circle cx={0} cy={-3.2} r={0.7} />
          <circle cx={2.8} cy={-0.8} r={0.7} />
          <circle cx={-2.8} cy={-0.8} r={0.7} />
          <circle cx={1.8} cy={2.4} r={0.7} />
          <circle cx={-1.8} cy={2.4} r={0.7} />
        </g>
      </g>
    );
  },
};

/** Where antlers or horns root: the species' head features, else either side of the head. */
function antlerRoots(ctx: ArtCtx): [number, number] {
  const f = ctx.anchors.headFeatures;
  const { head } = ctx.anchors;
  if (f.length >= 2) return [f[0]!.x, f[1]!.x];
  return [head.x - head.width * 0.32, head.x + head.width * 0.32];
}

/** Reindeer antlers (they replace horns). */
export const antlers: TraitArt = {
  replaces: ['ears'],
  back: (ctx) => {
    const [l, r] = antlerRoots(ctx);
    const y = ctx.anchors.head.y + 4;
    const color = ctx.look.palette.accent ?? '#D2A57E';
    const d = 'M0 2 C-1 -5 -3 -11 -7 -17 M-2.4 -7.4 C-5 -8 -8 -9.2 -10.2 -11.6 M-4.8 -12.6 C-3.6 -15 -2.6 -17.4 -2.4 -20';
    return (
      <g>
        <g transform={`translate(${l} ${y})`}>
          <OutlinedStroke d={d} color={color} width={3.2} />
        </g>
        <g transform={`translate(${r} ${y}) scale(-1 1)`}>
          <OutlinedStroke d={d} color={color} width={3.2} />
        </g>
      </g>
    );
  },
};

/** Highland fringe: a shaggy mop over the brow, eyes just peeking out beneath. */
export const bangs: TraitArt = {
  front: (ctx) => {
    const p = ctx.look.palette;
    const { eyes, head } = ctx.anchors;
    const E = eyes.y;
    const T = head.y - 1;
    const hw = ctx.body.halfWidthAt;
    const side = (y: number) => hw(y) + 1.2;
    const pts: Pt[] = [
      [50 - side(E - 8), E - 8],
      [eyes.left - 12, E - 4],
      [eyes.left - 9, E - 1.6],
      [eyes.left - 5.5, E - 5],
      [eyes.left - 1, E - 0.8],
      [eyes.left + 4.5, E - 5.2],
      [50, E - 2.6],
      [eyes.right - 4.5, E - 5.2],
      [eyes.right + 1, E - 0.8],
      [eyes.right + 5.5, E - 5],
      [eyes.right + 9, E - 1.6],
      [eyes.right + 12, E - 4],
      [50 + side(E - 8), E - 8],
      [50 + side(E - 15) + 0.6, E - 15],
      [50 + side(T + 5) + 1, T + 5],
      [62, T - 2.2],
      [50, T - 3],
      [38, T - 2.2],
      [50 - side(T + 5) - 1, T + 5],
      [50 - side(E - 15) - 0.6, E - 15],
    ];
    const mop = p.pattern ?? shade(p.body, 0.1);
    return (
      <g stroke-linejoin="round" stroke-linecap="round">
        <path d={smoothPath(pts)} fill={mop} stroke={OUTLINE} stroke-width={STROKE} />
        <g fill="none" stroke="#FFFFFF" stroke-width={1.1} opacity={0.45}>
          <path d={`M${eyes.left - 6} ${T + 5} C${eyes.left - 7} ${T + 10} ${eyes.left - 6} ${E - 12} ${eyes.left - 4} ${E - 9}`} />
          <path d={`M48 ${T + 2} C47 ${T + 8} 48 ${E - 12} 49.5 ${E - 8}`} />
          <path d={`M${eyes.right + 6} ${T + 5} C${eyes.right + 7} ${T + 10} ${eyes.right + 6} ${E - 12} ${eyes.right + 4} ${E - 9}`} />
        </g>
      </g>
    );
  },
};

import type { TraitArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';
import { heartPath } from '../shapes';
import { Crown, Sparkle } from '../bits';
import { MIRROR, OutlinedStroke } from '../species/parts';
import { SPECIES_ART } from '../species';

/** Accent traits: things a variant holds, wears for good, or shines with. */

/** Golden Mochi: a light gleam that sweeps across the fur, a tiny crown and twinkles. */
export const golden: TraitArt = {
  surface: () => (
    <g transform="rotate(24 50 60)">
      <rect class="pet-gleam" x={-12} y={10} width={9} height={110} fill="#FFFFFF" />
    </g>
  ),
  top: (ctx) => {
    const { head } = ctx.anchors;
    return (
      <g>
        <g transform={`translate(${head.x + 13} ${head.y + 1.5}) rotate(18) scale(0.52)`}>
          <Crown />
        </g>
        <g transform={`translate(${head.x - 20} ${head.y + 3})`}>
          <Sparkle r={2.6} color="#FFF3B0" twinkle />
        </g>
        <g transform={`translate(${head.x + 24} ${head.y + 11})`}>
          <Sparkle r={1.9} color="#FFF3B0" twinkle />
        </g>
      </g>
    );
  },
};

/** Lucky Cat (maneki-neko): a raised beckoning paw, a gold koban and a red collar with a bell. */
export const luckyPaw: TraitArt = {
  surface: (ctx) => {
    const { neck } = ctx.anchors;
    const y = neck.y;
    return (
      <g stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d={`M0 ${y - 1.6} Q50 ${y + 5.4} 100 ${y - 1.6} L100 ${y + 2.6} Q50 ${y + 9.6} 0 ${y + 2.6} Z`} fill="#EE6A84" />
        <g transform={`translate(50 ${y + 8})`}>
          <circle r={4.2} fill="#FFD65C" />
          <path d="M-2.4 0.6 L2.4 0.6" stroke-width={1.1} />
          <circle cy={2} r={0.9} fill={OUTLINE} stroke="none" />
          <circle cx={-1.4} cy={-1.5} r={1} fill="#fff" stroke="none" opacity={0.85} />
        </g>
      </g>
    );
  },
  front: (ctx) => {
    const p = ctx.look.palette;
    const fur = p.feet ?? p.body;
    return (
      <g stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
        {/* raised paw, beckoning good things */}
        <g class="pet-beckon" style={{ '--beckon-origin': '76px 66px' }}>
          <OutlinedStroke d="M75 68 C77 62 78.6 57 79.6 52" color={fur} width={8.4} />
          <path d="M73.6 47.6 C73.4 42.6 77 39.6 80.6 40 C84.4 40.4 87 43.8 86.4 47.8 C85.8 51.6 82.6 53.6 79.4 53.4 C76.2 53.2 73.8 51 73.6 47.6 Z" fill={fur} stroke-width={STROKE} />
          <g fill="#FFB3C4" stroke="none">
            <ellipse cx={80} cy={48.6} rx={2.6} ry={2.1} />
            <circle cx={77.2} cy={44.6} r={1.1} />
            <circle cx={80.2} cy={43.4} r={1.1} />
            <circle cx={83.2} cy={44.6} r={1.1} />
          </g>
        </g>
        {/* koban coin held at the chest */}
        <g transform="translate(36 80) rotate(-14)">
          <ellipse rx={6.4} ry={8.4} fill="#FFD65C" stroke-width={STROKE * 0.85} />
          <ellipse rx={4.4} ry={6.4} fill="none" stroke="#E0A93A" stroke-width={1} />
          <path d="M-2.4 -2.6 L2.4 -2.6 M-2.4 0 L2.4 0 M-2.4 2.6 L2.4 2.6" stroke="#E0A93A" stroke-width={1} />
          <path d="M-3.8 -4.4 C-3.2 -5.8 -2 -6.6 -0.8 -6.8" fill="none" stroke="#fff" stroke-width={1.1} opacity={0.9} />
        </g>
        <ellipse cx={30.4} cy={80.6} rx={3.6} ry={3.1} fill={fur} stroke-width={STROKE * 0.8} />
      </g>
    );
  },
};

/** Jingle Cat, wrapped as a present: ribbon around the tummy and a big bow. */
export const ribbon: TraitArt = {
  surface: (ctx) => {
    const c = ctx.look.palette.accent ?? '#EF6F86';
    const y = ctx.anchors.neck.y + 3;
    return (
      <g fill={c}>
        <path d={`M0 ${y - 1} Q50 ${y + 4} 100 ${y - 1} L100 ${y + 4.4} Q50 ${y + 9.4} 0 ${y + 4.4} Z`} />
        <rect x={47.3} y={y} width={5.4} height={40} />
        <path d={`M48.4 ${y + 2} L48.4 100`} stroke="#fff" stroke-width={0.9} opacity={0.5} />
      </g>
    );
  },
  front: (ctx) => {
    const c = ctx.look.palette.accent ?? '#EF6F86';
    const y = ctx.anchors.neck.y + 5.4;
    return (
      <g transform={`translate(50 ${y})`} stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round">
        <path d="M-1.6 1 L-6 9.6 L-2.8 8.8 L-1.2 11.6 L1 1.6 Z" fill={c} />
        <path d="M1.6 1 L6 9.6 L2.8 8.8 L1.2 11.6 L-1 1.6 Z" fill={c} />
        <path d="M0 0 C-4.6 -6.6 -13 -7.4 -13.4 -1.4 C-13.8 4.4 -5.4 4.8 0 0 Z" fill={c} />
        <path d="M0 0 C4.6 -6.6 13 -7.4 13.4 -1.4 C13.8 4.4 5.4 4.8 0 0 Z" fill={c} />
        <ellipse rx={3.2} ry={3.4} fill={c} />
        <path d="M-9 -3.6 C-7.4 -4.8 -5.6 -4.6 -4.6 -3.8" fill="none" stroke="#fff" stroke-width={1.1} stroke-linecap="round" opacity={0.75} />
      </g>
    );
  },
};

/** Cupid's little feathered wings, peeking out on both sides. */
function Wing({ mirror }: { mirror?: boolean }) {
  return (
    <g transform={mirror ? MIRROR : undefined}>
      <g class={mirror ? 'pet-wing-r' : 'pet-wing-l'} style={{ '--wing-origin': '20px 52px' }}>
        <g transform="translate(-1.5 -9) rotate(-8 20 60) scale(1.12)">
        <path
          d="M21 54 C14 48.6 5.4 48.6 2.6 52.6 C1.4 54.6 2.6 56.2 4.6 56.4 C2 58 1.6 61 3.8 62.2 C2.4 64.4 3.6 67.4 6.6 67.2 C10.6 70 17.6 68.4 22 64"
          fill="#FFFFFF"
          stroke={OUTLINE}
          stroke-width={STROKE}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M7.4 56.6 C11 56.4 14.4 57 17.4 58.4 M8.4 62.2 C11.6 62.6 14.6 62.6 17.6 61.8" fill="none" stroke="#F7B8C8" stroke-width={1.2} stroke-linecap="round" />
        </g>
      </g>
    </g>
  );
}

export const wings: TraitArt = {
  back: () => (
    <g>
      <Wing />
      <Wing mirror />
    </g>
  ),
};

/** Hug Bear holds a big squishy heart against her chest. */
export const heartHold: TraitArt = {
  front: (ctx) => {
    const p = ctx.look.palette;
    const fur = p.feet ?? p.body;
    const y = ctx.anchors.neck.y + 6.5;
    return (
      <g stroke={OUTLINE} stroke-linejoin="round">
        <path d={heartPath(50, y, 9.6)} fill="#F58CAA" stroke-width={STROKE * 0.9} />
        <path d={`M${43.4} ${y - 5} C${44.6} ${y - 7} ${46.6} ${y - 7.6} ${48} ${y - 6.6}`} fill="none" stroke="#fff" stroke-width={1.3} stroke-linecap="round" opacity={0.85} />
        <g fill={fur} stroke-width={STROKE * 0.8}>
          <ellipse cx={39.6} cy={y + 1} rx={4.2} ry={3.6} transform={`rotate(-24 39.6 ${y + 1})`} />
          <ellipse cx={60.4} cy={y + 1} rx={4.2} ry={3.6} transform={`rotate(24 60.4 ${y + 1})`} />
        </g>
      </g>
    );
  },
};

/** Sailor Duck's collar: a navy yoke with a white stripe and a red neckerchief. */
export const sailorCollar: TraitArt = {
  occupies: 'neck',
  surface: (ctx) => {
    const { y } = ctx.anchors.neck;
    return (
      <g stroke-linejoin="round">
        <path d={`M0 ${y - 3} Q50 ${y + 3} 100 ${y - 3} L100 ${y + 6} L60 ${y + 6} L50 ${y + 15} L40 ${y + 6} L0 ${y + 6} Z`} fill="#7E95D6" stroke={OUTLINE} stroke-width={STROKE * 0.8} />
        <path d={`M0 ${y + 3} L39 ${y + 3} L50 ${y + 12.4} L61 ${y + 3} L100 ${y + 3}`} fill="none" stroke="#FFFFFF" stroke-width={1.3} />
      </g>
    );
  },
  front: (ctx) => {
    const { y } = ctx.anchors.neck;
    return (
      <g transform={`translate(50 ${y + 9})`} fill="#F07A8F" stroke={OUTLINE} stroke-width={STROKE * 0.8} stroke-linejoin="round">
        <path d="M-1.4 1.6 L-4.6 8.6 L-1 7.4 Z" />
        <path d="M1.4 1.6 L4.6 8.6 L1 7.4 Z" />
        <path d="M-3.4 -2.2 L3.4 -2.2 L2.6 2.4 L-2.6 2.4 Z" />
      </g>
    );
  },
};

/** Kissy Frog: puckered lips (and a tiny heart) whenever the mouth is at rest. */
export const kissy: TraitArt = {
  replaces: ['mouth'],
  front: (ctx) => {
    const e = ctx.expression;
    if (e === 'eat' || e === 'surprised' || e === 'happy') return SPECIES_ART[ctx.look.species].mouth(ctx);
    const { x, y } = ctx.anchors.mouth;
    const ly = y + 1.6;
    return (
      <g stroke={OUTLINE} stroke-linejoin="round" stroke-linecap="round">
        <path
          d={`M${x - 4} ${ly} C${x - 4.2} ${ly - 3} ${x - 0.8} ${ly - 3.6} ${x} ${ly - 1.6} C${x + 0.8} ${ly - 3.6} ${x + 4.2} ${ly - 3} ${x + 4} ${ly} C${x + 3.8} ${ly + 3.4} ${x + 0.8} ${ly + 3.8} ${x} ${ly + 2.4} C${x - 0.8} ${ly + 3.8} ${x - 3.8} ${ly + 3.4} ${x - 4} ${ly} Z`}
          fill="#F58CAA"
          stroke-width={1.5}
        />
        <path d={`M${x - 2.8} ${ly + 0.2} Q${x} ${ly + 1} ${x + 2.8} ${ly + 0.2}`} fill="none" stroke-width={1} opacity={0.6} />
        <path d={heartPath(x + 8.6, ly - 5, 1.9)} fill="#F58CAA" stroke-width={0.9} />
      </g>
    );
  },
};

/** A shiny red nose on the muzzle (Reindeer Cow). */
export const redNose: TraitArt = {
  front: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    return (
      <g>
        <circle cx={x} cy={y - 3} r={3.6} fill="#F0607F" stroke={OUTLINE} stroke-width={STROKE * 0.7} />
        <ellipse cx={x - 1.2} cy={y - 4.2} rx={1.2} ry={0.8} fill="#fff" opacity={0.85} />
      </g>
    );
  },
};

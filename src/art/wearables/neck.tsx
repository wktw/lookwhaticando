import { C, SHADE, Shade, item } from './kit';
import type { WearCtx } from '../pets/types';
import { circle, ellipse, fmt, rrect, scallop, tube } from '../pets/shape';
import { heart } from '../pets/species/marks';

/**
 * Neck wear, drawn in the collar frame: the throat at the origin, the collar running 10 units to
 * each side and dipping at the front, anything that hangs falling toward +y.
 */

const band = (h = 3): string => `M-10 ${fmt(-h / 2)}Q0 ${fmt(3.6 - h / 2)} 10 ${fmt(-h / 2)}V${fmt(h / 2)}Q0 ${fmt(3.6 + h / 2)} -10 ${fmt(h / 2)}Z`;
/** A point on the collar's centre line at x. */
const on = (x: number): [number, number] => [x, 1.8 * (1 - (x / 10) ** 2)];

export const bellCollar = item({
  slot: 'neck',
  hang: 7.6,
  draw: () => (
    <g>
      <path d={band(2.6)} fill={C.blush} />
      <circle cx={2} cy={5} r={2.3} fill={C.brass} />
      <path d="M0.4 5.6H3.6" class="pet-line" stroke={C.brassDeep} stroke-width="0.6" />
      <circle cx={2} cy={6.3} r={0.5} fill={C.brassDeep} />
    </g>
  ),
  icon: 'translate(50 44) scale(3.6)',
});

export const tagCollar = item({
  slot: 'neck',
  hang: 8.8,
  draw: () => (
    <g>
      <path d={band(2.8)} fill={C.leather} />
      <circle cx={2} cy={3.6} r={0.9} fill={C.brassDeep} />
      <circle cx={2} cy={6.2} r={2.4} fill={C.brass} />
      <path d="M1 5.4A1.4 1.4 0 0 1 3.2 5.2" class="pet-line" fill="none" stroke={C.brassDeep} stroke-width="0.5" />
    </g>
  ),
  icon: 'translate(50 44) scale(3.6)',
});

export const cowbell = item({
  slot: 'neck',
  hang: 13.2,
  draw: () => (
    <g>
      <path d={band(3)} fill={C.leather} />
      <path d="M-1.8 3.4H5.8L7 10.6C7.2 11.4 6.6 12 5.8 12H-1.8C-2.6 12 -3.2 11.4 -3 10.6Z" fill={C.brass} />
      <path d="M3.4 3.4H5.8L7 10.6C7.2 11.4 6.6 12 5.8 12H4.4Z" fill={C.brassDeep} />
      <circle cx={2} cy={12.2} r={1} fill={C.leatherDeep} />
    </g>
  ),
  icon: 'translate(50 38) scale(3.6)',
});

/** A triangle hanging below the collar, knotted at the side. */
function kerchief(fill: string, check: string | null, knot: string) {
  const squares: string[] = [];
  if (check) {
    for (let y = 1; y < 13; y += 2.4) {
      for (let x = -9; x < 9; x += 2.4) {
        // Keep checks inside the triangle (edges from (±9, 1) down to (0, 14)).
        const half = 9 * (1 - (y + 1.2 - 1) / 13);
        if (Math.abs(x + 0.6) < half - 1) squares.push(rrect(x, y, 1.2, 1.2, 0.2));
      }
    }
  }
  return (
    <g>
      <path d="M-10 -0.6Q0 3.4 10 -0.6L1.6 13.6Q0 15.4 -1.6 13.6Z" fill={fill} />
      {check && <path d={squares.join('')} fill={check} />}
      <path d={band(2.2)} fill={knot} />
      <path d={`${ellipse(-9.4, 0.6, 1.8, 1.5)}M-9.6 1.4L-12.6 5.4L-10.8 6L-8.6 2Z`} fill={knot} />
    </g>
  );
}

export const ginghamBandana = item({ slot: 'neck', hang: 15.4, draw: () => kerchief('#F4D3D1', C.red, C.redDeep), icon: 'translate(52 36) scale(3.4)' });
export const dogBandana = item({ slot: 'neck', hang: 15.4, draw: () => kerchief(C.denim, null, '#7792B4'), icon: 'translate(52 36) scale(3.4)' });

/** A knitted scarf, wrapped, one end hanging at the front. */
function scarf(main: string, stripe: string | null, texture: string | null, twice = false, ctx: WearCtx | null = null) {
  return (
    <g>
      <path d={tube([on(-2), [-1.4, 6], [-2.6, 13]], 5, 4.4)} fill={main} />
      {stripe && <path d={`${rrect(-5, 8, 5.2, 1.6, 0.6)}${rrect(-5.2, 11, 5.2, 1.6, 0.6)}`} fill={stripe} />}
      <path d="M-5 14.6L-4.6 16.2M-3 15L-2.8 16.6M-1 14.8L-0.6 16.2" class="pet-line" stroke={main} stroke-width="0.9" stroke-linecap="round" />
      <path d={band(4.6)} fill={main} />
      {twice && <path d="M-9.6 2.6Q0 7 9.6 2.6V4.8Q0 9.2 -9.6 4.8Z" fill={main} />}
      {stripe && <path d="M-3 -2.4Q-2 1 -3 3.8L-1 4Q0 1 -1 -2.4ZM4 -2.2Q5 1 4 3.6L6 3.2Q7 0.6 6 -2.4Z" fill={stripe} />}
      {texture && <path d={[-7, -4, -1, 2, 5, 8].map((x) => circle(x, 1.6 * (1 - (x / 10) ** 2) + 0.4, 0.45)).join('')} fill={texture} />}
      {/* The shade: down the hanging end and under the wrap, so pale wool keeps its form. */}
      <Shade ctx={ctx} d="M1 2.6C1.2 6 0.8 10 -0.4 13.8L-1.8 13.6C-0.8 10 -0.4 6 -0.6 2.8Z" />
      <path d="M-10 1.5Q0 5.1 10 1.5V2.3Q0 5.9 -10 2.3Z" fill={SHADE} />
    </g>
  );
}

export const knitScarf = item({ slot: 'neck', hang: 16.6, draw: (ctx) => scarf(C.sage, null, C.sageDeep, false, ctx), icon: 'translate(50 36) scale(3.4)' });
export const leafScarf = item({ slot: 'neck', hang: 16.6, draw: (ctx) => scarf(C.rust, C.mustard, null, false, ctx), icon: 'translate(50 36) scale(3.4)' });
export const winterScarf = item({ slot: 'neck', hang: 16.6, draw: (ctx) => scarf(C.wool, null, C.woolDeep, true, ctx), icon: 'translate(50 36) scale(3.4)' });

export const heartLocket = item({
  slot: 'neck',
  hang: 10.8,
  draw: () => (
    <g>
      <path d={tube([[-10, 0], [-5, 2.6], [0, 3.6], [5, 2.6], [10, 0]], 0.6, 0.6)} fill={C.brassDeep} />
      <path d={heart(1.6, 6.4, 4.8, 4.4)} fill={C.brass} />
      <path d={heart(2.2, 6, 1.8, 1.6)} fill={C.white} opacity={0.5} />
    </g>
  ),
  icon: 'translate(50 40) scale(3.8)',
});

export const petalCollar = item({
  slot: 'neck',
  hang: 5.6,
  draw: () => (
    <g>
      {[-9, -6, -3, 0, 3, 6, 9].map((x, i) => {
        const [cx, cy] = on(x);
        return <path key={x} d={ellipse(cx, cy + 2.4, 2.2, 3)} transform={`rotate(${fmt(-x * 2)} ${fmt(cx)} ${fmt(cy)})`} fill={i % 2 ? C.cream : C.blush} />;
      })}
      <path d={band(1.6)} fill={C.blushDeep} />
    </g>
  ),
  icon: 'translate(50 40) scale(3.6)',
});

export const flowerLei = item({
  slot: 'neck',
  draw: () => {
    const cols = [C.blush, C.butter, C.sky, C.lilac, C.mint, C.blush, C.butter];
    return (
      <g>
        {[-9, -6, -3, 0, 3, 6, 9].map((x, i) => {
          const [cx, cy] = on(x);
          return (
            <g key={x}>
              <path d={scallop(cx, cy + 0.8, 2.2, 2.1, 5, 0.3, i)} fill={cols[i]} />
              <circle cx={cx} cy={cy + 0.8} r={0.7} fill={C.cream} />
            </g>
          );
        })}
      </g>
    );
  },
  icon: 'translate(50 42) scale(3.6)',
});

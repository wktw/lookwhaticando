import type { JSX } from 'preact';
import type { ArtCtx, WearableArt } from '../pets/types';
import { heartPath } from '../pets/shapes';
import { Blossom } from '../pets/bits';
import { ctxIcon, ICON_CTX, INK, SW } from './kit';

/** Neck wear: everything follows the neck line and the species' body width there. */

function neckLine(ctx: ArtCtx) {
  const { y } = ctx.anchors.neck;
  const hw = ctx.body.halfWidthAt(y) - 0.6;
  /** Point along the neck curve (t: 0 = left edge, 1 = right edge), sagging `sag` at the center. */
  const pt = (t: number, sag = 3.4): [number, number] => [50 + hw * (2 * t - 1), y - 1.8 + 4 * t * (1 - t) * sag];
  /** A band along the neck, `h` tall. */
  const band = (h: number, sag = 3.4) =>
    `M${50 - hw} ${y - 1.8} Q50 ${y - 1.8 + 2 * sag} ${50 + hw} ${y - 1.8} L${50 + hw} ${y - 1.8 + h} Q50 ${y - 1.8 + h + 2 * sag} ${50 - hw} ${y - 1.8 + h} Z`;
  return { y, hw, pt, band };
}

/** Icon helper: the back of the loop, seen from a little above, so a collar reads as a collar when shown alone. */
function Loop({ color, width, dashed }: { color: string; width: number; dashed?: boolean }) {
  const { neck } = ICON_CTX.anchors;
  const d = `M${neck.left} ${neck.y - 1} Q50 ${neck.y - 30} ${neck.right} ${neck.y - 1}`;
  return (
    <g fill="none" stroke-linecap="round">
      <path d={d} stroke={INK} stroke-width={width + SW * 1.6} />
      <path d={d} stroke={color} stroke-width={width} stroke-dasharray={dashed ? '1.4 1' : undefined} />
    </g>
  );
}

/** A neck item; `loop` draws the back of the band in the icon, which is zoomed around (50, cy), slightly tilted. */
function make(render: (ctx: ArtCtx) => JSX.Element, loop?: { color: string; width: number; dashed?: boolean }, zoom = 1.3, cy = 35): WearableArt {
  const front = ctxIcon(render, 1);
  return {
    render,
    icon: () => (
      <g transform={`translate(50 50) rotate(-6) scale(${zoom}) translate(-50 ${-cy})`}>
        {loop && <Loop {...loop} />}
        {front()}
      </g>
    ),
  };
}

export const bellCollar = make(
  (ctx) => {
    const { y, band } = neckLine(ctx);
    return (
      <g stroke={INK} stroke-width={SW * 0.85} stroke-linejoin="round">
        <path d={band(4)} fill="#F58CAA" />
        <g transform={`translate(50 ${y + 7.6})`}>
          <circle r={4.4} fill="#FFD65C" />
          <path d="M-2.6 0.6 L2.6 0.6" stroke-width={1.1} />
          <circle cy={2} r={0.9} fill={INK} stroke="none" />
          <circle cx={-1.4} cy={-1.6} r={1} fill="#fff" stroke="none" opacity={0.85} />
        </g>
      </g>
    );
  },
  { color: '#E07896', width: 3.4 },
);

const BANDANA = (y: number) => `M36.4 ${y + 1.4} Q50 ${y + 6.6} 63.6 ${y + 1.4} L52.6 ${y + 15.4} Q50 ${y + 18.2} 47.4 ${y + 15.4} Z`;

function Paw({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#FFFFFF">
      <ellipse cx={x} cy={y + 0.6} rx={1.5} ry={1.2} />
      <circle cx={x - 1.5} cy={y - 1} r={0.62} />
      <circle cx={x} cy={y - 1.6} r={0.62} />
      <circle cx={x + 1.5} cy={y - 1} r={0.62} />
    </g>
  );
}

export const pawBandana = make(
  (ctx) => {
    const { y, band } = neckLine(ctx);
    return (
      <g stroke-linejoin="round">
        <path d={band(3.2)} fill="#9CC8F0" stroke={INK} stroke-width={SW * 0.85} />
        <path d={BANDANA(y)} fill="#BBDCF6" stroke={INK} stroke-width={SW * 0.85} />
        <Paw x={44.6} y={y + 6.4} />
        <Paw x={55.2} y={y + 6.6} />
        <Paw x={50} y={y + 11.2} />
      </g>
    );
  },
  { color: '#86B6E6', width: 2.8 },
);

export const ginghamBandana = make(
  (ctx) => {
    const { y, band } = neckLine(ctx);
    const id = `${ctx.uid}-gingham`;
    return (
      <g stroke-linejoin="round">
        <clipPath id={id}>
          <path d={BANDANA(y)} />
        </clipPath>
        <path d={band(3.2)} fill="#F7A1B8" stroke={INK} stroke-width={SW * 0.85} />
        <path d={BANDANA(y)} fill="#FFE3EA" />
        <g clip-path={`url(#${id})`} fill="#F7A1B8" opacity={0.55}>
          {[34, 38, 42, 46, 50, 54, 58, 62].map((x) => (
            <rect key={x} x={x} y={y - 2} width={2} height={24} />
          ))}
          {[0, 4, 8, 12, 16].map((dy) => (
            <rect key={dy} x={30} y={y + dy} width={40} height={2} />
          ))}
        </g>
        <path d={BANDANA(y)} fill="none" stroke={INK} stroke-width={SW * 0.85} />
      </g>
    );
  },
  { color: '#EE8FAA', width: 2.8 },
);

export const cowbell = make(
  (ctx) => {
    const { y, band } = neckLine(ctx);
    return (
      <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
        <path d={band(3.2)} fill="#C99A74" stroke-width={SW * 0.85} />
        <g transform={`translate(50 ${y + 3.4})`} stroke-width={SW * 0.85}>
          <path d="M-2 -0.6 C-2 -2.6 2 -2.6 2 -0.6" fill="none" stroke-width={1.4} />
          <path d="M-3.8 0 L3.8 0 L6.4 9.6 C6.4 11.6 -6.4 11.6 -6.4 9.6 Z" fill="#FFD65C" />
          <path d="M-5.6 7.6 C-2 8.8 2 8.8 5.6 7.6" fill="none" stroke-width={1} opacity={0.5} />
          <circle cy={11.2} r={1.6} fill="#C99A74" stroke-width={1} />
          <path d="M-2.6 1.6 L-3.8 6.4" stroke="#fff" stroke-width={1.2} opacity={0.8} />
        </g>
      </g>
    );
  },
  { color: '#B88A66', width: 2.8 },
);

export const bowTie = make(
  (ctx) => {
    const { y } = ctx.anchors.neck;
    return (
      <g transform={`translate(50 ${y + 2.6})`} stroke={INK} stroke-width={SW * 0.85} stroke-linejoin="round">
        <path d="M0 0 L-8.6 -5 C-10 -5.6 -10.8 -4.6 -10.8 -3.2 L-10.8 3.2 C-10.8 4.6 -10 5.6 -8.6 5 Z" fill="#8FB3E8" />
        <path d="M0 0 L8.6 -5 C10 -5.6 10.8 -4.6 10.8 -3.2 L10.8 3.2 C10.8 4.6 10 5.6 8.6 5 Z" fill="#8FB3E8" />
        <g fill="#FFFFFF" stroke="none">
          <circle cx={-7.4} cy={-1.6} r={0.9} />
          <circle cx={-5} cy={1.8} r={0.9} />
          <circle cx={7.4} cy={-1.6} r={0.9} />
          <circle cx={5} cy={1.8} r={0.9} />
        </g>
        <rect x={-2.4} y={-3} width={4.8} height={6} rx={1.8} fill="#7AA0DC" />
      </g>
    );
  },
  undefined,
  3.2,
  38.6,
);

export const cloudScarf = make(
  (ctx) => {
    const { hw, pt } = neckLine(ctx);
    const n = Math.max(9, Math.round(hw / 3));
    const band = Array.from({ length: n }, (_, i) => pt(0.02 + (0.96 * i) / (n - 1), 3.8));
    const [tx, ty] = pt(0.3, 3.8);
    const puffs = [
      ...band.map(([x, y], i) => ({ x, y: y + 1.6, r: i % 2 ? 4.4 : 5 })),
      { x: tx - 1, y: ty + 7.6, r: 4.4 },
      { x: tx - 1.6, y: ty + 13, r: 3.8 },
    ];
    const shapes = puffs.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={c.r} />);
    return (
      <g>
        <g fill="#FFFFFF" stroke={INK} stroke-width={SW * 2}>
          {shapes}
        </g>
        <g fill="#FFFFFF">{shapes}</g>
        <g fill="#E6DEFA">
          {puffs.map((c, i) => (
            <ellipse key={i} cx={c.x + c.r * 0.15} cy={c.y + c.r * 0.45} rx={c.r * 0.7} ry={c.r * 0.4} />
          ))}
        </g>
      </g>
    );
  },
  { color: '#EEE8FC', width: 7 },
  1.2,
);

export const autumnScarf = make(
  (ctx) => {
    const { y, hw, band } = neckLine(ctx);
    const tx = 50 - hw * 0.42;
    return (
      <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
        <path d={`M${tx - 5} ${y + 1} L${tx + 4.4} ${y + 1.6} L${tx + 3.2} ${y + 18} L${tx - 6.2} ${y + 17.4} Z`} fill="#F79A6A" stroke-width={SW * 0.85} />
        <path d={`M${tx - 5.4} ${y + 7} L${tx + 4} ${y + 7.6} M${tx - 5.8} ${y + 11.6} L${tx + 3.6} ${y + 12.2}`} stroke="#FFD3A8" stroke-width={1.8} />
        <path
          d={`M${tx - 5} ${y + 17.6} L${tx - 5.4} ${y + 20.4} M${tx - 1.6} ${y + 17.8} L${tx - 1.8} ${y + 20.6} M${tx + 1.8} ${y + 18} L${tx + 1.8} ${y + 20.8}`}
          stroke-width={1.1}
        />
        <path d={band(7.6, 3.6)} fill="#FFB27A" stroke-width={SW * 0.85} />
        <path d={`M${50 - hw + 2} ${y + 2} Q50 ${y + 9.2} ${50 + hw - 2} ${y + 2}`} fill="none" stroke="#FFD3A8" stroke-width={1.6} />
      </g>
    );
  },
  { color: '#F59A64', width: 7 },
  1.3,
  38,
);

export const knitScarf = make(
  (ctx) => {
    const { y, hw, band } = neckLine(ctx);
    const kx = 50 + hw * 0.46;
    const ky = y + 4;
    const tail = (dx: number, rot: number) => (
      <g transform={`translate(${kx + dx} ${ky + 1}) rotate(${rot})`} stroke-width={SW * 0.85}>
        <path d="M-3.4 0 L3.4 0 L3.2 13 L-3.2 13 Z" fill="#F7A1B8" />
        <path d="M-3.3 4.4 L3.3 4.4 M-3.2 8.6 L3.2 8.6" stroke="#FFFFFF" stroke-width={1.6} />
        <path d="M-2.4 13 L-2.4 15.4 M0 13 L0 15.6 M2.4 13 L2.4 15.4" stroke-width={1.1} />
      </g>
    );
    return (
      <g stroke={INK} stroke-linejoin="round" stroke-linecap="round">
        {tail(-1.4, 8)}
        {tail(2.8, -10)}
        <path d={band(6.6, 3.6)} fill="#F7A1B8" stroke-width={SW * 0.85} />
        <g stroke="#FFFFFF" stroke-width={1.5} opacity={0.9}>
          {[-0.7, -0.4, -0.1, 0.2, 0.5].map((k) => (
            <path key={k} d={`M${50 + hw * k} ${y + 0.4 + (1 - k * k) * 6.4} l0 4.2`} />
          ))}
        </g>
        <ellipse cx={kx} cy={ky} rx={4} ry={3.6} fill="#F58CAA" stroke-width={SW * 0.85} />
      </g>
    );
  },
  { color: '#E88CA4', width: 6.4 },
  1.3,
  38,
);

export const heartLocket = make(
  (ctx) => {
    const { y, hw } = neckLine(ctx);
    const chain = `M${50 - hw + 1} ${y - 1.4} Q50 ${y + 11} ${50 + hw - 1} ${y - 1.4}`;
    return (
      <g stroke-linejoin="round" stroke-linecap="round">
        <path d={chain} fill="none" stroke={INK} stroke-width={2.4} />
        <path d={chain} fill="none" stroke="#FFE08A" stroke-width={1.2} stroke-dasharray="1.4 1" />
        <circle cx={50} cy={y + 5.4} r={1.2} fill="none" stroke={INK} stroke-width={1} />
        <path d={heartPath(50, y + 10, 4.6)} fill="#FFD65C" stroke={INK} stroke-width={SW * 0.8} />
        <circle cx={50} cy={y + 9.8} r={1.3} fill="#F58CAA" />
        <path d={`M${47} ${y + 8} q1 -1.4 2.4 -1.6`} fill="none" stroke="#FFFFFF" stroke-width={1} />
      </g>
    );
  },
  { color: '#FFE08A', width: 1.2, dashed: true },
  1.3,
  33,
);

const LEI_COLORS = ['#FF9FB8', '#FFF3D6', '#FFB27A', '#D6C8F8'];

export const flowerLei = make(
  (ctx) => {
    const { hw, pt } = neckLine(ctx);
    const n = Math.max(6, Math.round(hw / 5));
    return (
      <g>
        {Array.from({ length: n }, (_, i) => {
          const [x, y] = pt(0.05 + (0.9 * i) / (n - 1), 7);
          return (
            <g key={i} transform={`translate(${x} ${y + 1.4}) rotate(${i * 29})`}>
              <Blossom r={6.2} color={LEI_COLORS[i % LEI_COLORS.length]} center={i % 2 ? '#FFB27A' : '#FFE08A'} />
            </g>
          );
        })}
      </g>
    );
  },
  { color: '#9CCB86', width: 1.8 },
  1.12,
);

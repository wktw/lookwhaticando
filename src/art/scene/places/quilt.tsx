/**
 * The Quilt (DESIGN §8.4): a folded patchwork quilt at the end of the bed, with a small arched window
 * for stargazing and the bedside lamp. The night nap pile happens here.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { skyFor } from '../sill/scenery';
import { CRESCENT } from '../paths';
import { TableLamp } from '../props/TableLamp';
import { painter, Solid } from './kit';
import { patches, QUILT, QUILT_W } from './shapes';
import type { PlaceDrawProps, PlaceScene } from './types';

const ROWS: RoomRows = { glassBottom: 60, sillBack: QUILT.duvet.top, sillFront: QUILT.duvet.edge, nosing: 100 };

const C = {
  duvet: '#F7F1E7',
  fold: '#EAE0D1',
  edge: '#EFE6D8',
  stitch: '#E2D6C5',
  table: '#D9C09C',
} as const;

const f = (n: number) => +n.toFixed(2);

/** An arch-topped window: the sky inside, a painted frame around. */
function archPath(cx: number, top: number, w: number, bottom: number): string {
  const r = w / 2;
  return `M${f(cx - r)} ${f(bottom)}V${f(top + r)}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(top + r)}V${f(bottom)}Z`;
}

function Back({ room, view, light, uid }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const q = QUILT;
  const win = q.window;
  const sky = skyFor(win.cx - win.w / 2, win.cx + win.w / 2, win.bottom, 21);
  const m = sky.moon;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-qsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={view.sky[0]} />
          <stop offset="1" stop-color={view.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={QUILT_W} height={q.duvet.top} fill={room.wall} />
      {/* a small arched window over the bed, for the stars */}
      <path d={archPath(win.cx, win.top - 2.4, win.w + 4.8, win.bottom + 2.4)} fill={room.frame} />
      <path d={archPath(win.cx, win.top, win.w, win.bottom)} fill={`url(#${uid}-qsky)`} />
      {view.star && <path d={sky.stars} fill={view.star} opacity={0.9} />}
      {view.moon && <path d={CRESCENT} fill={view.moon} transform={`translate(${f(win.cx + 6 - 50 * (m.r / 26))} ${f(win.top + 12 - 50 * (m.r / 26))}) scale(${f(m.r / 26)})`} />}
      {view.cloud && <path d={`M${win.cx - 12} 30h14a2 2 0 0 1 0 4h-14a2 2 0 0 1 0-4ZM${win.cx - 8} 27.4h7a2 2 0 0 1 0 4h-7a2 2 0 0 1 0-4Z`} fill={view.cloud} opacity={0.85} />}
      <rect x={win.cx - 0.9} y={win.top} width={1.8} height={win.bottom - win.top} fill={room.frame} />
      <rect x={win.cx - win.w / 2} y={(win.top + win.bottom) / 2 + 3} width={win.w} height={1.8} fill={room.frame} />
      <rect x={win.cx - win.w / 2 - 3.4} y={win.bottom + 2} width={win.w + 6.8} height={2.2} rx={0.6} fill={room.frame} />
      {/* an embroidery hoop on the wall: linen, and one stitched flower */}
      <circle cx={96} cy={22} r={8.6} fill={p.c('#D9BE9A')} />
      <circle cx={96} cy={22} r={7.4} fill={p.c('#F6EFE3')} />
      <rect x={95.2} y={11.6} width={1.6} height={2.6} rx={0.5} fill={p.c('#C9A052')} />
      <path d="M96 27.4C96 25 95.6 23.4 96 21.6M96 25.4C94.4 24.4 93.4 24.8 92.8 25.6M96 24.6C97.4 23.8 98.4 24 99 24.8" fill="none" stroke={p.c('#9CBF8A')} stroke-width={0.5} stroke-linecap="round" />
      <path d={[0, 1, 2, 3, 4].map((k) => { const a = (k * 72 * Math.PI) / 180; return `M${(96 + Math.sin(a) * 1.5).toFixed(2)} ${(20 - Math.cos(a) * 1.5).toFixed(2)}m-1.1 0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0Z`; }).join('')} fill={p.c('#EFB4C1')} />
      <circle cx={96} cy={20} r={0.8} fill={p.c('#F2D98A')} />
      {/* the bedside table and lamp */}
      <path d={q.table} fill={p.c(C.table)} />
      <rect x={143} y={61} width={2} height={39} fill={p.c(C.table)} />
      <rect x={158} y={61} width={2} height={39} fill={p.c(C.table)} />
      <svg x={138} y={27} width={30} height={32} viewBox="0 0 100 100" overflow="visible">
        <TableLamp light={light} on={room.night} />
      </svg>
      {/* the bed: the duvet's top, a few soft folds, and its edge falling toward us */}
      <rect y={q.duvet.top} width={140} height={q.duvet.edge - q.duvet.top} fill={p.c(C.duvet)} />
      <path d="M8 70C22 68.6 34 69.4 44 71M16 78C30 76.6 44 77.4 54 79.4M100 81.6C112 80.6 124 81 136 82.4" fill="none" stroke={p.c(C.fold)} stroke-width={0.8} stroke-linecap="round" />
      <rect y={q.duvet.edge} width={140} height={100 - q.duvet.edge} fill={p.c(C.edge)} />
      <path d={`M0 ${q.duvet.edge + 5}H140M0 ${q.duvet.edge + 11}H140`} stroke={p.c(C.stitch)} stroke-width={0.4} stroke-dasharray="1.6 1.2" />
      <rect x={140} y={q.duvet.top} width={1.4} height={100 - q.duvet.top} fill="var(--shade)" />
      <rect y={q.duvet.edge} width={140} height={1} fill="var(--shade)" />
    </g>
  );
}

/** The folded quilt: three layers, each a row of patches, drawn in front of the duvet. */
function Quilt({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  return (
    <g>
      <path d="M64 80.6C80 82.2 120 82.2 136 80.6" fill="none" stroke="var(--contact)" stroke-width={2.2} stroke-linecap="round" />
      {QUILT.layers.map((d, i) => {
        const layer = i as 0 | 1 | 2;
        const top = [72.6, 66.4, 60.8][layer]!;
        const h = [7.4, 6.8, 6.2][layer]!;
        const row = patches(layer);
        const x0 = [64, 66, 68][layer]!;
        const x1 = x0 + [72, 69, 65][layer]!;
        return (
          <g key={i}>
            <path d={d} fill={p.c('#FBF6EE')} />
            {row.map((q, k) => {
              const a = Math.max(q.x, x0 + 2.2);
              const b = Math.min(q.x + q.w, x1 - 2.2);
              return b > a ? <rect key={k} x={a} y={top + 0.8} width={b - a - 0.4} height={h - 1.6} fill={p.c(q.color)} /> : null;
            })}
            <path d={p.shade(`quilt.layer${layer}`)} fill="var(--shade)" />
          </g>
        );
      })}
    </g>
  );
}

function ground(room: RoomPalette, petSize: number): Ground {
  const perches: Perch[] = [{ id: 'quilt:top', kind: 'bed', x: 100, y: 61.2, depth: 0.3, z: depthZ(0.3) + 2, w: 60 }];
  return { rows: ROWS, x0: 8, x1: 132, d0: 0.25, d1: 1, surface: room.wall, beam: null, perches, obstacles: [{ x0: 62, x1: 138 }], petSize };
}

export const QUILT_PLACE: PlaceScene = {
  id: 'quilt',
  width: QUILT_W,
  back: (props) => (
    <g>
      <Back {...props} />
      <Quilt {...props} />
    </g>
  ),
  ground,
  lampAt: [153, 38],
  crop: [10, 0, 150, 100],
};

/**
 * The Quilt (DESIGN §8.4): a made bed seen from its side, the headboard and pillow at the far end and
 * a patchwork quilt folded in three soft layers at its foot, against the footboard. A small arched
 * window for stargazing and the bedside lamp. The night nap pile happens on the quilt, in the lamp's pool.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { skyFor } from '../sill/scenery';
import { CRESCENT } from '../paths';
import { TableLamp } from '../props/TableLamp';
import { oval, painter, Solid } from './kit';
import { patches, QUILT, QUILT_W } from './shapes';
import type { PlaceDrawProps, PlaceScene } from './types';

const ROWS: RoomRows = { glassBottom: 60, sillBack: QUILT.duvet.top, sillFront: QUILT.duvet.edge, nosing: 100 };

const C = {
  sheet: '#FBF6EE',
  hem: '#F2EADF',
  mattress: '#E8DCCB',
  ticking: '#DDCDB8',
  wood: '#D9B894',
  woodDeep: '#C9A57F',
  pillow: '#FFFDF9',
  pillowBand: '#F5CDD6',
  table: '#D9C09C',
  stitch: '#FFFDF9',
  knot: '#C97F8E',
} as const;

const f = (n: number) => +n.toFixed(2);

/** An arch-topped window: the sky inside, a painted frame around. */
function archPath(cx: number, top: number, w: number, bottom: number): string {
  const r = w / 2;
  return `M${f(cx - r)} ${f(bottom)}V${f(top + r)}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(top + r)}V${f(bottom)}Z`;
}

/** The sheet's hem hanging over the mattress: a straight top, a softly scalloped edge. */
const HEM = (() => {
  const { x0, x1 } = QUILT.bed;
  const top = QUILT.duvet.edge;
  const low = QUILT.duvet.hem;
  let d = `M${x0} ${top}H${x1}V${low - 0.6}`;
  for (let x = x1; x > x0 + 0.1; x -= 8) {
    const nx = Math.max(x0, x - 8);
    d += `Q${f((x + nx) / 2)} ${f(low + 1)} ${f(nx)} ${f(low - 0.6)}`;
  }
  return `${d}Z`;
})();

function Room({ room, view, light, uid }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const win = QUILT.window;
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
      <rect width={QUILT_W} height={100} fill={room.wall} />
      <rect y={95} width={QUILT_W} height={5} fill={room.floor} />
      {/* a small arched window over the bed, for the stars */}
      <path d={archPath(win.cx, win.top - 2.4, win.w + 4.8, win.bottom + 2.4)} fill={room.frame} />
      <path d={archPath(win.cx, win.top, win.w, win.bottom)} fill={`url(#${uid}-qsky)`} />
      {view.star && <path d={sky.stars} fill={view.star} opacity={0.9} />}
      {view.moon && <path d={CRESCENT} fill={view.moon} transform={`translate(${f(win.cx + 6 - 50 * (m.r / 26))} ${f(win.top + 12 - 50 * (m.r / 26))}) scale(${f(m.r / 26)})`} />}
      {view.cloud && <path d={`M${win.cx - 12} 28h14a2 2 0 0 1 0 4h-14a2 2 0 0 1 0-4ZM${win.cx - 8} 25.4h7a2 2 0 0 1 0 4h-7a2 2 0 0 1 0-4Z`} fill={view.cloud} opacity={0.85} />}
      <rect x={win.cx - 0.9} y={win.top} width={1.8} height={win.bottom - win.top} fill={room.frame} />
      <rect x={win.cx - win.w / 2} y={(win.top + win.bottom) / 2 + 3} width={win.w} height={1.8} fill={room.frame} />
      <rect x={win.cx - win.w / 2 - 3.4} y={win.bottom + 2} width={win.w + 6.8} height={2.2} rx={0.6} fill={room.frame} />
      {/* an embroidery hoop on the wall: linen, and one stitched flower */}
      <circle cx={100} cy={22} r={8.6} fill={p.c('#D9BE9A')} />
      <circle cx={100} cy={22} r={7.4} fill={p.c('#F6EFE3')} />
      <rect x={99.2} y={11.6} width={1.6} height={2.6} rx={0.5} fill={p.c('#C9A052')} />
      <path d="M100 27.4C100 25 99.6 23.4 100 21.6M100 25.4C98.4 24.4 97.4 24.8 96.8 25.6M100 24.6C101.4 23.8 102.4 24 103 24.8" fill="none" stroke={p.c('#9CBF8A')} stroke-width={0.5} stroke-linecap="round" />
      <path d={[0, 1, 2, 3, 4].map((k) => { const a = (k * 72 * Math.PI) / 180; return `M${(100 + Math.sin(a) * 1.5).toFixed(2)} ${(20 - Math.cos(a) * 1.5).toFixed(2)}m-1.1 0a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0Z`; }).join('')} fill={p.c('#EFB4C1')} />
      <circle cx={100} cy={20} r={0.8} fill={p.c('#F2D98A')} />
      {/* the bedside table and lamp */}
      <path d={QUILT.table} fill={p.c(C.table)} />
      <rect x={146.5} y={61} width={1.8} height={34} fill={p.c(C.table)} />
      <rect x={156.5} y={61} width={1.8} height={34} fill={p.c(C.table)} />
      <path d={oval(152.5, 95.2, 9, 0.9)} fill="var(--contact)" />
      <svg x={138.5} y={27} width={28} height={32} viewBox="0 0 100 100" overflow="visible">
        <TableLamp light={light} on={room.night} />
      </svg>
    </g>
  );
}

/** The bed: headboard, the sheet over the mattress with its hem, the pillow, the frame and the footboard. */
function Bed({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const { x0, x1 } = QUILT.bed;
  return (
    <g>
      <path d={oval(72, 96.4, 70, 1.4)} fill="var(--contact)" />
      <Solid d={QUILT.headboard} fill={p.c(C.wood)} crescent={p.shade('quilt.headboard')} />
      {/* the made bed's top */}
      <rect x={x0} y={QUILT.duvet.top} width={x1 - x0} height={QUILT.duvet.edge - QUILT.duvet.top} fill={p.c(C.sheet)} />
      <Solid d={QUILT.mattress} fill={p.c(C.mattress)} crescent={p.shade('quilt.mattress')} />
      {/* the mattress's piping, just under the hem */}
      <rect x={9} y={89.2} width={126} height={0.8} rx={0.4} fill={p.c(C.ticking)} />
      <path d={HEM} fill={p.c(C.hem)} />
      <path d={QUILT.rail} fill={p.c(C.woodDeep)} />
      <rect x={10} y={94} width={2.4} height={5} rx={0.6} fill={p.c(C.woodDeep)} />
      <rect x={129} y={94} width={2.4} height={5} rx={0.6} fill={p.c(C.woodDeep)} />
      {/* the pillow at the far end, in a strawberry-milk case */}
      <path d={oval(27, 63.4, 15, 1.2)} fill="var(--contact)" />
      <Solid d={QUILT.pillow} fill={p.c(C.pillow)} crescent={p.shade('quilt.pillow')} />
      <path d="M34.6 51.2h2.2v11.6h-2.2Z" fill={p.c(C.pillowBand)} />
      <Solid d={QUILT.footboard} fill={p.c(C.wood)} crescent={p.shade('quilt.footboard')} />
      <path d={QUILT.knob} fill={p.c(C.woodDeep)} />
    </g>
  );
}

/** The folded quilt: three soft layers, each a round fold end in its backing and a run of patchwork. */
function Quilt({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  return (
    <g>
      <path d={oval(100, QUILT.duvet.edge - 0.2, 38, 1.3)} fill="var(--contact)" />
      {QUILT.layers.map((l, i) => {
        const layer = i as 0 | 1 | 2;
        const face = l.h - 1.4;
        const row = patches(layer);
        const mid = l.y + face / 2;
        const seams = row.slice(1).filter((_, k) => k % 2 === 0);
        return (
          <g key={i}>
            <path d={QUILT.slabs[layer]} fill={p.c(l.back)} />
            {row.map((q, k) => (
              <rect key={k} x={f(q.x)} y={l.y} width={f(q.w)} height={f(face)} fill={p.c(q.color)} />
            ))}
            {/* the quilting stitch along the layer, and tie knots at every other seam */}
            <path d={`M${f(l.x0 + l.h / 2 + 1)} ${f(mid)}H${f(l.x1 - 2)}`} stroke={p.c(C.stitch)} stroke-width={0.32} stroke-dasharray="0.9 0.8" opacity={0.8} />
            <path d={seams.map((q) => oval(q.x, mid, 0.42, 0.42)).join('')} fill={p.c(C.knot)} />
            {/* the fold's underside, turned away from the light */}
            <rect x={f(l.x0 + l.h / 2)} y={f(l.y + face)} width={f(l.x1 - 1.2 - l.x0 - l.h / 2)} height={1.4} fill="var(--shade)" />
            <path d={p.shade(`quilt.layer${layer}`)} fill="var(--shade)" />
          </g>
        );
      })}
    </g>
  );
}

function ground(room: RoomPalette, petSize: number): Ground {
  const top = QUILT.layers[2]!;
  const perches: Perch[] = [{ id: 'quilt:top', kind: 'bed', x: 104, y: top.y + 0.4, depth: 0.3, z: depthZ(0.3) + 2, w: 54 }];
  return { rows: ROWS, x0: 12, x1: 132, d0: 0.25, d1: 1, surface: room.wall, beam: null, perches, obstacles: [{ x0: 62, x1: 138 }], petSize };
}

export const QUILT_PLACE: PlaceScene = {
  id: 'quilt',
  width: QUILT_W,
  back: (props) => (
    <g>
      <Room {...props} />
      <Bed {...props} />
      <Quilt {...props} />
    </g>
  ),
  ground,
  lampAt: [152.5, 40],
  // The bedside lamp lights the quilt: the nap pile is the brightest thing in the room.
  pool: { x: 98, y: 66, r: 76 },
  crop: [6, 0, 150, 100],
};

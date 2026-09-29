/**
 * Saucer Pond (DESIGN §8.4): a terracotta saucer of water on the floorboards by the window, with a
 * pebble island and one lily pad. Frogs and ducks love it. The saucer's front lip is drawn over whoever
 * is in the water, so a floating duck sits in it rather than on it.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { painter, Solid, oval } from './kit';
import { WindowView } from '../sill/Backdrop';
import { POND, POND_W } from './shapes';
import { bowl } from '../crescent/build';
import type { PlaceDrawProps, PlaceScene } from './types';

const ROWS: RoomRows = { glassBottom: 53, sillBack: 64, sillFront: 99, nosing: 100 };

const C = {
  curtain: '#F4ECE1',
  fold: '#E9DDCD',
  rim: '#E5AC91',
  rimInner: '#C98A6E',
  side: '#D99A7E',
  water: '#BAD6E9',
  waterDeep: '#A9CAE0',
  ripple: '#F4FAFD',
  stone: ['#D9D1C5', '#CEC5B9', '#E4DDD3'],
  pad: '#A9C995',
  padVein: '#8DB27B',
} as const;

const NIGHT_WATER = '#465575';

/** How the saucer's front edge sits in depth: pets nearer than this stand in front of it. */
const FRONT_DEPTH = 0.74;

const { cx, cy, rim, water } = POND;
const lip = `M${cx - rim.rx} ${cy}A${rim.rx} ${rim.ry} 0 0 0 ${cx + rim.rx} ${cy}L${cx + water.rx} ${cy + 0.3}A${water.rx} ${water.ry} 0 0 1 ${cx - water.rx} ${cy + 0.3}Z`;

function Back({ room, view, light, moment, uid }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const night = room.night;
  const sun = moment.light.sun;
  const lean = (0.5 - sun) * 2 * 0.8 * 36;
  const floorTop = POND.skirting.bottom;
  const door = POND.door;
  return (
    <g>
      <rect width={POND_W} height={floorTop} fill={room.wall} />
      {/* the glazed door: two leaves meeting in the middle, three panes high */}
      <defs>
        <linearGradient id={`${uid}-psky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={view.sky[0]} />
          <stop offset="1" stop-color={view.sky[1]} />
        </linearGradient>
      </defs>
      <WindowView x0={door.x0} x1={door.x1} bottom={door.bottom} view={view} fill={`url(#${uid}-psky)`} seed={11} />
      <g fill={room.frame}>
        <rect x={door.x0 - 3.2} width={3.2} height={POND.skirting.top} />
        <rect x={door.x1} width={3.2} height={POND.skirting.top} />
        <rect x={(door.x0 + door.x1) / 2 - 2} width={4} height={door.bottom} />
        <rect x={door.x0} y={17} width={door.x1 - door.x0} height={2.2} />
        <rect x={door.x0} y={35} width={door.x1 - door.x0} height={2.2} />
        <rect x={door.x0 - 3.2} y={door.bottom} width={door.x1 - door.x0 + 6.4} height={POND.skirting.top - door.bottom} />
      </g>
      <g fill={room.frameShade}>
        <rect x={(door.x0 + door.x1) / 2 + 1.3} width={0.7} height={door.bottom} />
        <rect x={door.x0} y={18.6} width={door.x1 - door.x0} height={0.6} />
        <rect x={door.x0} y={36.6} width={door.x1 - door.x0} height={0.6} />
        <rect x={door.x1 + 2.5} width={0.7} height={POND.skirting.top} />
      </g>
      {/* skirting board */}
      <rect y={POND.skirting.top} width={POND_W} height={POND.skirting.bottom - POND.skirting.top} fill={room.frame} />
      <rect y={POND.skirting.top} width={POND_W} height={0.8} fill={room.frameShade} />
      <rect y={POND.skirting.bottom - 1} width={POND_W} height={1} fill={room.frameShade} />
      {/* floorboards, narrowing into the distance */}
      <rect y={floorTop} width={POND_W} height={100 - floorTop} fill={room.floor} />
      <path
        d="M0 68.6H150V69.2H0ZM0 74.8H150V75.5H0ZM0 82.8H150V83.6H0ZM0 93H150V94H0ZM34 64V68.6H34.6V64ZM112 64V68.6H112.6V64ZM12 69.2V74.8H12.7V69.2ZM78 69.2V74.8H78.7V69.2ZM136 69.2V74.8H136.7V69.2ZM52 75.5V82.8H52.8V75.5ZM124 75.5V82.8H124.8V75.5ZM26 83.6V93H27V83.6ZM98 83.6V93H99V83.6Z"
        fill={room.floorSeam}
      />
      {/* the window's light on the floor, beside the curtain */}
      {room.beam && <path d={`M${door.x0 + 6} ${floorTop}L${door.x0 + 50} ${floorTop}L${door.x0 + 50 + lean} 100L${door.x0 + 6 + lean} 100Z`} fill={room.beam.color} opacity={room.beam.opacity * 0.8} />}
      {/* a long linen curtain, pooling a little on the floor */}
      <path d="M0 0H17V60Q17.6 66.4 12 66.8H0Z" fill={p.c(C.curtain)} />
      <path d="M4.6 0H6.4V65H4.6ZM10.8 0H12.2V63.6H10.8Z" fill={p.c(C.fold)} />
      {/* the saucer: its shadow, rim, the inside wall at the back, and the water */}
      <path d={oval(cx + (night ? -3 : 3), cy + 11, rim.rx + 2, 3.2)} fill="var(--contact)" />
      <path d={oval(cx, cy, rim.rx, rim.ry)} fill={p.c(C.rim)} />
      <path d={oval(cx, cy - 0.5, water.rx + 0.6, water.ry + 0.3)} fill={p.c(C.rimInner)} />
      <path d={oval(cx, cy + 0.3, water.rx, water.ry)} fill={night ? NIGHT_WATER : p.c(C.water)} />
      {/* the pebble island */}
      <Solid d={POND.pebbles[0]} fill={p.c(C.stone[0])} crescent={p.shade('pond.pebble0')} />
      <Solid d={POND.pebbles[2]} fill={p.c(C.stone[2])} crescent={p.shade('pond.pebble2')} />
      <Solid d={POND.pebbles[1]} fill={p.c(C.stone[1])} crescent={p.shade('pond.pebble1')} />
    </g>
  );
}

function Front({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const night = room.night;
  const wet = night ? NIGHT_WATER : p.c(C.water);
  const pad = POND.pad;
  return (
    <g>
      <Solid d={POND.side} fill={p.c(C.side)} crescent={p.shade('pond.saucer')} />
      {/* the near half of the water, over whoever is swimming: a duck sits in it, not on it */}
      <path d={bowl(cx, cy + 0.3, water.rx, water.ry)} fill={wet} />
      <path d={bowl(cx - 6, cy + 0.3, water.rx - 12, water.ry - 1.8)} fill={night ? '#3E4B68' : p.c(C.waterDeep)} opacity={0.75} />
      {night ? (
        <path d={oval(cx + 22, cy + 2.2, 3.2, 0.9)} fill="#F6E7B6" opacity={0.55} />
      ) : (
        <path d={`M${cx + 14} ${cy + 3.4}q5 -1.2 10 0M${cx - 30} ${cy + 2.2}q4 -1 8 0M${cx - 8} ${cy + 5.2}q3 -0.7 6 0`} fill="none" stroke={p.c(C.ripple)} stroke-width={0.5} stroke-linecap="round" opacity={0.85} />
      )}
      {/* the lily pad, with its notch, flat on the water */}
      <path d={oval(pad.cx, pad.cy, pad.rx, pad.ry)} fill={p.c(C.pad)} />
      <path d={`M${pad.cx} ${pad.cy}L${pad.cx + 9.6} ${pad.cy - 1}L${pad.cx + 9.2} ${pad.cy + 0.9}Z`} fill={wet} />
      <path d={`M${pad.cx - 7} ${pad.cy + 0.3}L${pad.cx} ${pad.cy}M${pad.cx - 4} ${pad.cy - 1.6}L${pad.cx} ${pad.cy}M${pad.cx - 3.6} ${pad.cy + 1.8}L${pad.cx} ${pad.cy}`} stroke={p.c(C.padVein)} stroke-width={0.35} fill="none" />
      <path d={lip} fill={p.c(C.rim)} />
    </g>
  );
}

function ground(room: RoomPalette, petSize: number): Ground {
  const frontZ = depthZ(FRONT_DEPTH);
  const water = (id: string, x: number, y: number, likes: Perch['likes'], pose: Perch['pose']): Perch => ({ id, kind: 'water', x, y, depth: 0.5, z: frontZ - 10, w: petSize * 0.6, likes, pose });
  const perches: Perch[] = [
    // The lily pad first: the first frog out sits on it, a second takes the pebble island.
    { id: 'pond:pad', kind: 'shelf', x: 103, y: 80.8, depth: 0.5, z: frontZ + 6, w: 12, likes: ['frog'] },
    { id: 'pond:island', kind: 'shelf', x: 66, y: 74.4, depth: 0.4, z: frontZ - 20, w: 10, likes: ['frog', 'hamster'] },
    water('pond:water-a', 90, 84.4, ['duck'], 'loaf'),
    water('pond:water-b', 118, 83.4, ['duck'], 'loaf'),
    water('pond:water-c', 50, 83.6, ['duck', 'frog'], 'loaf'),
  ];
  return { rows: ROWS, x0: 20, x1: POND_W - 3, d0: 0.92, d1: 1, surface: room.floor, beam: null, perches, obstacles: [], petSize };
}

export const POND_PLACE: PlaceScene = {
  id: 'pond',
  width: POND_W,
  back: Back,
  front: Front,
  frontZ: depthZ(FRONT_DEPTH),
  ground,
  crop: [18, 22, 117, 78],
};

/**
 * Balcony Box (DESIGN §8.4): out through the glass door, a window box of seasonal flowers hung on
 * the railing, the street and the weather beyond, and a slatted stand where retired plants live. Room to
 * roam on the tiles; at night a jam-jar lantern on the stand.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { JAR_COLORS } from '../palette';
import { seeded } from '../sill/scenery';
import { WindowView } from '../sill/Backdrop';
import { Plant } from '../actors/adapters';
import { fallenLeaf, plantingFor, PLANTING_PAINT } from './windowbox';
import { painter, Solid, disc, oval } from './kit';
import { BALCONY, BALCONY_W } from './shapes';
import type { PlaceDrawProps, PlaceScene } from './types';

const ROWS: RoomRows = { glassBottom: 60, sillBack: 64, sillFront: 96, nosing: 100 };

const C = {
  tile: '#E4BBA0',
  grout: '#D3A688',
  rail: '#F3EEE6',
  railShade: '#E2DACD',
  box: '#D4B08A',
  boxLip: '#C49C75',
  soil: '#8E6E57',
  stand: '#D9C09C',
  leaf: '#9CBF8A',
  leafDeep: '#7FA571',
} as const;

const f = (n: number) => +n.toFixed(2);
const VP = { x: BALCONY_W / 2, y: 18 };

/** Terracotta tiles: courses across, joints running toward the far railing. */
const TILES = (() => {
  const courses = [69.6, 76.4, 85, 96].map((y) => `M0 ${y}H${BALCONY_W}V${y + 0.6}H0Z`).join('');
  const joints: string[] = [];
  for (let x = -60; x <= BALCONY_W + 60; x += 17) {
    const top = VP.x + ((x - VP.x) * (64 - VP.y)) / (100 - VP.y);
    joints.push(`M${f(top - 0.2)} 64L${f(top + 0.2)} 64L${f(x + 0.4)} 100L${f(x - 0.4)} 100Z`);
  }
  return courses + joints.join('');
})();

function Back({ room, view, light, moment, uid, retired = [] }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const night = room.night;
  const b = BALCONY;
  const season = moment.season;
  const plant = plantingFor(season, 37, 107, b.soil);
  const paint = PLANTING_PAINT[season];
  const snow = season === 'winter';
  const lanternOn = night;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={view.sky[0]} />
          <stop offset="1" stop-color={view.sky[1]} />
        </linearGradient>
      </defs>
      {/* the street beyond the railing: the same terrace and trees the Sill's window looks onto */}
      <WindowView x0={0} x1={BALCONY_W} bottom={64} view={view} fill={`url(#${uid}-bsky)`} seed={13} />
      {snow && !night && <path d={seededFlakes()} fill="#FFFFFF" opacity={0.85} />}
      {/* the tiled floor */}
      <rect y={64} width={BALCONY_W} height={36} fill={p.c(C.tile)} />
      <path d={TILES} fill={p.c(C.grout)} />
      {season === 'autumn' && (
        <g>
          <path d={LEAVES.map((l) => l[0]).join('')} fill={p.c('#DDA05C')} />
          <path d={LEAVES.map((l) => l[1]).join('')} fill="none" stroke={p.c('#B97F45')} stroke-width={0.3} stroke-linecap="round" />
        </g>
      )}
      {/* the railing along the far edge */}
      <path d={railings()} fill={p.c(C.rail)} />
      <rect x={b.door} y={b.rail.top} width={BALCONY_W - b.door} height={b.rail.h} fill={p.c(C.rail)} />
      <rect x={b.door} y={b.rail.top + b.rail.h - 0.7} width={BALCONY_W - b.door} height={0.7} fill={p.c(C.railShade)} />
      <rect x={b.door} y={b.rail.bottom - 1.6} width={BALCONY_W - b.door} height={1.6} fill={p.c(C.rail)} />
      {snow && <rect x={b.door} y={b.rail.top - 0.9} width={BALCONY_W - b.door} height={1.1} rx={0.5} fill="#FFFFFF" />}
      {/* the window box hangs on the top rail by two iron brackets, and shades the balusters under it */}
      <path d={BOX_SHADOW} fill="var(--contact)" />
      <path d={b.hooks.map((x) => hook(x, b.rail.top, 43)).join('')} fill={p.c('#7E7A86')} />
      {plant.stems && <path d={plant.stems} fill="none" stroke={p.c(paint.stem)} stroke-width={0.45} stroke-linecap="round" />}
      <path d={plant.leavesDeep} fill={p.c(paint.leafDeep)} />
      <path d={plant.leaves} fill={p.c(paint.leaf)} />
      {plant.marks && <path d={plant.marks} fill={p.c(paint.leafDeep)} fill-rule="evenodd" />}
      <path d={plant.flowers} fill={p.c(paint.flower)} />
      {plant.accents && <path d={plant.accents} fill={p.c(paint.accent)} />}
      {plant.snow && <path d={plant.snow} fill="#FFFFFF" opacity={0.95} />}
      <Solid d={b.box} fill={p.c(C.box)} crescent={p.shade('balcony.box')} />
      <path d={b.boxLip} fill={p.c(C.boxLip)} />
      {snow && <rect x={33} y={40.2} width={78} height={1.2} rx={0.6} fill="#FFFFFF" />}
      {/* the slatted stand where retired plants live */}
      <path d={`M${b.stand.x0 + 1} 40h1.6v${b.stand.foot - 40}h-1.6ZM${b.stand.x1 - 2.6} 40h1.6v${b.stand.foot - 40}h-1.6Z`} fill={p.c(C.stand)} />
      <path d={oval((b.stand.x0 + b.stand.x1) / 2, b.stand.foot, 19, 1.3)} fill="var(--contact)" />
      {b.standShelves.map((d, i) => (
        <path key={i} d={d} fill={p.c(C.stand)} />
      ))}
      <path d={p.shade('balcony.shelves')} fill="var(--shade)" />
      {retired.slice(0, 3).map((pot, i) => {
        const [x, y] = i === 0 ? [137, b.stand.shelves[0]] : i === 1 ? [152, b.stand.shelves[0]] : [137, b.stand.shelves[1]];
        const size = 20;
        return (
          <svg key={pot.habitId} x={x - size / 2} y={y - size * 0.95} width={size} height={size} viewBox="0 0 100 100" overflow="visible">
            <Plant species={pot.species} stage={pot.stage} pot={pot.pot} blooms={pot.blooms} size="100%" light={light} />
          </svg>
        );
      })}
      {/* a jam-jar lantern on the lower shelf */}
      <path d={b.lantern.body} transform={`translate(0 ${b.stand.shelves[1] - 44})`} fill={lanternOn ? '#FFE3A8' : p.c(JAR_COLORS.glass)} opacity={lanternOn ? 1 : 0.75} />
      <path d={b.lantern.cap} transform={`translate(0 ${b.stand.shelves[1] - 44})`} fill={p.c('#C9A052')} />
      {!lanternOn && <path d={p.shade('balcony.lantern')} transform={`translate(0 ${b.stand.shelves[1] - 44})`} fill="var(--shade)" />}
      {lanternOn && <circle cx={b.lantern.cx} cy={b.stand.shelves[1] - 5} r={1.6} fill="#FFF4D6" />}
      {/* the glass door we came out of */}
      <rect width={b.door} height={100} fill={room.frame} />
      <rect x={b.door - 1} width={1} height={100} fill={room.frameShade} />
    </g>
  );
}

/** An iron bracket: a strap up from the box's back, hooked over the top rail. */
function hook(x: number, rail: number, lip: number): string {
  return `M${x} ${lip}V${rail - 0.2}Q${x} ${rail - 1.6} ${x + 1.3} ${rail - 1.6}Q${x + 2.6} ${rail - 1.6} ${x + 2.6} ${rail - 0.2}V${rail + 1.4}H${x + 1.8}V${rail - 0.1}Q${x + 1.8} ${rail - 0.8} ${x + 1.3} ${rail - 0.8}Q${x + 0.8} ${rail - 0.8} ${x + 0.8} ${rail - 0.1}V${lip}Z`;
}

/** The box's shadow on the balusters just under it. */
const BOX_SHADOW = (() => {
  const out: string[] = [];
  for (let x = BALCONY.door + 3; x < BALCONY_W; x += 5.4) if (x > 35 && x < 108) out.push(`M${f(x)} 53h1.1v3.2h-1.1Z`);
  return out.join('');
})();

/** Three fallen leaves on the tiles (autumn). */
const LEAVES = [fallenLeaf(38, 88, 20, 5), fallenLeaf(116, 78.6, 160, 4.4), fallenLeaf(64, 94.4, -30, 5.2), fallenLeaf(92, 84, 200, 4)];

function railings(): string {
  const out: string[] = [];
  for (let x = BALCONY.door + 3; x < BALCONY_W; x += 5.4) out.push(`M${f(x)} ${BALCONY.rail.top}h1.1V${BALCONY.rail.bottom}h-1.1Z`);
  return out.join('');
}

function seededFlakes(): string {
  const r = seeded(99);
  const out: string[] = [];
  for (let i = 0; i < 16; i++) out.push(disc(8 + r() * (BALCONY_W - 12), 4 + r() * 56, 0.35 + r() * 0.35));
  return out.join('');
}

function ground(room: RoomPalette, petSize: number): Ground {
  const perches: Perch[] = [{ id: 'balcony:box', kind: 'shelf', x: 70, y: 41.2, depth: 0.05, z: depthZ(0) - 6, w: 60, likes: ['cat', 'bunny'] }];
  return { rows: ROWS, x0: BALCONY.door + 8, x1: BALCONY_W - 6, d0: 0.3, d1: 1, surface: room.floor, beam: null, perches, obstacles: [{ x0: BALCONY.stand.x0, x1: BALCONY.stand.x1 }], petSize };
}

export const BALCONY_PLACE: PlaceScene = {
  id: 'balcony',
  width: BALCONY_W,
  back: Back,
  ground,
  lampAt: [BALCONY.lantern.cx, BALCONY.stand.shelves[1] - 6],
  crop: [14, 0, 150, 100],
};

/**
 * Balcony Box (DESIGN §8.4): out through the glass door, a window box of seasonal flowers on the
 * railing, the street and the weather beyond, and a slatted stand where retired plants live. Room to
 * roam on the tiles; at night a jam-jar lantern on the stand.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { JAR_COLORS } from '../palette';
import { seeded, skyFor, streetFor } from '../sill/scenery';
import { CRESCENT } from '../paths';
import { Plant } from '../actors/adapters';
import type { Season } from '../time';
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

/** The window box's planting, by season: tulips, geraniums, heather and chrysanthemums, evergreen. */
function planting(season: Season): { leaves: string; flowers: string; flower: string; centre?: string; stems?: string } {
  const r = seeded(season.length * 7);
  const leaves: string[] = [];
  const flowers: string[] = [];
  const centres: string[] = [];
  const stems: string[] = [];
  for (let x = 38; x < 107; x += 4.2 + r() * 1.6) leaves.push(oval(x, 35 - r() * 2.6, 3.2 + r(), 2.2 + r() * 0.8));
  for (let x = 41; x < 105; x += 7 + r() * 5) {
    const y = 26 + r() * 5;
    if (season === 'spring') {
      stems.push(`M${f(x)} 36Q${f(x + 0.5)} ${f(y + 5)} ${f(x)} ${f(y + 1.6)}`);
      flowers.push(`M${f(x - 2)} ${f(y - 1.6)}Q${f(x - 2.2)} ${f(y + 2)} ${f(x)} ${f(y + 2.2)}Q${f(x + 2.2)} ${f(y + 2)} ${f(x + 2)} ${f(y - 1.6)}L${f(x + 1)} ${f(y - 0.2)}L${f(x)} ${f(y - 2)}L${f(x - 1)} ${f(y - 0.2)}Z`);
    } else if (season === 'summer') {
      for (let k = 0; k < 5; k++) flowers.push(disc(x + Math.cos(k * 1.26) * 1.6, y + 3 + Math.sin(k * 1.26) * 1.3, 1.25));
    } else if (season === 'autumn') {
      if (r() < 0.5) flowers.push(`M${f(x - 0.9)} 34L${f(x - 0.5)} ${f(y - 1)}L${f(x + 0.5)} ${f(y - 1)}L${f(x + 0.9)} 34Z`);
      else {
        flowers.push(disc(x, y + 4, 2));
        centres.push(disc(x, y + 4, 0.7));
      }
    } else {
      stems.push(`M${f(x)} 36L${f(x + (r() - 0.5) * 4)} ${f(y)}`);
      flowers.push(disc(x + 1.2, y + 3, 0.7), disc(x - 0.6, y + 4.2, 0.6));
    }
  }
  const flower = season === 'spring' ? '#F2A7B6' : season === 'summer' ? '#EE9A95' : season === 'autumn' ? '#C9A3D9' : '#D9786E';
  return { leaves: leaves.join(''), flowers: flowers.join(''), flower, centre: centres.length ? centres.join('') : undefined, stems: stems.join('') || undefined };
}

function Back({ room, view, light, moment, uid, retired = [] }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const night = room.night;
  const sky = skyFor(0, BALCONY_W, 64, 5);
  const street = streetFor(-10, BALCONY_W + 10, 64, 13);
  const plant = planting(moment.season);
  const b = BALCONY;
  const snow = moment.season === 'winter';
  const lanternOn = night;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bsky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={view.sky[0]} />
          <stop offset="1" stop-color={view.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={BALCONY_W} height={64} fill={`url(#${uid}-bsky)`} />
      {view.cloud && <path d={sky.clouds} fill={view.cloud} opacity={0.85} />}
      {view.star && <path d={sky.stars} fill={view.star} opacity={0.85} />}
      {view.moon && <path d={CRESCENT} fill={view.moon} transform={`translate(${f(sky.moon.x - 50 * (sky.moon.r / 20))} ${f(sky.moon.y - 50 * (sky.moon.r / 20))}) scale(${f(sky.moon.r / 20)})`} />}
      <path d={street.houses} fill={view.house} />
      <path d={street.roofs} fill={view.roof} />
      {view.snow && <path d={street.snow} fill={view.accent ?? '#FFFFFF'} opacity={0.9} />}
      {view.litWindow && <path d={street.windows} fill={view.litWindow} opacity={0.85} />}
      <path d={street.treesDeep} fill={view.treeDeep} />
      <path d={street.trees} fill={view.tree} />
      {snow && !night && <path d={seededFlakes()} fill="#FFFFFF" opacity={0.85} />}
      {/* the tiled floor */}
      <rect y={64} width={BALCONY_W} height={36} fill={p.c(C.tile)} />
      <path d={TILES} fill={p.c(C.grout)} />
      {moment.season === 'autumn' && <path d={[oval(40, 88, 1.8, 0.8), oval(118, 79, 1.6, 0.7), oval(66, 94, 1.9, 0.8)].join('')} fill={p.c('#D9A15E')} />}
      {/* the railing along the far edge */}
      <path d={railings()} fill={p.c(C.rail)} />
      <rect x={b.door} y={b.rail.top} width={BALCONY_W - b.door} height={b.rail.h} fill={p.c(C.rail)} />
      <rect x={b.door} y={b.rail.top + b.rail.h - 0.7} width={BALCONY_W - b.door} height={0.7} fill={p.c(C.railShade)} />
      <rect x={b.door} y={b.rail.bottom - 1.6} width={BALCONY_W - b.door} height={1.6} fill={p.c(C.rail)} />
      {snow && <rect x={b.door} y={b.rail.top - 0.9} width={BALCONY_W - b.door} height={1.1} rx={0.5} fill="#FFFFFF" />}
      {/* the window box and its planting */}
      {plant.stems && <path d={plant.stems} fill="none" stroke={p.c(C.leafDeep)} stroke-width={0.5} />}
      <path d={plant.leaves} fill={p.c(moment.season === 'winter' ? '#6F9468' : C.leaf)} />
      <path d={plant.flowers} fill={p.c(plant.flower)} />
      {plant.centre && <path d={plant.centre} fill={p.c('#F2D98A')} />}
      {/* the box hangs on the top rail by two iron hooks */}
      <path d={`M44 ${b.rail.top - 0.6}h2.2v4.2h-2.2ZM98 ${b.rail.top - 0.6}h2.2v4.2h-2.2Z`} fill={p.c('#8E8A93')} />
      <Solid d={b.box} fill={p.c(C.box)} crescent={p.shade('balcony.box')} />
      <path d={b.boxLip} fill={p.c(C.boxLip)} />
      {snow && <rect x={33} y={34.2} width={78} height={1.2} rx={0.6} fill="#FFFFFF" />}
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
  const perches: Perch[] = [{ id: 'balcony:box', kind: 'shelf', x: 70, y: 36.2, depth: 0.05, z: depthZ(0) - 6, w: 60, likes: ['cat', 'bunny'] }];
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

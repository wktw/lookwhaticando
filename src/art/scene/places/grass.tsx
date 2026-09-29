/**
 * Cat-grass Tray (DESIGN §8.4): a long seed tray of oat grass on an oak bench. At this size it is a
 * pasture: cows and rabbits stand on the lawn, level with the tray's lip, the short front blades
 * brushing their feet.
 */
import type { Ground } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { seeded } from '../sill/scenery';
import { painter as basePainter, Solid, oval } from './kit';
import { toneChroma } from '../palette';
import type { Light } from '@/art/light';
import type { TimeOfDay } from '../time';
import { GRASS, GRASS_W } from './shapes';
import type { PlaceDrawProps, PlaceScene } from './types';

/** After dark the grass keeps its green, tinted toward the lamplit indigo room rather than greyed (DESIGN §10.1). */
function painter(time: TimeOfDay, light: Light) {
  const p = basePainter(time, light);
  return time === 'night' ? { ...p, c: (hex: string) => toneChroma(time, hex) } : p;
}

const ROWS: RoomRows = { glassBottom: 58, sillBack: GRASS.soil, sillFront: GRASS.lip, nosing: 83 };

const C = {
  benchTop: '#E6D2B5',
  benchFront: '#D8BF9B',
  tray: '#EADCC6',
  rim: '#DCCAAE',
  soil: '#9C7C62',
  blades: ['#A9C895', '#8FB57D', '#BCD6A6'],
  seed: '#E4D6A6',
  frame: '#D9BE9A',
  mat: '#FBF7EF',
  fern: '#A9C495',
  clump: '#9DC089',
  lawn: '#A9C792',
  lawnBack: '#9CBD86',
  rail: '#E3CDAE',
  tin: '#BCCBD2',
  tinDeep: '#A9BAC3',
  twine: '#D8BB8A',
  twineLine: '#C4A370',
} as const;

const f = (n: number) => +n.toFixed(2);

interface Blades {
  tones: [string, string, string];
  seeds: string;
  stalks: string;
}

/** A band of oat-grass blades rooted at `soil`, `tall` high, as one path per green. */
function blades(x0: number, x1: number, soil: number, tall: number, n: number, seed: number, heads = 0): Blades {
  const r = seeded(seed);
  const tones: [string[], string[], string[]] = [[], [], []];
  for (let i = 0; i < n; i++) {
    const x = x0 + (i / (n - 1)) * (x1 - x0) + (r() - 0.5) * 2;
    const h = tall * (0.6 + r() * 0.45);
    const lean = (r() - 0.5) * 7;
    const w = 0.55 + r() * 0.35;
    tones[Math.floor(r() * 3)]!.push(`M${f(x - w)} ${soil}Q${f(x + lean * 0.3)} ${f(soil - h * 0.6)} ${f(x + lean)} ${f(soil - h)}Q${f(x + lean * 0.25 + 0.3)} ${f(soil - h * 0.5)} ${f(x + w)} ${soil}Z`);
  }
  const seeds: string[] = [];
  const stalks: string[] = [];
  for (let i = 0; i < heads; i++) {
    const x = x0 + ((i + 0.5) / heads) * (x1 - x0) + (r() - 0.5) * 8;
    const h = tall * (1.1 + r() * 0.25);
    const bend = (r() - 0.5) * 6;
    const tx = x + bend;
    const ty = soil - h;
    stalks.push(`M${f(x)} ${soil}Q${f(x + bend * 0.2)} ${f(soil - h * 0.6)} ${f(tx)} ${f(ty)}`);
    for (let k = 0; k < 3; k++) seeds.push(oval(tx + (k - 1) * 0.9 + bend * 0.1, ty + k * 1.4 - 0.6, 0.55, 1.1));
  }
  return { tones: [tones[0].join(''), tones[1].join(''), tones[2].join('')], seeds: seeds.join(''), stalks: stalks.join('') };
}

const BACK = blades(18, 152, GRASS.soil + 0.5, 25, 150, 17, 9);
const FRONT = blades(16, 154, GRASS.lip + 0.6, 4.2, 120, 23);

/** The dense body of the clump behind the blades: a soft ridge, so it reads as a lawn, not sprouts. */
const CLUMP = (() => {
  const r = seeded(31);
  let d = `M17 ${GRASS.soil + 1}`;
  for (let x = 17; x <= 153; x += 6) d += `L${x} ${f(GRASS.soil - 9 - r() * 6)}`;
  return `${d}L153 ${GRASS.soil + 1}Z`;
})();

function Grass({ b, p }: { b: Blades; p: ReturnType<typeof painter> }) {
  return (
    <g>
      {b.stalks && <path d={b.stalks} fill="none" stroke={p.c(C.blades[1])} stroke-width={0.35} />}
      <path d={b.tones[1]} fill={p.c(C.blades[1])} />
      <path d={b.tones[0]} fill={p.c(C.blades[0])} />
      <path d={b.tones[2]} fill={p.c(C.blades[2])} />
      {b.seeds && <path d={b.seeds} fill={p.c(C.seed)} />}
    </g>
  );
}

function Back({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const { bench, print } = GRASS;
  const away = p.from === 'right' ? -1 : p.from === 'top' ? 0 : 1;
  return (
    <g>
      <rect width={GRASS_W} height={bench.top} fill={room.wall} />
      {/* a pressed fern in a small oak frame, casting a hard little shadow on the wall */}
      <rect x={print.x + away * 1} y={print.y + 1.2} width={print.w} height={print.h} fill="var(--shade)" />
      <rect x={print.x} y={print.y} width={print.w} height={print.h} rx={0.6} fill={p.c(C.frame)} />
      <rect x={print.x + 2.4} y={print.y + 2.4} width={print.w - 4.8} height={print.h - 4.8} fill={p.c(C.mat)} />
      <path
        d={`M${print.x + 15} ${print.y + 21}C${print.x + 14.4} ${print.y + 15} ${print.x + 15.6} ${print.y + 9} ${print.x + 15} ${print.y + 5}`}
        fill="none"
        stroke={p.c(C.fern)}
        stroke-width={0.5}
      />
      <path
        d={[0, 1, 2, 3, 4].flatMap((i) => [oval(print.x + 12.4, print.y + 7 + i * 3, 2.4 - i * 0.15, 0.9), oval(print.x + 17.6, print.y + 7.8 + i * 3, 2.4 - i * 0.15, 0.9)]).join('')}
        fill={p.c(C.fern)}
      />
      {/* a peg rail: the tin watering can and a ball of twine */}
      <rect x={GRASS.rail.x0} y={GRASS.rail.y} width={GRASS.rail.x1 - GRASS.rail.x0} height={2.4} rx={0.6} fill={p.c(C.rail)} />
      <rect x={GRASS.rail.x0} y={GRASS.rail.y + 2.4} width={GRASS.rail.x1 - GRASS.rail.x0} height={0.7} fill="var(--shade)" />
      <path d={`M33.5 ${GRASS.rail.y + 1.2}v3.2M60 ${GRASS.rail.y + 1.2}v3.2`} stroke={p.c(C.frame)} stroke-width={1.3} stroke-linecap="round" />
      <path d="M28.6 30C29.6 22.6 37.4 22.6 38.4 30" fill="none" stroke={p.c(C.tinDeep)} stroke-width={1} />
      <path d="M40 35.4L49 27.6L50 28.8L41.4 37.6Z" fill={p.c(C.tinDeep)} />
      <path d={oval(49.8, 28, 1.4, 2)} fill={p.c(C.tin)} />
      <Solid d={GRASS.can.body} fill={p.c(C.tin)} crescent={p.shade('grass.can')} />
      <path d={GRASS.can.shoulder} fill={p.c(C.tinDeep)} />
      <path d={`M60 ${GRASS.rail.y + 4}L60.4 33`} stroke={p.c(C.twineLine)} stroke-width={0.35} />
      <circle cx={60.4} cy={36.2} r={3.6} fill={p.c(C.twine)} />
      <path d="M57.4 34.6C59.4 36.4 61.8 37 63.6 36.2M57 36.8C59.2 38.6 62 38.8 63.8 37.8M58.6 33.2C60.4 34.4 62.4 34.6 63.4 34" fill="none" stroke={p.c(C.twineLine)} stroke-width={0.35} />
      {/* the oak bench */}
      <rect y={bench.top} width={GRASS_W} height={bench.front - bench.top} fill={p.c(C.benchTop)} />
      <rect y={bench.front} width={GRASS_W} height={bench.bottom - bench.front} fill={p.c(C.benchFront)} />
      <rect y={bench.bottom} width={GRASS_W} height={100 - bench.bottom} fill={room.wallLow} />
      <rect y={bench.bottom} width={GRASS_W} height={1.4} fill={room.underNosing} />
      <path d={oval(85, GRASS.bench.top + 0.8, 72, 1.4)} fill="var(--contact)" />
      {/* soil and the tall grass behind the pasture */}
      <path d={CLUMP} fill={p.c(C.clump)} />
      <Grass b={BACK} p={p} />
      {/* the mown lawn the pets stand on, level with the tray's lip, and the soil at its edge */}
      <rect x={16} y={GRASS.soil} width={138} height={GRASS.lip - GRASS.soil} fill={p.c(C.lawn)} />
      <rect x={16} y={GRASS.soil} width={138} height={2.2} fill={p.c(C.lawnBack)} />
      <rect x={16} y={GRASS.lip - 1.2} width={138} height={1.6} fill={p.c(C.soil)} />
    </g>
  );
}

function Front({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  return (
    <g>
      <Grass b={FRONT} p={p} />
      <Solid d={GRASS.tray} fill={p.c(C.tray)} crescent={p.shade('grass.tray')} />
      {/* the rolled rim throws one hard band of shade on the moulded front */}
      <rect x={16} y={GRASS.lip + 2} width={138} height={1.3} fill="var(--shade)" />
      <Solid d={GRASS.rim} fill={p.c(C.rim)} crescent={p.shade('grass.rim')} />
    </g>
  );
}

function ground(room: RoomPalette, petSize: number): Ground {
  return { rows: ROWS, x0: 22, x1: GRASS_W - 20, d0: 0, d1: 1, surface: room.wall, beam: null, perches: [], obstacles: [], petSize };
}

export const GRASS_PLACE: PlaceScene = {
  id: 'grass',
  width: GRASS_W,
  back: Back,
  front: Front,
  frontZ: depthZ(1) + 20,
  ground,
  // After dark the Sill's table lamp on the end of the bench lights the pasture (its pool is anchored to its shade).
  lamp: { x: 162.4, y: GRASS.bench.top, size: 24 },
  crop: [10, 4, 144, 96],
};

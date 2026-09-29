/**
 * Bookshelf (DESIGN §8.4): a painted bookcase with two shelves of paperbacks in the palette, a pothos
 * trailing down from the top and a small reading lamp. Height for cats: they sit on top, curl up in
 * the gap on the upper shelf, or sit in front of the books below. At night the lamp is the light.
 */
import type { Ground, Perch } from '../arrange';
import { depthZ, type RoomRows } from '../room';
import type { RoomPalette } from '../palette';
import { LAMP_COLORS } from '../palette';
import { seeded } from '../sill/scenery';
import { painter, pothosLeaf, Solid, oval } from './kit';
import { SHELF, SHELF_W } from './shapes';
import type { PlaceDrawProps, PlaceScene } from './types';

const ROWS: RoomRows = { glassBottom: 60, sillBack: SHELF.floor - 3, sillFront: SHELF.floor + 3, nosing: SHELF.plinth };

const C = {
  paint: '#EFE8DA',
  inside: '#DCD2BF',
  insideDeep: '#D3C8B3',
  edge: '#E3DACA',
  band: '#FBF7EF',
  pot: '#DDA088',
  potRim: '#D38B6D',
  stem: '#86A873',
  leaves: ['#9CBF8A', '#B6D29F'],
  shade: '#FBF1DE',
  brass: '#C9A052',
} as const;

const f = (n: number) => +n.toFixed(2);

/** The trailing pothos: vines from the pot on top, over the edge and down past the upper shelf. */
const VINES = (() => {
  const r = seeded(61);
  const stems: string[] = [];
  const leaves: [string[], string[]] = [[], []];
  const vine = (x: number, y: number, dx: number, len: number) => {
    let d = `M${f(x)} ${f(y)}`;
    let cx = x;
    let cy = y;
    for (let i = 0; i < len; i++) {
      const nx = cx + dx * (0.6 + r() * 1.2);
      const ny = cy + 4 + r() * 1.6;
      d += `Q${f(cx + dx * 2)} ${f((cy + ny) / 2)} ${f(nx)} ${f(ny)}`;
      cx = nx;
      cy = ny;
      const side = i % 2 === 0 ? 1 : -1;
      leaves[i % 2]!.push(pothosLeaf(cx, cy, side * (30 + r() * 30), 0.62 - i * 0.02));
    }
    stems.push(d);
  };
  vine(22, 14, -0.8, 9);
  vine(26, 15, 0.5, 11);
  vine(31, 15, 1.1, 6);
  // The crown in the pot.
  for (let i = 0; i < 7; i++) {
    const a = -70 + i * 23 + (r() - 0.5) * 10;
    const len = 5 + r() * 3;
    const x = 27.5 + Math.sin((a * Math.PI) / 180) * len;
    const y = 12 - Math.cos((a * Math.PI) / 180) * len * 0.8;
    stems.push(`M27.5 12.6Q${f((27.5 + x) / 2)} ${f(y + 2)} ${f(x)} ${f(y)}`);
    leaves[i % 2]!.push(pothosLeaf(x, y, 180 + a * 0.8, 0.72));
  }
  return { stems: stems.join(''), leaves: [leaves[0].join(''), leaves[1].join('')] as const };
})();

function Back({ room, light }: PlaceDrawProps) {
  const p = painter(room.time, light);
  const s = SHELF;
  const w = s.x1 - s.x0;
  const lampOn = room.night;
  return (
    <g>
      <rect width={SHELF_W} height={100} fill={room.wall} />
      {/* the case: inside first, then the boards and sides in front of it */}
      <rect x={s.x0} y={s.top} width={w} height={s.plinth - s.top} fill={p.c(C.inside)} />
      <rect x={s.x0 + s.side} y={s.top + s.topBoard} width={w - s.side * 2} height={2.4} fill={p.c(C.insideDeep)} />
      <rect x={s.x0 + s.side} y={s.mid + s.midBoard} width={w - s.side * 2} height={2.2} fill={p.c(C.insideDeep)} />
      {s.upper.map((b, i) => (
        <path key={`u${i}`} d={b.d} fill={p.c(b.color)} />
      ))}
      {s.lower.map((b, i) => (
        <path key={`l${i}`} d={b.d} fill={p.c(b.color)} />
      ))}
      <path d={[...s.upper, ...s.lower].flatMap((b) => (b.band ? [b.band] : [])).join('')} fill={p.c(C.band)} opacity={0.75} />
      <path d={p.shade('shelf.upper') + p.shade('shelf.lower')} fill="var(--shade)" />
      {s.stack.map((d, i) => (
        <Solid key={i} d={d} fill={p.c(s.stackColors[i]!)} crescent={p.shade(`shelf.stack${i}`)} />
      ))}
      <rect x={s.x0} y={s.top} width={w} height={s.topBoard} fill={p.c(C.paint)} />
      <rect x={s.x0} y={s.top} width={w} height={0.9} fill={p.c(C.edge)} />
      <rect x={s.x0} y={s.mid} width={w} height={s.midBoard} fill={p.c(C.paint)} />
      <rect x={s.x0} y={s.floor} width={w} height={s.floorBoard} fill={p.c(C.paint)} />
      <rect x={s.x0} y={s.floor + s.floorBoard} width={w} height={s.plinth - s.floor - s.floorBoard} fill={p.c(C.edge)} />
      <rect x={s.x0} y={s.top} width={s.side} height={s.plinth - s.top} fill={p.c(C.paint)} />
      <rect x={s.x1 - s.side} y={s.top} width={s.side} height={s.plinth - s.top} fill={p.c(C.paint)} />
      <rect x={p.from === 'right' ? s.x0 : s.x1 - 1} y={s.top} width={1} height={s.plinth - s.top} fill="var(--shade)" />
      <rect x={s.x0} y={s.plinth} width={w} height={100 - s.plinth} fill={room.wallLow} />
      {/* the trailing pothos in its pot on top */}
      <path d={VINES.stems} fill="none" stroke={p.c(C.stem)} stroke-width={0.45} stroke-linecap="round" />
      <path d={VINES.leaves[0]} fill={p.c(C.leaves[0])} />
      <path d={VINES.leaves[1]} fill={p.c(C.leaves[1])} />
      <Solid d={s.pothosPot} fill={p.c(C.pot)} crescent={p.shade('shelf.pothosPot')} />
      <rect x={18.8} y={11.6} width={17.4} height={2.2} rx={0.8} fill={p.c(C.potRim)} />
      {/* the reading lamp */}
      <path d={oval(122, 22.6, 7, 0.9)} fill="var(--contact)" />
      <path d={s.lamp.stem} fill={p.c(C.brass)} />
      <path d={s.lamp.base} fill={p.c(C.brass)} />
      <path d={s.lamp.shade} fill={lampOn ? LAMP_COLORS.shadeLit : p.c(C.shade)} />
      {!lampOn && <path d={p.shade('shelf.lampShade')} fill="var(--shade)" />}
      <path d={oval(122, 10.7, 7.6, 0.8)} fill={lampOn ? LAMP_COLORS.rimLit : p.c('#EADAC0')} />
    </g>
  );
}

function ground(room: RoomPalette, petSize: number): Ground {
  const perches: Perch[] = [
    { id: 'shelf:top-a', kind: 'shelf', x: 58, y: SHELF.top, depth: 0.5, z: depthZ(0) - 5, w: 30, likes: ['cat'] },
    { id: 'shelf:top-b', kind: 'shelf', x: 92, y: SHELF.top, depth: 0.5, z: depthZ(0) - 5, w: 26 },
    { id: 'shelf:gap', kind: 'bed', x: 80, y: 45.8, depth: 0.5, z: depthZ(0) - 4, w: 20, likes: ['cat', 'hamster'], pose: 'loaf' },
  ];
  return { rows: ROWS, x0: SHELF.x0 + 8, x1: SHELF.x1 - 8, d0: 0.4, d1: 1, surface: room.wall, beam: null, perches, obstacles: [], petSize };
}

export const BOOKSHELF_PLACE: PlaceScene = {
  id: 'bookshelf',
  width: SHELF_W,
  back: Back,
  ground,
  lampAt: SHELF.lamp.bulb,
  crop: [4, 2, 144, 96],
};

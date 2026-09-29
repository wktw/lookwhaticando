/**
 * The Sill's still life, drawn once per hour-quarter: the wall, the sash window and the street
 * through it, the painted sill, the sunbeam with the window bars' shadows inside it, the shadows
 * the pots cast in the sun, and after dark the lamp's warm pool. Everything that moves (pets) or
 * stands in front (pots, jar, lamp, decor) is laid over it by the scene.
 */
import { memo } from 'preact/compat';
import { CRESCENT } from '../paths';
import { tone, type OutsidePalette, type RoomPalette } from '../palette';
import type { RoomRows } from '../room';
import { beamQuad, type Beam, type SillLayout } from './layout';
import { skyFor, terraceFor } from './scenery';

/** A shadow thrown across the sill by something standing in the sun. */
export interface CastSpec {
  x: number;
  /** Baseline (y of the foot) in units. */
  y: number;
  /** Width at the foot and at the top, and the height of the solid part. */
  foot: number;
  top: number;
  height: number;
  /** A crown of leaves above it: centre height and radius. */
  crown?: { h: number; r: number };
}

export interface SillBackdropProps {
  layout: SillLayout;
  room: RoomPalette;
  view: OutsidePalette;
  beam: Beam | null;
  casts: readonly CastSpec[];
  /** [dx, dy] per unit of height (see castVector). */
  cast: readonly [number, number];
  /** Unique prefix for gradient ids. */
  uid: string;
  /** Draw the lamp's pool (the Today band pins its lamp and draws the pool itself). */
  pool?: boolean;
}

const f = (n: number) => +n.toFixed(2);

export const SillBackdrop = memo(function SillBackdrop({ layout, room, view, beam, casts, cast, uid, pool = true }: SillBackdropProps) {
  const { width, window: win, spec } = layout;
  const rows = spec.rows;
  const lamp = layout.lamp;
  return (
    <svg viewBox={`0 0 ${f(width)} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={view.sky[0]} />
          <stop offset="1" stop-color={view.sky[1]} />
        </linearGradient>
        {room.night && pool && (
          <radialGradient id={`${uid}-pool`} gradientUnits="userSpaceOnUse" cx={f(lamp.x)} cy={f(rows.sillBack - 30)} r={120}>
            <stop offset="0" stop-color="var(--lamp, #FFC98A)" stop-opacity={0.5} />
            <stop offset="0.42" stop-color="var(--lamp, #FFC98A)" stop-opacity={0.17} />
            <stop offset="1" stop-color="var(--lamp, #FFC98A)" stop-opacity={0} />
          </radialGradient>
        )}
      </defs>
      <rect width={f(width)} height={100} fill={room.wall} />
      <WindowView x0={win.x0} x1={win.x1} bottom={rows.glassBottom} view={view} fill={`url(#${uid}-sky)`} />
      <Frame layout={layout} room={room} />
      {win.x0 >= 10 && <Curtain x1={win.x0 + 1.5} bottom={rows.sillBack + 0.6} room={room} />}
      <SillBoard width={width} rows={rows} room={room} />
      {beam && room.beam && <Sunbeam beam={beam} rows={rows} room={room} />}
      {beam && room.beam && casts.length > 0 && <Casts casts={casts} cast={cast} rows={rows} fill={room.sill} />}
      {room.night && pool && <rect width={f(width)} height={100} fill={`url(#${uid}-pool)`} />}
    </svg>
  );
});

/** The view through a pane from x0 to x1, down to `bottom`: sky, clouds or stars, the street across the road. */
export function WindowView({ x0, x1, bottom, view, fill, seed = 7 }: { x0: number; x1: number; bottom: number; view: OutsidePalette; fill: string; seed?: number }) {
  const street = terraceFor(x0, x1, bottom, seed);
  const sky = skyFor(x0, x1, bottom, seed - 4);
  const m = sky.moon;
  const s = m.r / 20;
  return (
    <svg x={f(x0)} y={0} width={f(x1 - x0)} height={f(bottom)} viewBox={`${f(x0)} 0 ${f(x1 - x0)} ${f(bottom)}`} overflow="hidden">
      <rect x={f(x0)} width={f(x1 - x0)} height={f(bottom)} fill={fill} />
      {view.cloud && <path d={sky.clouds} fill={view.cloud} opacity={0.82} />}
      {view.star && <path d={sky.stars} fill={view.star} opacity={0.8} />}
      {view.moon && <path d={CRESCENT} fill={view.moon} transform={`translate(${f(m.x - 50 * s)} ${f(m.y - 50 * s)}) scale(${f(s)})`} />}
      {street.walls.map((d, i) => d && <path key={i} d={d} fill={view.facades[i % view.facades.length]} />)}
      <path d={street.cornices} fill={view.cornice} />
      {view.snow && <path d={street.snow} fill={view.accent ?? '#FFFFFF'} opacity={0.9} />}
      <path d={street.panes} fill={view.pane} />
      <path d={street.lit} fill={view.litWindow ?? view.pane} opacity={view.litWindow ? 0.85 : 1} />
      <path d={street.awnings} fill={view.awning} />
      <path d={street.stripes} fill={view.stripe} />
      <path d={street.treesDeep} fill={view.treeDeep} />
      <path d={street.trees} fill={view.tree} />
      {view.accent && !view.snow && <path d={street.accents} fill={view.accent} />}
    </svg>
  );
}

/** Jambs, the meeting rail, the sash stiles and the bottom rail, in the frame's paint. */
function Frame({ layout, room }: { layout: SillLayout; room: RoomPalette }) {
  const { window: win, spec } = layout;
  const rows = spec.rows;
  const jamb = 3.4;
  const stile = 2.6;
  const railH = 3;
  const bottomRail = rows.sillBack - rows.glassBottom;
  const inner = room.night ? 'rgba(10, 8, 22, 0.22)' : 'rgba(94, 76, 154, 0.07)';
  return (
    <g>
      {/* the glass sits back in the frame: a soft shadow under the rail and inside the left of each pane */}
      <rect x={f(win.x0)} y={win.rail + railH} width={f(win.x1 - win.x0)} height={1.6} fill={inner} />
      <rect x={f(win.x0)} y={0} width={1.4} height={rows.glassBottom} fill={inner} />
      {win.stiles.map((x) => (
        <rect key={x} x={f(x + stile / 2)} y={0} width={1.2} height={rows.glassBottom} fill={inner} />
      ))}
      <g fill={room.frame}>
        <rect x={f(win.x0 - jamb)} y={0} width={jamb} height={rows.sillBack} />
        <rect x={f(win.x1)} y={0} width={jamb} height={rows.sillBack} />
        <rect x={f(win.x0)} y={win.rail} width={f(win.x1 - win.x0)} height={railH} />
        {win.stiles.map((x) => (
          <rect key={x} x={f(x - stile / 2)} y={0} width={stile} height={rows.glassBottom} />
        ))}
        <rect x={f(win.x0 - jamb)} y={rows.glassBottom} width={f(win.x1 - win.x0 + jamb * 2)} height={bottomRail} />
      </g>
      <g fill={room.frameShade}>
        <rect x={f(win.x1 + jamb - 0.9)} y={0} width={0.9} height={rows.sillBack} />
        <rect x={f(win.x0)} y={win.rail + railH - 0.7} width={f(win.x1 - win.x0)} height={0.7} />
        {win.stiles.map((x) => (
          <rect key={x} x={f(x + stile / 2 - 0.7)} y={0} width={0.7} height={rows.glassBottom} />
        ))}
        <rect x={f(win.x0 - jamb)} y={f(rows.sillBack - 0.9)} width={f(win.x1 - win.x0 + jamb * 2)} height={0.9} />
      </g>
    </g>
  );
}

/** A linen curtain at the left of the window, falling straight to the sill. */
function Curtain({ x1, bottom, room }: { x1: number; bottom: number; room: RoomPalette }) {
  const linen = tone(room.time, '#F4ECE1');
  const fold = tone(room.time, '#E8DCCB');
  return (
    <g>
      <path d={`M0 0H${f(x1)}V${f(bottom - 4)}Q${f(x1 + 0.6)} ${f(bottom)} ${f(x1 - 3)} ${f(bottom)}H0Z`} fill={linen} />
      <path d={`M${f(x1 * 0.3)} 0h1.6V${f(bottom)}h-1.6ZM${f(x1 * 0.68)} 0h1.3V${f(bottom - 0.4)}h-1.3Z`} fill={fold} />
      <path d={`M${f(x1 - 0.9)} 0h0.9V${f(bottom - 4)}h-0.9Z`} fill="var(--shade)" />
    </g>
  );
}

function SillBoard({ width, rows, room }: { width: number; rows: RoomRows; room: RoomPalette }) {
  return (
    <g>
      <rect x={0} y={rows.sillBack} width={f(width)} height={f(rows.sillFront - rows.sillBack)} fill={room.sill} />
      <rect x={0} y={rows.sillBack} width={f(width)} height={0.8} fill={room.sillSeam} />
      <rect x={0} y={rows.sillFront} width={f(width)} height={f(rows.nosing - rows.sillFront)} fill={room.nosing} />
      <rect x={0} y={rows.nosing} width={f(width)} height={f(100 - rows.nosing)} fill={room.wallLow} />
      <rect x={0} y={rows.nosing} width={f(width)} height={1.6} fill={room.underNosing} />
    </g>
  );
}

function Sunbeam({ beam, rows, room }: { beam: Beam; rows: RoomRows; room: RoomPalette }) {
  const q = beamQuad(beam, rows);
  const d = `M${q.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
  const deep = rows.sillFront - rows.sillBack;
  const lean = beam.slant / deep;
  const at = (depth: number) => rows.sillBack + depth * deep;
  // The stile's shadow: a thin stripe leaning with the beam; the meeting rail's: a band across it.
  const barX = beam.bar.x;
  const bar = `M${f(barX)} ${rows.sillBack}L${f(barX + beam.bar.w)} ${rows.sillBack}L${f(barX + beam.bar.w + beam.slant)} ${rows.sillFront}L${f(barX + beam.slant)} ${rows.sillFront}Z`;
  const y0 = at(beam.rail.depth);
  const y1 = y0 + beam.rail.h;
  const rail = `M${f(beam.x0 + lean * (y0 - rows.sillBack))} ${f(y0)}L${f(beam.x1 + lean * (y0 - rows.sillBack))} ${f(y0)}L${f(beam.x1 + lean * (y1 - rows.sillBack))} ${f(y1)}L${f(beam.x0 + lean * (y1 - rows.sillBack))} ${f(y1)}Z`;
  const lip = rows.sillFront;
  const edge = `M${f(beam.x0 + beam.slant + 2)} ${lip}L${f(beam.x1 + beam.slant - 2)} ${lip}L${f(beam.x1 + beam.slant * 1.08 - 3)} ${f(lip + 1.6)}L${f(beam.x0 + beam.slant * 1.08 + 3)} ${f(lip + 1.6)}Z`;
  const b = room.beam!;
  return (
    <g>
      <path d={d} fill={b.color} opacity={b.opacity} />
      <path d={edge} fill={b.color} opacity={b.opacity * 0.55} />
      <path d={`${bar}${rail}`} fill={room.sill} />
    </g>
  );
}

/** Cast shadows are the bare sill showing through the beam, so outside the sun they vanish by themselves. */
function Casts({ casts, cast, rows, fill }: { casts: readonly CastSpec[]; cast: readonly [number, number]; rows: RoomRows; fill: string }) {
  return (
    <g fill={fill}>
      {casts.map((c, i) => {
        const tall = c.crown ? c.crown.h + c.crown.r : c.height;
        const room = Math.max(0.5, rows.sillFront - c.y - 0.4);
        const dy = Math.min(cast[1], room / Math.max(1, tall));
        const d =
          `M${f(-c.foot / 2)} 0L${f(c.foot / 2)} 0L${f(c.top / 2)} ${f(-c.height)}L${f(-c.top / 2)} ${f(-c.height)}Z` +
          (c.crown ? `M${f(-c.crown.r)} ${f(-c.crown.h)}a${f(c.crown.r)} ${f(c.crown.r)} 0 1 0 ${f(2 * c.crown.r)} 0a${f(c.crown.r)} ${f(c.crown.r)} 0 1 0 ${f(-2 * c.crown.r)} 0Z` : '');
        return <path key={i} d={d} transform={`translate(${f(c.x)} ${f(c.y)}) matrix(1 0 ${f(-cast[0])} ${f(-dy)} 0 0)`} />;
      })}
    </g>
  );
}

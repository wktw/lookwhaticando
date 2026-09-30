/**
 * One stretch of sill, drawn: the still life behind, then the pots, the coin jar, the lamp and the
 * placed decor standing on it in depth order, then whoever is out (passed as children). Used by the
 * Shelf, the standalone Sill and the Today band. On the Sill it also carries the rituals (DESIGN §13,
 * §14.1): the Cutting by the window, a found thing, a note waiting to be opened, a birthday cake.
 */
import type { ComponentChildren } from 'preact';
import type { Light } from '@/art/light';
import type { EditDecor, SillExtras, SillPot } from '../model';
import type { OutsidePalette, RoomPalette } from '../palette';
import { baseline, depthScale, depthZ } from '../room';
import { OBJECT_BASE } from '../props/shapes';
import { CoinJar } from '../props/CoinJar';
import { TableLamp } from '../props/TableLamp';
import { PotSlot } from '../actors/PotSlot';
import { DecorItem } from '../actors/DecorItem';
import { DecorEditLayer } from '../actors/DecorEdit';
import { standAt } from '../actors/stand';
import { LampPoolGradient } from '../props/LampPool';
import { DECOR_ENTRIES } from '../decor';
import { decorSize } from '../fit';
import { foundFor } from '../objects/found';
import { NoteArt } from '../objects/note';
import { CuttingPot, CuttingVine, vineReach } from '../objects/cutting';
import type { Pt } from '../decor/geo';
import { SillBackdrop } from './Backdrop';
import type { SillWorld } from './world';
import s from '../shelf.module.css';

export interface SillSegmentProps {
  world: SillWorld;
  room: RoomPalette;
  view: OutsidePalette;
  /** The light every child gets. */
  light: Light;
  pots: readonly SillPot[];
  coins: number;
  uid: string;
  tags?: boolean;
  animated?: boolean;
  /** Per-habit overrides from the Today band (a pour darkens the soil and bumps the pulse). */
  damp?: ReadonlySet<string>;
  pulses?: Readonly<Record<string, number>>;
  potRef?: (habitId: string, el: HTMLDivElement | null) => void;
  jarRef?: (el: HTMLDivElement | null) => void;
  /** Extra class on each pot (the band's scroll-snap points). */
  potClass?: string;
  /** Only this habit's tag, if any (the band shows the tapped pot's tag only). */
  tagFor?: string;
  /** The Today band pins the jar and the lamp at its right edge and lights the night itself. */
  pinned?: boolean;
  /** Where the moon hangs (see SillBackdrop). */
  moonX?: number;
  /** The rituals on the sill (the band draws its own at its pinned end). */
  extras?: SillExtras;
  /** Decor edit mode. */
  edit?: { decor: EditDecor; sceneRef: { current: HTMLElement | null } };
  children?: ComponentChildren;
}

/** The Cutting's path along the frame: up the left jamb, across the head of the window, down the right jamb. */
export function cuttingPath(world: SillWorld, from: Pt): Pt[] {
  const win = world.layout.window;
  const rows = world.layout.spec.rows;
  const jl = win.x0 - 1.7;
  const jr = win.x1 + 1.7;
  return [from, [jl, from[1] - 3], [jl, 2], [jr, 2], [jr, rows.sillBack - 2]];
}

export function SillSegment({ world, room, view, light, pots, coins, uid, tags, animated, damp, pulses, potRef, jarRef, potClass, tagFor, pinned, moonX, extras, edit, children }: SillSegmentProps) {
  const { layout, beam, casts, cast, decor } = world;
  const { rows, scale } = layout.spec;
  const jar = layout.jar;
  const lamp = layout.lamp;
  const byHabit = new Map(pots.map((p) => [p.habitId, p]));
  // The Cutting stands on the sill in front of the left jamb, where the curtain meets the window.
  const cutting = extras?.cutting && !pinned && layout.window.x0 >= 10 ? extras.cutting : undefined;
  const cutDepth = 0.1;
  const cutX = layout.window.x0 - 5.6;
  const cutSize = scale.pot * 0.58;
  const cutY = baseline(rows, cutDepth);
  return (
    <>
      <SillBackdrop layout={layout} room={room} view={view} beam={beam} casts={casts} cast={cast} uid={uid} pool={!pinned} moonX={moonX} />
      {(world.pools.length > 0 || cutting) && (
        <svg viewBox={`0 0 ${+layout.width.toFixed(2)} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: 'none' }}>
          {world.pools.map((p, i) => (
            <g key={i}>
              <defs>
                <LampPoolGradient id={`${uid}-dp${i}`} cx={+p.x.toFixed(2)} cy={+p.y.toFixed(2)} r={+p.r.toFixed(2)} squash={0.4} strength={0.55} />
              </defs>
              <rect x={+(p.x - p.r).toFixed(2)} y={+(p.y - p.r * 0.4).toFixed(2)} width={+(p.r * 2).toFixed(2)} height={+(p.r * 0.8).toFixed(2)} fill={`url(#${uid}-dp${i})`} />
            </g>
          ))}
          {cutting && <CuttingVine path={cuttingPath(world, [cutX, cutY - cutSize * 0.42])} reach={vineReach(cutting.stage, cutting.overall)} light={light} />}
        </svg>
      )}
      {cutting && (
        <div class={s.pot} style={standAt(cutX, cutY, cutSize, 95, depthZ(cutDepth), depthScale(cutDepth))} data-cutting={cutting.stage}>
          <CuttingPot stage={cutting.stage} light={light} animated={animated} />
        </div>
      )}
      {decor
        .filter((d) => d.hanging)
        .map((d) => (
          <DecorItem key={d.key} entry={d.entry} itemId={d.itemId} x={d.x} y={d.y} z={d.z} size={d.size} light={light} flip={d.flip} />
        ))}
      {world.pots.map((place) => {
        const pot = byHabit.get(place.habitId)!;
        return (
          <PotSlot
            key={pot.habitId}
            pot={pot}
            place={place}
            z={depthZ(place.depth)}
            light={light}
            tag={tags || tagFor === pot.habitId}
            animated={animated}
            damp={damp?.has(pot.habitId) || undefined}
            pulse={pulses?.[pot.habitId]}
            slotRef={potRef ? (el) => potRef(pot.habitId, el) : undefined}
            class={potClass}
          />
        );
      })}
      {!pinned && (
        <>
          <div ref={jarRef} class={s.prop} style={standAt(jar.x, baseline(rows, jar.depth), scale.jar, OBJECT_BASE, depthZ(jar.depth), depthScale(jar.depth))}>
            <CoinJar coins={coins} light={light} />
          </div>
          <div class={s.prop} style={standAt(lamp.x, baseline(rows, lamp.depth), scale.lamp, OBJECT_BASE, depthZ(lamp.depth), depthScale(lamp.depth))}>
            <TableLamp light={light} on={room.night} />
          </div>
        </>
      )}
      {decor
        .filter((d) => !d.hanging)
        .map((d) => [
          <DecorItem key={d.key} entry={d.entry} itemId={d.itemId} x={d.x} y={d.y} z={d.z} size={d.size} light={light} flip={d.flip} scale={d.scale} />,
          // A box's front face goes over whoever is asleep in it.
          d.entry.front ? <DecorItem key={`${d.key}/front`} entry={d.entry} itemId={d.itemId} x={d.x} y={d.y} z={d.z + 3} size={d.size} light={light} flip={d.flip} scale={d.scale} front /> : null,
        ])}
      {!pinned && extras && <SillExtrasArt world={world} extras={extras} light={light} />}
      {edit && <DecorEditLayer decor={decor} floor={world.floor} rows={rows} place="sill" edit={edit.decor} sceneRef={edit.sceneRef} />}
      {children}
    </>
  );
}

/** A found thing, a waiting note and a birthday cake on the Sill, where the world placed them (the band puts them at its pinned end instead). */
function SillExtrasArt({ world, extras, light }: { world: SillWorld; extras: SillExtras; light: Light }) {
  const { rows, scale } = world.layout.spec;
  const { found, note, cake } = world.rituals;
  const out = [];
  if (extras.found && found) {
    const entry = foundFor(extras.found.seed);
    out.push(<SillThing key="found" kind="found" x={found.x} depth={found.depth} size={found.size} rows={rows} light={light} entry={entry} label={extras.found.label ?? 'Something on the sill'} onTap={extras.found.onTap} />);
  }
  if (extras.note && note) {
    out.push(<SillNote key="note" x={note.x} depth={note.depth} size={note.size} rows={rows} light={light} note={extras.note} />);
  }
  if (extras.cake && cake) {
    const entry = DECOR_ENTRIES['decor-birthday-cake']!;
    out.push(<SillThing key="cake" kind="cake" x={cake.x} depth={cake.depth} size={decorSize(entry, scale.pet)} rows={rows} light={light} entry={entry} />);
  }
  return <>{out}</>;
}

/** A small thing standing on the sill: decor art, a button when it can be picked up. */
export function SillThing({ kind, x, depth, size, rows, light, entry, label, onTap }: { kind: string; x: number; depth: number; size: number; rows: SillWorld['layout']['spec']['rows']; light: Light; entry: import('../decor').DecorEntry; label?: string; onTap?: () => void }) {
  const y = baseline(rows, depth);
  const z = depthZ(depth, 'stand');
  const art = <DecorItem entry={entry} itemId={kind} x={x} y={y} z={z} size={size} light={light} scale={depthScale(depth)} />;
  if (!onTap) return art;
  const box = standAt(x, y, Math.max(size, 12), 92, z + 1, depthScale(depth));
  return (
    <>
      {art}
      <button type="button" class={s.sillButton} style={box} aria-label={label} onClick={onTap} data-sill={kind} />
    </>
  );
}

/** A note on the sill, clipped and leaning: a real button that opens it. */
export function SillNote({ x, depth, size, rows, light, note }: { x: number; depth: number; size: number; rows: SillWorld['layout']['spec']['rows']; light: Light; note: NonNullable<SillExtras['note']> }) {
  const y = baseline(rows, depth);
  const label = note.label ?? (note.kind === 'herbarium' ? 'A Herbarium page on the sill' : note.kind === 'story' ? 'A story on the sill' : 'A note on the sill');
  return (
    <button type="button" class={s.sillButton} style={standAt(x, y, size, 92, depthZ(depth, 'stand') + 1, depthScale(depth))} aria-label={label} onClick={note.onOpen} data-sill="note" data-kind={note.kind}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <NoteArt kind={note.kind} light={light} />
      </svg>
    </button>
  );
}

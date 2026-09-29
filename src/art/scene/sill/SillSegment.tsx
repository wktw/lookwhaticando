/**
 * One stretch of sill, drawn: the still life behind, then the pots, the coin jar, the lamp and the
 * placed decor standing on it in depth order, then whoever is out (passed as children). Used by the
 * Shelf, the standalone Sill and the Today band.
 */
import type { ComponentChildren } from 'preact';
import type { Light } from '@/art/light';
import type { SillPot } from '../model';
import type { OutsidePalette, RoomPalette } from '../palette';
import { baseline, depthScale, depthZ } from '../room';
import { OBJECT_BASE } from '../props/shapes';
import { CoinJar } from '../props/CoinJar';
import { TableLamp } from '../props/TableLamp';
import { PotSlot } from '../actors/PotSlot';
import { DecorItem } from '../actors/DecorItem';
import { standAt } from '../actors/stand';
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
  /** The Today band pins the jar and the lamp at its right edge and lights the night itself. */
  pinned?: boolean;
  children?: ComponentChildren;
}

/** A pot's tag goes on the side away from its resident's head (the rim's fixed facing). */
function tagSideFor(world: SillWorld, habitId: string): 'left' | 'right' {
  const rim = world.ground.perches.find((q) => q.owner === habitId && q.kind === 'rim');
  return rim?.facing === 'right' ? 'left' : 'right';
}

export function SillSegment({ world, room, view, light, pots, coins, uid, tags, animated, damp, pulses, potRef, jarRef, potClass, pinned, children }: SillSegmentProps) {
  const { layout, beam, casts, cast, decor } = world;
  const { rows, scale } = layout.spec;
  const jar = layout.jar;
  const lamp = layout.lamp;
  return (
    <>
      <SillBackdrop layout={layout} room={room} view={view} beam={beam} casts={casts} cast={cast} uid={uid} pool={!pinned} />
      {decor
        .filter((d) => d.hanging)
        .map((d) => (
          <DecorItem key={d.key} itemId={d.itemId} x={d.x} y={d.y} z={d.z} petSize={scale.pet} light={light} flip={d.flip} />
        ))}
      {layout.pots.map((p, i) => {
        const pot = pots[i]!;
        return (
          <PotSlot
            key={pot.habitId}
            pot={pot}
            x={p.x}
            y={baseline(rows, p.depth)}
            size={scale.pot}
            scale={depthScale(p.depth)}
            z={depthZ(p.depth)}
            light={light}
            tag={tags}
            tagSide={tagSideFor(world, pot.habitId)}
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
        .map((d) => (
          <DecorItem key={d.key} itemId={d.itemId} x={d.x} y={d.y} z={d.z} petSize={scale.pet} light={light} flip={d.flip} scale={d.scale} />
        ))}
      {children}
    </>
  );
}

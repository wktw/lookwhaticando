/**
 * The Today band (DESIGN §9.1): the nearest stretch of the sill, 168 px tall, collapsing to 64 px as
 * the page scrolls. The real sky through the window, the sunbeam crossing the sill, today's habit pots
 * (up to six, scrolling sideways with snap) and whoever lives in them, peeking over the rim. Tapping
 * the window opens the Shelf. The screen lays the greeting chip (top left) and the wallet (top right)
 * over it.
 *
 * The check-in choreography drives it through a ref (`WindowsillBandHandle`): `pour` a stream of water
 * onto a pot, `coinToJar`, and let a resident `react`. Under reduced motion the state changes at once.
 */
import { Fragment, type JSX, type Ref } from 'preact';
import { forwardRef } from 'preact/compat';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'preact/hooks';
import { effect, signal, type ReadonlySignal } from '@preact/signals';
import type { Hemisphere } from '@/art/light';
import { prefersReducedMotion } from '@/fx/motion';
import type { ShelfPet, SillPot } from './model';
import { petKey } from './model';
import type { Moment } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { arrangePets } from './arrange';
import { BAND_END, BAND_MAX_POTS, BAND_SPEC } from './sill/layout';
import { sillWorld } from './sill/world';
import { SillSegment } from './sill/SillSegment';
import { PetLayer } from './actors/PetLayer';
import type { ActorView } from './actors/PetActor';
import { u } from './actors/stand';
import { useWidthUnits, useWindowMoment } from './hooks';
import { baseline, depthScale, PLANT_BASELINE, POT_RIM } from './room';
import { OBJECT_BASE } from './props/shapes';
import { CoinJar, pileTop } from './props/CoinJar';
import { Coin } from './props/Coin';
import { TableLamp } from './props/TableLamp';
import { standAt } from './actors/stand';
import { lampPoolCss } from './props/LampPool';
import { bandCollapse } from './band';
import { sceneTokens } from './SillScene';
import { useUid } from './uid';
import { scrollKeyTarget } from './ScrollFrame';
import s from './shelf.module.css';
import b from './band.module.css';

export interface WindowsillBandHandle {
  /** A thin stream of water onto that habit's pot; the soil darkens and the plant reacts. */
  pour(habitId: string): void;
  /** A brass coin drops into the jar. */
  coinToJar(): void;
  /** That pet looks up (a resident, by its key). */
  react(petKey: string): void;
}

export interface WindowsillBandProps {
  /** Today's habit pots, left to right (up to six are shown). */
  pots: readonly SillPot[];
  /** The pets living in them (each with `home` set to its habit). */
  pets?: readonly ShelfPet[];
  coins: number;
  now?: Date;
  hemisphere?: Hemisphere;
  /** Pin the moment (gallery, tests). Overrides `now`. */
  moment?: Moment;
  /** 0 open (168 px) … 1 collapsed (64 px). A signal is applied without re-rendering. */
  collapse?: number | ReadonlySignal<number>;
  onWindowTap?: () => void;
  /**
   * Pixels the screen's short date chip takes at the left when collapsed: the pot row slides right by
   * this much as the band collapses, so the chip never sits over a resident.
   */
  chipInset?: number;
  class?: string;
  style?: JSX.CSSProperties;
}

interface Pour {
  id: number;
  x: number;
  y: number;
}

let pourIds = 0;

const POUR_MS = 680;
const SOIL_AT_MS = 260;
const COIN_MS = 600;
/** Where the watering can's spout pours from, in band units (just under the chips' top edge). */
const SPOUT_Y = 12;

/** The collapsed chip's width by default (a "Tue 29 · 3 of 5" chip and its margin). */
export const BAND_CHIP_INSET = 116;

function applyCollapse(el: HTMLElement | null, collapse: number, inset: number) {
  if (!el) return;
  const c = bandCollapse(collapse);
  el.style.setProperty('--band-clip', `${c.clip}px`);
  el.style.setProperty('--band-follow', `${c.follow}px`);
  el.style.setProperty('--band-shift', `${+(c.t * inset).toFixed(2)}px`);
}

/** A reduced-motion acknowledgement: fade in, hold, fade out (opacity only). */
function fadeInOut(el: HTMLElement | null) {
  el?.animate?.([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
}

export const WindowsillBand = forwardRef(function WindowsillBand(props: WindowsillBandProps, ref: Ref<WindowsillBandHandle>) {
  const { pets = [], coins, collapse = 0, onWindowTap, chipInset = BAND_CHIP_INSET } = props;
  const pots = useMemo(() => props.pots.slice(0, BAND_MAX_POTS), [props.pots]);
  const band = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const uid = useUid('band');
  // Measured to the unit: the pots are spaced so the pinned end never slices one.
  const widthU = useWidthUnits(sceneRef, 174, 1);
  const moment = useWindowMoment(props);
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);

  const world = useMemo(() => sillWorld(BAND_SPEC, pots, [], room, moment.light.sun, widthU, moment.season), [pots, room, moment.light.sun, widthU, moment.season]);
  const residents = useMemo(() => pets.filter((p) => p.home && pots.some((q) => q.habitId === p.home)), [pets, pots]);
  const start = useMemo(() => arrangePets(world.ground, residents, moment), [world, residents, moment.time]); // eslint-disable-line react-hooks/exhaustive-deps
  const views = useMemo(() => new Map([...start].map(([k, v]) => [k, signal<ActorView>(v)])), [start]);

  // Collapse: a number re-applies on render; a signal writes the two variables directly.
  useEffect(() => {
    if (typeof collapse === 'number') {
      applyCollapse(band.current, collapse, chipInset);
      return;
    }
    return effect(() => applyCollapse(band.current, collapse.value, chipInset));
  }, [collapse, chipInset]);

  // Choreography state: pours in flight, soil watered, plant pulses, a coin, passing looks.
  const [pours, setPours] = useState<Pour[]>([]);
  const [damp, setDamp] = useState<ReadonlySet<string>>(() => new Set());
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [coin, setCoin] = useState({ n: 0, still: false });
  const [looks, setLooks] = useState<Record<string, ActorView['expression']>>({});
  const jar = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const water = useCallback((habitId: string) => {
    setDamp((d) => new Set(d).add(habitId));
    setPulses((p) => ({ ...p, [habitId]: (p[habitId] ?? 0) + 1 }));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      pour(habitId) {
        const i = pots.findIndex((p) => p.habitId === habitId);
        const at = world.layout.pots[i];
        if (!at) return;
        if (prefersReducedMotion()) return water(habitId);
        const size = BAND_SPEC.scale.pot * depthScale(at.depth);
        const soil = baseline(BAND_SPEC.rows, at.depth) - ((PLANT_BASELINE - POT_RIM.y + 2) / 100) * size;
        const id = ++pourIds;
        // Beside the resident, onto the soil just inside the rim.
        setPours((list) => [...list, { id, x: at.x + size * 0.19, y: soil }]);
        later(() => water(habitId), SOIL_AT_MS);
        later(() => setPours((list) => list.filter((p) => p.id !== id)), POUR_MS + 400);
      },
      coinToJar() {
        // Reduced motion: no fall, but the coin still arrives, fading in on top of the heap.
        if (prefersReducedMotion()) return setCoin((c) => ({ n: c.n + 1, still: true }));
        setCoin((c) => ({ n: c.n + 1, still: false }));
        later(() => {
          const el = jar.current;
          if (!el) return;
          el.classList.remove(b.clink!);
          void el.offsetWidth;
          el.classList.add(b.clink!);
        }, COIN_MS * 0.8);
      },
      react(key) {
        setLooks((l) => ({ ...l, [key]: 'surprised' }));
        later(() => setLooks((l) => ({ ...l, [key]: undefined })), 900);
        if (prefersReducedMotion()) return;
        const body = sceneRef.current?.querySelector<HTMLElement>(`[data-pet="${CSS.escape(key)}"] > div`);
        if (!body) return;
        body.classList.remove(s.react!);
        void body.offsetWidth;
        body.classList.add(s.react!);
      },
    }),
    [pots, world, water, later],
  );

  // The pot row scrolls with Arrow keys too, one pot at a time.
  const onScrollKey = (e: KeyboardEvent) => {
    const el = sceneRef.current;
    if (!el) return;
    const pitch = world.layout.pots.length > 1 ? world.layout.pots[1]!.x - world.layout.pots[0]!.x : BAND_SPEC.pitch;
    const to = scrollKeyTarget(e.key, el.scrollLeft, el.scrollWidth - el.clientWidth, (pitch * el.clientHeight) / 100);
    if (to == null) return;
    e.preventDefault();
    el.scrollTo({ left: to, behavior: 'smooth' });
  };
  const win = world.layout.window;
  const jarTop = baseline(BAND_SPEC.rows, BAND_SPEC.backRow + 0.06) - ((OBJECT_BASE - 36) / 100) * BAND_SPEC.scale.jar;
  const coinRest = baseline(BAND_SPEC.rows, BAND_SPEC.backRow + 0.06) - ((OBJECT_BASE - pileTop(coins)) / 100) * BAND_SPEC.scale.jar * depthScale(BAND_SPEC.backRow + 0.06);
  // The band's right end is pinned: the window's jamb, the wall, the jar and the lamp. The pots scroll
  // in the window to its left, so the coin always has somewhere visible to land (under the wallet).
  const rows = BAND_SPEC.rows;
  const E = BAND_END;
  const jarDepth = BAND_SPEC.backRow + 0.06;
  const lampDepth = BAND_SPEC.backRow - 0.1;
  return (
    <div ref={band} class={[b.band, props.class].filter(Boolean).join(' ')} style={props.style}>
      <div class={b.slide}>
        <div class={b.follow} style={{ ...sceneTokens(room.tokens), background: room.wall }}>
          <div ref={sceneRef} class={[s.scene, b.scroll, room.night ? s.night : ''].filter(Boolean).join(' ')} style={{ right: u(E.width), background: room.wall }} data-time={moment.time} tabIndex={0} role="group" aria-label="Today’s plants" onKeyDown={onScrollKey}>
            <div class={s.track} style={{ width: u(world.layout.width) }}>
              <SillSegment world={world} room={room} view={view} light={light} pots={pots} coins={coins} uid={uid} animated damp={damp} pulses={pulses} potClass={b.snap} pinned moonX={bandMoonX(widthU)}>
                <PetLayer pets={residents} views={views} size={BAND_SPEC.scale.pet} light={light} animated expressions={looks} />
                {pours.map((p) => (
                  <Fragment key={p.id}>
                    {/* a watering can's spout tips in at the top, and the water runs from it onto the soil */}
                    <svg class={b.spout} viewBox="0 0 20 12" style={{ left: u(p.x - 17.6), top: u(SPOUT_Y - 9.6), width: u(20), height: u(12) }} aria-hidden="true" focusable="false">
                      <path d="M-2 -1.8L16.4 6.2L17.6 9.2L-2 2.6Z" fill="#9DB9A6" />
                      <path d="M-2 -1.8L16.4 6.2L16.9 7.4L-2 0.2Z" fill="#BCD3C1" />
                      <path d="M15.2 5.2L19.8 7.4L18.4 11L14 8.8Z" fill="#8AA894" />
                    </svg>
                    <div class={b.stream} style={{ left: u(p.x - 1.4), top: u(SPOUT_Y), width: u(2.8), height: u(p.y - SPOUT_Y) }} />
                    {[-1.6, 0.4, 1.9].map((dx, i) => (
                      <div key={i} class={b.splash} style={{ left: u(p.x - 0.65 + dx * 0.4), top: u(p.y - 1.2), '--dx': u(dx) } as JSX.CSSProperties} />
                    ))}
                  </Fragment>
                ))}
              </SillSegment>
              {onWindowTap && (
                <button type="button" class={b.window} aria-label="Open the Shelf" onClick={onWindowTap} style={{ left: u(win.x0), width: u(win.x1 - win.x0), height: u(rows.glassBottom) }} />
              )}
            </div>
          </div>
          <div class={b.end} style={{ width: u(E.width) }}>
            <svg viewBox={`0 0 ${E.width} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0 }}>
              <rect width={E.width} height={rows.sillBack} fill={room.wall} />
              <rect width={E.jamb} height={rows.sillBack} fill={room.frame} />
              <rect x={E.jamb - 0.9} width={0.9} height={rows.sillBack} fill={room.frameShade} />
              <rect y={rows.sillBack} width={E.width} height={rows.sillFront - rows.sillBack} fill={room.sill} />
              <rect y={rows.sillBack} width={E.width} height={0.8} fill={room.sillSeam} />
              <rect y={rows.sillFront} width={E.width} height={rows.nosing - rows.sillFront} fill={room.nosing} />
              <rect y={rows.nosing} width={E.width} height={100 - rows.nosing} fill={room.wallLow} />
              <rect y={rows.nosing} width={E.width} height={1.6} fill={room.underNosing} />
            </svg>
            {room.night && <div class={b.pool} style={{ left: u(E.lamp - 64), top: u(rows.sillBack - 84), width: u(128), height: u(128), background: lampPoolCss() }} />}
            <div class={s.prop} style={standAt(E.lamp, baseline(rows, lampDepth), BAND_SPEC.scale.lamp, OBJECT_BASE, 2, depthScale(lampDepth))}>
              <TableLamp light={light} on={room.night} />
            </div>
            <div ref={jar} class={s.prop} style={standAt(E.jar, baseline(rows, jarDepth), BAND_SPEC.scale.jar, OBJECT_BASE, 3, depthScale(jarDepth))}>
              <CoinJar coins={coins} light={light} />
            </div>
            {coin.n > 0 &&
              (coin.still ? (
                <div key={coin.n} ref={fadeInOut} class={b.coinStill} style={{ left: u(E.jar - 2.2), top: u(coinRest - 2.2), width: u(4.4), height: u(4.4) }}>
                  <Coin />
                </div>
              ) : (
                <Coin key={coin.n} class={b.coin} style={{ left: u(E.jar - 2.2), top: u(jarTop - 3), width: u(4.4), height: u(4.4) }} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Where the band's moon hangs: in the last pane before the pinned jamb, as the band opens (scrolled to
 * its start), with the whole crescent clear of the jamb.
 */
export function bandMoonX(viewU: number): number {
  return viewU - BAND_MOON_INSET;
}

/** How far left of the pinned jamb the band's moon hangs (its centre), in units. */
export const BAND_MOON_INSET = 16;

/** Keys of the pets a band shows (the residents of its pots), for choreography callers. */
export function bandResidents(pots: readonly SillPot[], pets: readonly ShelfPet[]): string[] {
  return pets.filter((p) => p.home && pots.slice(0, BAND_MAX_POTS).some((q) => q.habitId === p.home)).map(petKey);
}

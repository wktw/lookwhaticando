/**
 * The small drawings the Progress screen and the rituals need (DESIGN §9.1 week strip, §9.2 calendar and the year,
 * §13 Sunday Note, This month's flowers and Pressing Day). Flat, matte, no outlines; standing things carry one hard
 * crescent in `var(--shade)` away from the light and a flat contact shadow, pressed things lie flat on their paper.
 * Every one takes the app's one light unless given a `light` (DESIGN §10.4), and tones for Lamplight like the room.
 *
 * - `DayGlyph`: a day as a flower sized by how full it was, a bud when it only just began, a sprout for Tiny, a soft
 *   moon for rest and off days, a leaf for paused; an empty, future or unscheduled day draws nothing (the date shows).
 * - `Pressing`: one habit's pressed stem on a Herbarium page, sized by how often it was watered, with a small flower
 *   for each rest day (up to six) and a strip of paper tape.
 * - `NoteCard`: the Sunday Note, a Herbarium page, the anniversary note or a story, as the card kept on the memory
 *   shelf; a Sunday Note carries a pencil sketch of the week's activity (the same art as the routine props, §14.1).
 * - `MonthJar`: the jar on the sill that fills through the month with a stem from each habit watered.
 */
import type { JSX } from 'preact';
import type { PlantSpeciesId } from '@/catalog/types';
import type { Routine } from '@/domain/routines';
import type { DayState } from '@/state/views/calendar';
import type { Light } from '../light';
import { nightTone } from '../scene/decor/kit';
import { useArtLight } from '../scene/moment';
import { ROUTINE_ART } from '../scene/objects/routines';
import { PETAL_INKS } from '../plants/looks';
import { muteTree } from '../muted';

const f = (n: number) => +n.toFixed(2);
const ell = (cx: number, cy: number, rx: number, ry = rx) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;
/** +1 when the light comes from the left (shade falls right), −1 from the right, 0 from above. */
const awayOf = (light: Light) => (light.from === 'left' ? 1 : light.from === 'right' ? -1 : 0);
const toner = (light: Light) => (hex: string) => (light.night ? nightTone(hex) : hex);

/** A leaf once pressed: the sage gone a little grey and papery. */
const PRESSED_LEAF = '#A7BD95';

/** The ink of every small flower here (a blush petal, a butter heart, a sage leaf, a lavender moon). */
export const GLYPH_INKS = { petal: '#EFB4C1', petalDeep: '#E59AAC', heart: '#F2D98A', leaf: '#9CB58A', leafDeep: '#86A274', moon: '#C8BAE6', soil: '#B79A82' } as const;

interface ArtBase {
  /** Rendered size in px (square unless said otherwise). */
  size?: number;
  light?: Light;
  /** An accessible name; decorative without one. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

function Svg({ box, w, h, title, class: cls, style, children }: { box: string; w: number; h: number; title?: string; class?: string; style?: JSX.CSSProperties; children: JSX.Element | JSX.Element[] | null }) {
  return (
    <svg viewBox={box} width={w} height={h} class={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* DayGlyph                                                            */
/* ------------------------------------------------------------------ */

/** How big a day's flower is drawn for how full the day was (1 when nothing says otherwise). */
export function flowerScale(fraction: number | null | undefined): number {
  const x = fraction == null || !Number.isFinite(fraction) ? 1 : Math.max(0, Math.min(1, fraction));
  return 0.5 + 0.5 * x;
}

/** What a day state draws. */
export function glyphKind(state: DayState, fraction: number | null | undefined): 'flower' | 'bud' | 'sprout' | 'moon' | 'leaf' | null {
  switch (state) {
    case 'done':
      return 'flower';
    case 'partial':
      return fraction != null && fraction < 0.34 ? 'bud' : 'flower';
    case 'tiny':
      return 'sprout';
    case 'rest':
    case 'off':
      return 'moon';
    case 'paused':
      return 'leaf';
    default:
      return null;
  }
}

/** Five petals round a heart, radius `r`, centred at (cx, cy). */
function flowerPaths(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    d += ell(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.46);
  }
  return d;
}

export interface DayGlyphProps extends ArtBase {
  state: DayState;
  /** done ÷ due for the day (null: nothing says, drawn full). */
  fraction?: number | null;
}

/** A day in the week strip, the calendar or the year (24-unit canvas). */
export function DayGlyph({ state, fraction, size = 24, light: given, title, class: cls, style }: DayGlyphProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const c = toner(light);
  const away = awayOf(light);
  const kind = glyphKind(state, fraction);
  let art: JSX.Element | null = null;
  if (kind === 'flower') {
    const r = 9.4 * flowerScale(fraction);
    const cy = 12.6;
    art = (
      <g data-glyph="flower">
        <path d={ell(12 + away * 0.8, 21.6, r * 0.7, 1.1)} fill="var(--contact)" />
        <path d={flowerPaths(12, cy, r)} fill={c(GLYPH_INKS.petal)} />
        {/* a flat flower: its only shade is the heart's crescent, away from the light */}
        <path d={ell(12, cy, r * 0.3)} fill={c(GLYPH_INKS.heart)} />
        <path d={`M${f(12 + away * r * 0.02)} ${f(cy - r * 0.3)}A${f(r * 0.3)} ${f(r * 0.3)} 0 0 ${away >= 0 ? 1 : 0} ${f(12)} ${f(cy + r * 0.3)}A${f(r * 0.2)} ${f(r * 0.3)} 0 0 ${away >= 0 ? 0 : 1} ${f(12)} ${f(cy - r * 0.3)}Z`} fill="var(--shade)" />
      </g>
    );
  } else if (kind === 'bud') {
    art = (
      <g data-glyph="bud">
        <path d="M12 21.4V13.4" stroke={c(GLYPH_INKS.leaf)} stroke-width={1.3} stroke-linecap="round" />
        <path d="M12 17.6C9.6 17.4 8.4 16 8.2 14.4C10.4 14.4 11.6 15.6 12 17.6Z" fill={c(GLYPH_INKS.leaf)} />
        <path d="M12 6.6C14.4 8.6 15 11.2 13.8 13.2C13.2 14.2 10.8 14.2 10.2 13.2C9 11.2 9.6 8.6 12 6.6Z" fill={c(GLYPH_INKS.petal)} />
        <path d={away >= 0 ? 'M12 6.6C14.4 8.6 15 11.2 13.8 13.2C13.4 13.8 12.8 14 12.2 14C13.4 11.8 13.4 9 12 6.6Z' : 'M12 6.6C9.6 8.6 9 11.2 10.2 13.2C10.6 13.8 11.2 14 11.8 14C10.6 11.8 10.6 9 12 6.6Z'} fill="var(--shade)" />
      </g>
    );
  } else if (kind === 'sprout') {
    art = (
      <g data-glyph="sprout">
        <path d={ell(12, 20.6, 4.6, 1.3)} fill={c(GLYPH_INKS.soil)} />
        <path d="M12 20.4V13.6" stroke={c(GLYPH_INKS.leaf)} stroke-width={1.3} stroke-linecap="round" />
        <path d="M12 14.6C9.2 14.8 7.2 13.2 6.8 10.6C9.6 10.4 11.6 12 12 14.6Z" fill={c(GLYPH_INKS.leaf)} />
        <path d="M12 13.4C12.6 10.6 14.8 9 17.4 9.2C17 11.8 14.8 13.4 12 13.4Z" fill={c(GLYPH_INKS.leafDeep)} />
      </g>
    );
  } else if (kind === 'moon') {
    art = (
      <g data-glyph="moon">
        <path d="M13.6 4.8A7.6 7.6 0 1 0 19.4 16.6A6.2 6.2 0 1 1 13.6 4.8Z" fill={c(GLYPH_INKS.moon)} />
      </g>
    );
  } else if (kind === 'leaf') {
    art = (
      <g data-glyph="leaf">
        <path d="M6.4 18.6C6.2 11.6 10.4 6.4 18 5.6C18.4 12.8 14 18 6.4 18.6Z" fill={c(GLYPH_INKS.leaf)} />
        <path d="M6.6 18.4L15.4 8.8" stroke={c(GLYPH_INKS.leafDeep)} stroke-width={0.8} stroke-linecap="round" />
        <path d={away >= 0 ? 'M18 5.6C18.4 12.8 14 18 6.4 18.6C12.6 16.6 16.4 12.4 18 5.6Z' : 'M6.4 18.6C6.2 11.6 10.4 6.4 18 5.6C11.8 8 7.8 12.4 6.4 18.6Z'} fill="var(--shade)" />
      </g>
    );
  }
  return (
    <Svg box="0 0 24 24" w={size} h={size} title={title} class={cls} style={style}>
      {art}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Pressing                                                            */
/* ------------------------------------------------------------------ */

/** Rest-day flowers drawn on a pressing, at most (DESIGN §13: "Rest days press as a small flower"). */
export const MAX_REST_FLOWERS = 6;

/** A pressed petal colour for a species: its first petal ink, faded a little into the paper; foliage presses green. */
export function pressedInk(species: PlantSpeciesId): string {
  const ink = PETAL_INKS[species]?.find((c) => !/^#F[89A-F]/i.test(c)) ?? PETAL_INKS[species]?.[0];
  return ink ?? GLYPH_INKS.leaf;
}

export interface PressingProps extends ArtBase {
  species: PlantSpeciesId;
  /** How often it was watered this month, 0..1 (sizes the pressing; a quiet month is as lovely, just smaller). */
  share: number;
  /** Rest days this month: each presses as a small flower at the foot (up to six). */
  rests?: number;
}

/** One habit's pressing on a Herbarium page (60 × 100 canvas; `size` is its height in px). */
export function Pressing({ species, share, rests = 0, size = 100, light: given, title, class: cls, style }: PressingProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const c = toner(light);
  const s = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));
  const top = 58 - 44 * s;
  const petal = c(pressedInk(species));
  const flowering = !!PETAL_INKS[species];
  const pairs = 1 + Math.round(s * 3);
  const leaves: string[] = [];
  for (let i = 0; i < pairs; i++) {
    const y = 88 - ((88 - top) * (i + 0.8)) / (pairs + 1);
    const l = 7 + s * 5;
    leaves.push(`M30 ${f(y)}C${f(30 - l * 0.4)} ${f(y - 1.6)} ${f(30 - l)} ${f(y - l * 0.5)} ${f(30 - l * 1.05)} ${f(y - l * 0.8)}C${f(30 - l * 0.5)} ${f(y - l * 0.7)} ${f(30 - l * 0.1)} ${f(y - 1.5)} 30 ${f(y)}Z`);
    leaves.push(`M30 ${f(y - 3)}C${f(30 + l * 0.4)} ${f(y - 4.6)} ${f(30 + l)} ${f(y - 3 - l * 0.5)} ${f(30 + l * 1.05)} ${f(y - 3 - l * 0.8)}C${f(30 + l * 0.5)} ${f(y - 3 - l * 0.7)} ${f(30 + l * 0.1)} ${f(y - 4.5)} 30 ${f(y - 3)}Z`);
  }
  const bloomR = 5 + 5 * s;
  const n = Math.max(0, Math.min(MAX_REST_FLOWERS, Math.floor(rests)));
  const restFlowers = Array.from({ length: n }, (_, i) => {
    const x = 30 + (i % 2 === 0 ? -1 : 1) * (7 + Math.floor(i / 2) * 6);
    return flowerPaths(x, 90 - (i % 3) * 1.4, 2.8);
  }).join('');
  return (
    <Svg box="0 0 60 100" w={size * 0.6} h={size} title={title} class={cls} style={style}>
      <g data-pressing={species}>
        <path d={`M30 94C29.4 80 30.8 ${f(top + 14)} 30 ${f(top)}`} fill="none" stroke={c(GLYPH_INKS.leafDeep)} stroke-width={1.1} stroke-linecap="round" />
        <path d={leaves.join('')} fill={c(PRESSED_LEAF)} />
        {flowering ? (
          <g>
            <path d={flowerPaths(30, top - bloomR * 0.3, bloomR)} fill={petal} opacity={0.92} />
            <path d={ell(30, top - bloomR * 0.3, bloomR * 0.26)} fill={c(GLYPH_INKS.heart)} />
          </g>
        ) : (
          <path d={`M30 ${f(top + 2)}C${f(30 - bloomR)} ${f(top - bloomR * 0.4)} ${f(30 - bloomR * 0.4)} ${f(top - bloomR * 1.6)} 30 ${f(top - bloomR * 1.7)}C${f(30 + bloomR * 0.4)} ${f(top - bloomR * 1.6)} ${f(30 + bloomR)} ${f(top - bloomR * 0.4)} 30 ${f(top + 2)}Z`} fill={c(GLYPH_INKS.leaf)} />
        )}
        {restFlowers && <path d={restFlowers} fill={c(GLYPH_INKS.moon)} data-rests={n} />}
        {/* a strip of paper tape holding the stem to the page */}
        <path d="M20.6 72.4L39.2 69.8L39.8 74.2L21.2 76.8Z" fill={c('#F4ECDD')} opacity={0.88} />
      </g>
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* NoteCard                                                            */
/* ------------------------------------------------------------------ */

export type NoteCardKind = 'sundayNote' | 'herbarium' | 'anniversary' | 'story';

export interface NoteCardProps extends ArtBase {
  kind: NoteCardKind;
  /** A Sunday Note's sketch: the week's activity, drawn in pencil (the routine prop's own art, §14.1). */
  sketch?: Routine;
  /** A Herbarium page's pressings (its top three, left to right). */
  pressings?: readonly { species: PlantSpeciesId; share: number; rests?: number }[];
}

const CARD = { paper: '#FFFBF3', edge: '#EFE5D5', rule: '#DCD0BE', clip: '#C9A45A', clipDeep: '#A98640', bow: '#EFB4C1', knot: '#E29AAD' };

/** A note card as kept on the memory shelf (100 × 100 canvas, standing on y 92). */
export function NoteCard({ kind, sketch, pressings, size = 96, light: given, title, class: cls, style }: NoteCardProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const c = toner(light);
  const away = awayOf(light) || 1;
  const tall = kind === 'herbarium';
  const [x0, x1, y0, y1] = tall ? [22, 78, 10, 90] : [10, 90, 22, 86];
  const edge = away > 0 ? `M${x1} ${y1}L${x1 + 2.2} ${y1 - 1}L${x1 + 2.2} ${y0 + 1.4}L${x1} ${y0}Z` : `M${x0} ${y1}L${x0 - 2.2} ${y1 - 1}L${x0 - 2.2} ${y0 + 1.4}L${x0} ${y0}Z`;
  const mid = (x0 + x1) / 2;
  const lines = (from: number, to: number, ys: number[]) => ys.map((y, i) => `M${from} ${y}H${to - (i % 3) * 6}`).join('');
  let body: JSX.Element | null = null;
  if (kind === 'herbarium') {
    const ps = (pressings?.length ? pressings : [{ species: 'lavender' as PlantSpeciesId, share: 0.7 }]).slice(0, 3);
    const w = (x1 - x0 - 8) / ps.length;
    body = (
      <g>
        {ps.map((p, i) => (
          <g key={i} transform={`translate(${f(x0 + 4 + i * w + w / 2 - 15)} ${f(y0 + 10)}) scale(0.5)`}>
            <PressingArt species={p.species} share={p.share} rests={p.rests ?? 0} c={c} />
          </g>
        ))}
        <path d={lines(x0 + 6, x1 - 6, [y1 - 10])} stroke={c(CARD.rule)} stroke-width={1.1} stroke-linecap="round" />
      </g>
    );
  } else {
    const art = kind === 'sundayNote' && sketch ? ROUTINE_ART[sketch]?.art({ light: { from: 'left', night: false } }) : null;
    body = (
      <g>
        <path d={lines(x0 + 7, art ? mid + 4 : x1 - 7, [y0 + 14, y0 + 22, y0 + 30, y0 + 38, y0 + 46, y0 + 54].slice(0, kind === 'story' ? 5 : 6))} stroke={c(CARD.rule)} stroke-width={1.2} stroke-linecap="round" />
        {art && (
          <g transform={`translate(${f(mid + 6)} ${f(y0 + 10)}) scale(0.34)`} opacity={0.8} data-sketch={sketch}>
            {/* a faded sketch: the routine prop's own drawing, its colours washed out like pencil on paper */}
            {muteTree(muteTree(art))}
          </g>
        )}
        {kind === 'anniversary' && (
          <g>
            <path d={`M${mid} ${y1 - 14}l-7 -4l0.4 8.6Z M${mid} ${y1 - 14}l7 -4l-0.4 8.6Z`} fill={c(CARD.bow)} />
            <path d={`M${mid - 1.6} ${y1 - 15.6}h3.2v3.2h-3.2Z`} fill={c(CARD.knot)} />
          </g>
        )}
        {kind === 'story' && <path d={`M${x1 - 16} ${y1 - 12}C${x1 - 16} ${y1 - 20} ${x1 - 10} ${y1 - 24} ${x1 - 6} ${y1 - 24}C${x1 - 6} ${y1 - 16} ${x1 - 10} ${y1 - 12} ${x1 - 16} ${y1 - 12}Z`} fill={c(GLYPH_INKS.leaf)} />}
      </g>
    );
  }
  return (
    <Svg box="0 0 100 100" w={size} h={size} title={title} class={cls} style={style}>
      <g data-note={kind}>
        <ellipse cx={mid + away * 2} cy={y1 + 2} rx={(x1 - x0) / 2 + 2} ry={1.8} fill="var(--contact)" />
        <path d={edge} fill={c(CARD.edge)} />
        <path d={`M${x0} ${y0}H${x1}V${y1}H${x0}Z`} fill={c(CARD.paper)} />
        <path d={away > 0 ? `M${x1 - 4} ${y0}H${x1}V${y1}H${x1 - 4}Z` : `M${x0} ${y0}H${x0 + 4}V${y1}H${x0}Z`} fill="var(--shade)" />
        {body}
        {/* the paper clip over the top edge */}
        <path d={`M${x0 + 12} ${y0 + 12}V${y0 - 5}a3 3 0 0 1 6 0V${y0 + 9}a1.8 1.8 0 0 1 -3.6 0V${y0 - 2}`} fill="none" stroke={c(CARD.clip)} stroke-width={1.4} stroke-linecap="round" />
        <path d={`M${x0 + 12} ${y0}V${y0 + 12}`} fill="none" stroke={c(CARD.clipDeep)} stroke-width={1.4} stroke-linecap="round" />
      </g>
    </Svg>
  );
}

/** A pressing drawn inside another drawing (the Herbarium card): the Pressing's own shapes on its 60 × 100 canvas. */
function PressingArt({ species, share, rests, c }: { species: PlantSpeciesId; share: number; rests: number; c: (hex: string) => string }) {
  const s = Math.max(0, Math.min(1, share));
  const top = 58 - 44 * s;
  const bloomR = 5 + 5 * s;
  const flowering = !!PETAL_INKS[species];
  return (
    <g>
      <path d={`M30 94C29.4 80 30.8 ${f(top + 14)} 30 ${f(top)}`} fill="none" stroke={c(GLYPH_INKS.leafDeep)} stroke-width={1.6} stroke-linecap="round" />
      <path d={`M30 78C24 76 20 72 19 68C25 68 29 72 30 78ZM30 70C36 68 40 64 41 60C35 60 31 64 30 70Z`} fill={c(GLYPH_INKS.leaf)} />
      {flowering ? <path d={flowerPaths(30, top - bloomR * 0.3, bloomR)} fill={c(pressedInk(species))} /> : <path d={ell(30, top - 2, bloomR * 0.6, bloomR)} fill={c(GLYPH_INKS.leaf)} />}
      {rests > 0 && <path d={Array.from({ length: Math.min(MAX_REST_FLOWERS, rests) }, (_, i) => flowerPaths(30 + (i % 2 ? 1 : -1) * (8 + Math.floor(i / 2) * 6), 90, 2.8)).join('')} fill={c(GLYPH_INKS.moon)} />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* MonthJar                                                            */
/* ------------------------------------------------------------------ */

/** Stems drawn in the jar, at most (one per habit watered this month). */
export const MAX_JAR_STEMS = 14;

export interface MonthJarProps extends ArtBase {
  /** One stem per habit watered this month (todayVM.monthJar). */
  stems: readonly { habitId: string; plant: PlantSpeciesId }[];
}

/** Where each stem leans and how tall it stands, by its place in the jar (stable for the same habits). */
export function jarStems(n: number): { angle: number; h: number }[] {
  const k = Math.max(0, Math.min(MAX_JAR_STEMS, n));
  return Array.from({ length: k }, (_, i) => {
    const t = k === 1 ? 0.5 : i / (k - 1);
    return { angle: -34 + 68 * t, h: 34 + ((i * 7) % 5) * 3 };
  });
}

/** This month's flowers: a jam jar of water on the sill with a stem from each habit watered (100 canvas, on y 92). */
export function MonthJar({ stems, size = 96, light: given, title, class: cls, style }: MonthJarProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const c = toner(light);
  const away = awayOf(light) || 1;
  const shown = stems.slice(0, MAX_JAR_STEMS);
  const lay = jarStems(shown.length);
  const neck = { x: 50, y: 56 };
  return (
    <Svg box="0 0 100 100" w={size} h={size} title={title} class={cls} style={style}>
      <g data-month-jar={shown.length}>
        <ellipse cx={50 + away * 2} cy={92.4} rx={20} ry={2} fill="var(--contact)" />
        {shown.map((st, i) => {
          const { angle, h } = lay[i]!;
          const a = (angle * Math.PI) / 180;
          const tx = neck.x + Math.sin(a) * h;
          const ty = neck.y - Math.cos(a) * h;
          const ink = PETAL_INKS[st.plant] ? pressedInk(st.plant) : GLYPH_INKS.leaf;
          return (
            <g key={st.habitId} data-stem={st.habitId}>
              <path d={`M50 86Q${f(50 + Math.sin(a) * 10)} 60 ${f(tx)} ${f(ty)}`} fill="none" stroke={c(GLYPH_INKS.leafDeep)} stroke-width={1.1} stroke-linecap="round" />
              {PETAL_INKS[st.plant] ? <path d={flowerPaths(tx, ty, 4.2)} fill={c(ink)} /> : <path d={ell(tx, ty, 2.2, 3.6)} fill={c(ink)} transform={`rotate(${f(angle)} ${f(tx)} ${f(ty)})`} />}
              {PETAL_INKS[st.plant] && <path d={ell(tx, ty, 1.2)} fill={c(GLYPH_INKS.heart)} />}
            </g>
          );
        })}
        {/* the jar: clear glass, the water, a twine tie at the neck, its crescent away from the light */}
        <path d="M34 60C34 57 36 56 38 56H62C64 56 66 57 66 60V88C66 90.4 64.4 92 62 92H38C35.6 92 34 90.4 34 88Z" fill={c('#E6EEF1')} opacity={0.55} />
        <path d="M35 70H65V88C65 90 63.6 91.2 61.6 91.2H38.4C36.4 91.2 35 90 35 88Z" fill={c('#CFE1EA')} opacity={0.6} />
        <path d="M36 58.6H64V61.4H36Z" fill={c('#C9AE84')} />
        <path d={away > 0 ? 'M60 56H62C64 56 66 57 66 60V88C66 90.4 64.4 92 62 92H60C62 92 62.8 90.4 62.8 88V60C62.8 57 62 56 60 56Z' : 'M40 56H38C36 56 34 57 34 60V88C34 90.4 35.6 92 38 92H40C38 92 37.2 90.4 37.2 88V60C37.2 57 38 56 40 56Z'} fill="var(--shade)" />
        <path d={away > 0 ? 'M38.4 62V84' : 'M61.6 62V84'} stroke="#FFFFFF" stroke-width={1.2} stroke-linecap="round" opacity={light.night ? 0.3 : 0.6} />
      </g>
    </Svg>
  );
}

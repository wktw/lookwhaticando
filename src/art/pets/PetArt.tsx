import { Fragment, type JSX } from 'preact';
import { useId } from 'preact/hooks';
import type { Outfit } from '@/state/types';
import { getCollectible } from '@/catalog/collectibles';
import { DAY_LIGHT, type Light } from '@/art/light';
import { WEARABLE_ART } from '../wearables';
import { canonicalExpression, type Expression, type MarkId, type PetLook, type Pose, type TraitId } from './types';
import { getLook } from './looks';
import { SPECIES_ART } from './species';
import type { DrawCtx } from './species/art';
import { mix, spriteTones, tonesFor, type PaletteMode } from './palette';
import { pathBox, poseBounds, type Box } from './bounds';
import { crescentPath } from './crescents';
import { BASELINE, frameTransform, SHADE_FOR, type Layer, type LitKey, type PoseRig, type TailRig } from './rig';
import { fmt, place } from './shape';
import { dots } from './species/marks';
import { WearHead, WearNeck, WearBody, wearCtxFor } from './wear';
import './pet.css';

export interface PetArtProps {
  /** Pet collectible id, e.g. 'pet-cat-calico', or a Moonlit variant 'moonlit:pet-cat-calico'. */
  petId: string;
  outfit?: Outfit;
  expression?: Expression;
  /**
   * A true posture (DESIGN §8.1). Default 'sit'. `carry` is the pet lifted by a hand on the Shelf (DESIGN §8.2): the
   * standing body held up with its legs dangling, no contact shadow, swinging a little like a pendulum while live.
   */
  pose?: ArtPose;
  /** Windowlight: where the light comes from, and whether it is the lamp. Default: the window, from the left. */
  light?: Light;
  /** Idle life: breathing, blinking, a tail flick, the walk cycle. */
  animated?: boolean;
  /** CSS size (number = px). Square. */
  size?: number | string;
  /** The pixel size when `size` is not a number (e.g. '100%'), so the small-size floors still apply. */
  px?: number;
  facing?: 'left' | 'right';
  /** Render as an unowned silhouette (a flat shape in a muted token). */
  silhouette?: boolean;
  /** Field Guide "not yet": the same drawing at 35% saturation. */
  muted?: boolean;
  /** Draw the contact shadow (default true). */
  shadow?: boolean;
  /**
   * Tile mode (Field Guide tiles, reveals, inventory): the pet fills the frame instead of keeping
   * its true size relative to other species. Leave it off where pets share a scene.
   */
  fit?: boolean;
  /** Accessible label. When omitted the art is decorative (aria-hidden). */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /** Override look (gallery and tests). */
  look?: PetLook;
}

/** Every pose PetArt draws: the rigs' true postures, and `carry` (derived from the stand). */
export type ArtPose = Pose | 'carry';

/** How far a carried pet's legs hang below their hips, as a stretch of the leg (DESIGN §8.2 "dangling feet"). */
export const DANGLE = 1.24;

/** Stable pseudo-random 0..1 from a string (desynchronised idle timings). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export type Tier = 'micro' | 'small' | 'medium' | 'full';

/** Size floors (DESIGN §10.4): ≤ 20 px a three-shape sprite, ≤ 32 px the loaf with closed eyes. */
export function tierFor(px: number | undefined): Tier {
  if (px === undefined) return 'full';
  if (px <= 20) return 'micro';
  if (px <= 32) return 'small';
  if (px < 48) return 'medium';
  return 'full';
}

/** The lit side in the art's own frame: a left-facing pet is mirrored, so left and right swap. */
function litSide(light: Light, facing: 'left' | 'right'): LitKey {
  if (light.from === 'top') return 'top';
  if (facing === 'right') return light.from;
  return light.from === 'left' ? 'right' : 'left';
}

/** Where a sock's bottom sits, to stretch it upward into a glove. Cached per path. */
const sockFoot = new Map<string, number>();
function gloveT(sock: string, k: number): string {
  let y = sockFoot.get(sock);
  if (y === undefined) sockFoot.set(sock, (y = pathBox(sock).y1));
  return `translate(0 ${fmt(y)}) scale(1 ${k}) translate(0 ${fmt(-y)})`;
}

function Layers({ layers, c, part, cls, dangle }: { layers?: Layer[]; c: DrawCtx; part: 'front' | 'frontB' | 'back' | 'backB'; cls?: string; dangle?: boolean }) {
  if (!layers?.length) return null;
  const t = c.tones;
  const rim = t.dark && !c.silhouette;
  // Birman gloves and Ragdoll mitts: white paws that reach up the leg.
  const glove = c.has('mitts') ? 1.9 : c.has('gloves') ? 1.7 : 0;
  const items = layers.map((l, i) => {
    const sockTone = l.sockTone ? t[l.sockTone] : l.tone === 'legFar' ? t.pawFar : l.tone === 'foot' || l.tone === 'footFar' ? null : t.paw;
    const shade = l.lit && !c.silhouette ? c.crescent(`${part}${i}` as never, c.shade) : '';
    const glow = l.lit && rim ? c.crescent(`${part}${i}` as never, `rim-${c.lit}`) : '';
    const tone = t[l.tone] ?? t.coat;
    const lower = l.lower && tone !== t.coat;
    const gloved = glove && l.sock && sockTone && !l.sockTone;
    const shapes = (
      <>
        <path d={l.d} fill={lower ? mix(t.coat, tone, 0.38) : tone} />
        {lower && <path d={l.lower} fill={tone} />}
        {l.sock && sockTone && <path d={l.sock} fill={sockTone} transform={gloved ? gloveT(l.sock, glove) : undefined} />}
        {shade && <path d={shade} fill="var(--shade)" />}
        {glow && <path d={glow} fill={c.night ? 'var(--lamp)' : DAY_RIM} opacity={c.night ? 0.45 : 0.5} />}
      </>
    );
    // A carried pet's legs hang from the hip: the leg (and its crescents) stretched down from its top.
    const hang = dangle ? legHang(l.d) : undefined;
    return l.cls || hang ? (
      <g key={i} class={l.cls} transform={hang}>
        {shapes}
      </g>
    ) : (
      <Fragment key={i}>{shapes}</Fragment>
    );
  });
  return cls ? <g class={cls}>{items}</g> : <>{items}</>;
}

/** Where a leg hangs from when carried: stretched down from its top edge. Cached per path. */
const hips = new Map<string, number>();
function legHang(d: string): string {
  let y = hips.get(d);
  if (y === undefined) hips.set(d, (y = pathBox(d).y0));
  return `translate(0 ${fmt(y)}) scale(1 ${DANGLE}) translate(0 ${fmt(-y)})`;
}

/** The window's cool edge light on a dark coat by day (the style frames' "rim light"). */
const DAY_RIM = '#B4B0D2';

/**
 * A lit part: its crescent in the room's shade and, on a dark coat, a thin rim on the lit side:
 * the window's cool light by day, the lamp's warm light at night, so it never sinks into the room.
 */
function Light({ c, part, rim }: { c: DrawCtx; part: 'body' | 'head' | 'tail' | 'tailCurl'; rim: boolean }) {
  const d = c.crescent(part, c.shade);
  const r = rim ? c.crescent(part, `rim-${c.lit}`) : '';
  return (
    <>
      {d && <path class="pet-shade" d={d} fill="var(--shade)" />}
      {r && <path class="pet-rim" d={r} fill={c.night ? 'var(--lamp)' : DAY_RIM} opacity={c.night ? 0.45 : 0.5} />}
    </>
  );
}

function Tail({ c, tail, part }: { c: DrawCtx; tail: TailRig; part: 'tail' | 'tailCurl' }) {
  const t = c.tones;
  const cat = c.look.species === 'cat';
  const wag = c.animated && c.look.species === 'dog' && c.face.expr === 'happy';
  // A cat flicks only the tip: the tail is drawn as a still shaft and a tip that turns on the joint.
  const flick = c.animated && cat && part === 'tail' && !!tail.end;
  const tipped = t.tip !== t.tail && !c.silhouette;
  const rings = c.has('tabby') && tail.rings;
  const clip = !tail.tuft && (tipped || rings);
  const plume = c.trait('longhair') || c.trait('fluffy');
  const piece = (d: string, id: string, shade: string, key: string) => (
    <Fragment key={key}>
      <path d={d} fill={t.tail} />
      {clip && (
        <>
          <clipPath id={id}>
            <path d={d} />
          </clipPath>
          <g clip-path={`url(#${id})`}>
            {rings && <path d={tail.rings} fill={t.mark} />}
            {tipped && tail.fade && <path d={tail.fade} fill={mix(t.tail, t.tip, 0.5)} />}
            {tipped && <path d={tail.tip} fill={t.tip} />}
          </g>
        </>
      )}
      {shade && <path class="pet-shade" d={shade} fill="var(--shade)" />}
    </Fragment>
  );
  const plumeT = `translate(${tail.pivot[0]} ${tail.pivot[1]}) scale(1.14) translate(${-tail.pivot[0]} ${-tail.pivot[1]})`;
  if (flick) {
    const [x, y] = tail.end!.pivot;
    const sh = (p: 'tailShaft' | 'tailEnd') => (c.silhouette ? '' : c.crescent(p, c.shade));
    return (
      <g>
        {plume && <path d={tail.d} fill={t.tail} transform={plumeT} />}
        {piece(c.crescent('tailShaft', 'shape') || tail.d, `${c.uid}-t`, sh('tailShaft'), 's')}
        <g transform={`translate(${fmt(x)} ${fmt(y)})`}>
          <g class="pet-tailflick">
            <g transform={`translate(${fmt(-x)} ${fmt(-y)})`}>{piece(tail.end!.d, `${c.uid}-te`, sh('tailEnd'), 'e')}</g>
          </g>
        </g>
      </g>
    );
  }
  const body = (
    <g>
      {plume && <path d={tail.d} fill={t.tail} transform={plumeT} />}
      {piece(tail.d, `${c.uid}-t`, c.silhouette ? '' : c.crescent(part, c.shade), 'w')}
      {tail.tuft && <path d={tail.tip} fill={t.tip} />}
    </g>
  );
  if (!wag) return body;
  const [x, y] = tail.pivot;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g class="pet-wag">
        <g transform={`translate(${-x} ${-y})`}>{body}</g>
      </g>
    </g>
  );
}

const SPRITE_POSE: Pose = 'loaf';

/** A tile's frame: the pet fills about 80% of the canvas height or 88% of its width. */
const FIT_H = 80;
const FIT_W = 88;

/**
 * The species scale for a drawing. In the world (a sill, a place) pets keep their true relative
 * sizes, eased toward full size at small sizes so tiny pets stay legible. In a tile (`fit`) every
 * pet fills the frame, keeping only a hint of its size (a hamster a touch smaller than a cow).
 */
export function scaleFor(tier: Tier, base: number, fit: boolean, bounds: Box, stocky: number): { s: number; dx: number } {
  if (fit) {
    const h = BASELINE - bounds.y0;
    const w = (bounds.x1 - bounds.x0) * stocky;
    const hint = Math.min(1.03, Math.max(0.92, (base / 0.84) ** 0.15));
    const s = Math.min(1.7, Math.min(FIT_H / h, FIT_W / w) * hint);
    return { s, dx: -((bounds.x0 + bounds.x1) / 2 - 50) * s * stocky };
  }
  const s = tier === 'small' ? 0.9 + (base - 0.9) * 0.25 : tier === 'medium' ? base + (0.95 - base) * 0.4 : base;
  return { s, dx: 0 };
}

export function PetArt(props: PetArtProps) {
  const { petId, outfit, animated = false, size = 96, facing = 'right', silhouette = false, muted = false, shadow = true, fit = false, title } = props;
  const rawId = useId();
  const uid = `pet${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const look = props.look ?? getLook(petId);
  const art = SPECIES_ART[look.species];
  const { id: rigId, rig } = art.rigFor(look);
  const px = typeof size === 'number' ? size : props.px;
  const tier = tierFor(px);
  const light = props.light ?? DAY_LIGHT;
  const night = light.night;
  const mode: PaletteMode = silhouette ? 'silhouette' : muted ? (night ? 'muted-night' : 'muted') : night ? 'night' : 'day';
  const tones = tonesFor(look, mode);
  const marks = new Set<MarkId>(look.marks ?? []);
  const traits = new Set<TraitId>(look.traits ?? []);
  const has = (m: MarkId) => !silhouette && marks.has(m);
  const trait = (t: TraitId) => traits.has(t);
  const lit = litSide(light, facing);
  const shade = SHADE_FOR[lit];
  const live = animated && !silhouette;

  const r = hash01(petId);
  const timing = {
    '--pet-breathe-dur': `${(3.4 + r * 1.2).toFixed(2)}s`,
    '--pet-breathe-delay': `${(-r * 4).toFixed(2)}s`,
    '--pet-blink-dur': `${(4 + ((r * 7919) % 1) * 5).toFixed(2)}s`,
    '--pet-blink-delay': `${(-r * 9).toFixed(2)}s`,
    '--pet-flick-dur': `${(6 + r * 4).toFixed(2)}s`,
    '--pet-flick-delay': `${(-r * 6).toFixed(2)}s`,
  } as JSX.CSSProperties;

  const pxStr = typeof size === 'number' ? `${size}px` : size;
  const label = title ?? (silhouette ? undefined : getCollectible(petId)?.name);
  // Breathing and blinking stay under reduced motion (DESIGN §10.5): the root and the blink groups are motion-safe.
  const classes = ['pet-art', `species-${look.species}`, live ? 'is-animated ck-motion-safe' : '', silhouette ? 'is-silhouette' : '', props.class ?? ''].filter(Boolean).join(' ');
  const flip = facing === 'left' ? 'translate(100 0) scale(-1 1)' : '';

  // Breathing is a transform on the <svg> itself (pet.css), so it composites as one box.
  const svg = (children: JSX.Element, pose: ArtPose | 'sprite') => (
    <svg
      class={classes}
      data-tier={tier}
      data-pose={pose}
      viewBox="0 0 100 100"
      width={pxStr}
      height={pxStr}
      style={{ ...timing, ...props.style }}
      role={title ? 'img' : undefined}
      aria-label={title ? label : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );

  const base = rig.scale * (look.scale ?? 1);

  if (tier === 'micro') {
    // The sprite keeps a hint of the species' size, eased as for the small tier.
    const k = fit ? 1 : (0.9 + (base - 0.9) * 0.25) / 0.9;
    const spriteT = `${flip}${k !== 1 ? ` translate(50 ${BASELINE}) scale(${fmt(k)}) translate(-50 ${-BASELINE})` : ''}`;
    return svg(
      <g transform={spriteT || undefined}>
        {shadow && <ellipse cx={48} cy={94.5} rx={36} ry={4} fill="var(--contact)" />}
        {art.sprite({ tones: spriteTones(tones), look, has, trait })}
      </g>,
      'sprite',
    );
  }

  const expr = canonicalExpression(props.expression);
  const askedArt = props.pose ?? 'sit';
  const carried = askedArt === 'carry';
  const asked: Pose = carried ? 'stand' : askedArt;
  // Size floors: ≤ 32 px the closed-eye loaf; below 48 px a curl reads as a blob, so it loafs too.
  const pose: Pose = tier === 'small' || (tier === 'medium' && asked === 'sleep') ? SPRITE_POSE : asked;
  const dangle = carried && pose === 'stand';
  const p: PoseRig = rig.poses[pose];
  const sleepy = tier === 'medium' && asked === 'sleep';
  const closed = !!p.eyesClosed || sleepy || (tier === 'small' && expr !== 'happy');
  const ctx: DrawCtx = {
    uid,
    rigId,
    rig,
    pose,
    p,
    look,
    tones,
    face: { tones, expr: p.eyesClosed || sleepy ? 'sleep' : expr, closed, full: tier === 'full', lit, animated: live },
    shade,
    lit,
    night,
    silhouette,
    animated: live,
    hat: !silhouette && !!outfit?.head && !!WEARABLE_ART[outfit.head],
    has,
    trait,
    crescent: (part, kind) => (part === 'head' ? crescentPath(rigId, 'head', kind) : crescentPath(rigId, pose, part, kind)),
  };

  const markArts = [...marks].map((m) => art.marks[m]).filter((m): m is NonNullable<typeof m> => !!m);
  const bodyMarks = markArts.map((m) => m.body).filter((f): f is NonNullable<typeof f> => !!f);
  const headMarks = markArts.map((m) => m.head).filter((f): f is NonNullable<typeof f> => !!f);
  const chest = !silhouette && markArts.some((m) => m.chest) ? ctx.crescent('chest', 'pale') : '';
  const wear = outfit && !silhouette ? outfit : undefined;
  const wearCtx = wearCtxFor(ctx);
  const bodyWear = wear?.body ? WEARABLE_ART[wear.body] : undefined;
  const showBodyWear = bodyWear && !bodyWear.hideIn?.includes(pose);
  const detail = art.bodyDetail?.(ctx);
  const needsBodyClip = !silhouette && (bodyMarks.length > 0 || showBodyWear || look.flecks || !!detail);
  const needsHeadClip = !silhouette && (headMarks.length > 0 || look.flecks);

  const stocky = look.stocky ?? 1;
  const { s, dx } = scaleFor(tier, base, fit, poseBounds(rigId, rig, pose), stocky);
  const sx = s * stocky;
  // One transform for the flip, the species scale and a tile's centring.
  const scaleT = `${flip} translate(${fmt(50 + dx)} ${BASELINE}) scale(${fmt(sx)} ${fmt(s)}) translate(-50 ${-BASELINE})`;

  const darkRim = tones.dark && !silhouette;
  const curled = trait('curled-tail') && !!p.tailCurl;
  const tail = trait('stub-tail') ? undefined : curled ? p.tailCurl : p.tail;
  const tailPart = curled ? 'tailCurl' : 'tail';
  const walkB = pose === 'walk' && p.frameB && live;
  const motion = live ? p.motion : undefined;
  const bob = motion === 'bob' ? 'pet-bob' : undefined;
  const sway = motion === 'waddle' ? 'pet-waddle' : motion === 'hop' ? 'pet-hop' : undefined;
  const tilt = expr === 'happy' ? ' rotate(-6)' : expr === 'surprised' ? ' translate(0 -1.2)' : '';
  const headT = place(p.head.x, p.head.y, p.head.s, p.head.r ?? 0) + tilt;
  const contactDx = shade === 'right' ? p.contact.rx * 0.08 : shade === 'left' ? -p.contact.rx * 0.08 : 0;
  const cast = silhouette ? '' : ctx.crescent('cast', shade);

  const body = (
    <>
      {needsBodyClip && (
        <clipPath id={`${uid}-b`}>
          <path d={p.body} />
        </clipPath>
      )}
      <path d={p.body} fill={tones.coat} />
      {needsBodyClip && (
        <g clip-path={`url(#${uid}-b)`}>
          {detail}
          {(bodyMarks.length > 0 || look.flecks || showBodyWear) && (
            <g transform={frameTransform(p.frame)}>
              {bodyMarks.map((m, i) => (
                <Fragment key={i}>{m(ctx)}</Fragment>
              ))}
              {look.flecks && <path d={dots(4, 4, 92, 70, 7, 1.1, 3.3, 1)} fill="#F4F0FF" opacity={0.7} />}
              {showBodyWear && <WearBody art={bodyWear!} ctx={wearCtx} />}
            </g>
          )}
        </g>
      )}
      {chest && !showBodyWear && <path d={chest} fill={tones.under} />}
      {cast && <path d={cast} fill="var(--shade)" />}
      {!silhouette && <Light c={ctx} part="body" rim={darkRim} />}
    </>
  );

  const head = (
    <g transform={headT}>
      {showBodyWear && bodyWear!.hood?.(wearCtx)}
      {art.ears(ctx)}
      {needsHeadClip && (
        <clipPath id={`${uid}-h`}>
          <path d={rig.head.d} />
        </clipPath>
      )}
      <path d={rig.head.d} fill={tones.head} />
      {needsHeadClip && (
        <g clip-path={`url(#${uid}-h)`}>
          {headMarks.map((m, i) => (
            <Fragment key={i}>{m(ctx)}</Fragment>
          ))}
          {look.flecks && <path d={dots(-14, -14, 26, 10, 3, 0.9, 5.1, 1)} fill="#F4F0FF" opacity={0.7} />}
        </g>
      )}
      {!silhouette && <Light c={ctx} part="head" rim={darkRim} />}
      {art.overHead?.(ctx)}
      {!silhouette && art.face(ctx)}
      {wear && <WearHead outfit={wear} ctx={wearCtx} front={false} />}
      {art.earsOverHat?.(ctx)}
      {wear && <WearHead outfit={wear} ctx={wearCtx} front />}
    </g>
  );

  const lower = (
    <>
      {tail && tail.layer === 'back' && <Tail c={ctx} tail={tail} part={tailPart} />}
      {art.behindBody?.(ctx)}
      {body}
    </>
  );
  const upper = (
    <>
      {tail && tail.layer === 'front' && <Tail c={ctx} tail={tail} part={tailPart} />}
      {art.overBody?.(ctx)}
      {wear?.neck && <WearNeck id={wear.neck} ctx={wearCtx} neck={p.neck} />}
      {head}
      {tail && tail.layer === 'over' && <Tail c={ctx} tail={tail} part={tailPart} />}
      {art.top?.(ctx)}
    </>
  );
  const figure = (
    <>
      <Layers layers={p.back} c={ctx} part="back" cls={walkB ? 'pet-walk-a' : undefined} dangle={dangle} />
      {walkB && <Layers layers={p.frameB!.back} c={ctx} part="backB" cls="pet-walk-b" />}
      {bob ? <g class={bob}>{lower}</g> : lower}
      <Layers layers={p.front} c={ctx} part="front" cls={walkB ? 'pet-walk-a' : undefined} dangle={dangle} />
      {walkB && <Layers layers={p.frameB!.front} c={ctx} part="frontB" cls="pet-walk-b" />}
      {bob ? <g class={bob}>{upper}</g> : upper}
    </>
  );

  if (dangle) {
    // Held by the scruff: the figure hangs from just above the neck, tipped a little nose-up, and swings.
    const [hx, hy] = [p.neck.x, p.neck.y - 8];
    return svg(
      <g transform={scaleT}>
        <g transform={`translate(${fmt(hx)} ${fmt(hy)})`}>
          <g class={live ? 'pet-dangle' : undefined}>
            <g transform={`rotate(-7) translate(${fmt(-hx)} ${fmt(-hy)})`}>{figure}</g>
          </g>
        </g>
      </g>,
      'carry',
    );
  }

  return svg(
    <g transform={scaleT}>
      {shadow && <ellipse cx={fmt(p.contact.cx + contactDx)} cy={BASELINE + 0.4} rx={p.contact.rx} ry={2.8} fill="var(--contact)" />}
      {sway ? (
        <g transform={`translate(50 ${BASELINE})`}>
          <g class={sway}>
            <g transform={`translate(-50 ${-BASELINE})`}>{figure}</g>
          </g>
        </g>
      ) : (
        figure
      )}
    </g>,
    pose,
  );
}

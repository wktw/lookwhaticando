import type { JSX } from 'preact';
import { useId, useMemo } from 'preact/hooks';
import type { Outfit } from '@/state/types';
import { getCollectible } from '@/catalog/collectibles';
import { ANCHORS, BODIES, FOOT_LEFT, FOOT_RIGHT, OUTLINE, STROKE, VIEWBOX } from './geometry';
import type { ArtCtx, BodyPart, Expression, PetLook, TraitArt } from './types';
import { auraOf, getLook } from './looks';
import { SPECIES_ART } from './species';
import { PATTERNS } from './patterns';
import { TRAITS } from './traits';
import { DefaultEyes, Blush } from './face';
import { Aura, Sparkles } from './aura';
import { WEARABLE_ART } from '../wearables';
import './pet.css';

export interface PetArtProps {
  /** Pet collectible id, e.g. 'pet-cat-calico'. */
  petId: string;
  outfit?: Outfit;
  expression?: Expression;
  /** Idle life: breathing, blinking, tail sway. */
  animated?: boolean;
  /** CSS size (number = px). Square. */
  size?: number | string;
  facing?: 'left' | 'right';
  /** Render as an unowned silhouette. */
  silhouette?: boolean;
  /** Draw the soft ground shadow (default true). */
  shadow?: boolean;
  /** Accessible label. When omitted the art is decorative (aria-hidden). */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /** Override look (used by the gallery & tests). */
  look?: PetLook;
}

/** Stable pseudo-random 0..1 from a string (for desynchronized idle timings). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** The look's traits, minus any that step aside for real wear in the slot they occupy. */
function activeTraits(look: PetLook, outfit: Outfit | undefined): TraitArt[] {
  const out: TraitArt[] = [];
  for (const id of look.traits ?? []) {
    const t = TRAITS[id];
    if (t && !(t.occupies && outfit?.[t.occupies])) out.push(t);
  }
  return out;
}

const DEFAULT_SHEEN = { cx: 34, cy: 41, rx: 10, ry: 5.5, rotate: -28 };
const WEAR_SLOTS = ['body', 'neck', 'face', 'head'] as const;

export function PetArt(props: PetArtProps) {
  const { petId, outfit, expression = 'idle', animated = false, size = 96, facing = 'right', silhouette = false, shadow = true, title } = props;
  const rawId = useId();
  const uid = `pet${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const look = props.look ?? getLook(petId);
  const species = SPECIES_ART[look.species];
  const anchors = ANCHORS[look.species];
  const traits = activeTraits(look, outfit);
  const body = traits.reduce((shape, t) => (t.body ? t.body(shape, anchors) : shape), BODIES[look.species]);
  const hidden = new Set<BodyPart>(traits.flatMap((t) => t.replaces ?? []));
  const bodyClipId = `${uid}-body`;
  const ctx: ArtCtx = { uid, bodyClip: `url(#${bodyClipId})`, expression, anchors, body, look, hidden };

  const r = useMemo(() => hash01(petId + rawId), [petId, rawId]);
  const timing = {
    '--pet-breathe-dur': `${(3 + r * 0.8).toFixed(2)}s`,
    '--pet-breathe-delay': `${(-r * 3).toFixed(2)}s`,
    '--pet-blink-dur': `${(3.6 + r * 2.6).toFixed(2)}s`,
    '--pet-blink-delay': `${(-r * 5).toFixed(2)}s`,
    '--pet-tail-dur': `${(2.2 + r * 1.2).toFixed(2)}s`,
    '--pet-idle-delay': `${(-r * 7).toFixed(2)}s`,
  } as JSX.CSSProperties;

  const pattern = PATTERNS[look.pattern];
  const p = look.palette;
  const sheen = body.sheen ?? DEFAULT_SHEEN;
  const aura = silhouette ? undefined : auraOf(look, petId);

  const worn = (slot: keyof Outfit) => {
    const id = outfit?.[slot];
    return id ? WEARABLE_ART[id] : undefined;
  };
  const wear = (slot: keyof Outfit) => {
    const art = worn(slot);
    return art ? <g class={`pet-wear pet-wear-${slot}`}>{art.render(ctx)}</g> : null;
  };
  const headWear = wear('head');
  const wearBehind = WEAR_SLOTS.map((slot) => {
    const layer = worn(slot)?.behind?.(ctx);
    return layer ? <g key={slot}>{layer}</g> : null;
  });
  const bodyOver = worn('body')?.over?.(ctx);
  // Ears (and horns) stand in front of hats for species that wear hats behind them;
  // small accessories (bows, clips, wreaths) opt to sit in front of the ears anyway.
  const earsFront = anchors.headWearBehindFeatures;
  const hatBehindEars = earsFront && !worn('head')?.overEars;
  const ears = hidden.has('ears') ? null : species.ears?.(ctx);

  const classes = [
    'pet-art',
    `species-${look.species}`,
    animated && !silhouette ? 'is-animated' : '',
    silhouette ? 'is-silhouette' : '',
    aura ? `aura-${aura}` : '',
    props.class ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const px = typeof size === 'number' ? `${size}px` : size;
  const label = title ?? (silhouette ? undefined : getCollectible(petId)?.name);

  return (
    <svg
      class={classes}
      viewBox={VIEWBOX}
      width={px}
      height={px}
      style={{ ...timing, ...props.style }}
      role={title ? 'img' : undefined}
      aria-label={title ? label : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={bodyClipId}>
          <path d={body.path} />
        </clipPath>
      </defs>
      {aura && <Aura kind={aura} uid={uid} />}
      {shadow && <ellipse class="pet-shadow" cx={50} cy={94.5} rx={31} ry={3.6} fill={OUTLINE} opacity={0.12} />}
      <g transform={facing === 'left' ? 'translate(100 0) scale(-1 1)' : undefined}>
        <g class="pet-idle">
          <g class="pet-breathe">
            {wearBehind}
            {traits.map((t, i) => t.back && <g key={`tb${i}`}>{t.back(ctx)}</g>)}
            {!hidden.has('tail') && species.tail?.(ctx)}
            {species.back(ctx)}
            {!earsFront && ears}
            <path d={body.path} fill={p.body} />
            {/* surface: pattern, species overlay, trait surfaces, shading, clothing, all clipped to the body */}
            <g clip-path={ctx.bodyClip}>
              {pattern(ctx)}
              {species.overlay?.(ctx)}
              {traits.map((t, i) => t.surface && <g key={`ts${i}`}>{t.surface(ctx)}</g>)}
              <ellipse
                cx={sheen.cx}
                cy={sheen.cy}
                rx={sheen.rx}
                ry={sheen.ry}
                transform={`rotate(${sheen.rotate} ${sheen.cx} ${sheen.cy})`}
                fill="#fff"
                opacity={0.38}
              />
              <ellipse cx={50} cy={97} rx={40} ry={12} fill={OUTLINE} opacity={0.07} />
              {wear('body')}
            </g>
            <path d={body.path} fill="none" stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" />
            {bodyOver}
            {!hidden.has('feet') &&
              (species.feet ? (
                species.feet(ctx)
              ) : (
                <g fill={p.feet ?? p.body} stroke={OUTLINE} stroke-width={STROKE * 0.9}>
                  <ellipse {...FOOT_LEFT} />
                  <ellipse {...FOOT_RIGHT} />
                </g>
              ))}
            <Blush ctx={ctx} />
            {species.eyes ? species.eyes(ctx) : <DefaultEyes ctx={ctx} />}
            {!hidden.has('mouth') && species.mouth(ctx)}
            {hatBehindEars && headWear}
            {wear('neck')}
            {wear('face')}
            {earsFront && ears}
            {species.front?.(ctx)}
            {traits.map((t, i) => t.front && <g key={`tf${i}`}>{t.front(ctx)}</g>)}
            {!hatBehindEars && headWear}
            {traits.map((t, i) => t.top && <g key={`tt${i}`}>{t.top(ctx)}</g>)}
          </g>
        </g>
      </g>
      {(aura === 'sparkle' || aura === 'holo') && <Sparkles holo={aura === 'holo'} />}
    </svg>
  );
}

import type { JSX } from 'preact';
import { useId, useMemo } from 'preact/hooks';
import type { Outfit } from '@/state/types';
import { getCollectible } from '@/catalog/collectibles';
import { ANCHORS, BODY_PATH, FOOT_LEFT, FOOT_RIGHT, OUTLINE, STROKE, VIEWBOX } from './geometry';
import type { ArtCtx, Expression, PetLook } from './types';
import { getLook } from './looks';
import { SPECIES_ART } from './species';
import { PATTERNS } from './patterns';
import { TRAITS } from './traits';
import { DefaultEyes, Blush } from './face';
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

export function PetArt(props: PetArtProps) {
  const { petId, outfit, expression = 'idle', animated = false, size = 96, facing = 'right', silhouette = false, shadow = true, title } = props;
  const rawId = useId();
  const uid = `pet${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const look = props.look ?? getLook(petId);
  const species = SPECIES_ART[look.species];
  const anchors = ANCHORS[look.species];
  const bodyClipId = `${uid}-body`;
  const ctx: ArtCtx = { uid, bodyClip: `url(#${bodyClipId})`, expression, anchors, look };

  const r = useMemo(() => hash01(petId + rawId), [petId, rawId]);
  const timing = {
    '--pet-breathe-dur': `${(3 + r * 0.8).toFixed(2)}s`,
    '--pet-breathe-delay': `${(-r * 3).toFixed(2)}s`,
    '--pet-blink-dur': `${(3.6 + r * 2.6).toFixed(2)}s`,
    '--pet-blink-delay': `${(-r * 5).toFixed(2)}s`,
    '--pet-tail-dur': `${(2.2 + r * 1.2).toFixed(2)}s`,
  } as JSX.CSSProperties;

  const traits = (look.traits ?? []).map((t) => TRAITS[t]).filter((t): t is NonNullable<typeof t> => !!t);
  const pattern = PATTERNS[look.pattern] ?? PATTERNS.none!;
  const p = look.palette;

  const wear = (slot: keyof Outfit) => {
    const id = outfit?.[slot];
    if (!id) return null;
    const art = WEARABLE_ART[id];
    if (!art) return null;
    return <g class={`pet-wear pet-wear-${slot}`}>{art.render(ctx)}</g>;
  };
  const bodyWear = wear('body');
  const headWear = wear('head');

  const classes = ['pet-art', animated && !silhouette ? 'is-animated' : '', silhouette ? 'is-silhouette' : '', look.aura ? `aura-${look.aura}` : '', props.class ?? '']
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
          <path d={BODY_PATH} />
        </clipPath>
      </defs>
      {shadow && <ellipse class="pet-shadow" cx={50} cy={94.5} rx={31} ry={3.6} fill={OUTLINE} opacity={0.12} />}
      <g transform={facing === 'left' ? 'translate(100 0) scale(-1 1)' : undefined}>
        <g class="pet-breathe">
          {traits.map((t, i) => t.back && <g key={`tb${i}`}>{t.back(ctx)}</g>)}
          {species.back(ctx)}
          {/* body fill */}
          <path d={BODY_PATH} fill={p.body} />
          {/* surface: pattern, species overlay, shading, clothing, all clipped to the body */}
          <g clip-path={ctx.bodyClip}>
            {pattern(ctx)}
            {species.overlay?.(ctx)}
            <ellipse cx={34} cy={41} rx={10} ry={5.5} transform="rotate(-28 34 41)" fill="#fff" opacity={0.38} />
            <ellipse cx={50} cy={97} rx={40} ry={12} fill={OUTLINE} opacity={0.07} />
            {bodyWear}
          </g>
          <path d={BODY_PATH} fill="none" stroke={OUTLINE} stroke-width={STROKE} stroke-linejoin="round" />
          {/* feet */}
          <g fill={p.feet ?? p.body} stroke={OUTLINE} stroke-width={STROKE * 0.9}>
            <ellipse {...FOOT_LEFT} />
            <ellipse {...FOOT_RIGHT} />
          </g>
          {/* face */}
          <Blush ctx={ctx} />
          {species.eyes ? species.eyes(ctx) : <DefaultEyes ctx={ctx} />}
          {species.mouth(ctx)}
          {anchors.headWearBehindFeatures && headWear}
          {species.front?.(ctx)}
          {wear('neck')}
          {wear('face')}
          {traits.map((t, i) => t.front && <g key={`tf${i}`}>{t.front(ctx)}</g>)}
          {!anchors.headWearBehindFeatures && headWear}
          {traits.map((t, i) => t.top && <g key={`tt${i}`}>{t.top(ctx)}</g>)}
        </g>
      </g>
      {look.aura === 'sparkle' || look.aura === 'holo' ? <Sparkles /> : null}
    </svg>
  );
}

/** Four little ✦ sparkles orbiting rare/ultra variants. */
function Sparkles() {
  const star = 'M0 -4 C0.6 -1 1 -0.6 4 0 C1 0.6 0.6 1 0 4 C-0.6 1 -1 0.6 -4 0 C-1 -0.6 -0.6 -1 0 -4 Z';
  return (
    <g class="pet-sparkles" fill="#FFE593" stroke="#fff" stroke-width={0.6}>
      <path d={star} transform="translate(12 30) scale(0.9)" />
      <path d={star} transform="translate(89 40) scale(0.7)" />
      <path d={star} transform="translate(86 16) scale(1.1)" />
      <path d={star} transform="translate(16 70) scale(0.6)" />
    </g>
  );
}

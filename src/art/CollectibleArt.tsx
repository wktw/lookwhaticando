import type { JSX } from 'preact';
import { getCollectible } from '@/catalog/collectibles';
import { PetArt } from './pets/PetArt';
import { WEARABLE_ART } from './wearables';
import { TREAT_ART, DECOR_ART, PlaceholderItem } from './items';
import { PlantArt, PotArt } from './plants';
import { OUTLINE } from './pets/geometry';

export interface CollectibleArtProps {
  id: string;
  size?: number | string;
  animated?: boolean;
  silhouette?: boolean;
  /** Accessible label; decorative when omitted. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Renders any collectible by id: pets as characters, wearables as standalone icons,
 * treats/decor as item art, plants as a blooming plant in a terracotta pot, pots empty.
 */
export function CollectibleArt({ id, size = 96, animated, silhouette, title, class: cls, style }: CollectibleArtProps) {
  const def = getCollectible(id);
  const px = typeof size === 'number' ? `${size}px` : size;
  if (!def) return null;
  const wrapCls = [cls, silhouette ? 'collectible-silhouette' : ''].filter(Boolean).join(' ');

  switch (def.category) {
    case 'pet':
      return <PetArt petId={id} size={size} animated={animated} silhouette={silhouette} title={title} class={cls} style={style} />;
    case 'plant':
      return (
        <span class={wrapCls} style={{ display: 'inline-block', width: px, height: px, ...style }} role={title ? 'img' : undefined} aria-label={title}>
          <PlantArt species={def.plant} stage={5} pot="terracotta" size="100%" animated={animated} />
        </span>
      );
    case 'pot':
      return (
        <span class={wrapCls} style={{ display: 'inline-block', width: px, height: px, ...style }} role={title ? 'img' : undefined} aria-label={title}>
          <PotArt pot={def.pot} size="100%" />
        </span>
      );
    default: {
      const render =
        def.category === 'wearable'
          ? WEARABLE_ART[id]?.icon
          : def.category === 'treat'
            ? TREAT_ART[id]
            : DECOR_ART[id];
      return (
        <svg
          class={wrapCls}
          viewBox="0 0 100 100"
          width={px}
          height={px}
          style={style}
          role={title ? 'img' : undefined}
          aria-label={title}
          aria-hidden={title ? undefined : true}
        >
          {render ? render() : <PlaceholderItem />}
          {!render && <title>{def.name}</title>}
        </svg>
      );
    }
  }
}

export const ART_OUTLINE = OUTLINE;

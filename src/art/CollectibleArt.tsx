import type { JSX } from 'preact';
import { getCollectible } from '@/catalog/collectibles';
import type { Light } from './light';
import { PetArt } from './pets/PetArt';
import { WEARABLE_ART } from './wearables';
import { TREAT_ART, DECOR_ART, PlaceholderItem } from './items';
import { PlantArt, PotArt } from './plants/PlantArt';
import { muteTree } from './muted';
import { useArtLight } from './scene/moment';

export interface CollectibleArtProps {
  id: string;
  /** CSS size (number = px). Square. */
  size?: number | string;
  /**
   * The pixel size when `size` is not a number (a '100%' tile), so a pet's small-size floors still apply. Give it
   * whenever you know the tile's size.
   */
  px?: number;
  animated?: boolean;
  /** Not owned yet: a flat ink silhouette (a pet draws its own; items use the `.collectible-silhouette` repaint). */
  silhouette?: boolean;
  /** Field Guide "not yet": the same drawing at 35% saturation. */
  muted?: boolean;
  /**
   * Fill the tile (default true): a tree frog fills its tile as fully as a Rain Hat fills its own, so the animals
   * never read as the least important thing on the page. Off: pets keep their true size relative to one another.
   */
  fit?: boolean;
  /** The light (DESIGN §10.4). Left out: the app's one light (`artLight`: the window at this hour, the lamp after dark). */
  light?: Light;
  /** Accessible label; decorative when omitted. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Renders any collectible by id: pets as characters sitting up in their tile, wearables as standalone icons,
 * treats and decor as item art, plants as a blooming plant in a terracotta pot, pots empty. Every one is lit by the same
 * light as the scenes around it.
 */
export function CollectibleArt({ id, size = 96, px, animated, silhouette, muted = false, fit = true, light: given, title, class: cls, style }: CollectibleArtProps) {
  const appLight = useArtLight();
  const light = given ?? appLight;
  const def = getCollectible(id);
  const css = typeof size === 'number' ? `${size}px` : size;
  if (!def) return null;
  const wrapCls = [cls, silhouette && def.category !== 'pet' ? 'collectible-silhouette' : ''].filter(Boolean).join(' ');
  const tile = { display: 'inline-block', width: css, height: css, ...style };

  switch (def.category) {
    case 'pet':
      return (
        <PetArt
          petId={id}
          size={size}
          px={typeof size === 'number' ? size : px}
          fit={fit}
          pose="sit"
          light={light}
          animated={animated}
          silhouette={silhouette}
          muted={muted && !silhouette}
          title={title}
          class={cls}
          style={style}
        />
      );
    case 'plant':
      return (
        <span class={wrapCls} style={tile} role={title ? 'img' : undefined} aria-label={title}>
          <PlantArt species={def.plant} stage={5} pot="terracotta" size="100%" fit="icon" light={light} muted={muted} animated={animated} />
        </span>
      );
    case 'pot':
      return (
        <span class={wrapCls} style={tile} role={title ? 'img' : undefined} aria-label={title}>
          <PotArt pot={def.pot} size="100%" light={light} muted={muted} />
        </span>
      );
    default: {
      const render = def.category === 'wearable' ? WEARABLE_ART[id]?.icon : def.category === 'treat' ? TREAT_ART[id] : DECOR_ART[id];
      const art = render ? render({ light }) : null;
      return (
        <svg class={wrapCls} viewBox="0 0 100 100" width={css} height={css} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
          {art ? (muted ? muteTree(art) : art) : <PlaceholderItem />}
          {!render && <title>{def.name}</title>}
        </svg>
      );
    }
  }
}

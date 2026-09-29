import type { JSX } from 'preact';
import { getCollectible } from '@/catalog/collectibles';
import { CollectibleArt } from '@/art/CollectibleArt';

/**
 * A collectible drawn for the inside of a capsule (`CapsuleShell`'s `figure`): SVG on a 0–100
 * canvas. Most art is already an <svg>; plants and pots render as HTML, so they travel in a
 * foreignObject. The shell reprints it as one flat silhouette.
 */
export function CapsuleFigure({ id }: { id: string }): JSX.Element | null {
  const def = getCollectible(id);
  if (!def) return null;
  if (def.category === 'plant' || def.category === 'pot') {
    return (
      <foreignObject x={0} y={0} width={100} height={100}>
        <CollectibleArt id={id} size={100} />
      </foreignObject>
    );
  }
  return <CollectibleArt id={id} size={100} silhouette />;
}

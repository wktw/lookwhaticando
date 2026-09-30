import { useLayoutEffect, useRef } from 'preact/hooks';
import type { KeepsakeKind } from '@/state/types';
import { ObjectArt } from '@/art/scene';

/**
 * A keepsake drawn to fill its tile. `ObjectArt` draws on the Sill's 100 canvas, where a flat thing
 * (a paper bookmark, a pressed leaf) is a sliver along the bottom; at tile size that reads as an empty
 * square. This crops the canvas to the drawing (its measured box, squared, with a little air), so a
 * bookmark is a bookmark at 48 px. (A `fit` prop on ObjectArt would retire this: NOTES-open.md.)
 */
export function FitObject({ keepsake, size }: { keepsake: KeepsakeKind; size: number }) {
  const box = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const svg = box.current?.querySelector('svg');
    if (!svg || typeof (svg as SVGGraphicsElement).getBBox !== 'function') return;
    let b: DOMRect;
    try {
      b = (svg as SVGGraphicsElement).getBBox();
    } catch {
      return;
    }
    if (!b.width || !b.height) return;
    const side = Math.max(b.width, b.height) * 1.12;
    const x = b.x + b.width / 2 - side / 2;
    const y = b.y + b.height / 2 - side / 2;
    svg.setAttribute('viewBox', `${x.toFixed(2)} ${y.toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}`);
  }, [keepsake]);
  return (
    <span ref={box} style={{ display: 'grid', placeItems: 'center', width: `${size}px`, height: `${size}px`, overflow: 'hidden' }} aria-hidden="true">
      <ObjectArt keepsake={keepsake} size={size} />
    </span>
  );
}

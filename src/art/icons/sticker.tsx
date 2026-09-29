/**
 * Die-cut sticker backing shared by the active tab icons and the habit icons: the drawing again,
 * flattened to a cream silhouette with a thick edge, so the cocoa line reads on dark surfaces.
 */
import type { ComponentChildren } from 'preact';
import { STICKER } from './palette';
import css from './sticker.module.css';

export interface StickerBackingProps {
  /** Total stroke width of the backing edge, in the drawing's units. */
  width: number;
  /** Show only at night (theme-driven) instead of always. */
  auto?: boolean;
  /** A fresh copy of the drawing (never the same vnodes as the visible one). */
  children: ComponentChildren;
}

export function StickerBacking({ width, auto = false, children }: StickerBackingProps) {
  return (
    <g class={auto ? `${css.backing} ${css.auto}` : css.backing} style={{ color: STICKER }} stroke={STICKER} stroke-width={width}>
      {children}
    </g>
  );
}

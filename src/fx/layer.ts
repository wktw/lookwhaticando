/**
 * The shared fixed FX layer for imperative sprites (flying coins, floating text).
 * Created lazily on first use; pointer-events never block the app.
 */
import './fx.css';

let layer: HTMLDivElement | null = null;

export function fxLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'mm-fx-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  return layer;
}

export type Point = { x: number; y: number };

/** Center point of a rect, or the point itself. */
export function toPoint(at: DOMRect | Point): Point {
  if ('width' in at) return { x: at.left + at.width / 2, y: at.top + at.height / 2 };
  return { x: at.x, y: at.y };
}

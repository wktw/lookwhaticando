/**
 * Field Guide "not yet" for any drawing (DESIGN §10.4: no CSS filters on art). The same drawing, its paint taken down
 * to 35% saturation the way the pets' own `muted` palette does it, by repainting the element tree: every hex `fill`,
 * `stroke` and `stop-color` on a plain SVG element. The art's small drawing components (a pot, a leaf, a glow) are
 * hook-free functions of their props, so they are drawn in place and repainted too (one that uses hooks, or a light
 * source that keeps its colour, is marked with `keepPaint`); token colours (`var(--shade)`) are kept.
 */
import { cloneElement, createElement, Fragment, isValidElement, type ComponentChildren, type VNode } from 'preact';
import { desaturate } from './pets/palette';

const PAINTS = ['fill', 'stroke', 'stop-color'] as const;

/** Components that use hooks or keep their own colours: drawn by Preact as they are, never expanded here. */
const kept = new WeakSet<object>();

/** Marks a component as one `muteTree` leaves alone (it uses hooks, or it is a light source that keeps its colour). */
export function keepPaint<T extends object>(component: T): T {
  kept.add(component);
  return component;
}
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const cache = new Map<string, string>();

/** One colour, muted (memoised). Anything that is not a hex colour (a token, `none`) is kept. */
export function mutedInk(c: string): string {
  if (!HEX.test(c)) return c;
  let out = cache.get(c);
  if (!out) cache.set(c, (out = desaturate(c)));
  return out;
}

/**
 * The element tree with its paint muted. Nested arrays stay nested (never flattened with
 * `toChildArray`): Preact scopes keys to their own array, so two lists that both use keys 0…n
 * (two leaves' veins, say) must not be merged into one list of siblings.
 */
export function muteTree(node: ComponentChildren): ComponentChildren {
  if (Array.isArray(node)) return node.map((child) => muteTree(child as ComponentChildren));
  if (!isValidElement(node)) return node;
  const el = node as VNode<Record<string, unknown>>;
  if (typeof el.type === 'function' && !kept.has(el.type) && !(el.type.prototype && 'render' in el.type.prototype)) {
    // A drawing component: draw it here and repaint what it draws, keyed as the component was.
    const drawn = muteTree((el.type as (p: unknown) => ComponentChildren)(el.props));
    return el.key != null ? createElement(Fragment, { key: el.key }, drawn) : drawn;
  }
  if (typeof el.type !== 'string' && el.type !== Fragment) return el;
  const props: Record<string, unknown> = {};
  for (const key of PAINTS) {
    const v = el.props[key];
    if (typeof v === 'string') {
      const to = mutedInk(v);
      if (to !== v) props[key] = to;
    }
  }
  const children = el.props.children as ComponentChildren;
  return cloneElement(el, props, children === undefined ? undefined : muteTree(children));
}

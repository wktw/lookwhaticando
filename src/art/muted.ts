/**
 * Field Guide "not yet" for any drawing (DESIGN §10.4: no CSS filters on art). The same drawing, its paint taken down
 * to 35% saturation the way the pets' own `muted` palette does it, by repainting the element tree: every hex `fill`,
 * `stroke` and `stop-color` on a plain SVG element. The art's small drawing components (a pot, a leaf, a glow) are
 * hook-free functions of their props, so they are drawn in place and repainted too; token colours (`var(--shade)`)
 * are kept.
 */
import { cloneElement, Fragment, isValidElement, toChildArray, type ComponentChildren, type VNode } from 'preact';
import { desaturate } from './pets/palette';

const PAINTS = ['fill', 'stroke', 'stop-color'] as const;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const cache = new Map<string, string>();

/** One colour, muted (memoised). Anything that is not a hex colour (a token, `none`) is kept. */
export function mutedInk(c: string): string {
  if (!HEX.test(c)) return c;
  let out = cache.get(c);
  if (!out) cache.set(c, (out = desaturate(c)));
  return out;
}

/** The element tree with its paint muted. */
export function muteTree(node: ComponentChildren): ComponentChildren {
  const out = toChildArray(node).map((child) => {
    if (!isValidElement(child)) return child;
    const el = child as VNode<Record<string, unknown>>;
    if (typeof el.type === 'function' && !(el.type.prototype && 'render' in el.type.prototype)) {
      // A drawing component: draw it here and repaint what it draws.
      return muteTree((el.type as (p: unknown) => ComponentChildren)(el.props));
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
  });
  return out.length === 1 ? out[0] : out;
}

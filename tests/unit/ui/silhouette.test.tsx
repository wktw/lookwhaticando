// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { CollectibleArt } from '@/art/CollectibleArt';
import { COLLECTIBLES } from '@/catalog/collectibles';

/**
 * Locked collectibles render as a flat ink silhouette purely through global.css (no filters on art).
 * jsdom does not cascade stylesheets reliably, so this checks the selectors instead: every painted
 * shape of every non-pet collectible must be matched by the ink repaint rules, whether the class sits
 * on a wrapper span (plants, pots) or on the root <svg> (wearables, treats, decor).
 */
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

function selectorFor(declaration: RegExp): string {
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
  const hit = rules.find(([, sel = '', body = '']) => sel.includes('collectible-silhouette') && declaration.test(body));
  if (!hit?.[1]) throw new Error(`no silhouette rule for ${declaration}`);
  return hit[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

const INK_FILL = selectorFor(/fill:\s*var\(--ink\)/);
const INHERIT_FILL = selectorFor(/fill:\s*inherit/);
const INK_STROKE = selectorFor(/stroke:\s*var\(--ink\)/);
const SHAPES = 'path, rect, circle, ellipse, polygon, polyline, line, text';

/** The fill an element ends up with under the silhouette rules: 'ink', 'none' or 'unstyled' (a leak). */
function silhouetteFill(el: Element): 'ink' | 'none' | 'unstyled' {
  const own = el.getAttribute('fill');
  if (own === 'none') return 'none';
  if (el.matches(INK_FILL)) return 'ink';
  if (own === null && el.matches(INHERIT_FILL) && el.parentElement) return silhouetteFill(el.parentElement);
  return 'unstyled';
}

/** The fill the art itself asks for, following presentation-attribute inheritance. */
function authoredFill(el: Element): string | null {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const v = n.getAttribute('fill');
    if (v !== null) return v;
    if (n.tagName.toLowerCase() === 'svg' && !n.parentElement?.closest('svg')) break;
  }
  return null;
}

/** The element whose stroke attribute this shape paints with (its own or an ancestor's), if any. */
function strokeOwner(el: Element): Element | null {
  const owner = el.closest('[stroke]');
  return owner && owner.getAttribute('stroke') !== 'none' ? owner : null;
}

let host: HTMLElement | null = null;
afterEach(() => {
  if (host) render(null, host);
  document.body.innerHTML = '';
  host = null;
});

const LOCKABLE = COLLECTIBLES.filter((c) => c.category !== 'pet');

describe('collectible silhouettes', () => {
  it('covers wearables, treats, decor, plants and pots', () => {
    const cats = new Set(LOCKABLE.map((c) => c.category));
    for (const c of ['wearable', 'treat', 'decor', 'plant', 'pot']) expect(cats.has(c as never)).toBe(true);
  });

  it.each(LOCKABLE.map((c) => [c.category, c.id]))('%s %s repaints every shape in ink', (_cat, id) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    render(<CollectibleArt id={id} size={96} silhouette />, host);
    const shapes = [...host.querySelectorAll(SHAPES)].filter((el) => !el.closest('clipPath, defs, title'));
    expect(shapes.length).toBeGreaterThan(0);
    for (const el of shapes) {
      const want = authoredFill(el) === 'none' ? 'none' : 'ink';
      expect(silhouetteFill(el), `${id}: <${el.tagName} fill=${authoredFill(el)}>`).toBe(want);
      const owner = strokeOwner(el);
      if (owner) expect(owner.matches(INK_STROKE), `${id}: stroke ${owner.getAttribute('stroke')} is inked`).toBe(true);
    }
  });

  it('matches nothing without the silhouette flag', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    render(<CollectibleArt id="treat-strawberry" size={96} />, host);
    const shapes = [...host.querySelectorAll(SHAPES)];
    expect(shapes.length).toBeGreaterThan(0);
    for (const el of shapes) expect(el.matches(INK_FILL)).toBe(false);
  });
});

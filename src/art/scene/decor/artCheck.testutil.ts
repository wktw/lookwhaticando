/**
 * Test helper for item art: renders a drawing into a detached <svg> (jsdom) and lists everything
 * that breaks the catkin illustration rules (DESIGN §10.4) or the SVG itself.
 */
import { render } from 'preact';
import { h, type JSX } from 'preact';

/** Arguments per path command. */
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/** Why `d` is not valid path data, or null when it is. */
export function pathDataError(d: string): string | null {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  if (!tokens.length) return 'empty';
  if (!/^[mM]$/.test(tokens[0]!)) return `starts with ${tokens[0]}`;
  if (/NaN|Infinity|undefined/.test(d)) return 'non-numeric value';
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++]!;
    const arity = ARITY[cmd.toLowerCase()];
    if (arity === undefined) return `unknown command ${cmd}`;
    let count = 0;
    while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i]!)) {
      i++;
      count++;
    }
    if (arity === 0 ? count !== 0 : count === 0 || count % arity !== 0) return `${cmd} has ${count} numbers`;
  }
  return null;
}

/** Renders `node` inside an <svg viewBox="0 0 100 100"> and returns the svg element (call `done` to unmount). */
export function mount(node: JSX.Element): { svg: SVGSVGElement; html: string; done: () => void } {
  const host = document.createElement('div');
  render(h('svg', { viewBox: '0 0 100 100' }, node), host);
  const svg = host.querySelector('svg')!;
  return { svg, html: host.innerHTML, done: () => render(null, host) };
}

/**
 * Every rule a drawing breaks: SVG filters, masks, clip paths or blend modes; outlines (a stroke on
 * a filled shape); strokes too heavy to be a genuinely thin thing; gradients other than a light's
 * radial glow; and broken path data.
 */
export function artProblems(svg: Element): string[] {
  const problems: string[] = [];
  for (const el of svg.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'filter' || tag === 'mask' || tag === 'clippath' || tag === 'pattern' || tag === 'lineargradient') problems.push(`<${tag}>`);
    for (const attr of ['filter', 'mask', 'clip-path', 'mix-blend-mode']) if (el.hasAttribute(attr)) problems.push(`${attr} on <${tag}>`);
    if (/mix-blend|filter/.test(el.getAttribute('style') ?? '')) problems.push(`style effect on <${tag}>`);
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none') {
      const fill = el.getAttribute('fill');
      if (fill !== 'none') problems.push(`outline: a stroke on a filled <${tag}>`);
      const width = Number(el.getAttribute('stroke-width') ?? 1);
      if (width > 5.2) problems.push(`stroke ${width} wide is not a thin thing`);
    }
    const d = el.getAttribute('d');
    if (d !== null) {
      const error = pathDataError(d);
      if (error) problems.push(`path data: ${error} in "${d.slice(0, 40)}…"`);
    }
  }
  return problems;
}

/** Paths filled with the given paint (e.g. the shade ink), in document order. */
export function pathsFilled(svg: Element, fill: string): string[] {
  return [...svg.querySelectorAll('path')].filter((p) => p.getAttribute('fill') === fill).map((p) => p.getAttribute('d') ?? '');
}

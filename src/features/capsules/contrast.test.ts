import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { contrast, mix } from '@/art/machines/color';

/**
 * Text contrast for the capsules screens in both themes (WCAG AA: 4.5:1, 3:1 for large text),
 * computed from the real tokens. Mirrors the colors used in the CSS modules.
 */
const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));
}

const light = block(':root');
const THEMES = { light, night: { ...light, ...block(":root[data-theme='night']") } };

/** CSS `color-mix(in srgb, <tone-700> 75%, var(--ink))`: pill text on 100-level fills. */
const pillInk = (t: Record<string, string>, tone: string) => mix(t[`${tone}-700`]!, t.ink!, 0.25);

describe.each(Object.entries(THEMES))('%s theme contrast', (_name, t) => {
  it('pills and chips: tone ink on its 100 fill (and on cards)', () => {
    for (const tone of ['sage', 'sky', 'lavender', 'butter', 'blush']) {
      expect(contrast(pillInk(t, tone), t[`${tone}-100`]!), tone).toBeGreaterThanOrEqual(4.5);
      expect(contrast(pillInk(t, tone), t.card!), `${tone} on card`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tier chips: holographic print under graphite, and the two-colour Special', () => {
    for (const band of ['#F5CDD6', '#F6E6B4', '#CDE6DA', '#D2E4F2', '#DDD4F1']) expect(contrast('#3B3236', band), band).toBeGreaterThanOrEqual(4.5);
    for (const half of ['blush-100', 'sky-100']) expect(contrast(pillInk(t, 'sky'), t[half]!), half).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink!, t.card!)).toBeGreaterThanOrEqual(4.5);
  });

  it('body text on the page and cards', () => {
    for (const bg of ['bg', 'bg-2', 'card']) {
      expect(contrast(t.ink!, t[bg]!), bg).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['ink-2']!, t[bg]!), bg).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('lineup leaflets', () => {
  // Leaflet.module.css: the series paper (theme.trim) in its ink (theme.ink); at night the paper
  // is dimmed 8% toward the Lamplight wall. A collected cell prints the paper out of the ink.
  it('the ink reads on its paper for every series, day and night', () => {
    for (const m of MACHINES) {
      const night = mix(m.theme.trim, '#221C30', 0.08);
      for (const bg of [m.theme.trim, night]) expect(contrast(m.theme.ink, bg), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('reveal cards', () => {
  // RevealCard.tsx: a Special print's band is the series colour let down 55% with paper.
  it('the series ink reads on the Special band for every series', () => {
    for (const m of MACHINES) expect(contrast(m.theme.ink, mix(m.theme.body, '#FFFFFF', 0.55)), m.id).toBeGreaterThanOrEqual(4.5);
  });
});

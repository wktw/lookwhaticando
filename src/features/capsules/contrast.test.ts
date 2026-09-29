import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { contrast, mix } from '@/art/machines/color';
import { specialBandVars } from './RevealCard';

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
  // Leaflet.module.css: by day the series paper (theme.trim) in its ink (theme.ink); a collected
  // cell prints the paper out of the ink. At night the sheet is the series colour let down 28% into
  // the Lamplight card and warmed 6% by the lamp, with the print reversed out in the paper colour.
  const nightPaper = (m: (typeof MACHINES)[number]) => mix(mix('#2D2733', m.theme.body, 0.28), '#FFC98A', 0.06);

  it('the ink reads on its paper for every series, by day', () => {
    for (const m of MACHINES) expect(contrast(m.theme.ink, m.theme.trim), m.id).toBeGreaterThanOrEqual(4.5);
  });

  it('the reversed print reads on the lamplit sheet for every series, at night', () => {
    for (const m of MACHINES) expect(contrast(m.theme.trim, nightPaper(m)), m.id).toBeGreaterThanOrEqual(4.5);
  });

  it('the night sheet stays well below the glare of day paper', () => {
    for (const m of MACHINES) expect(contrast(nightPaper(m), '#2D2733'), m.id).toBeLessThan(2.5);
  });
});

describe('reveal cards', () => {
  // RevealCard.tsx specialBandVars: a Special print's band is the series colour let down 55% with
  // paper by day, and 68% into the night card under lamplight, printed in the light ink.
  it('the series ink reads on the Special band for every series, by day', () => {
    for (const m of MACHINES) expect(contrast(m.theme.ink, specialBandVars(m.theme)['--series-band']!), m.id).toBeGreaterThanOrEqual(4.5);
  });

  it('the light ink reads on the night Special band for every series', () => {
    for (const m of MACHINES) {
      const v = specialBandVars(m.theme);
      expect(contrast(v['--series-ink-night']!, v['--series-band-night']!), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { contrast, mix, tint } from '@/art/machines/color';
import { machineHue } from '@/art/machines/theme';

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

  it('NEW! sticker: fixed white on deep blush', () => {
    expect(contrast('#FFFFFF', '#C23F68')).toBeGreaterThanOrEqual(4.5);
  });

  it('star count chip on "Make a wish": cocoa ink on white 60% over lavender-300', () => {
    expect(contrast('#4A3540', mix(t['lavender-300']!, '#FFFFFF', 0.6))).toBeGreaterThanOrEqual(4.5);
  });

  it('body text on the page and cards', () => {
    for (const bg of ['bg', 'bg-2', 'card']) {
      expect(contrast(t.ink!, t[bg]!), bg).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['ink-2']!, t[bg]!), bg).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('series lineup poster', () => {
  // Sheets.module.css: tint(hue, .55), dimmed at night by rgba(34, 28, 48, .08).
  it('kicker and title stay legible on every machine, day and night', () => {
    for (const m of MACHINES) {
      const poster = tint(machineHue(m), 0.55);
      const night = mix(poster, '#221C30', 0.08);
      for (const bg of [poster, night]) expect(contrast(m.theme.ink, bg), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { PASTELS } from '@/catalog/types';
import { HabitIcon, HABIT_ICON_ART, habitIconColors } from '@/art/habit-icons';
import { FAMILY } from '@/art/icons/palette';

function markup(id: string, tone: (typeof PASTELS)[number]) {
  const host = document.createElement('div');
  render(<HabitIcon id={id} tone={tone} />, host);
  return host.innerHTML;
}

describe('habit icons', () => {
  it('has art for exactly the catalog ids', () => {
    expect(Object.keys(HABIT_ICON_ART).sort()).toEqual(HABIT_ICONS.map((i) => i.id).sort());
  });

  it('prints every icon in its family: the hero fill and a second tone', () => {
    let withInk = 0;
    for (const { id } of HABIT_ICONS) {
      for (const tone of PASTELS) {
        const html = markup(id, tone);
        const { fill, ink, light, shade } = habitIconColors(tone);
        expect(html.includes(fill), `${id}/${tone} fill`).toBe(true);
        expect([ink, light, shade].some((c) => html.includes(c)), `${id}/${tone} second tone`).toBe(true);
        if (html.includes(ink)) withInk++;
      }
    }
    // The deep ink carries legibility at 20 px: nearly every icon uses it.
    expect(withInk).toBeGreaterThan(HABIT_ICONS.length * PASTELS.length * 0.95);
  });

  it('uses only its own family (and never black or an outline stroke round a body)', () => {
    const allowed = new Set(Object.values(habitIconColors('sky')).map((c) => c.toLowerCase()));
    for (const { id } of HABIT_ICONS) {
      const html = markup(id, 'sky').toLowerCase();
      for (const hex of html.match(/#[0-9a-f]{6}/g) ?? []) expect(allowed.has(hex), `${id}: ${hex}`).toBe(true);
      expect(html, id).not.toContain('#000');
    }
  });

  it('builds the tones from the family tokens', () => {
    for (const tone of PASTELS) {
      const c = habitIconColors(tone);
      expect([c.soft, c.light, c.fill, c.ink]).toEqual([FAMILY[tone][100], FAMILY[tone][300], FAMILY[tone][500], FAMILY[tone][700]]);
      expect(c.shade).not.toBe(c.fill);
    }
  });

  it('still accepts the three tones older callers pass', () => {
    const host = document.createElement('div');
    render(<svg>{HABIT_ICON_ART.water!({ fill: '#000001', soft: '#000002', ink: '#000003' })}</svg>, host);
    const html = host.innerHTML;
    expect(html).toContain('#000001');
    expect(html).toContain('#000003');
    expect(html).not.toContain('undefined');
  });

  it('keeps colours at night and ignores the old sticker prop', () => {
    const host = document.createElement('div');
    render(<HabitIcon id="swim" tone="sky" sticker />, host);
    expect(host.innerHTML).toBe(markup('swim', 'sky'));
  });

  it('falls back to the plant tag for unknown ids', () => {
    expect(markup('not-a-real-icon', 'sky')).toBe(markup('sparkle', 'sky'));
  });
});

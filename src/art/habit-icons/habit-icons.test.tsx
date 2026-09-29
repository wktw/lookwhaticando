// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { PASTELS } from '@/catalog/types';
import { HabitIcon, HABIT_ICON_ART, habitIconColors } from '@/art/habit-icons';
import { STICKER } from '@/art/icons/palette';

function markup(id: string, tone: (typeof PASTELS)[number]) {
  const host = document.createElement('div');
  render(<HabitIcon id={id} tone={tone} />, host);
  return host.innerHTML;
}

describe('habit icons', () => {
  it('has art for exactly the catalog ids', () => {
    expect(Object.keys(HABIT_ICON_ART).sort()).toEqual(HABIT_ICONS.map((i) => i.id).sort());
  });

  it('paints every icon in the requested tone', () => {
    for (const { id } of HABIT_ICONS) {
      for (const tone of PASTELS) {
        const html = markup(id, tone);
        const { fill, soft } = habitIconColors(tone);
        expect(html.includes(fill) || html.includes(soft), `${id}/${tone}`).toBe(true);
      }
    }
  });

  it('keeps renderers self-contained (outline style travels with the art)', () => {
    const host = document.createElement('div');
    render(<svg>{HABIT_ICON_ART.water!({ fill: '#000001', soft: '#000002', ink: '#000003' })}</svg>, host);
    const root = host.querySelector('svg > g')!;
    expect(root.getAttribute('stroke')).toBe('#000003');
    expect(root.getAttribute('stroke-linejoin')).toBe('round');
  });

  it('carries a night sticker edge unless turned off', () => {
    const svg = (sticker?: boolean) => {
      const host = document.createElement('div');
      render(<HabitIcon id="swim" tone="sky" sticker={sticker} />, host);
      return host.querySelector('svg')!;
    };
    const auto = svg().querySelector(`g[stroke="${STICKER}"]`);
    const always = svg(true).querySelector(`g[stroke="${STICKER}"]`);
    expect(auto).not.toBeNull();
    expect(always).not.toBeNull();
    // `auto` adds the theme-driven visibility class on top of the backing class.
    expect(auto!.getAttribute('class')!.split(' ').length).toBeGreaterThan(always!.getAttribute('class')!.split(' ').length);
    expect(svg(false).innerHTML).not.toContain(STICKER);
  });

  it('falls back to the sparkle for unknown ids', () => {
    expect(markup('not-a-real-icon', 'sky')).toBe(markup('sparkle', 'sky'));
  });
});

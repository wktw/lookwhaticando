// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { VNode } from 'preact';
import { Icon, ICON_NAMES, CoinIcon, StarIcon, StardustIcon, TicketIcon } from '@/art/icons';
import { COCOA, STICKER } from '@/art/icons/palette';
import { cogPath, crescentPath, flowerPath, heartPath, memo, scallopPath, sparklePath, starPath } from '@/art/icons/shapes';

function mount(node: VNode): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

describe('UI icons', () => {
  it('draws every icon name', () => {
    expect(ICON_NAMES).toHaveLength(39);
    for (const name of ICON_NAMES) {
      const svg = mount(<Icon name={name} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24');
      expect(svg.querySelectorAll('path, circle, rect, ellipse').length, name).toBeGreaterThan(0);
    }
  });

  it('gives every tab icon a distinct active state', () => {
    for (const name of ICON_NAMES.filter((n) => n.startsWith('tab-'))) {
      const outline = mount(<Icon name={name} />).querySelectorAll('[fill-opacity]').length;
      const filled = mount(<Icon name={name} filled />).querySelectorAll('[fill-opacity]').length;
      expect(outline, name).toBeGreaterThan(0);
      expect(filled, name).toBeLessThan(outline);
    }
  });

  it('draws active tabs as cocoa stickers and inactive ones in currentColor', () => {
    for (const name of ICON_NAMES.filter((n) => n.startsWith('tab-'))) {
      const active = mount(<Icon name={name} filled />).querySelector('svg')!;
      expect(active.querySelector(`g[stroke="${STICKER}"]`), name).not.toBeNull();
      expect(active.querySelector(`g[stroke="${COCOA}"]`), name).not.toBeNull();
      expect(active.getAttribute('overflow')).toBe('visible');
      const idle = mount(<Icon name={name} />).querySelector('svg')!;
      expect(idle.innerHTML, name).not.toContain(COCOA);
      expect(idle.innerHTML, name).not.toContain(STICKER);
    }
  });

  it('never needs element ids (safe to render many per page)', () => {
    for (const name of ICON_NAMES) expect(mount(<Icon name={name} filled />).querySelector('[id]'), name).toBeNull();
  });

  it('is decorative without a title and labelled with one', () => {
    const plain = mount(<Icon name="plus" />).querySelector('svg')!;
    expect(plain.getAttribute('aria-hidden')).toBe('true');
    expect(plain.getAttribute('role')).toBeNull();
    const labelled = mount(<Icon name="plus" title="Add habit" />).querySelector('svg')!;
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Add habit');
    expect(labelled.getAttribute('aria-hidden')).toBeNull();
  });

  it('honors size and stroke width', () => {
    const svg = mount(<Icon name="check" size={20} strokeWidth={2.25} />).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('20px');
    expect(svg.getAttribute('stroke-width')).toBe('2.25');
  });
});

describe('currency art', () => {
  it('renders all four currencies', () => {
    for (const C of [CoinIcon, StarIcon, StardustIcon, TicketIcon]) {
      const svg = mount(<C size={16} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 32 32');
    }
  });

  it('fills the stardust jar with its level (clamped)', () => {
    const dustTop = (level: number) => {
      const host = mount(<StardustIcon level={level} />);
      const dust = host.querySelector('g[clip-path] path');
      return dust ? Number(/^M0 ([\d.]+)/.exec(dust.getAttribute('d')!)![1]) : null;
    };
    expect(dustTop(0)).toBeNull();
    expect(dustTop(1)!).toBeLessThan(dustTop(0.5)!);
    expect(dustTop(3)).toBe(dustTop(1));
    // A single stardust (0.1) still shows a visible layer.
    expect(dustTop(0.05)).toBe(dustTop(0.15));
    expect(dustTop(0.2)!).toBeLessThan(dustTop(0.15)!);
  });
});

describe('path builders', () => {
  const clean = (d: string) => expect(d).toMatch(/^M[^N]*Z$/);
  it('produce closed, finite paths', () => {
    for (const d of [
      starPath(16, 16, 12, 6),
      scallopPath(50, 42, 30, 18),
      flowerPath(12, 12, 3, 8, 5),
      sparklePath(10, 10, 5),
      heartPath(12, 12, 18),
      crescentPath(15, 16, 10.5, 20.5, 11, 8.5),
      cogPath(12, 12, 6.6, 9.2, 8),
    ]) {
      clean(d);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it('memoizes builders by their arguments', () => {
    let calls = 0;
    const cached = memo((x: number, y: number) => {
      calls++;
      return `M${x} ${y}Z`;
    });
    expect(cached(1, 2)).toBe(cached(1, 2));
    expect(cached(2, 1)).toBe('M2 1Z');
    expect(calls).toBe(2);
  });

  it('builds the crescent from the two circle intersections', () => {
    expect(crescentPath(15, 16, 10.5, 20.5, 11, 8.5)).toBe('M13.98 5.55A10.5 10.5 0 1 0 25.31 18.01A8.5 8.5 0 0 1 13.98 5.55Z');
  });
});

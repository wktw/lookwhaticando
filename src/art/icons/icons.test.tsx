// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import type { VNode } from 'preact';
import { Icon, ICON_ALIASES, ICON_NAMES, CoinIcon, StampIcon, SwapIcon, TicketIcon, StarIcon, StardustIcon, type IconName } from '@/art/icons';
import { SOFT_OPACITY } from '@/art/icons/glyphs';
import { circlePath, cogPath, crescentPath, flowerPath, heartPath, memo, ringSegmentPath, roundRectPath, scallopPath, sparklePath, starPath } from '@/art/icons/shapes';
import tabsCss from '@/art/icons/tabs.module.css';
import { SHELF_CAT_PARTS, SHELF_PETS } from '@/art/icons/tabs';
import { SPECIES } from '@/catalog/types';
import { STAMP_RIM } from '@/art/icons/currency';

function mount(node: VNode): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

const TABS: IconName[] = ['tab-today', 'tab-progress', 'tab-capsules', 'tab-shelf', 'tab-you'];

describe('UI glyphs', () => {
  it('draws every icon name as shapes on the 24 grid', () => {
    for (const name of ICON_NAMES) {
      const svg = mount(<Icon name={name} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24');
      expect(svg.querySelectorAll('path, circle, rect, ellipse').length, name).toBeGreaterThan(0);
    }
  });

  it('has every glyph the screens need', () => {
    const needed: IconName[] = [
      'watering-can', 'moon', 'sprout', 'note', 'calendar', 'bell', 'gear', 'export', 'import', 'undo', 'check', 'plus',
      'more', 'close', 'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up', 'info', 'lock', 'search', 'sun',
      'lamp', 'hanger', 'bowl', 'frame', 'pot', 'book', 'drop', 'magnifier', 'field-guide', 'rest', 'tiny',
    ];
    for (const name of needed) expect(ICON_NAMES, name).toContain(name);
  });

  it('paints glyphs in currentColor: solid shapes, a soft second tone, lines only for thin things', () => {
    for (const name of ICON_NAMES.filter((n) => !n.startsWith('tab-'))) {
      const svg = mount(<Icon name={name} />).querySelector('svg')!;
      expect(svg.getAttribute('fill'), name).toBe('currentColor');
      expect(svg.innerHTML, name).not.toMatch(/#[0-9a-f]{3,6}/i);
      for (const el of svg.querySelectorAll('[stroke]')) expect(el.getAttribute('stroke'), name).toBe('currentColor');
      for (const el of svg.querySelectorAll('[fill-opacity]')) expect(Number(el.getAttribute('fill-opacity')), name).toBe(SOFT_OPACITY);
    }
  });

  it('keeps the alias names drawing the same thing', () => {
    for (const [alias, target] of Object.entries(ICON_ALIASES)) {
      const a = mount(<Icon name={alias as IconName} filled />).innerHTML;
      const b = mount(<Icon name={target} filled />).innerHTML;
      expect(a, alias).toBe(b);
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

  it('honours size and stroke width', () => {
    const svg = mount(<Icon name="check" size={20} strokeWidth={2.25} />).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('20px');
    expect(svg.getAttribute('stroke-width')).toBe('2.25');
  });

  it('makes the heart solid when filled', () => {
    const soft = mount(<Icon name="heart" />).querySelector('path')!;
    const solid = mount(<Icon name="heart" filled />).querySelector('path')!;
    expect(soft.getAttribute('fill-opacity')).toBe(String(SOFT_OPACITY));
    expect(solid.getAttribute('fill-opacity')).toBeNull();
  });
});

describe('tab icons', () => {
  it('has all five tabs, with the old Meadow name kept as an alias of Shelf', () => {
    for (const t of TABS) expect(ICON_NAMES).toContain(t);
    expect(mount(<Icon name="tab-meadow" />).innerHTML).toBe(mount(<Icon name="tab-shelf" />).innerHTML);
    expect(mount(<Icon name="tab-meadow" filled />).innerHTML).toBe(mount(<Icon name="tab-shelf" filled />).innerHTML);
  });

  it('gives every tab a quiet inactive state and a filled active state', () => {
    for (const name of TABS) {
      const idle = mount(<Icon name={name} />).querySelector('svg')!;
      const active = mount(<Icon name={name} filled />).querySelector('svg')!;
      expect(active.innerHTML, name).not.toBe(idle.innerHTML);
      // Inactive: currentColor only, the body in the soft tone, no accent classes.
      expect(idle.querySelector('[fill-opacity]'), name).not.toBeNull();
      expect(idle.querySelector('[class]'), name).toBeNull();
      // Active: the body in the accent mass, the structure in the deep accent, nothing soft.
      expect(active.querySelector(`.${tabsCss.mass}`), name).not.toBeNull();
      expect(active.querySelector(`.${tabsCss.structure}, .${tabsCss.structureLine}`), name).not.toBeNull();
      expect(active.querySelector('[fill-opacity]'), name).toBeNull();
    }
  });

  it('draws tabs as flat shapes, not stroked line icons', () => {
    for (const name of TABS) {
      for (const filled of [false, true]) {
        const svg = mount(<Icon name={name} filled={filled} />).querySelector('svg')!;
        const shapes = [...svg.querySelectorAll('path, rect, circle, ellipse')];
        const filledShapes = shapes.filter((el) => el.getAttribute('fill') !== 'none');
        expect(filledShapes.length, name).toBeGreaterThan(shapes.length / 2);
      }
    }
  });

  it('draws the Shelf cat as separate shapes, so overlapping pieces never cancel into holes', () => {
    for (const filled of [false, true]) {
      const svg = mount(<Icon name="tab-shelf" filled={filled} />).querySelector('svg')!;
      const ds = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'));
      for (const part of SHELF_CAT_PARTS) expect(ds).toContain(part);
      // The head is one circle, and neither the ears nor the body carry it inside them.
      expect(SHELF_CAT_PARTS[1]).not.toContain(SHELF_CAT_PARTS[0]);
      expect(SHELF_CAT_PARTS[2]).not.toContain(SHELF_CAT_PARTS[0]);
    }
  });

  it('draws your closest pet on the Shelf tab: eight species, each its own silhouette, and a sprig before the first pet', () => {
    const drawn = new Set<string>();
    for (const species of SPECIES) {
      for (const filled of [false, true]) {
        const svg = mount(<Icon name="tab-shelf" species={species} filled={filled} />).querySelector('svg')!;
        expect(svg.querySelector(`[data-species="${species}"]`), species).not.toBeNull();
        const ds = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'));
        for (const part of SHELF_PETS[species].parts) expect(ds, species).toContain(part);
        if (!filled) drawn.add(svg.innerHTML.replace(/data-species="[a-z]+"/, ''));
      }
    }
    expect(drawn.size).toBe(SPECIES.length);
    const none = mount(<Icon name="tab-shelf" species={null} />).querySelector('svg')!;
    expect(none.querySelector('[data-species="none"]')).not.toBeNull();
    // Left out, the cat (older callers).
    expect(mount(<Icon name="tab-shelf" />).innerHTML).toBe(mount(<Icon name="tab-shelf" species="cat" />).innerHTML);
  });

  it('switches the active mass for lamplight in CSS', () => {
    const css = readFileSync('src/art/icons/tabs.module.css', 'utf8');
    expect(css).toMatch(/\[data-theme='night'\]\) \.mass/);
    expect(css).toMatch(/prefers-color-scheme: dark/);
  });
});

describe('currency tokens', () => {
  it('renders all four tokens, and the old names still work', () => {
    for (const C of [CoinIcon, StampIcon, SwapIcon, TicketIcon, StarIcon, StardustIcon]) {
      const svg = mount(<C size={16} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 32 32');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    expect(StarIcon).toBe(StampIcon);
  });

  it('sits inline in text by default', () => {
    const svg = mount(<CoinIcon />).querySelector('svg')!;
    expect(svg.style.display).toBe('inline-block');
    const custom = mount(<CoinIcon style={{ display: 'block' }} />).querySelector('svg')!;
    expect(custom.style.display).toBe('block');
  });

  it('fills 0–10 swap segments, clamped', () => {
    const filled = (node: VNode) => [...mount(node).querySelectorAll('path')].filter((p) => !p.getAttribute('fill')!.startsWith('var(')).length;
    expect(mount(<SwapIcon />).querySelectorAll('path')).toHaveLength(10);
    expect(filled(<SwapIcon count={0} />)).toBe(0);
    expect(filled(<SwapIcon count={4} />)).toBe(4);
    expect(filled(<SwapIcon count={14} />)).toBe(10);
    expect(filled(<SwapIcon count={-2} />)).toBe(0);
    // The old stardust API: level is swaps / 10.
    expect(filled(<StardustIcon level={0.3} />)).toBe(3);
  });

  it('draws the stamp as an ink impression: an open rim with a sprig, never a check', () => {
    const svg = mount(<StampIcon />).querySelector('svg')!;
    const rim = svg.querySelector('path[fill-rule="evenodd"]');
    expect(rim?.getAttribute('d')).toBe(STAMP_RIM);
    // No solid disc under the rim: the paper shows through the middle.
    expect(svg.querySelector('circle')).toBeNull();
    expect(svg.querySelectorAll('ellipse')).toHaveLength(3);
    expect(svg.innerHTML).not.toContain('M11.2 16.4l3.3 3.3');
  });

  it('draws the ticket with a perforated edge (holes punched through)', () => {
    const ticket = mount(<TicketIcon />).querySelector('path[fill-rule="evenodd"]');
    expect(ticket).not.toBeNull();
    expect(ticket!.getAttribute('d')!.match(/a0\.75 0\.75/g)!.length).toBeGreaterThanOrEqual(8);
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
      circlePath(12, 12, 4),
      roundRectPath(2, 3, 10, 8, 2),
      ringSegmentPath(16, 16, 8, 13, 3, 33),
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

  it('matches the crescents committed in the art (they are precomputed, not computed at runtime)', () => {
    const coin = readFileSync('src/art/icons/currency.tsx', 'utf8');
    expect(coin).toContain(crescentPath(16, 16, 13, 13.9, 14.3, 13));
  });
});

/** Every source file of this module's art, for the emoji and filter scans. */
function sources(): string[] {
  const roots = ['src/art/icons', 'src/art/badges', 'src/art/habit-icons'];
  const files = ['src/app/AppIconArt.tsx', 'src/app/SplashArt.tsx', 'src/app/SplashArt.module.css', 'src/app/installArt.tsx', 'src/app/installArt.module.css', 'src/app/GumballArt.tsx', 'src/dev/sections-icons.tsx'];
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  return [...roots.flatMap(walk), ...files].filter((f) => /\.(tsx?|css)$/.test(f));
}

describe('catkin language', () => {
  it('has no emoji anywhere in the icon modules', () => {
    for (const f of sources()) {
      const text = readFileSync(f, 'utf8');
      const hit = /\p{Extended_Pictographic}/u.exec(text);
      expect(hit?.[0], `${f}: ${hit?.[0]}`).toBeUndefined();
    }
  });

  it('uses no filters, blend modes or masks, and gradients nowhere', () => {
    for (const f of sources().filter((f) => !f.includes('.test.'))) {
      const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(text, f).not.toMatch(/<filter|filter:|drop-shadow|mix-blend-mode|<mask|Gradient/);
    }
  });
});

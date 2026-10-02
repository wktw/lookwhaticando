// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { VNode } from 'preact';
import { CatkinSprig, Wordmark } from '@/art/icons';
import { CATKIN_BODY, CATKIN_LIT, SPRIG_CATKINS } from '@/art/icons/brand';
import { DAY_LIGHT, NIGHT_LIGHT, type LightFrom } from '@/art/light';
import { AppIconArt, FAVICON_TILE, ICON_CALF, ICON_CAT, ICON_PLACE, IconScene, WALL_SHADOW_OPACITY, squirclePath, type AppIconShape } from '@/art/icons/appIcon';
import { LaunchArt as SplashArt } from '@/art/icons/splash';
import { poseBounds } from '@/art/pets/bounds';
import { SPECIES_ART } from '@/art/pets/species';
import { getLook } from '@/art/pets/looks';
import { GumballArt, CabinetMark } from '@/app/GumballArt';
import { MATERIAL } from '@/art/icons/palette';
import cabinetCss from '@/art/icons/cabinet.module.css';
import { readFileSync } from 'node:fs';
import { shapeBoxes } from '@/art/plants/svgBounds.testutil';

function mount(node: VNode): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

describe('wordmark and sprig', () => {
  it('sets "Little by Little" as real text, with an optional sprig', () => {
    const withSprig = mount(<Wordmark size={40} />);
    expect(withSprig.textContent).toBe('Little by Little');
    expect(withSprig.querySelector('svg')).not.toBeNull();
    expect(withSprig.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    const bare = mount(<Wordmark sprig={false} />);
    expect(bare.textContent).toBe('Little by Little');
    expect(bare.querySelector('svg')).toBeNull();
    expect((withSprig.firstElementChild as HTMLElement).style.fontSize).toBe('40px');
  });

  it('draws a twig with exactly three catkins, each a lit shape over its shade', () => {
    const svg = mount(<CatkinSprig />).querySelector('svg')!;
    expect(svg.querySelectorAll(`path[d="${CATKIN_BODY}"]`)).toHaveLength(3);
    CATKIN_LIT.left.forEach((d) => expect(svg.querySelectorAll(`path[d="${d}"]`)).toHaveLength(1));
    // One thin stroke (the twig; the catkins sit straight on it), everything else flat.
    expect(svg.querySelectorAll('path[stroke-width]')).toHaveLength(1);
  });

  it('draws the lit side for left, top and right light', () => {
    const froms: LightFrom[] = ['left', 'top', 'right'];
    for (const from of froms) {
      const svg = mount(<CatkinSprig light={{ from, night: false }} />).querySelector('svg')!;
      CATKIN_LIT[from].forEach((d) => expect(svg.querySelectorAll(`path[d="${d}"]`), from).toHaveLength(1));
    }
  });

  it('puts every shade crescent on the same side in sprig space, away from the light', () => {
    // The endpoints of a path's segments (M and A end points), turned into sprig space.
    const points = (d: string, [x, y, a]: readonly [number, number, number]) => {
      const n = d.match(/-?\d*\.?\d+/g)!.map(Number);
      const pts: [number, number][] = [[n[0]!, n[1]!]];
      for (let i = 2; i + 7 <= n.length; i += 7) pts.push([n[i + 5]!, n[i + 6]!]);
      const r = (a * Math.PI) / 180;
      return pts.map(([px, py]) => {
        const ly = py - 9;
        return [x + px * Math.cos(r) - ly * Math.sin(r), y + px * Math.sin(r) + ly * Math.cos(r)] as const;
      });
    };
    const mean = (ps: readonly (readonly [number, number])[], k: 0 | 1) => ps.reduce((s, p) => s + p[k], 0) / ps.length;
    SPRIG_CATKINS.forEach((c, i) => {
      const body = points(CATKIN_BODY, c);
      // The lit shape leans toward the light: its centre sits left of the body's for "left", and so on.
      expect(mean(points(CATKIN_LIT.left[i]!, c), 0)).toBeLessThan(mean(body, 0));
      expect(mean(points(CATKIN_LIT.right[i]!, c), 0)).toBeGreaterThan(mean(body, 0));
      expect(mean(points(CATKIN_LIT.top[i]!, c), 1)).toBeLessThan(mean(body, 1));
    });
  });

  it('draws the lamplight side at night', () => {
    const svg = mount(<CatkinSprig light={NIGHT_LIGHT} />).querySelector('svg')!;
    CATKIN_LIT.right.forEach((d) => expect(svg.querySelectorAll(`path[d="${d}"]`)).toHaveLength(1));
    expect(mount(<CatkinSprig light={DAY_LIGHT} />).innerHTML).toContain(CATKIN_LIT.left[0]);
  });

  it('is labelled when given a title', () => {
    const svg = mount(<CatkinSprig title="catkin" />).querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('catkin');
  });
});

describe('app icon', () => {
  const shapes: AppIconShape[] = ['squircle', 'square', 'maskable', 'favicon'];

  it('renders every shape, clipped to its own outline', () => {
    for (const shape of shapes) {
      const svg = mount(<AppIconArt shape={shape} size={180} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
      expect(svg.querySelector('clipPath'), shape).not.toBeNull();
    }
  });

  it('shows the app’s own black cat on a terracotta pot, with a Holstein calf beside it (DESIGN §1 "Many animals")', () => {
    const host = mount(<AppIconArt />);
    const html = host.innerHTML;
    expect(html).toContain(MATERIAL.terracotta);
    expect(html).not.toMatch(/#000000|"black"/i);
    // PetArt's own drawings, not a separate icon cat: in the picture and in its wall shadow.
    expect(host.querySelectorAll('[data-animal="pet-cat-black"] svg.pet-art')).toHaveLength(2);
    expect(host.querySelectorAll('[data-animal="pet-cow-holstein"] svg.pet-art')).toHaveLength(2);
    expect(host.querySelectorAll('svg.pet-art.is-silhouette')).toHaveLength(2);
  });

  it('keeps the cat at least 35% of the icon’s width, and the calf about 55–60% of the cat’s height', () => {
    const drawn = (petId: string, pose: 'loaf' | 'sit', size: number) => {
      const look = getLook(petId);
      const { id, rig } = SPECIES_ART[look.species].rigFor(look);
      const b = poseBounds(id, rig, pose);
      const s = rig.scale * (look.scale ?? 1);
      return { w: ((b.x1 - b.x0) * s * size) / 100, h: ((94 - b.y0) * s * size) / 100 };
    };
    const cat = drawn(ICON_CAT.petId, 'loaf', ICON_CAT.size);
    const calf = drawn(ICON_CALF.petId, 'sit', ICON_CALF.size);
    expect(cat.w).toBeGreaterThanOrEqual(35);
    expect(calf.h / cat.h).toBeGreaterThan(0.5);
    expect(calf.h / cat.h).toBeLessThan(0.65);
  });

  it('lights the launch screen’s scene by the lamp at night', () => {
    const day = mount(<IconScene />).innerHTML;
    const night = mount(<IconScene night />).innerHTML;
    expect(night).not.toBe(day);
    expect(day).toContain(MATERIAL.terracotta);
  });

  it('crops the favicon to the cat and pot on a deeper tile, without the beam or cast shadow', () => {
    const full = mount(<AppIconArt />).innerHTML;
    const fav = mount(<AppIconArt shape="favicon" />).innerHTML;
    expect(full).toContain('#FAEFD2');
    expect(fav).not.toContain('#FAEFD2');
    expect(fav).toContain(FAVICON_TILE);
    expect(fav).not.toContain(`opacity="${WALL_SHADOW_OPACITY}"`);
    expect(full).toContain(`opacity="${WALL_SHADOW_OPACITY}"`);
    expect(fav.length).toBeLessThan(full.length);
  });

  it('draws the pot rim once, under the cat, with a contact shadow on it', () => {
    const svg = mount(<AppIconArt />).querySelector('svg')!;
    const rims = [...svg.querySelectorAll('path')].filter((p) => p.getAttribute('fill') === MATERIAL.terracottaRim);
    expect(rims).toHaveLength(1);
  });

  it('keeps both animals inside the maskable icon’s 80% safe circle', () => {
    const host = mount(<AppIconArt shape="maskable" size={512} />);
    // ICON_PLACE.maskable is translate(tx ty) scale(k) translate(mx my).
    const [tx, ty, k, mx, my] = ICON_PLACE.maskable!.match(/-?[\d.]+/g)!.map(Number) as [number, number, number, number, number];
    expect(ICON_PLACE.maskable).toMatch(/^translate\([^)]*\) scale\([^)]*\) translate\([^)]*\)$/);
    let far = 0;
    for (const a of [ICON_CAT, ICON_CALF]) {
      // The picture's own animal (the second drawing; the first is its wall shadow).
      const art = [...host.querySelectorAll(`[data-animal="${a.petId}"] svg.pet-art`)].find((el) => !el.classList.contains('is-silhouette'))!.cloneNode(true) as Element;
      // The animal itself (its soft contact shadow on the sill may run under the mask's edge).
      art.querySelectorAll('[fill="var(--contact)"]').forEach((el) => el.remove());
      const top = a.feet - (a.size * 94) / 100;
      for (const b of shapeBoxes(art, { sampled: true })) {
        for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]] as const) {
          const ix = a.x - a.size / 2 + (x * a.size) / 100;
          const iy = top + (y * a.size) / 100;
          const d = Math.hypot(tx + (ix + mx) * k - 50, ty + (iy + my) * k - 50);
          far = Math.max(far, d);
        }
      }
    }
    expect(far).toBeLessThanOrEqual(40);
  });

  it('gives each instance its own clip id', () => {
    const host = mount(
      <div>
        <AppIconArt />
        <AppIconArt />
      </div>,
    );
    const [a, b] = [...host.querySelectorAll('clipPath')].map((c) => c.id);
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('builds a closed squircle', () => {
    expect(squirclePath(50, 50, 50)).toMatch(/^M[\d. L]+Z$/);
  });
});

describe('launch screen and cabinet mark', () => {
  it('puts the icon’s cat and calf over the wordmark on paper in both themes', () => {
    for (const theme of ['light', 'night'] as const) {
      const host = mount(<SplashArt theme={theme} width={390} height={844} />);
      expect(host.textContent).toBe('Little by Little');
      expect(host.querySelector('[data-animal="pet-cat-black"]')).not.toBeNull();
      expect(host.querySelector('[data-animal="pet-cow-holstein"]')).not.toBeNull();
      expect(host.querySelector('[data-splash]')!.getAttribute('data-splash')).toBe(theme);
    }
  });

  it('keeps the cabinet mark importable under both names', () => {
    expect(CabinetMark).toBe(GumballArt);
    const svg = mount(<GumballArt size={36} />).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('36');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes its inks from CSS, so it follows the theme into lamplight or is pinned by `light`', () => {
    const auto = mount(<GumballArt />).querySelector('svg')!;
    expect(auto.getAttribute('class')).toContain(cabinetCss.auto);
    expect(auto.innerHTML).not.toMatch(/fill="#/i);
    const night = mount(<GumballArt light={NIGHT_LIGHT} />).querySelector('svg')!;
    expect(night.getAttribute('class')).toContain(cabinetCss.night);
    expect(night.getAttribute('class')).toContain(cabinetCss.fromRight);
    const src = readFileSync('src/art/icons/cabinet.module.css', 'utf8');
    expect(src).toMatch(/\[data-theme='night'\]\) \.auto/);
    expect(src).toMatch(/prefers-color-scheme: dark/);
  });
});

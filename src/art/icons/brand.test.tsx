// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { VNode } from 'preact';
import { CatkinSprig, Wordmark } from '@/art/icons';
import { CATKIN_BODY, CATKIN_LIT } from '@/art/icons/brand';
import { DAY_LIGHT, NIGHT_LIGHT } from '@/art/light';
import { AppIconArt, squirclePath, type AppIconShape } from '@/app/AppIconArt';
import { SplashArt } from '@/app/SplashArt';
import { GumballArt, CabinetMark } from '@/app/GumballArt';
import { MATERIAL } from '@/art/icons/palette';

function mount(node: VNode): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

describe('wordmark and sprig', () => {
  it('sets lowercase "catkin" as real text, with an optional sprig', () => {
    const withSprig = mount(<Wordmark size={40} />);
    expect(withSprig.textContent).toBe('catkin');
    expect(withSprig.querySelector('svg')).not.toBeNull();
    expect(withSprig.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    const bare = mount(<Wordmark sprig={false} />);
    expect(bare.textContent).toBe('catkin');
    expect(bare.querySelector('svg')).toBeNull();
    expect((withSprig.firstElementChild as HTMLElement).style.fontSize).toBe('40px');
  });

  it('draws a twig with exactly three catkins, each a lit shape over its shade', () => {
    const svg = mount(<CatkinSprig />).querySelector('svg')!;
    expect(svg.querySelectorAll(`path[d="${CATKIN_BODY}"]`)).toHaveLength(3);
    expect(svg.querySelectorAll(`path[d="${CATKIN_LIT}"]`)).toHaveLength(3);
    // Two thin strokes (the twig and its spur), everything else flat.
    expect(svg.querySelectorAll('path[stroke-width]')).toHaveLength(2);
  });

  it('puts the shade on the side away from the light', () => {
    const groups = (light = DAY_LIGHT) => [...mount(<CatkinSprig light={light} />).querySelectorAll('g[transform]')].map((g) => g.getAttribute('transform')!);
    expect(groups(DAY_LIGHT).every((t) => !t.includes('scale(-1 1)'))).toBe(true);
    expect(groups(NIGHT_LIGHT).every((t) => t.includes('scale(-1 1)'))).toBe(true);
  });

  it('is labelled when given a title', () => {
    const svg = mount(<CatkinSprig title="catkin" />).querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('catkin');
  });
});

describe('app icon', () => {
  const shapes: AppIconShape[] = ['squircle', 'square', 'maskable'];

  it('renders every shape, clipped to its own outline', () => {
    for (const shape of shapes) {
      const svg = mount(<AppIconArt shape={shape} size={180} />).querySelector('svg')!;
      expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
      expect(svg.querySelector('clipPath'), shape).not.toBeNull();
    }
  });

  it('shows a plum-black cat with gold eyes on a terracotta pot', () => {
    const html = mount(<AppIconArt />).innerHTML;
    expect(html).toContain(MATERIAL.plum);
    expect(html).toContain(MATERIAL.catEye);
    expect(html).toContain(MATERIAL.terracotta);
    expect(html).not.toMatch(/#000000|"black"/i);
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
  it('puts the wordmark on paper in both themes', () => {
    for (const theme of ['light', 'night'] as const) {
      const host = mount(<SplashArt theme={theme} width={390} height={844} />);
      expect(host.textContent).toBe('catkin');
      expect(host.querySelector('[data-splash]')!.getAttribute('data-splash')).toBe(theme);
    }
  });

  it('keeps the cabinet mark importable under both names', () => {
    expect(CabinetMark).toBe(GumballArt);
    const svg = mount(<GumballArt size={36} />).querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('36');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});

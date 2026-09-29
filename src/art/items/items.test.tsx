// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { TREATS, DECOR } from '@/catalog/collectibles';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { CollectibleArt } from '@/art/CollectibleArt';
import { artBounds } from '@/art/plants/svgBounds.testutil';
import { SYMMETRIC_SHADE, artProblems, mount, pathsFilled, shadeCentreX } from '@/art/scene/decor/artCheck.testutil';
import { DECOR_ART, PlaceholderItem, TREAT_ART } from './index';

const LIGHTS: Light[] = [DAY_LIGHT, { from: 'top', night: false }, { from: 'right', night: false }, NIGHT_LIGHT];

describe('treat art', () => {
  it('has a renderer for every catalog treat, and nothing else', () => {
    expect(Object.keys(TREAT_ART).sort()).toEqual(TREATS.map((t) => t.id).sort());
  });

  it('draws every treat as a group on the 100×100 canvas, called bare or with a light', () => {
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      for (const node of [Art(), Art({ light: DAY_LIGHT }), Art({ light: NIGHT_LIGHT })]) {
        const { svg, html, done } = mount(node);
        expect(html.startsWith('<svg viewBox="0 0 100 100"><g'), t.id).toBe(true);
        const b = artBounds(svg, { stroked: true });
        expect(b.x0 >= 0 && b.y0 >= 0 && b.x1 <= 100 && b.y1 <= 100, `${t.id} bounds ${JSON.stringify(b)}`).toBe(true);
        done();
      }
    }
  });

  it('fills the canvas enough to read at 40 px', () => {
    for (const t of TREATS) {
      const { svg, done } = mount(TREAT_ART[t.id]!());
      const b = artBounds(svg);
      done();
      expect(Math.max(b.x1 - b.x0, b.y1 - b.y0), t.id).toBeGreaterThan(60);
    }
  });

  it('uses no filters, masks, clip paths, outlines, gradients or broken path data, in any light', () => {
    for (const t of TREATS) {
      for (const light of LIGHTS) {
        const { svg, done } = mount(TREAT_ART[t.id]!({ light }));
        expect(artProblems(svg), `${t.id} ${light.from}${light.night ? ' night' : ''}`).toEqual([]);
        expect(svg.querySelector('radialGradient'), t.id).toBeNull();
        done();
      }
    }
  });

  it('moves the shade crescent with the light, and dims in lamplight', () => {
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      const left = mount(Art({ light: DAY_LIGHT }));
      const right = mount(Art({ light: { from: 'right', night: false } }));
      const night = mount(Art({ light: NIGHT_LIGHT }));
      expect(pathsFilled(left.svg, 'var(--shade)').length, `${t.id} has crescents`).toBeGreaterThan(0);
      expect(pathsFilled(left.svg, 'var(--shade)'), t.id).not.toEqual(pathsFilled(right.svg, 'var(--shade)'));
      expect(night.html, t.id).not.toEqual(right.html);
      for (const m of [left, right, night]) m.done();
    }
  });

  it("puts every treat's shade on the side away from the light", () => {
    const wrong: string[] = [];
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      const left = mount(Art({ light: DAY_LIGHT }));
      const right = mount(Art({ light: { from: 'right', night: false } }));
      if (!SYMMETRIC_SHADE[t.id] && !(shadeCentreX(left.svg) > shadeCentreX(right.svg))) wrong.push(t.id);
      left.done();
      right.done();
    }
    expect(wrong).toEqual([]);
  });

  it('lights a mirrored treat as if the light came from the other side', () => {
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      const mirrored = mount(Art({ light: DAY_LIGHT, facing: 'left' }));
      const rightLit = mount(Art({ light: { from: 'right', night: false } }));
      expect(mirrored.html, t.id).toEqual(rightLit.html);
      mirrored.done();
      rightLit.done();
    }
  });

  it('works as a component too, the way the gallery and the pantry use it', () => {
    const Art = TREAT_ART['treat-strawberry']!;
    const asComponent = mount(<Art light={DAY_LIGHT} />);
    const called = mount(Art({ light: DAY_LIGHT }));
    expect(asComponent.html).toEqual(called.html);
    asComponent.done();
    called.done();
  });
});

describe('item art', () => {
  it('offers every decor as an icon that takes a light', () => {
    expect(Object.keys(DECOR_ART).sort()).toEqual(DECOR.map((d) => d.id).sort());
    for (const d of DECOR) {
      const day = mount(DECOR_ART[d.id]!());
      const night = mount(DECOR_ART[d.id]!({ light: NIGHT_LIGHT }));
      expect(night.html, d.id).not.toEqual(day.html);
      day.done();
      night.done();
    }
  });

  it('draws the placeholder parcel without outlines', () => {
    const { svg, done } = mount(<PlaceholderItem />);
    expect(artProblems(svg)).toEqual([]);
    done();
  });

  it('renders treats and decor through CollectibleArt', () => {
    for (const id of ['treat-carob-heart', 'decor-window-seat']) {
      const host = document.createElement('div');
      const { html, done } = mount(<CollectibleArt id={id} size={40} title="Carob heart" />);
      expect(html.includes('<path'), id).toBe(true);
      done();
      host.remove();
    }
  });
});

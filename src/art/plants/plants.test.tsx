// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { JSX } from 'preact';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { MAX_BLOOMS, PLANT_STAGE_NAMES, POT_GEOMETRY, PlantArt, PlantTag, PotArt, PLANT_SPECIES_WITH_ART, POTS_WITH_ART, tagAnchor, type PlantArtProps } from '@/art/plants';
import { artBounds, drawnMass, pathPoints, type Box } from './svgBounds.testutil';
import { bloomCount, growthOf } from './PlantArt';
import { kitFor, inks } from './kit';
import { bake, bandCrescents, placeMatrix, taperCrescents } from './geom';
import { ICON_FRAMES } from './iconFrames';
import { channels, toHsl } from './math';

const SPECIES = [...PLANT_SPECIES_WITH_ART] as PlantSpeciesId[];
const POTS = [...POTS_WITH_ART] as PotId[];
const TOP: Light = { from: 'top', night: false };
const RIGHT: Light = { from: 'right', night: false };
const LIGHTS: Light[] = [DAY_LIGHT, TOP, RIGHT, NIGHT_LIGHT];

/** Renders into a detached host, hands the host to `read`, then unmounts. */
function inspect<T>(node: JSX.Element, read: (host: HTMLElement) => T): T {
  const host = document.createElement('div');
  render(node, host);
  const out = read(host);
  render(null, host);
  return out;
}

const markup = (node: JSX.Element) => inspect(node, (host) => host.innerHTML);
const broken = (html: string) => /NaN|undefined|Infinity/.test(html);
const plant = (props: Partial<PlantArtProps>) => <PlantArt species="pothos" stage={0} pot="terracotta" {...props} />;

const union = (boxes: Box[]): Box =>
  boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });

const pathBounds = (d: string): Box => union(pathPoints(d).map(([x, y]) => ({ x0: x, y0: y, x1: x, y1: y })));
/** Painted bounds of the whole drawing (plant, vessel, shadow). */
const wholeBounds = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => artBounds(host.querySelector('svg')!, { stroked: true }));
/** Painted bounds of the plant itself: the swaying layers. */
const plantBounds = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => union([...host.querySelectorAll('.plant-sway')].map((g) => artBounds(g, { stroked: true }))));
const mass = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => drawnMass(host.querySelector('svg')!));
const outside = (b: Box) => b.x0 < 0.5 || b.x1 > 99.5 || b.y0 < 1 || b.y1 > 99.5;

describe('PlantArt: every species, stage and pot', () => {
  it('names the stages Cutting to Evergreen', () => {
    expect(PLANT_STAGE_NAMES).toEqual(['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen']);
  });

  it('renders every species × stage × pot without broken path data, inside the canvas with headroom', () => {
    const bad: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        for (const pot of POTS) {
          inspect(plant({ species, stage, progress: 0.95, blooms: MAX_BLOOMS, pot }), (host) => {
            if (broken(host.innerHTML)) bad.push(`${species} ${stage} ${pot}: broken`);
            const b = artBounds(host.querySelector('svg')!, { stroked: true });
            if (outside(b)) bad.push(`${species} ${stage} in ${pot}: ${JSON.stringify(b)}`);
          });
        }
      }
    }
    expect(bad).toEqual([]);
  }, 60_000);

  it('keeps every light and every progress inside the canvas too', () => {
    const out: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        for (const light of LIGHTS) {
          for (const progress of [0, 0.5]) {
            const b = wholeBounds({ species, stage, progress, light, pot: 'rosy' });
            if (outside(b)) out.push(`${species} ${stage}@${progress} ${light.from}${light.night ? ' night' : ''}: ${JSON.stringify(b)}`);
          }
        }
      }
    }
    expect(out).toEqual([]);
  }, 30_000);

  it('draws stages 0 and 1 in glass (a water glass, a seed dish or a forcing glass), never a pot', () => {
    for (const species of SPECIES) {
      for (const stage of [0, 1]) {
        const html = markup(plant({ species, stage, progress: 0.5, pot: 'mug' }));
        expect(html, `${species} ${stage}`).toMatch(/data-vessel="(glass|dish|forcing)"/);
        expect(html, `${species} ${stage}`).not.toMatch(/data-pot=/);
      }
    }
  });

  it('pots every species up from stage 2, except the tulip, which lives in its forcing glass', () => {
    for (const species of SPECIES) {
      const html = markup(plant({ species, stage: 2, pot: 'teacup' }));
      if (species === 'tulip') expect(html).toMatch(/data-vessel="forcing"/);
      else expect(html, species).toMatch(/data-vessel="pot" data-pot="teacup"/);
    }
  });

  it('makes every stage visibly bigger or fuller than the one before', () => {
    const same: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 1; stage <= 7; stage++) {
        const before = { species, stage: stage - 1, progress: 0.5 };
        const after = { species, stage, progress: 0.5 };
        const a = plantBounds(before);
        const b = plantBounds(after);
        const moved = Math.max(Math.abs(a.y0 - b.y0), Math.abs(a.x0 - b.x0), Math.abs(a.x1 - b.x1));
        if (Math.abs(mass(after) - mass(before)) < 2 && moved < 1) same.push(`${species} ${stage}`);
      }
    }
    expect(same).toEqual([]);
  }, 30_000);

  it('adds real detail as progress fills a stage', () => {
    const flat: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 6; stage++) {
        if (Math.abs(mass({ species, stage, progress: 0.95 }) - mass({ species, stage, progress: 0 })) < 3) flat.push(`${species} ${stage}`);
      }
    }
    expect(flat).toEqual([]);
  }, 30_000);

  it('never grows backwards: from Potted on, each stage is at least as tall or as wide', () => {
    const shrank: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 3; stage <= 7; stage++) {
        const a = plantBounds({ species, stage: stage - 1, progress: 0.5 });
        const b = plantBounds({ species, stage, progress: 0.5 });
        if (b.y0 > a.y0 + 0.5 && b.x1 - b.x0 < a.x1 - a.x0 - 0.5) shrank.push(`${species} ${stage}`);
      }
    }
    expect(shrank).toEqual([]);
  }, 30_000);
});

describe('PlantArt: the catkin art language', () => {
  it('uses no filters, masks, clip paths, blend modes or gradients', () => {
    for (const species of SPECIES) {
      for (const stage of [0, 1, 4, 7]) {
        for (const light of [DAY_LIGHT, NIGHT_LIGHT]) {
          const html = markup(plant({ species, stage, light, pot: 'midnight', pulse: 1 }));
          expect(html, species).not.toMatch(/<filter|filter=|<mask|mask=|clip-path|<clipPath|blend|Gradient/i);
        }
      }
    }
    for (const pot of POTS) expect(markup(<PotArt pot={pot} />)).not.toMatch(/<filter|<mask|clip-path|Gradient/i);
  }, 30_000);

  it('draws no outlines: strokes only for thin things, never around a filled shape', () => {
    for (const species of SPECIES) {
      for (const stage of [1, 6]) {
        inspect(plant({ species, stage, pot: 'terracotta' }), (host) => {
          for (const el of host.querySelectorAll('[stroke]')) {
            if (el.getAttribute('stroke') === 'none') continue;
            const fill = el.getAttribute('fill');
            expect(!fill || fill === 'none', `${species}: a stroked, filled ${el.tagName}`).toBe(true);
            expect(Number(el.getAttribute('stroke-width') ?? 1), `${species} stroke width`).toBeLessThanOrEqual(3);
          }
        });
      }
    }
  });

  it('gives every pot a shade crescent on the side away from the light, and underneath when lit from above', () => {
    for (const pot of POTS) {
      const crescent = (light: Light) =>
        inspect(<PotArt pot={pot} light={light} />, (host) => {
          const boxes = [...host.querySelectorAll('.pl-shade:not([data-part="handle"])')].map((el) => artBounds(el));
          expect(boxes.length, `${pot} crescents`).toBeGreaterThan(0);
          const b = union(boxes);
          return (b.x0 + b.x1) / 2;
        });
      expect(crescent(DAY_LIGHT), `${pot}, window left`).toBeGreaterThan(50);
      expect(crescent(RIGHT), `${pot}, window right`).toBeLessThan(50);
      expect(crescent(NIGHT_LIGHT), `${pot}, lamp`).toBeLessThan(50);
      expect(Math.abs(crescent(TOP) - 50), `${pot}, overhead`).toBeLessThan(6);
    }
  });

  it('casts the contact shadow away from the light', () => {
    const contactX = (light: Light) =>
      inspect(<PotArt pot="terracotta" light={light} />, (host) => {
        const b = artBounds(host.querySelector('.pl-contact')!);
        return (b.x0 + b.x1) / 2;
      });
    expect(contactX(DAY_LIGHT)).toBeGreaterThan(50);
    expect(contactX(RIGHT)).toBeLessThan(50);
    expect(contactX(TOP)).toBeCloseTo(50);
  });

  it('gives the midnight glaze a rim of lamplight at night, and nothing else', () => {
    expect(markup(<PotArt pot="midnight" light={NIGHT_LIGHT} />)).toMatch(/pl-rim/);
    expect(markup(<PotArt pot="midnight" light={DAY_LIGHT} />)).not.toMatch(/pl-rim/);
    expect(markup(<PotArt pot="terracotta" light={NIGHT_LIGHT} />)).not.toMatch(/pl-rim/);
  });

  it('puts the water glass highlight on the lit side', () => {
    const highlightX = (light: Light) =>
      inspect(plant({ species: 'pothos', stage: 1, light }), (host) => {
        const bright = [...host.querySelectorAll('[data-vessel="glass"] path')].filter((el) => el.getAttribute('fill') === '#FFFFFF');
        expect(bright.length).toBe(1);
        const b = artBounds(bright[0]!);
        return (b.x0 + b.x1) / 2;
      });
    expect(highlightX(DAY_LIGHT)).toBeLessThan(50);
    expect(highlightX(RIGHT)).toBeGreaterThan(50);
  });

  it('warms lit colours toward the lamp at night', () => {
    expect(markup(<PotArt pot="terracotta" light={DAY_LIGHT} />)).toContain('fill="#DDA088"');
    expect(markup(<PotArt pot="terracotta" light={NIGHT_LIGHT} />)).not.toContain('fill="#DDA088"');
  });

  it('keeps colour under the lamp: the blue mug stays blue, the midnight glaze stays deep blue', () => {
    const fillOf = (pot: PotId, light: Light, pick: (fills: string[]) => string) =>
      inspect(<PotArt pot={pot} light={light} />, (host) => pick([...host.querySelectorAll('[fill^="#"]')].map((el) => el.getAttribute('fill')!)));
    const saturation = (hex: string) => toHsl(channels(hex))[1];
    const hue = (hex: string) => toHsl(channels(hex))[0];
    const mugDay = fillOf('mug', DAY_LIGHT, (f) => f.find((c) => c === '#AECBE4')!);
    expect(mugDay).toBe('#AECBE4');
    const mugNight = kitFor(NIGHT_LIGHT).lit('#AECBE4');
    expect(saturation(mugNight)).toBeGreaterThanOrEqual(0.25);
    expect(Math.abs(hue(mugNight) - hue('#AECBE4'))).toBeLessThan(12);
    const midnight = kitFor(NIGHT_LIGHT).lit('#34406E');
    expect(saturation(midnight)).toBeGreaterThanOrEqual(0.3);
    expect(hue(midnight)).toBeGreaterThan(215);
    expect(hue(midnight)).toBeLessThan(245);
  });

  it('folds the prayer plant’s leaves upward at night', () => {
    for (const stage of [1, 3, 5, 7]) {
      const day = markup(plant({ species: 'calathea', stage, light: DAY_LIGHT }));
      const night = markup(plant({ species: 'calathea', stage, light: NIGHT_LIGHT }));
      expect(day, `stage ${stage} by day`).not.toMatch(/data-folded/);
      expect(night, `stage ${stage} at night`).toMatch(/data-folded="true"/);
      // Folded leaves stand up, so the plant is narrower than by day.
      const d = plantBounds({ species: 'calathea', stage, light: DAY_LIGHT });
      const n = plantBounds({ species: 'calathea', stage, light: NIGHT_LIGHT });
      expect(n.x1 - n.x0, `stage ${stage} width`).toBeLessThan(d.x1 - d.x0);
    }
    // Only the prayer plant moves at night.
    expect(plantBounds({ species: 'pothos', stage: 5, light: NIGHT_LIGHT })).toEqual(plantBounds({ species: 'pothos', stage: 5, light: DAY_LIGHT }));
  });

  it('turns the sunflower to face the light', () => {
    const facing = (light: Light) => inspect(plant({ species: 'sunflower', stage: 6, light }), (host) => host.querySelector('[data-facing]')!.getAttribute('data-facing'));
    expect(facing(DAY_LIGHT)).toBe('left');
    expect(facing(RIGHT)).toBe('right');
    expect(facing(TOP)).toBe('front');
    expect(facing(NIGHT_LIGHT)).toBe('right');
  });

  it('darkens the shade side of the plant: leaves away from the light take the darker inks', () => {
    const p = inks('#AAAAAA', '#777777', '#444444');
    const left = kitFor(DAY_LIGHT);
    expect(left.tone(p, 0, 30)).toBe('#AAAAAA');
    expect(left.tone(p, 0, 70)).toBe('#777777');
    expect(left.tone(p, 1, 70)).toBe('#444444');
    const right = kitFor(RIGHT);
    expect(right.tone(p, 0, 70)).toBe('#AAAAAA');
    expect(right.tone(p, 0, 30)).toBe('#777777');
    const top = kitFor(TOP);
    expect(top.tone(p, 0, 30, 40)).toBe('#AAAAAA');
    expect(top.tone(p, 0, 30, 70)).toBe('#777777');
    expect(kitFor(NIGHT_LIGHT).tone(p, 0, 70)).not.toBe('#AAAAAA');
    expect(kitFor(DAY_LIGHT)).toBe(kitFor({ from: 'left', night: false }));
  });
});

describe('PlantArt: icon framing for cards', () => {
  const viewBox = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => host.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number));
  const painted = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => artBounds(host.querySelector('svg')!, { stroked: true, sampled: true }));

  it('has a frame for every species and stage, and keeps the scene canvas by default', () => {
    for (const species of SPECIES) expect(ICON_FRAMES[species], species).toHaveLength(8);
    expect(viewBox({ species: 'begonia', stage: 0 })).toEqual([0, 0, 100, 100]);
    expect(viewBox({ species: 'begonia', stage: 0, fit: 'icon' })).not.toEqual([0, 0, 100, 100]);
  });

  it('fills the card: every stage spans most of its box, and young plants are no longer specks', () => {
    const thin: string[] = [];
    let total = 0;
    let n = 0;
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        const [, , side] = viewBox({ species, stage, fit: 'icon' });
        const b = painted({ species, stage, progress: 0.5, fit: 'icon' });
        const w = b.x1 - b.x0;
        const h = b.y1 - b.y0;
        const area = (w * h) / (side! * side!);
        total += area;
        n++;
        if (Math.max(w, h) / side! < 0.65 || area < 0.3) thin.push(`${species} ${stage}: ${Math.round(area * 100)}%`);
      }
    }
    expect(thin).toEqual([]);
    // On average the painted bounds cover well over half the box (a cutting on the scene canvas covers about a fifth).
    expect(total / n).toBeGreaterThan(0.55);
    const scene = painted({ species: 'pothos', stage: 0, progress: 0.5 });
    const icon = painted({ species: 'pothos', stage: 0, progress: 0.5, fit: 'icon' });
    const [, , side] = viewBox({ species: 'pothos', stage: 0, fit: 'icon' });
    expect((icon.y1 - icon.y0) / side!).toBeGreaterThan(1.4 * ((scene.y1 - scene.y0) / 100));
  }, 30_000);

  it('never crops the plant, in any pot, light, progress or bloom count', () => {
    const cropped: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        const [x, y, side] = viewBox({ species, stage, fit: 'icon' });
        for (const pot of ['terracotta', 'teacup', 'mug', 'eggshell'] as PotId[]) {
          for (const light of [DAY_LIGHT, RIGHT, NIGHT_LIGHT]) {
            const b = painted({ species, stage, pot, light, progress: 0.99, blooms: MAX_BLOOMS, fit: 'icon' });
            if (b.x0 < x! - 0.3 || b.y0 < y! - 0.3 || b.x1 > x! + side! + 0.3 || b.y1 > y! + side! + 0.3) cropped.push(`${species} ${stage} ${pot} ${light.from}`);
          }
        }
      }
    }
    expect(cropped).toEqual([]);
  }, 60_000);

  it('stands the empty pot beside a cutting only when asked, in a scene or a card (the M1 audit: a card cutting has its pot too)', () => {
    const emptyPot = (props: Partial<PlantArtProps>) => markup(plant(props)).includes('data-empty-pot="blush"');
    expect(emptyPot({ stage: 0, pot: 'blush' })).toBe(false);
    expect(emptyPot({ stage: 0, pot: 'blush', withPot: true })).toBe(true);
    expect(emptyPot({ stage: 1, pot: 'blush', withPot: true })).toBe(true);
    expect(emptyPot({ stage: 3, pot: 'blush', withPot: true })).toBe(false);
    expect(emptyPot({ stage: 0, pot: 'blush', fit: 'icon' })).toBe(false);
    expect(emptyPot({ stage: 0, pot: 'blush', withPot: true, fit: 'icon' })).toBe(true);
    // The card's frame widens to hold the glass and the pot.
    const side = (withPot: boolean) => Number(markup(plant({ stage: 0, pot: 'blush', withPot, fit: 'icon' })).match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)![1]);
    expect(side(true)).toBeGreaterThan(side(false));
    // It stands on the shade side, behind the glass.
    const potX = (light: Light) => inspect(plant({ stage: 0, pot: 'blush', withPot: true, light }), (host) => {
      const b = artBounds(host.querySelector('[data-empty-pot]')!);
      return (b.x0 + b.x1) / 2;
    });
    expect(potX(DAY_LIGHT)).toBeGreaterThan(55);
    expect(potX(RIGHT)).toBeLessThan(45);
  });
});

describe('PlantArt: growth input', () => {
  it('treats NaN and infinite input as the nearest sensible value, never as broken path data', () => {
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        const zero = markup(plant({ species, stage, progress: 0 }));
        expect(markup(plant({ species, stage, progress: NaN })), `${species} ${stage} NaN`).toBe(zero);
        expect(markup(plant({ species, stage, progress: -Infinity })), `${species} ${stage} -Infinity`).toBe(zero);
        expect(broken(markup(plant({ species, stage, progress: Infinity, blooms: NaN }))), `${species} ${stage} Infinity`).toBe(false);
      }
      expect(broken(markup(plant({ species, stage: NaN })))).toBe(false);
      expect(markup(plant({ species, stage: Infinity }))).toBe(markup(plant({ species, stage: 7 })));
      expect(markup(plant({ species, stage: 12, progress: 3 }))).toBe(markup(plant({ species, stage: 7, progress: 1 })));
    }
  }, 30_000);

  it('counts blooms from Blooming on: the stage default, or 0..MAX_BLOOMS when given', () => {
    expect(bloomCount(4, 0.9, 5)).toBe(0);
    expect(bloomCount(5, 0, undefined)).toBe(2);
    expect(bloomCount(5, 1, undefined)).toBe(3);
    expect(bloomCount(6, 0, undefined)).toBe(4);
    expect(bloomCount(7, 0, undefined)).toBe(5);
    expect(bloomCount(7, 0, NaN)).toBe(5);
    expect(bloomCount(6, 0, 2.7)).toBe(2);
    expect(bloomCount(6, 0, -3)).toBe(0);
    expect(bloomCount(6, 0, 40)).toBe(MAX_BLOOMS);
    expect(bloomCount(6, 0, Infinity)).toBe(MAX_BLOOMS);
    expect(growthOf(3, 0.25, 4)).toEqual({ stage: 3, progress: 0.25, t: 3.25, blooms: 0 });
  });

  it('shows more flowers, berries or pups as blooms go up, capped at MAX_BLOOMS', () => {
    for (const species of SPECIES) {
      const at = (blooms: number) => markup(plant({ species, stage: 6, blooms, pot: 'speckled' }));
      expect(at(6), `${species}: 6 blooms`).not.toBe(at(0));
      expect(at(9), `${species}: past the cap`).toBe(at(MAX_BLOOMS));
    }
  });

  it('ignores blooms before Blooming', () => {
    for (const species of SPECIES) expect(markup(plant({ species, stage: 4, blooms: 4 })), species).toBe(markup(plant({ species, stage: 4 })));
  });

  it('darkens the soil when watered today', () => {
    for (const pot of POTS) {
      const soil = (damp: boolean) => inspect(plant({ species: 'pilea', stage: 3, pot, damp }), (host) => host.querySelector('.plant-soil')!.getAttribute('fill'));
      expect(soil(true), pot).not.toBe(soil(false));
    }
  });

  it('marks Evergreen with a small brass watering-can charm, and nothing that glitters', () => {
    expect(markup(plant({ stage: 7 }))).toMatch(/plant-charm/);
    expect(markup(plant({ stage: 6 }))).not.toMatch(/plant-charm/);
    expect(markup(plant({ stage: 7 }))).not.toMatch(/sparkle|twinkle|glow/i);
  });
});

describe('PlantArt: watering and accessibility', () => {
  it('waters the plant only when pulse goes up after mount: a leaf lift, a glint, damp soil', () => {
    const host = document.createElement('div');
    const show = (pulse: number) => act(() => render(plant({ species: 'begonia', stage: 4, pot: 'mug', pulse }), host));
    const glint = () => host.querySelector('.plant-glint') !== null;
    const soil = () => host.querySelector('.plant-soil')!.getAttribute('fill');
    const lift = () => host.querySelector('.plant-lift-0, .plant-lift-1');
    show(3);
    const dry = soil();
    expect(glint()).toBe(false);
    expect(lift()).toBeNull();
    show(2);
    expect(glint(), 'an undone check-in').toBe(false);
    show(4);
    expect(glint()).toBe(true);
    expect(soil()).not.toBe(dry);
    const first = lift()!.getAttribute('class');
    show(5);
    // The lift restarts by switching keyframes, without remounting the plant.
    expect(lift()!.getAttribute('class')).not.toBe(first);
    act(() => render(null, host));
  });

  it('is decorative by default and labelled when titled', () => {
    inspect(plant({ species: 'catnip', stage: 5, pot: 'tincan' }), (host) => expect(host.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true'));
    inspect(plant({ species: 'catnip', stage: 5, pot: 'tincan', title: 'Tidy for 10 min, catnip, Blooming' }), (host) => {
      const svg = host.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Tidy for 10 min, catnip, Blooming');
      expect(svg.getAttribute('aria-hidden')).toBeNull();
    });
  });
});

describe('PotArt and pot geometry', () => {
  it('renders every pot on its own, in every light, without broken geometry', () => {
    for (const pot of POTS) {
      for (const light of LIGHTS) {
        const html = markup(<PotArt pot={pot} light={light} damp />);
        expect(html.includes('<path'), pot).toBe(true);
        expect(broken(html), pot).toBe(false);
      }
    }
  });

  it('says where a tag’s stake meets the soil, beside the stem on the soil line', () => {
    for (const pot of POTS) {
      const at = tagAnchor(pot);
      const g = POT_GEOMETRY[pot];
      expect(at.y, pot).toBe(g.mouth.y);
      expect(at.x, pot).toBeGreaterThan(52);
      expect(at.x, pot).toBeLessThan(50 + g.mouth.hw);
    }
  });

  it('publishes where every pot’s rim and soil are, inside the canvas', () => {
    for (const pot of POTS) {
      const g = POT_GEOMETRY[pot];
      expect(g.rim.x0, pot).toBeGreaterThan(20);
      expect(g.rim.x1, pot).toBeLessThan(80);
      expect(g.mouth.y, pot).toBeGreaterThan(55);
      expect(g.mouth.y, pot).toBeLessThan(72);
      expect(g.foot.y, pot).toBe(95);
    }
  });
});

describe('baked shapes (one path per ink)', () => {
  it('puts a baked copy exactly where the transform would', () => {
    const d = 'M0 0L10 0L10 -20Z';
    const m = placeMatrix(30, 60, 90, 0.5);
    const b = pathBounds(bake(d, m));
    // Turned a quarter clockwise and halved: the 20-unit rise now points right, 10 long.
    expect(b.x0).toBeCloseTo(30, 1);
    expect(b.x1).toBeCloseTo(40, 1);
    expect(b.y0).toBeCloseTo(60, 1);
    expect(b.y1).toBeCloseTo(65, 1);
    // Arcs keep their size under a uniform scale and flip their sweep in a mirror.
    expect(bake('M0 0a2 2 0 1 0 4 0Z', placeMatrix(0, 0, 0, 2))).toBe('M0 0A4 4 0 1 0 8 0Z');
    expect(bake('M0 0a2 2 0 1 0 4 0Z', placeMatrix(0, 0, 0, 1, -1))).toContain('A2 2 0 1 1 -4 0');
  });
});

describe('shade crescents (geometry)', () => {
  it('builds each crescent on the side away from the light, inside its shape', () => {
    const t = taperCrescents({ top: 60, bottom: 90, a: 20, b: 15, r: 2 }, 5);
    // The band follows the rounded foot, so its inner edge reaches b - r - d from the middle.
    expect(pathBounds(t.left).x0).toBeGreaterThanOrEqual(50 + 15 - 2 - 5 - 0.01);
    expect(pathBounds(t.right).x1).toBeLessThanOrEqual(50 - 15 + 2 + 5 + 0.01);
    expect(pathBounds(t.top).y0).toBeGreaterThanOrEqual(85 - 0.01);
    const r = bandCrescents(30, 60, 40, 6, 2, 4);
    expect(pathBounds(r.left).x0).toBeGreaterThanOrEqual(70 - 2 - 4 - 0.01);
    expect(pathBounds(r.right).x1).toBeLessThanOrEqual(30 + 2 + 4 + 0.01);
  });
});

describe('PlantTag', () => {
  it('carries the name and the note as real text', () => {
    inspect(<PlantTag name="Drink water" note="after coffee" size={14} />, (host) => {
      expect(host.textContent).toContain('Drink water');
      expect(host.textContent).toContain('after coffee');
      expect(host.querySelector('[title="Drink water"]')).not.toBeNull();
      expect(host.querySelector('[data-stand="stake"]')).not.toBeNull();
    });
  });

  it('keeps a long name whole for screen readers, with the full text on hover', () => {
    const name = 'Water the fern on the landing, and the one by the door';
    inspect(<PlantTag name={name} />, (host) => {
      expect(host.textContent).toBe(name);
      expect(host.querySelector(`[title="${name}"]`)).not.toBeNull();
    });
  });

  it('can be propped against the pot, with no stake', () => {
    inspect(<PlantTag name="Stretch" stand="propped" />, (host) => {
      expect(host.querySelector('[data-stand="propped"]')).not.toBeNull();
      expect(host.querySelectorAll('[aria-hidden="true"]').length).toBe(1);
    });
  });

  it('scales with its size', () => {
    inspect(<PlantTag name="Read" size={22} />, (host) => expect((host.firstElementChild as HTMLElement).style.getPropertyValue('--tag-size')).toBe('22px'));
  });
});

describe('composed plants are remembered', () => {
  it('the same plant twice in one tree, and again after a remount, draws the same', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const one = (key: string) => <PlantArt key={key} species="monstera" stage={5} progress={0.4} pot="terracotta" size={64} seed="s" />;
    render(<div>{one('a')}{one('b')}</div>, host);
    const [a, b] = [...host.querySelectorAll('svg')].map((s) => s.innerHTML.replace(/plant-\d+/g, 'plant-N'));
    expect(a).toBeTruthy();
    expect(b).toBe(a);
    render(null, host);
    render(<div>{one('c')}</div>, host);
    expect(host.querySelector('svg')!.innerHTML.replace(/plant-\d+/g, 'plant-N')).toBe(a);
    render(null, host);
    host.remove();
  });
});

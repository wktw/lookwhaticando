// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { JSX } from 'preact';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { TREATS } from '@/catalog/collectibles';
import { PlantArt, PotArt, PLANT_SPECIES_WITH_ART, POTS_WITH_ART, type PlantArtProps } from '@/art/plants';
import { TREAT_ART } from '@/art/items';
import { artBounds, drawnMass, type Box } from './svgBounds.testutil';
import { POTS as POT_DEFS } from './pots';

const SPECIES = [...PLANT_SPECIES_WITH_ART] as PlantSpeciesId[];
const POTS = [...POTS_WITH_ART] as PotId[];
/** The gold bow's left loop, as drawn by the Evergreen charm. */
const BOW = 'M0 0 C-1.6 -2.4 -4.4 -2.4 -4.4 -0.2';
const CLASSIC_POTS: PotId[] = ['terracotta', 'cream', 'blush', 'speckled', 'ticking', 'eggshell', 'midnight'];

/** Renders into a detached host, hands the host to `read`, then unmounts. */
function inspect<T>(node: JSX.Element, read: (host: HTMLElement) => T): T {
  const host = document.createElement('div');
  render(node, host);
  const out = read(host);
  render(null, host);
  return out;
}

const markup = (node: JSX.Element) => inspect(node, (host) => host.innerHTML);

/** Drops instance ids so two renders of the same art compare equal. */
const normalize = (html: string) => html.replace(/(plant|pot)[a-zA-Z0-9_-]*?-(glow|shade|body|bowl|heart)/g, 'id-$2');

const broken = (html: string) => /NaN|undefined|Infinity/.test(html);

const plant = (props: Partial<PlantArtProps>) => <PlantArt species="tulip" stage={0} pot="terracotta" {...props} />;

/** Painted bounds of the plant itself (not the pot or the Evergreen extras). */
function plantBounds(props: Partial<PlantArtProps>): Box {
  return inspect(plant(props), (host) =>
    [...host.querySelectorAll('.plant-sway')].map((g) => artBounds(g, { stroked: true })).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })),
  );
}

const mass = (props: Partial<PlantArtProps>) => inspect(plant(props), (host) => drawnMass(host.querySelector('svg')!));

describe('PlantArt', () => {
  it('renders every species at every stage and progress without broken geometry', () => {
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        for (const progress of [0, 0.5, 0.95]) {
          expect(broken(markup(plant({ species, stage, progress }))), `${species} stage ${stage} @${progress}`).toBe(false);
        }
      }
    }
  });

  it('treats NaN and infinite input as the nearest sensible value, never as broken path data', () => {
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        const zero = normalize(markup(plant({ species, stage, progress: 0 })));
        expect(normalize(markup(plant({ species, stage, progress: NaN }))), `${species} ${stage} NaN progress`).toBe(zero);
        expect(normalize(markup(plant({ species, stage, progress: -Infinity }))), `${species} ${stage} -Infinity progress`).toBe(zero);
        expect(broken(markup(plant({ species, stage, progress: Infinity, blooms: NaN }))), `${species} ${stage} Infinity`).toBe(false);
      }
      const capped = normalize(markup(plant({ species, stage: 7, blooms: 6 })));
      expect(normalize(markup(plant({ species, stage: 7, blooms: Infinity })))).toBe(capped);
      expect(normalize(markup(plant({ species, stage: 7, blooms: NaN })))).toBe(normalize(markup(plant({ species, stage: 7 }))));
      expect(broken(markup(plant({ species, stage: NaN })))).toBe(false);
      expect(normalize(markup(plant({ species, stage: Infinity })))).toBe(normalize(markup(plant({ species, stage: 7 }))));
    }
  });

  it('makes every stage visibly bigger or fuller than the one before', () => {
    const same: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 1; stage <= 7; stage++) {
        const [before, after] = [stage - 1, stage].map((s) => ({ species, stage: s, progress: 0.5 }));
        const a = plantBounds(before!);
        const b = plantBounds(after!);
        const moved = Math.max(Math.abs(a.y0 - b.y0), Math.abs(a.x0 - b.x0), Math.abs(a.x1 - b.x1));
        if (Math.abs(mass(after!) - mass(before!)) < 2 && moved < 1) same.push(`${species} ${stage}`);
      }
    }
    expect(same).toEqual([]);
  });

  it('adds real detail as progress fills a stage (not just a tiny nudge)', () => {
    const flat: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 6; stage++) {
        if (Math.abs(mass({ species, stage, progress: 0.95 }) - mass({ species, stage, progress: 0 })) < 4) flat.push(`${species} ${stage}`);
      }
    }
    expect(flat).toEqual([]);
  });

  it('keeps every plant inside the canvas with headroom, even Evergreen with six blooms', () => {
    const out: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        for (const progress of [0, 0.95]) {
          const b = plantBounds({ species, stage, progress, blooms: 6 });
          if (b.y0 < 4.5 || b.x0 < 3 || b.x1 > 97) out.push(`${species} ${stage}@${progress}: y ${b.y0.toFixed(1)}, x ${b.x0.toFixed(1)}–${b.x1.toFixed(1)}`);
        }
      }
      for (const pot of POTS) {
        const all = inspect(plant({ species, stage: 7, blooms: 6, pot, size: 40 }), (host) => artBounds(host.querySelector('svg')!, { stroked: true }));
        if (all.y0 < 0 || all.x0 < 0 || all.x1 > 100 || all.y1 > 100) out.push(`${species} in ${pot}: whole art leaves the canvas ${JSON.stringify(all)}`);
      }
    }
    expect(out).toEqual([]);
  });

  it('grows extra blooms after Evergreen, capped at six with a golden sparkle', () => {
    for (const species of SPECIES) {
      const counts = [0, 3, 6, 9].map((blooms) => normalize(markup(plant({ species, stage: 7, blooms, pot: 'speckled' }))));
      expect(counts[1], `${species} blooms 3`).not.toBe(counts[0]);
      expect(counts[2], `${species} blooms 6`).not.toBe(counts[1]);
      expect(counts[3], `${species} blooms beyond the cap`).toBe(counts[2]);
      expect(broken(counts[2]!), species).toBe(false);
    }
  });

  it('ignores blooms before Evergreen and clamps out-of-range input', () => {
    const plain = normalize(markup(plant({ stage: 6, pot: 'rosy' })));
    expect(normalize(markup(plant({ stage: 6, blooms: 4, pot: 'rosy' })))).toBe(plain);
    expect(normalize(markup(plant({ stage: 12, progress: 3, pot: 'rosy' })))).toBe(normalize(markup(plant({ stage: 7, progress: 1, pot: 'rosy' }))));
  });

  it('dresses every Evergreen pot in its reward: a gold bow and charm, plus a ribbon on pots without a face', () => {
    for (const pot of POTS) {
      const evergreen = markup(plant({ stage: 7, pot }));
      expect(evergreen.includes(BOW), `${pot} charm`).toBe(true);
      expect(broken(evergreen), pot).toBe(false);
      expect(markup(plant({ stage: 6, pot })).includes(BOW), `${pot} before Evergreen`).toBe(false);
    }
    for (const pot of CLASSIC_POTS) expect(markup(plant({ stage: 7, pot })).includes(`d="${POT_DEFS[pot].ribbon}"`), `${pot} ribbon`).toBe(true);
  });

  it('keeps small icons still: no twinkles or charm swing below 64px', () => {
    const at = (size: number) => markup(plant({ stage: 7, size, animated: true }));
    expect(at(40)).not.toMatch(/plant-twinkle|plant-charm/);
    expect(at(120)).toMatch(/plant-twinkle/);
    expect(at(120)).toMatch(/plant-charm/);
  });

  it('fits every species in every pot', () => {
    for (const pot of POTS) {
      for (const species of SPECIES) {
        expect(broken(markup(plant({ species, stage: 7, blooms: 6, pot }))), `${species} in ${pot}`).toBe(false);
      }
    }
  });

  it('waters the plant only when pulse goes up after mount', () => {
    const host = document.createElement('div');
    const show = (pulse: number) => act(() => render(plant({ species: 'begonia', stage: 4, pot: 'mug', pulse }), host));
    const watered = () => host.querySelector('.plant-water') !== null;
    show(3);
    expect(watered()).toBe(false);
    expect(host.querySelector('.plant-wiggle')).toBeNull();
    show(2);
    expect(watered(), 'an undone check-in').toBe(false);
    show(4);
    expect(watered()).toBe(true);
    const first = host.querySelector('.plant-wiggle')!.getAttribute('class');
    show(5);
    // The wiggle restarts by switching keyframes, without remounting the plant.
    expect(host.querySelector('.plant-wiggle')!.getAttribute('class')).not.toBe(first);
    act(() => render(null, host));
  });

  it('is decorative by default and labelled when titled', () => {
    inspect(plant({ species: 'catnip', stage: 5, pot: 'tincan' }), (host) => expect(host.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true'));
    inspect(plant({ species: 'catnip', stage: 5, pot: 'tincan', title: 'Meal prep lemon tree, blooming' }), (host) => {
      const svg = host.querySelector('svg')!;
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Meal prep lemon tree, blooming');
    });
  });

  it('gives each instance its own clip-path ids', () => {
    const html = markup(
      <div>
        {plant({ stage: 3, pot: 'ticking' })}
        {plant({ stage: 3, pot: 'ticking' })}
      </div>,
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('PotArt', () => {
  it('renders every pot on its own', () => {
    for (const pot of POTS) {
      const html = markup(<PotArt pot={pot} />);
      expect(html.includes('<path'), pot).toBe(true);
      expect(broken(html), pot).toBe(false);
    }
  });
});

describe('treat art', () => {
  it('draws every treat as a group without broken geometry, inside the canvas', () => {
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      const node = (
        <svg viewBox="0 0 100 100">
          <Art />
        </svg>
      );
      const html = markup(node);
      expect(html.startsWith('<svg viewBox="0 0 100 100"><g'), t.id).toBe(true);
      expect(broken(html), t.id).toBe(false);
      const b = inspect(node, (host) => artBounds(host.querySelector('svg')!, { stroked: true }));
      expect(b.y0 >= 0 && b.x0 >= 0 && b.x1 <= 100 && b.y1 <= 100, `${t.id} bounds ${JSON.stringify(b)}`).toBe(true);
    }
  });
});

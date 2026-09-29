// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { JSX } from 'preact';
import type { PlantSpeciesId, PotId } from '@/catalog/types';
import { TREATS } from '@/catalog/collectibles';
import { PlantArt, PotArt, PLANT_SPECIES_WITH_ART, POTS_WITH_ART } from '@/art/plants';
import { TREAT_ART } from '@/art/items';

const SPECIES = [...PLANT_SPECIES_WITH_ART] as PlantSpeciesId[];
const POTS = [...POTS_WITH_ART] as PotId[];

function markup(node: JSX.Element): string {
  const host = document.createElement('div');
  render(node, host);
  const html = host.innerHTML;
  render(null, host);
  return html;
}

/** Drops instance ids so two renders of the same art compare equal. */
const normalize = (html: string) => html.replace(/(plant|pot)[a-zA-Z0-9_-]*?-(glow|shade|body|bowl|heart)/g, 'id-$2');

const broken = (html: string) => /NaN|undefined|Infinity/.test(html);

describe('PlantArt', () => {
  it('renders every species at every stage and progress without broken geometry', () => {
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 7; stage++) {
        for (const progress of [0, 0.5, 0.95]) {
          const html = markup(<PlantArt species={species} stage={stage} progress={progress} pot="terracotta" />);
          expect(broken(html), `${species} stage ${stage} @${progress}`).toBe(false);
        }
      }
    }
  });

  it('makes every stage look different from the one before', () => {
    const same: string[] = [];
    for (const species of SPECIES) {
      let previous = '';
      for (let stage = 0; stage <= 7; stage++) {
        const html = normalize(markup(<PlantArt species={species} stage={stage} progress={0.5} pot="cream" />));
        if (html === previous) same.push(`${species} ${stage}`);
        previous = html;
      }
    }
    expect(same).toEqual([]);
  });

  it('adds continuous detail as progress fills a stage', () => {
    const static_: string[] = [];
    for (const species of SPECIES) {
      for (let stage = 0; stage <= 6; stage++) {
        const start = normalize(markup(<PlantArt species={species} stage={stage} progress={0} pot="blush" />));
        const end = normalize(markup(<PlantArt species={species} stage={stage} progress={0.95} pot="blush" />));
        if (start === end) static_.push(`${species} ${stage}`);
      }
    }
    expect(static_).toEqual([]);
  });

  it('grows extra blooms after Evergreen, capped at six with a golden sparkle', () => {
    for (const species of SPECIES) {
      const counts = [0, 3, 6, 9].map((blooms) => normalize(markup(<PlantArt species={species} stage={7} blooms={blooms} pot="sage" />)));
      expect(counts[1], `${species} blooms 3`).not.toBe(counts[0]);
      expect(counts[2], `${species} blooms 6`).not.toBe(counts[1]);
      expect(counts[3], `${species} blooms beyond the cap`).toBe(counts[2]);
      expect(broken(counts[2]!), species).toBe(false);
    }
  });

  it('ignores blooms before Evergreen and clamps out-of-range input', () => {
    const plain = normalize(markup(<PlantArt species="tulip" stage={6} pot="heart" />));
    expect(normalize(markup(<PlantArt species="tulip" stage={6} blooms={4} pot="heart" />))).toBe(plain);
    expect(normalize(markup(<PlantArt species="tulip" stage={12} progress={3} pot="heart" />))).toBe(normalize(markup(<PlantArt species="tulip" stage={7} progress={1} pot="heart" />)));
  });

  it('fits every species in every pot', () => {
    for (const pot of POTS) {
      for (const species of SPECIES) {
        expect(broken(markup(<PlantArt species={species} stage={7} blooms={6} pot={pot} />)), `${species} in ${pot}`).toBe(false);
      }
    }
  });

  it('plays the watering reaction only when pulse changes after mount', () => {
    const host = document.createElement('div');
    render(<PlantArt species="daisy" stage={4} pot="kitty" pulse={3} />, host);
    expect(host.querySelector('.plant-water')).toBeNull();
    expect(host.querySelector('.plant-wiggle')).toBeNull();
    render(<PlantArt species="daisy" stage={4} pot="kitty" pulse={4} />, host);
    expect(host.querySelector('.plant-water')).not.toBeNull();
    expect(host.querySelector('.plant-wiggle')).not.toBeNull();
    render(null, host);
  });

  it('is decorative by default and labelled when titled', () => {
    const host = document.createElement('div');
    render(<PlantArt species="lemon" stage={5} pot="frog" />, host);
    expect(host.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    render(<PlantArt species="lemon" stage={5} pot="frog" title="Meal prep lemon tree, blooming" />, host);
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Meal prep lemon tree, blooming');
    render(null, host);
  });

  it('gives each instance its own clip-path ids', () => {
    const html = markup(
      <div>
        <PlantArt species="tulip" stage={3} pot="cowprint" />
        <PlantArt species="tulip" stage={3} pot="cowprint" />
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
  it('draws every treat as a group without broken geometry', () => {
    for (const t of TREATS) {
      const Art = TREAT_ART[t.id]!;
      const html = markup(
        <svg viewBox="0 0 100 100">
          <Art />
        </svg>,
      );
      expect(html.startsWith('<svg viewBox="0 0 100 100"><g'), t.id).toBe(true);
      expect(broken(html), t.id).toBe(false);
    }
  });
});

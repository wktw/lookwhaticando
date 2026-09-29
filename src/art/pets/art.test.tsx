// @vitest-environment jsdom
/**
 * The pet art system: every pet, pose, light, expression, size floor and wearable renders cleanly;
 * the precomputed crescents cover every pose × facing × light and are fresh; no filters, and no
 * strokes except the thin lines that are allowed one (whiskers, closed eyes, a frog's mouth).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, type ComponentChild } from 'preact';
import { PETS, WEARABLES } from '@/catalog/collectibles';
import { SPECIES, type Species } from '@/catalog/types';
import { shadeSide, type Light } from '@/art/light';
import { PetArt, scaleFor, tierFor } from './PetArt';
import { pathBox, placeBox, poseBounds } from './bounds';
import { BASELINE } from './rig';
import { LOOKS, getLook } from './looks';
import { SPECIES_ART } from './species';
import { RIGS } from './species/rigs';
import { CRESCENT_HASH } from './crescents/data';
import { crescentPath } from './crescents';
import { crescentJobs, jobsHash } from './crescents/jobs';
import { EXPRESSIONS, POSES, canonicalExpression, type Expression } from './types';
import { luma, spriteTones, tonesFor } from './palette';
import { WEARABLE_ART } from '../wearables';

// The render sweeps sample poses, lights and expressions rather than every combination, so the
// suite stays quick; give them some room on a busy machine all the same.
vi.setConfig({ testTimeout: 20_000 });

function markup(node: ComponentChild): string {
  const host = document.createElement('div');
  render(node, host);
  const html = host.innerHTML;
  render(null, host);
  return html;
}

function dom(node: ComponentChild): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

function expectClean(html: string, label: string) {
  expect(html, label).not.toMatch(/NaN|undefined|Infinity|\[object/);
  expect(html.length, label).toBeGreaterThan(200);
}

const MODELS = Object.fromEntries(SPECIES.map((s) => [s, PETS.find((p) => p.species === s)!.id])) as Record<Species, string>;
const LIGHTS: Light[] = [
  { from: 'left', night: false },
  { from: 'top', night: false },
  { from: 'right', night: false },
  { from: 'right', night: true },
];

describe('pet looks', () => {
  it('has a look for every catalog pet, with its species', () => {
    for (const p of PETS) expect(LOOKS[p.id]?.species, p.id).toBe(p.species);
  });

  it('only asks for markings its species can draw', () => {
    for (const [id, look] of Object.entries(LOOKS)) {
      for (const m of look.marks ?? []) expect(SPECIES_ART[look.species].marks[m], `${id} ${m}`).toBeDefined();
    }
  });

  it('resolves Moonlit variants to the same animal with flecks, and unknown ids to a fallback', () => {
    const m = getLook('moonlit:pet-cow-holstein');
    expect(m.species).toBe('cow');
    expect(m.flecks).toBe(true);
    expect(m.palette.coat).not.toBe(LOOKS['pet-cow-holstein']!.palette.coat);
    expect(getLook('pet-mochi').species).toBe('cat');
  });

  it('keeps the Mochi-era expression names as aliases', () => {
    const cases: [Expression, string][] = [
      ['idle', 'rest'],
      ['love', 'happy'],
      ['eat', 'chew'],
      ['wink', 'blink'],
    ];
    for (const [a, b] of cases) expect(canonicalExpression(a)).toBe(b);
  });
});

describe('pet art rendering', () => {
  it('renders every expression on every species, and every pet in a rotating sample of them', () => {
    for (const sp of SPECIES) for (const e of EXPRESSIONS) expectClean(markup(<PetArt petId={MODELS[sp]} expression={e} animated />), `${sp} ${e}`);
    PETS.forEach((p, i) => {
      for (const e of [EXPRESSIONS[i % EXPRESSIONS.length]!, EXPRESSIONS[(i + 3) % EXPRESSIONS.length]!]) {
        expectClean(markup(<PetArt petId={p.id} expression={e} animated />), `${p.id} ${e}`);
      }
    });
  });

  it('renders every pose for every species, both facings, every light', () => {
    for (const s of SPECIES) {
      for (const pose of POSES) {
        for (const facing of ['left', 'right'] as const) {
          for (const light of LIGHTS) {
            const html = markup(<PetArt petId={MODELS[s]} pose={pose} facing={facing} light={light} size={160} animated />);
            expectClean(html, `${s} ${pose} ${facing} ${light.from}`);
            expect(html, `${s} ${pose}`).toContain(`data-pose="${pose}"`);
          }
        }
      }
    }
  });

  it('renders every look in every pose', () => {
    for (const p of PETS) for (const pose of POSES) expectClean(markup(<PetArt petId={p.id} pose={pose} size={72} />), `${p.id} ${pose}`);
  });

  it('draws Moonlit variants of every pet', () => {
    for (const p of PETS) expectClean(markup(<PetArt petId={`moonlit:${p.id}`} light={{ from: 'right', night: true }} />), `moonlit ${p.id}`);
  });

  it('draws muted pets without filters and silhouettes as one flat token colour', () => {
    const muted = markup(<PetArt petId="pet-cat-calico" muted />);
    expect(muted).not.toContain('filter');
    const sil = dom(<PetArt petId="pet-cat-calico" silhouette />);
    const fills = new Set([...sil.querySelectorAll('[fill]')].map((e) => e.getAttribute('fill')).filter((f) => f !== 'var(--contact)'));
    expect([...fills]).toEqual(['var(--ink-disabled)']);
  });

  it('is decorative by default and labelled with a title', () => {
    expect(markup(<PetArt petId="pet-cat-orange" />)).toContain('aria-hidden="true"');
    const labelled = markup(<PetArt petId="pet-cat-orange" title="Pudding" />);
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Pudding"');
  });
});

describe('size floors', () => {
  it('switches tiers at 32 and 20 px', () => {
    expect(tierFor(20)).toBe('micro');
    expect(tierFor(21)).toBe('small');
    expect(tierFor(32)).toBe('small');
    expect(tierFor(33)).toBe('medium');
    expect(tierFor(48)).toBe('full');
    expect(tierFor(undefined)).toBe('full');
  });

  it('draws the loaf with closed eyes at 32 px, whatever the pose', () => {
    for (const s of SPECIES) {
      const el = dom(<PetArt petId={MODELS[s]} pose="stand" size={32} />);
      const svg = el.querySelector('svg')!;
      expect(svg.getAttribute('data-pose'), s).toBe('loaf');
      expect(svg.getAttribute('data-tier'), s).toBe('small');
      // Closed eyes are lines, not dots: no eye catchlights, and no blink group.
      expect(el.querySelector('.pet-blink'), s).toBeNull();
    }
    expect(dom(<PetArt petId={MODELS.cat} pose="stand" size={33} />).querySelector('svg')!.getAttribute('data-pose')).toBe('stand');
  });

  it('curls up only at 48 px and up: below that a sleeping pet loafs with closed eyes', () => {
    for (const sp of SPECIES) {
      const el = dom(<PetArt petId={MODELS[sp]} pose="sleep" size={40} />);
      expect(el.querySelector('svg')!.getAttribute('data-pose'), sp).toBe('loaf');
      expect(el.querySelector('.pet-blink'), sp).toBeNull();
      expect(dom(<PetArt petId={MODELS[sp]} pose="sleep" size={48} />).querySelector('svg')!.getAttribute('data-pose'), sp).toBe('sleep');
    }
  });

  it('gives the sprite a hint of the species size: a hamster smaller than a cow', () => {
    const k = (id: string) => Number(/scale\(([\d.]+)\)/.exec(dom(<PetArt petId={id} size={20} />).querySelector('svg > g')!.getAttribute('transform') ?? 'scale(1)')![1]);
    expect(k(MODELS.hamster)).toBeLessThan(k(MODELS.cow));
  });

  it('draws a dedicated sprite at 20 px: three shapes and the eyes', () => {
    for (const s of SPECIES) {
      const el = dom(<PetArt petId={MODELS[s]} pose="walk" size={20} />);
      expect(el.querySelector('svg')!.getAttribute('data-tier'), s).toBe('micro');
      // The shapes, not counting the contact shadow.
      expect(el.querySelectorAll('path, circle, ellipse:not([fill="var(--contact)"])').length, s).toBeLessThanOrEqual(8);
    }
  });
});

describe('tile mode', () => {
  it('fits every species and pose inside the canvas, filling most of it', () => {
    for (const [rigId, rig] of Object.entries(RIGS)) {
      for (const pose of POSES) {
        const b = poseBounds(rigId, rig, pose);
        const { s, dx } = scaleFor('full', rig.scale, true, b, 1);
        const x = (v: number) => 50 + dx + (v - 50) * s;
        const y = (v: number) => BASELINE + (v - BASELINE) * s;
        expect(x(b.x0), `${rigId} ${pose}`).toBeGreaterThanOrEqual(0);
        expect(x(b.x1), `${rigId} ${pose}`).toBeLessThanOrEqual(100);
        expect(y(b.y0), `${rigId} ${pose}`).toBeGreaterThanOrEqual(0);
        // Fills at least 70% of the canvas one way or the other.
        expect(Math.max(x(b.x1) - x(b.x0), y(b.y1) - y(b.y0)), `${rigId} ${pose}`).toBeGreaterThan(70);
      }
    }
  });

  it('draws a hamster in a tile much larger than in the world', () => {
    const scaleOf = (el: HTMLElement) => Number(/scale\(([\d.]+) /.exec(el.querySelector('svg > g')!.getAttribute('transform')!)![1]);
    const world = scaleOf(dom(<PetArt petId={MODELS.hamster} size={72} />));
    const tile = scaleOf(dom(<PetArt petId={MODELS.hamster} size={72} fit />));
    expect(tile).toBeGreaterThan(world * 1.5);
  });
});

describe('lean drawing', () => {
  it('stays near 25–40 elements per still pet, and breathes on the <svg>, not an inner group', () => {
    let total = 0;
    let n = 0;
    for (const p of PETS) {
      const el = dom(<PetArt petId={p.id} pose={POSES[n % POSES.length]} size={120} />);
      const count = el.querySelectorAll('svg *').length;
      expect(count, p.id).toBeLessThanOrEqual(60);
      total += count;
      n++;
    }
    expect(total / n).toBeLessThanOrEqual(40);
    const live = dom(<PetArt petId={MODELS.cat} animated />);
    expect(live.querySelector('svg')!.getAttribute('class')).toContain('is-animated');
    expect(live.querySelector('svg .pet-breathe')).toBeNull();
  });

  it('flicks only the tip of a cat\'s tail', () => {
    const el = dom(<PetArt petId={MODELS.cat} animated />);
    const flick = el.querySelector('.pet-tailflick')!;
    expect(flick.querySelector('path')!.getAttribute('d')).toBe(RIGS.cat!.poses.sit.tail!.end!.d);
    // The shaft stays still, outside the flicking group.
    expect(crescentPath('cat', 'sit', 'tailShaft', 'shape')).not.toBe('');
  });
});

describe('small-size legibility', () => {
  it('steps pale coats into the shade at sprite size, and leaves others alone', () => {
    const pale = tonesFor(LOOKS['pet-cat-oddeyed']!, 'day');
    const dark = tonesFor(LOOKS['pet-cat-black']!, 'day');
    expect(luma(spriteTones(pale).coat)).toBeLessThan(luma(pale.coat));
    expect(luma(spriteTones(pale).far)).toBeLessThan(luma(spriteTones(pale).head));
    expect(spriteTones(dark)).toBe(dark);
    expect(spriteTones(tonesFor(LOOKS['pet-cat-oddeyed']!, 'silhouette')).coat).toBe('var(--ink-disabled)');
  });
});

describe('expressions', () => {
  it('holds a still slow blink half-closed, and animates it when idle life is on', () => {
    const still = dom(<PetArt petId="pet-cat-orange" expression="blink" size={120} />);
    expect(still.querySelector('.pet-slowblink')).toBeNull();
    expect(still.querySelector('.pet-blink')).toBeNull();
    const live = dom(<PetArt petId="pet-cat-orange" expression="blink" size={120} animated />);
    expect(live.querySelector('.pet-slowblink')).not.toBeNull();
  });

  it('gives each species its idle life: a cat tail flick, a cow ear flick, a frog throat pulse', () => {
    expect(dom(<PetArt petId="pet-cat-orange" animated />).querySelector('.pet-tailflick')).not.toBeNull();
    expect(dom(<PetArt petId="pet-cow-holstein" animated />).querySelector('.pet-earflick')).not.toBeNull();
    expect(dom(<PetArt petId="pet-frog-tree" animated />).querySelector('.pet-throat')).not.toBeNull();
    expect(dom(<PetArt petId="pet-cat-orange" />).querySelector('.pet-tailflick')).toBeNull();
  });

  it('walks with the species rhythm: a cow bobs, a duck waddles, a cat hops in two stages', () => {
    expect(dom(<PetArt petId="pet-cow-holstein" pose="walk" animated />).querySelector('.pet-bob')).not.toBeNull();
    expect(dom(<PetArt petId="pet-duck-mallard" pose="walk" animated />).querySelector('.pet-waddle')).not.toBeNull();
    expect(dom(<PetArt petId="pet-cat-orange" pose="walk" animated />).querySelector('.pet-hop')).not.toBeNull();
    expect(dom(<PetArt petId="pet-cat-orange" pose="walk" animated />).querySelector('.pet-walk-b')).not.toBeNull();
  });
});

describe('windowlight crescents', () => {
  it('exists for every rig × pose × facing × light', () => {
    for (const rig of Object.keys(RIGS)) {
      expect(crescentPath(rig, 'head', 'right'), `${rig} head`).not.toBe('');
      for (const pose of POSES) {
        for (const facing of ['left', 'right'] as const) {
          for (const from of ['left', 'top', 'right'] as const) {
            const side = shadeSide({ from, night: false }, facing);
            expect(crescentPath(rig, pose, 'body', side), `${rig} ${pose} ${facing} ${from}`).not.toBe('');
            expect(crescentPath(rig, 'head', side), `${rig} head ${side}`).not.toBe('');
          }
          expect(crescentPath(rig, pose, 'body', 'rim-right'), `${rig} ${pose} rim`).not.toBe('');
          if (pose !== 'sleep') expect(crescentPath(rig, pose, 'chest', 'pale'), `${rig} ${pose} chest`).not.toBe('');
        }
      }
    }
  });

  it('is fresh: the stored data was generated from the current rigs', () => {
    expect(CRESCENT_HASH, 'run: npx vite-node src/art/pets/crescents/write.ts').toBe(jobsHash(crescentJobs(RIGS)));
  });

  it('puts the shade on the side away from the light, and flips for a left-facing pet', () => {
    const right = dom(<PetArt petId="pet-cat-orange" light={{ from: 'left', night: false }} />);
    const left = dom(<PetArt petId="pet-cat-orange" light={{ from: 'right', night: false }} />);
    const flipped = dom(<PetArt petId="pet-cat-orange" light={{ from: 'left', night: false }} facing="left" />);
    const shade = (el: HTMLElement) => el.querySelector('.pet-shade')!.getAttribute('d');
    expect(shade(right)).toBe(crescentPath('cat', 'sit', 'body', 'right'));
    expect(shade(left)).toBe(crescentPath('cat', 'sit', 'body', 'left'));
    expect(shade(flipped)).toBe(crescentPath('cat', 'sit', 'body', 'left'));
  });

  it('rims dark coats on the lit side: warm lamplight at night, cool window light by day, none on pale coats', () => {
    const lamp = dom(<PetArt petId="pet-cat-black" light={{ from: 'right', night: true }} />);
    const day = dom(<PetArt petId="pet-cat-black" light={{ from: 'left', night: false }} />);
    expect(lamp.querySelector('.pet-rim')!.getAttribute('fill')).toBe('var(--lamp)');
    expect(lamp.querySelector('.pet-rim')!.getAttribute('d')).toBe(crescentPath('cat', 'sit', 'body', 'rim-right'));
    expect(day.querySelector('.pet-rim')!.getAttribute('fill')).not.toBe('var(--lamp)');
    expect(dom(<PetArt petId="pet-cat-orange" light={{ from: 'right', night: true }} />).querySelector('.pet-rim')).toBeNull();
  });
});

describe('flat, outline-free art', () => {
  it('uses no filters, and strokes only on thin lines', () => {
    const cases: ComponentChild[] = [];
    for (const p of PETS) cases.push(<PetArt petId={p.id} expression="happy" size={120} />);
    for (const w of WEARABLES) cases.push(<PetArt petId={MODELS.cat} outfit={{ [w.slot]: w.id }} size={120} />);
    for (const node of cases) {
      const el = dom(node);
      expect(el.innerHTML).not.toMatch(/<filter|filter=|mask=|mix-blend/);
      for (const e of el.querySelectorAll('[stroke]')) {
        if (e.getAttribute('stroke') === 'none') continue;
        expect(e.closest('.pet-line'), e.outerHTML.slice(0, 80)).not.toBeNull();
      }
    }
  });
});

describe('wearables', () => {
  it('fits every wearable on every species in sit, loaf and stand', () => {
    // Each wearable meets every species; the pose rotates so every pair of species and pose is
    // covered across the wearables of a slot.
    const poses = ['sit', 'loaf', 'stand'] as const;
    WEARABLES.forEach((w, wi) => {
      SPECIES.forEach((s, si) => {
        const pose = poses[(wi + si) % 3]!;
        const html = markup(<PetArt petId={MODELS[s]} pose={pose} outfit={{ [w.slot]: w.id }} />);
        expectClean(html, `${w.id} on ${s} ${pose}`);
        expect(html, `${w.id} on ${s} ${pose}`).toContain(`pet-wear-${w.slot}`);
      });
    });
  });

  it('keeps neck wear clear of the head: no collar hides wholly behind the chin', () => {
    for (const s of SPECIES) {
      for (const [rigId, rig] of Object.entries(RIGS).filter(([, r]) => r.species === s)) {
        for (const pose of ['sit', 'loaf', 'stand', 'walk'] as const) {
          const p = rig.poses[pose];
          const head = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
          placeBox(pathBox(rig.head.d), p.head, head);
          const k = p.neck.w / 10;
          // The collar band: 10 collar units each side of the throat, from its top edge to the dip.
          const band = { x0: p.neck.x - p.neck.w, x1: p.neck.x + p.neck.w, y0: p.neck.y + 0.4 * k, y1: p.neck.y + 3 * k };
          const covered = band.x0 >= head.x0 && band.x1 <= head.x1 && band.y0 >= head.y0 && band.y1 <= head.y1;
          expect(covered, `${rigId} ${pose}: the collar is behind the head`).toBe(false);
          // And its front, below the chin, shows: the band's lowest edge is under the head.
          expect(band.y1, `${rigId} ${pose}: collar under the chin`).toBeGreaterThan(head.y1 - 1.5);
        }
      }
    }
  });

  it('shortens hanging neck wear so it never reaches the floor', () => {
    const el = dom(<PetArt petId={MODELS.frog} pose="loaf" outfit={{ neck: 'wear-gingham-bandana' }} />);
    const t = el.querySelector('.pet-wear-neck > g')!.getAttribute('transform')!;
    const [sx, sy] = t.match(/scale\(([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number);
    expect(sy!).toBeLessThan(sx!);
  });

  it('draws every wearable icon', () => {
    for (const w of WEARABLES) {
      expect(WEARABLE_ART[w.id]?.slot, w.id).toBe(w.slot);
      expectClean(markup(<svg viewBox="0 0 100 100">{WEARABLE_ART[w.id]!.icon()}</svg>), w.id);
    }
  });

  it('hides body wear in poses it cannot sit well in', () => {
    expect(markup(<PetArt petId={MODELS.cat} pose="sleep" outfit={{ body: 'wear-knit-sweater' }} />)).not.toContain('pet-wear-body');
  });
});

import { describe, expect, it } from 'vitest';
import { SFX, VOICES } from '@/fx/soundRecipes';
import type { SfxName } from '@/fx/sound';
import { peakOf, renderRecipe, speakerLoudness } from './offlineSynth';

/** Loudness as heard on a phone speaker (dB, see speakerLoudness) that each role aims for. */
const ROLE: Record<SfxName, [role: string, min: number, max: number]> = {
  chime: ['celebration', -21, -15],
  'reveal-common': ['celebration', -21, -15],
  'reveal-uncommon': ['celebration', -21, -15],
  'reveal-rare': ['celebration', -21, -15],
  'reveal-ultra': ['celebration', -21, -15],
  fanfare: ['celebration', -21, -15],
  pop: ['tap', -24, -20],
  coin: ['tap', -24, -20],
  undo: ['tap', -24, -20],
  sparkle: ['tap', -24, -20],
  thunk: ['tap', -24, -20],
  ratchet: ['tick', -28, -23],
  crack: ['tick', -28, -23],
  whoosh: ['tick', -28, -23],
  munch: ['tick', -28, -23],
};

const measure = (recipe: Parameters<typeof renderRecipe>[0]) => {
  const x = renderRecipe(recipe);
  return { loudness: speakerLoudness(x), peak: peakOf(x) };
};

describe('sound levels (rendered offline, as heard on a phone speaker)', () => {
  it('every pet voice is equally audible: a peep as clear as a moo', () => {
    const levels = Object.entries(VOICES).map(([name, r]) => [name, measure(r).loudness] as const);
    for (const [name, db] of levels) expect(db, name).toBeGreaterThan(-22);
    for (const [name, db] of levels) expect(db, name).toBeLessThan(-18);
  });

  it('each sound effect sits at its role’s level: ticks under taps, taps under celebrations', () => {
    for (const [name, r] of Object.entries(SFX)) {
      const [role, min, max] = ROLE[name as SfxName];
      const { loudness } = measure(r);
      expect(loudness, `${name} (${role})`).toBeGreaterThan(min);
      expect(loudness, `${name} (${role})`).toBeLessThan(max);
    }
  });

  it('nothing clips: every peak leaves headroom before the room and compressor', () => {
    for (const [name, r] of [...Object.entries(SFX), ...Object.entries(VOICES)]) expect(measure(r).peak, name).toBeLessThan(0.75);
  });
});

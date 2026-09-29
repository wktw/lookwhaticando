/**
 * Sound design for every SfxName and PetVoice: soft, real-ish things heard in a sunny room
 * (DESIGN §8.2, §10.5). A water-drop chime for a check-in, a brass clink for a coin, a paper
 * rustle for a sheet, a ratchet tick for the capsule handle, a soft pop for opening. Wind chimes
 * and a small music box for the bigger moments. No arcade blips, no speech blips, nothing square.
 *
 * Each recipe is wrapped in trim(): a loudness calibration measured as heard on a phone speaker,
 * so every pet voice is equally audible and SFX sit at their role's level (tiny ticks a little
 * under taps, taps under celebrations). tests/unit/fx/soundLevels.test.ts renders them all and
 * keeps it that way; re-measure there after changing a recipe.
 */
import type { PetVoice, SfxName } from './sound';
import { NOTE, type Voice } from './synth';

type Recipe = (v: Voice) => void;

/** Scale every note of a recipe by `gain` (its loudness calibration). */
function trim(gain: number, recipe: Recipe): Recipe {
  return (v) =>
    recipe({
      pitch: v.pitch,
      tone: (spec) => v.tone({ ...spec, gain: spec.gain * gain }),
      noise: (spec) => v.noise({ ...spec, gain: spec.gain * gain }),
    });
}

/** A small glass bell: a sine body with a quiet inharmonic partial (what makes glass sound like glass). */
function glass(v: Voice, f: number, at: number, dur = 0.6, gain = 0.16) {
  v.tone({ f, at, dur, gain, attack: 0.003 });
  v.tone({ f: f * 2.76, at, dur: dur * 0.35, gain: gain * 0.16, attack: 0.002 });
}

/** A music-box pluck: bright attack, quick decay, a soft octave above. */
function pluck(v: Voice, f: number, at: number, dur = 0.55, gain = 0.15) {
  v.tone({ f, at, dur, gain, attack: 0.002 });
  v.tone({ type: 'triangle', f: f * 2, at, dur: dur * 0.3, gain: gain * 0.18, attack: 0.002 });
}

/** A drop landing in water: the tiny bubble's pitch rises fast. */
function drop(v: Voice, at: number, gain = 0.2, from = 620, to = 1480) {
  v.tone({ f: from, fEnd: to, glide: 0.045, at, dur: 0.1, gain, attack: 0.002 });
}

/** Wind chimes: soft glass notes at uneven moments, the way a breeze plays them. */
const CHIMES = [NOTE.E6, NOTE.G6, NOTE.C7, NOTE.D6, NOTE.A7 / 2];
const CHIME_AT = [0, 0.13, 0.22, 0.38, 0.52];

export const SFX: Record<SfxName, Recipe> = {
  // A soft pop, for opening (a capsule, a tab): a small cork-like "pup", no click.
  pop: trim(1.27, (v) => {
    v.tone({ f: 520, fEnd: 230, glide: 0.05, dur: 0.09, gain: 0.3, attack: 0.002 });
    v.noise({ dur: 0.025, gain: 0.08, filter: { type: 'lowpass', freq: 1400 } });
  }),
  // The check-in: a drop falls into the water, then a rising two-note glass chime.
  chime: trim(1.4, (v) => {
    drop(v, 0);
    glass(v, NOTE.C6, 0.06, 0.6, 0.16);
    glass(v, NOTE.G6, 0.15, 0.75, 0.13);
  }),
  // A brass coin into the jar: a warm clink and a smaller one as it settles.
  coin: trim(1.06, (v) => {
    for (const [at, k] of [[0, 1], [0.075, 0.5]] as const) {
      v.noise({ at, dur: 0.018, gain: 0.14 * k, filter: { type: 'bandpass', freq: 4200, q: 3 } });
      v.tone({ f: 1190, at, dur: 0.22, gain: 0.07 * k, attack: 0.001 });
      v.tone({ f: 2150, at, dur: 0.34, gain: 0.11 * k, attack: 0.001 });
      v.tone({ f: 3310, at, dur: 0.2, gain: 0.06 * k, attack: 0.001 });
      v.tone({ f: 5230, at, dur: 0.1, gain: 0.03 * k, attack: 0.001 });
    }
  }),
  // One click of the capsule handle: a small woody ratchet tick.
  ratchet: trim(3.85, (v) => {
    v.noise({ dur: 0.02, gain: 0.3, filter: { type: 'bandpass', freq: 2600, q: 2.5 } });
    v.tone({ type: 'triangle', f: 1350, fEnd: 950, dur: 0.028, gain: 0.1, attack: 0.001 });
  }),
  // The capsule lands in the tray: a soft wooden knock.
  thunk: trim(1.97, (v) => {
    v.tone({ f: 140, fEnd: 66, dur: 0.22, gain: 0.2, attack: 0.003 });
    v.tone({ type: 'triangle', f: 330, fEnd: 170, dur: 0.12, gain: 0.26, attack: 0.002 });
    v.noise({ dur: 0.06, gain: 0.3, filter: { type: 'bandpass', freq: 800, q: 1.3 } });
  }),
  // The capsule's shell giving a little (Secret taps).
  crack: trim(3.83, (v) => {
    v.noise({ dur: 0.035, gain: 0.3, filter: { type: 'bandpass', freq: 3000, q: 1.6 } });
    v.noise({ at: 0.03, dur: 0.02, gain: 0.16, filter: { type: 'bandpass', freq: 4200, q: 2 } });
  }),
  // Reveals: a small music box, one more note for each rarer tier.
  'reveal-common': trim(1.62, (v) => {
    pluck(v, NOTE.E5, 0);
    pluck(v, NOTE.G5, 0.12);
  }),
  'reveal-uncommon': trim(1.49, (v) => {
    pluck(v, NOTE.C5, 0);
    pluck(v, NOTE.E5, 0.12);
    pluck(v, NOTE.G5, 0.24, 0.7);
  }),
  'reveal-rare': trim(1.59, (v) => {
    pluck(v, NOTE.C5, 0);
    pluck(v, NOTE.E5, 0.12);
    pluck(v, NOTE.G5, 0.24);
    glass(v, NOTE.C6, 0.4, 0.9, 0.12);
  }),
  'reveal-ultra': trim(1.49, (v) => {
    v.tone({ f: NOTE.C5, at: 0, dur: 1.2, gain: 0.05, attack: 0.25 });
    v.tone({ f: NOTE.G5, at: 0, dur: 1.2, gain: 0.04, attack: 0.25 });
    pluck(v, NOTE.C6, 0.3);
    pluck(v, NOTE.E6, 0.44);
    pluck(v, NOTE.G6, 0.58);
    glass(v, NOTE.C7, 0.78, 1.1, 0.1);
  }),
  // Perfect day, milestones: wind chimes in the window.
  fanfare: trim(1.37, (v) => {
    CHIMES.forEach((f, i) => glass(v, f, CHIME_AT[i]!, 1.1, 0.12 - i * 0.012));
  }),
  // A sheet: a sheet of paper sliding, a few soft grains of rustle.
  whoosh: trim(3.55, (v) => {
    v.noise({ dur: 0.26, gain: 0.05, attack: 0.05, filter: { type: 'bandpass', freq: 1600, freqEnd: 2600, q: 0.7 } });
    for (const [at, g, f] of [[0, 0.16, 3400], [0.05, 0.1, 4200], [0.11, 0.14, 3000], [0.18, 0.08, 4600]] as const) {
      v.noise({ at, dur: 0.05, gain: g, attack: 0.006, filter: { type: 'bandpass', freq: f, q: 1.4 } });
    }
  }),
  // A glint of glass (swaps becoming a stamp, a note arriving).
  sparkle: trim(1.37, (v) => {
    glass(v, NOTE.E7 / 2, 0, 0.35, 0.1);
    glass(v, NOTE.B5 * 2, 0.07, 0.45, 0.08);
  }),
  munch: trim(2.8, (v) => {
    for (const at of [0, 0.11, 0.22]) {
      v.noise({ at, dur: 0.055, gain: 0.3, filter: { type: 'bandpass', freq: 1300, q: 0.9 } });
      v.tone({ f: 440, fEnd: 340, at, dur: 0.05, gain: 0.08 });
    }
  }),
  // Undo: the same drop, falling back (a lower, falling "plip").
  undo: trim(1.39, (v) => {
    drop(v, 0, 0.18, 1300, 700);
    v.tone({ f: NOTE.D5, at: 0.05, dur: 0.3, gain: 0.1, attack: 0.004 });
  }),
};

export const VOICES: Record<PetVoice, Recipe> = {
  // Cat: a soft trill, the rolled "brrp?" of a cat saying hello (rising, with a flutter through it).
  mew: trim(3.36, (v) => {
    const formant = { type: 'bandpass' as const, freq: 1400, q: 1.1 };
    const roll = { rate: 26, depth: 0.7 };
    v.tone({ type: 'triangle', f: 480, fEnd: 820, glide: 0.2, dur: 0.3, gain: 0.3, attack: 0.03, am: roll, filter: formant });
    v.tone({ f: 960, fEnd: 1640, glide: 0.2, dur: 0.24, gain: 0.05, attack: 0.03, am: roll });
  }),
  // Cow: a tiny, high moo (these are thumb-sized cows), with a lazy vibrato and a mouth that opens.
  // Its 2nd–4th harmonics carry it on phone speakers.
  moo: trim(0.515, (v) => {
    const vib = (k: number) => ({ rate: 5.4, depth: 4 * k, delay: 0.2 });
    v.tone({ type: 'triangle', f: 215, fEnd: 250, glide: 0.3, dur: 0.72, gain: 0.42, attack: 0.1, vib: vib(1), filter: { type: 'lowpass', freq: 500, freqEnd: 1200, q: 2 } });
    for (const [k, gain] of [[2, 0.2], [3, 0.12], [4, 0.05]] as const) {
      v.tone({ f: 215 * k, fEnd: 250 * k, glide: 0.3, dur: 0.64, gain, attack: 0.12, vib: vib(k), filter: { type: 'lowpass', freq: 650, freqEnd: 1300 } });
    }
  }),
  // Dog: a friendly little "arf", with a smaller echo.
  woof: trim(1.5, (v) => {
    for (const [at, k] of [[0, 1], [0.19, 0.92]] as const) {
      v.tone({ type: 'triangle', f: 440 * k, fEnd: 260 * k, at, dur: 0.13, gain: 0.3 * k, attack: 0.01, filter: { type: 'lowpass', freq: 1500 } });
      v.noise({ at, dur: 0.07, gain: 0.07 * k, filter: { type: 'bandpass', freq: 900, q: 1 } });
    }
  }),
  // Bunny: a tiny rising squeak.
  squeak: trim(1.7, (v) => {
    v.tone({ f: 1700, fEnd: 2600, glide: 0.05, dur: 0.1, gain: 0.16, attack: 0.008 });
    v.tone({ f: 2600, fEnd: 2150, at: 0.05, dur: 0.08, gain: 0.1 });
  }),
  // Frog: a double "rib-bit" (a croak with a fast pulse through it, its overtones up where
  // small speakers can play them).
  ribbit: trim(2.1, (v) => {
    const pulse = { rate: 38, depth: 0.9 };
    for (const [at, k] of [[0, 1], [0.2, 1.08]] as const) {
      v.tone({ type: 'triangle', f: 200 * k, fEnd: 165 * k, at, dur: 0.14, gain: 0.16, attack: 0.01, am: pulse, filter: { type: 'lowpass', freq: 1100 } });
      v.tone({ f: 600 * k, fEnd: 495 * k, at, dur: 0.13, gain: 0.22, attack: 0.01, am: pulse });
      v.tone({ f: 1000 * k, fEnd: 825 * k, at, dur: 0.12, gain: 0.1, attack: 0.01, am: pulse });
    }
  }),
  // Bear: a warm, rumbly "hmm-grr" (upper harmonics so small speakers still hear the rumble).
  grr: trim(1.3, (v) => {
    const rumble = { rate: 22, depth: 0.55 };
    v.tone({ type: 'triangle', f: 110, fEnd: 96, dur: 0.46, gain: 0.16, attack: 0.06, am: rumble, filter: { type: 'lowpass', freq: 540 } });
    for (const [k, gain] of [[2, 0.24], [3, 0.2], [5, 0.08]] as const) {
      v.tone({ f: 110 * k, fEnd: 96 * k, dur: 0.42, gain, attack: 0.08, am: rumble, filter: { type: 'lowpass', freq: 900 } });
    }
  }),
  // Hamster: two quick peeps.
  peep: trim(2.3, (v) => {
    v.tone({ f: 2200, fEnd: 2750, dur: 0.06, gain: 0.13, attack: 0.005 });
    v.tone({ f: 2350, fEnd: 2900, at: 0.09, dur: 0.06, gain: 0.11, attack: 0.005 });
  }),
  // Duck: a nasal little "wek".
  quack: trim(2.4, (v) => {
    const nasal = { type: 'bandpass' as const, freq: 1100, q: 1.8 };
    v.tone({ type: 'triangle', f: 560, fEnd: 430, dur: 0.12, gain: 0.5, attack: 0.006, filter: nasal });
    v.tone({ f: 1120, fEnd: 860, dur: 0.1, gain: 0.08, filter: nasal });
    v.noise({ dur: 0.02, gain: 0.05, filter: { type: 'bandpass', freq: 2400, q: 2 } });
  }),
};

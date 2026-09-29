/**
 * Sound design for every SfxName and PetVoice. Soft sine/triangle voices, gentle envelopes,
 * pastel-bright intervals (major triads, pentatonic sparkles). Nothing square, nothing harsh.
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

/** A bell-ish note: sine body, a soft triangle an octave down, a quick shimmer an octave up. */
function bell(v: Voice, f: number, at: number, dur = 0.5, gain = 0.22) {
  v.tone({ f, at, dur, gain });
  v.tone({ type: 'triangle', f: f / 2, at, dur: dur * 0.7, gain: gain * 0.22 });
  v.tone({ f: f * 2, at, dur: dur * 0.35, gain: gain * 0.12 });
}

function arpeggio(v: Voice, notes: number[], step: number, dur = 0.45, gain = 0.18, start = 0) {
  notes.forEach((f, i) => bell(v, f, start + i * step, dur, gain));
}

const PENTA = [NOTE.C7, NOTE.D7, NOTE.E7, NOTE.G7, NOTE.A7];
function sparkles(v: Voice, count: number, start: number, step = 0.05, gain = 0.07) {
  for (let i = 0; i < count; i++) {
    const f = PENTA[Math.floor(Math.random() * PENTA.length)]!;
    v.tone({ f, at: start + i * step + Math.random() * 0.015, dur: 0.18, gain });
  }
}

function pad(v: Voice, notes: number[], at: number, dur: number, gain = 0.05) {
  for (const f of notes) v.tone({ f, at, dur, gain, attack: 0.12 });
}

export const SFX: Record<SfxName, Recipe> = {
  pop: trim(1.2, (v) => {
    v.tone({ f: 380, fEnd: 1150, dur: 0.09, glide: 0.06, gain: 0.32, attack: 0.003 });
    v.tone({ type: 'triangle', f: 2200, dur: 0.025, gain: 0.04, attack: 0.001 });
  }),
  chime: (v) => {
    bell(v, NOTE.C6, 0, 0.55, 0.24);
    bell(v, NOTE.G6, 0.085, 0.7, 0.2);
  },
  coin: (v) => {
    v.tone({ type: 'triangle', f: NOTE.B5, dur: 0.08, gain: 0.16 });
    v.tone({ f: NOTE.E6, at: 0.06, dur: 0.36, gain: 0.2 });
    v.tone({ type: 'triangle', f: NOTE.E6 * 2, at: 0.06, dur: 0.12, gain: 0.03 });
  },
  // One click of the crank: a woody tick with a little pitched "tk".
  ratchet: trim(3.3, (v) => {
    v.noise({ dur: 0.028, gain: 0.3, filter: { type: 'bandpass', freq: 2400, q: 2 } });
    v.tone({ type: 'triangle', f: 1250, fEnd: 900, dur: 0.03, gain: 0.12, attack: 0.001 });
  }),
  // The capsule lands: a soft low bump plus a hollow plastic knock you can hear on a phone.
  thunk: trim(1.45, (v) => {
    v.tone({ f: 150, fEnd: 62, dur: 0.24, gain: 0.22, attack: 0.003 });
    v.tone({ type: 'triangle', f: 420, fEnd: 220, dur: 0.12, gain: 0.3, attack: 0.002 });
    v.noise({ dur: 0.07, gain: 0.35, filter: { type: 'bandpass', freq: 900, q: 1.2 } });
  }),
  crack: trim(2.2, (v) => {
    v.noise({ dur: 0.06, gain: 0.3, filter: { type: 'bandpass', freq: 3200, q: 1.4 } });
    v.tone({ type: 'triangle', f: 900, fEnd: 320, dur: 0.09, gain: 0.1 });
  }),
  'reveal-common': (v) => arpeggio(v, [NOTE.C5, NOTE.E5, NOTE.G5], 0.075),
  'reveal-uncommon': (v) => {
    arpeggio(v, [NOTE.C5, NOTE.E5, NOTE.G5], 0.07);
    bell(v, NOTE.C6, 0.21, 0.8, 0.2);
  },
  'reveal-rare': (v) => {
    arpeggio(v, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5, NOTE.D6], 0.065, 0.55, 0.17);
    pad(v, [NOTE.C5, NOTE.G5], 0.25, 1.1);
    sparkles(v, 6, 0.32);
  },
  'reveal-ultra': (v) => {
    v.tone({ f: NOTE.C5, fEnd: NOTE.C7, dur: 0.75, glide: 0.6, gain: 0.1, attack: 0.05 });
    arpeggio(v, [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7], 0.06, 0.7, 0.17, 0.55);
    pad(v, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5], 0.55, 1.5, 0.045);
    sparkles(v, 10, 0.7, 0.055);
  },
  fanfare: (v) => {
    arpeggio(v, [NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6], 0.09, 0.3, 0.16);
    for (const f of [NOTE.C6, NOTE.E6, NOTE.G6]) bell(v, f, 0.38, 1.0, 0.11);
    sparkles(v, 6, 0.5, 0.06);
  },
  whoosh: trim(3, (v) => {
    v.noise({ dur: 0.3, gain: 0.16, attack: 0.09, filter: { type: 'bandpass', freq: 420, freqEnd: 2200, q: 0.8 } });
  }),
  sparkle: trim(1.5, (v) => sparkles(v, 5, 0, 0.045, 0.08)),
  munch: trim(2.8, (v) => {
    for (const at of [0, 0.11, 0.22]) {
      v.noise({ at, dur: 0.055, gain: 0.3, filter: { type: 'bandpass', freq: 1300, q: 0.9 } });
      v.tone({ f: 440, fEnd: 340, at, dur: 0.05, gain: 0.08 });
    }
  }),
  undo: trim(1.2, (v) => {
    v.tone({ f: NOTE.G5, dur: 0.18, gain: 0.16 });
    v.tone({ f: NOTE.D5, at: 0.08, dur: 0.28, gain: 0.14 });
  }),
};

export const VOICES: Record<PetVoice, Recipe> = {
  // Cat: a rising "mrrp?" chirp that settles.
  mew: trim(2, (v) => {
    const formant = { type: 'bandpass' as const, freq: 1500, q: 1.1 };
    v.tone({ type: 'triangle', f: 520, fEnd: 980, glide: 0.09, dur: 0.24, gain: 0.3, attack: 0.02, filter: formant });
    v.tone({ f: 1040, fEnd: 1700, glide: 0.09, dur: 0.18, gain: 0.05, attack: 0.02 });
    v.tone({ type: 'triangle', f: 980, fEnd: 760, at: 0.1, dur: 0.16, gain: 0.18, filter: formant });
  }),
  // Cow: a soft, low "mmooo" with a lazy vibrato and an opening/closing mouth (filter sweep).
  // Its 2nd–4th harmonics carry it on phone speakers, which can't play the 150 Hz fundamental.
  moo: trim(0.66, (v) => {
    const vib = (k: number) => ({ rate: 5.2, depth: 4 * k, delay: 0.25 });
    v.tone({ type: 'triangle', f: 150, fEnd: 188, glide: 0.35, dur: 0.95, gain: 0.42, attack: 0.12, vib: vib(1), filter: { type: 'lowpass', freq: 380, freqEnd: 1000, q: 2 } });
    for (const [k, gain] of [[2, 0.2], [3, 0.12], [4, 0.05]] as const) {
      v.tone({ f: 150 * k, fEnd: 188 * k, glide: 0.35, dur: 0.85, gain, attack: 0.15, vib: vib(k), filter: { type: 'lowpass', freq: 500, freqEnd: 1100 } });
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

/**
 * A tiny offline renderer for the Voice API in src/fx/synth.ts, following WebAudio's math
 * (oscillators, exponential glides, vibrato, sine AM, envelopes, RBJ biquads), so the sound
 * recipes can be measured in Node without a browser. Room and compressor are left out: this
 * measures how loud each recipe is going into them.
 */
import type { FilterSpec, NoiseSpec, ToneSpec, Voice } from '@/fx/synth';

export const SAMPLE_RATE = 48_000;
const SILENT = 0.0001;
const TAU = Math.PI * 2;

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** WebAudio BiquadFilterNode coefficients (lowpass/highpass Q is in dB there; bandpass Q is linear). */
export function biquad(type: BiquadFilterType, freq: number, q: number, gainDb = 0): Biquad {
  const w0 = (TAU * Math.min(freq, SAMPLE_RATE / 2 - 1)) / SAMPLE_RATE;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const resonant = type === 'lowpass' || type === 'highpass';
  const alpha = sin / (2 * (resonant ? 10 ** (q / 20) : q));
  let b: [number, number, number];
  let a: [number, number, number];
  switch (type) {
    case 'lowpass':
      b = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      a = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'highpass':
      b = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      a = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'bandpass':
      b = [alpha, 0, -alpha];
      a = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'peaking': {
      const A = 10 ** (gainDb / 40);
      b = [1 + alpha * A, -2 * cos, 1 - alpha * A];
      a = [1 + alpha / A, -2 * cos, 1 - alpha / A];
      break;
    }
    default:
      throw new Error(`filter ${type} not modelled`);
  }
  return { b0: b[0] / a[0], b1: b[1] / a[0], b2: b[2] / a[0], a1: a[1] / a[0], a2: a[2] / a[0] };
}

/** Run `x` through a biquad whose coefficients may change per sample. */
function filterInPlace(x: Float32Array, coeffAt: (i: number) => Biquad): void {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let c = coeffAt(0);
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) c = coeffAt(i);
    const x0 = x[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    x[i] = y0;
  }
}

function applyFilter(x: Float32Array, spec: FilterSpec, dur: number) {
  const q = spec.q ?? 0.8;
  filterInPlace(x, (i) => {
    const t = Math.min(1, i / SAMPLE_RATE / dur);
    const f = spec.freqEnd ? spec.freq * (spec.freqEnd / spec.freq) ** t : spec.freq;
    return biquad(spec.type, f, q);
  });
}

/** Linear attack to `peak`, then an exponential fall to near-silence at `dur`. */
function envelopeAt(tau: number, peak: number, attack: number, dur: number): number {
  if (tau < attack) return SILENT + ((peak - SILENT) * tau) / attack;
  if (tau < dur) return peak * (SILENT / peak) ** ((tau - attack) / (dur - attack));
  return SILENT;
}

/** Deterministic noise so measurements are stable. */
function noiseSource(seed = 1) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Render a recipe to a mono buffer (seconds long). */
export function renderRecipe(recipe: (v: Voice) => void, seconds = 2.5): Float32Array {
  const out = new Float32Array(Math.round(SAMPLE_RATE * seconds));
  const noise = noiseSource();
  const mix = (x: Float32Array, start: number) => {
    for (let i = 0; i < x.length && start + i < out.length; i++) out[start + i]! += x[i]!;
  };
  const voice: Voice = {
    pitch: 1,
    tone({ type = 'sine', f, fEnd, glide, at = 0, dur, gain, attack = 0.006, vib, am, filter }: ToneSpec) {
      const n = Math.round((dur + 0.05) * SAMPLE_RATE);
      const x = new Float32Array(n);
      let phase = 0;
      for (let i = 0; i < n; i++) {
        const tau = i / SAMPLE_RATE;
        let freq = fEnd ? f * (fEnd / f) ** Math.min(1, tau / (glide ?? dur)) : f;
        if (vib) freq += vib.depth * Math.min(1, tau / ((vib.delay ?? 0) + 0.08)) * Math.sin(TAU * vib.rate * tau);
        phase += (TAU * freq) / SAMPLE_RATE;
        const p = (phase / TAU) % 1;
        x[i] = type === 'triangle' ? 1 - 4 * Math.abs(p - 0.5) : Math.sin(phase);
      }
      if (filter) applyFilter(x, filter, dur);
      for (let i = 0; i < n; i++) {
        const tau = i / SAMPLE_RATE;
        const trem = am ? 1 - am.depth / 2 + (am.depth / 2) * Math.sin(TAU * am.rate * tau) : 1;
        x[i]! *= trem * envelopeAt(tau, gain, attack, dur);
      }
      mix(x, Math.round(at * SAMPLE_RATE));
    },
    noise({ at = 0, dur, gain, attack = 0.004, filter }: NoiseSpec) {
      const n = Math.round((dur + 0.05) * SAMPLE_RATE);
      const x = new Float32Array(n);
      for (let i = 0; i < n; i++) x[i] = noise();
      applyFilter(x, filter, dur);
      for (let i = 0; i < n; i++) x[i]! *= envelopeAt(i / SAMPLE_RATE, gain, attack, dur);
      mix(x, Math.round(at * SAMPLE_RATE));
    },
  };
  recipe(voice);
  return out;
}

export function peakOf(x: Float32Array): number {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  return p;
}

/**
 * Loudness as heard on a phone speaker, in dB: a 400 Hz high-pass (small speakers play almost
 * nothing lower) and a gentle presence bump at 2.5 kHz (where ears are keenest), then the
 * loudest 100 ms window's RMS.
 */
export function speakerLoudness(x: Float32Array): number {
  const y = Float32Array.from(x);
  filterInPlace(y, () => biquad('highpass', 400, 0.707));
  filterInPlace(y, () => biquad('peaking', 2500, 1, 4));
  const win = Math.round(SAMPLE_RATE * 0.1);
  const hop = Math.round(SAMPLE_RATE * 0.01);
  let best = 0;
  for (let i = 0; i + win <= y.length; i += hop) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += y[j]! * y[j]!;
    best = Math.max(best, s / win);
  }
  return 10 * Math.log10(best + 1e-12);
}

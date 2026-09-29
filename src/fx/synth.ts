/**
 * Tiny WebAudio voice kit. Every sound in the app is built from these two voices:
 * a shaped oscillator (`tone`) and a filtered noise burst (`noise`). Envelopes are soft
 * (a few ms attack, exponential release) so nothing clicks or bites.
 */
export interface FilterSpec {
  type: BiquadFilterType;
  freq: number;
  /** Sweep the cutoff to this frequency over the note. */
  freqEnd?: number;
  q?: number;
}

export interface ToneSpec {
  type?: OscillatorType;
  /** Start frequency (Hz). */
  f: number;
  /** End frequency; glides exponentially over `glide` seconds (default: whole note). */
  fEnd?: number;
  glide?: number;
  /** Onset time offset from "now" (s). */
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  /** Vibrato (Hz rate, Hz depth), starting after `vibDelay` seconds. */
  vib?: { rate: number; depth: number; delay?: number };
  /** Tremolo/amplitude modulation for croaks and purrs: rate Hz, depth 0..1. */
  am?: { rate: number; depth: number };
  filter?: FilterSpec;
}

export interface NoiseSpec {
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  filter: FilterSpec;
}

export interface Voice {
  tone(spec: ToneSpec): void;
  noise(spec: NoiseSpec): void;
  /** Pitch multiplier requested by the caller (1 = as designed). */
  pitch: number;
}

const SILENT = 0.0001;

function envelope(g: AudioParam, t: number, peak: number, attack: number, dur: number) {
  g.setValueAtTime(SILENT, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.exponentialRampToValueAtTime(SILENT, t + dur);
}

function makeFilter(ctx: BaseAudioContext, spec: FilterSpec, t: number, dur: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = spec.type;
  f.Q.value = spec.q ?? 0.8;
  f.frequency.setValueAtTime(spec.freq, t);
  if (spec.freqEnd) f.frequency.exponentialRampToValueAtTime(spec.freqEnd, t + dur);
  return f;
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.5);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/** A voice bound to a context, an output node, a start time and pitch/volume multipliers. */
export function createVoice(ctx: BaseAudioContext, out: AudioNode, now: number, pitch = 1, volume = 1): Voice {
  return {
    pitch,
    tone({ type = 'sine', f, fEnd, glide, at = 0, dur, gain, attack = 0.006, vib, am, filter }) {
      const t = now + at;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f * pitch, t);
      if (fEnd) osc.frequency.exponentialRampToValueAtTime(fEnd * pitch, t + (glide ?? dur));

      const amp = ctx.createGain();
      envelope(amp.gain, t, gain * volume, attack, dur);

      const stops: AudioScheduledSourceNode[] = [osc];
      if (vib) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = vib.rate;
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(vib.depth * pitch, t + (vib.delay ?? 0) + 0.08);
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(t);
        stops.push(lfo);
      }

      let node: AudioNode = osc;
      if (filter) node = node.connect(makeFilter(ctx, filter, t, dur));
      if (am) {
        // Amplitude modulation: a gain whose level wobbles between (1 - depth) and 1.
        const trem = ctx.createGain();
        trem.gain.value = 1 - am.depth / 2;
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.value = am.rate;
        depth.gain.value = am.depth / 2;
        lfo.connect(depth).connect(trem.gain);
        lfo.start(t);
        stops.push(lfo);
        node = node.connect(trem);
      }
      node.connect(amp).connect(out);

      osc.start(t);
      for (const s of stops) s.stop(t + dur + 0.05);
    },
    noise({ at = 0, dur, gain, attack = 0.004, filter }) {
      const t = now + at;
      const src = ctx.createBufferSource();
      src.buffer = getNoise(ctx);
      const amp = ctx.createGain();
      envelope(amp.gain, t, gain * volume, attack, dur);
      src.connect(makeFilter(ctx, filter, t, dur)).connect(amp).connect(out);
      src.start(t, Math.random() * 0.3);
      src.stop(t + dur + 0.05);
    },
  };
}

/** Equal-tempered note frequencies used by the recipes. */
export const NOTE = {
  D5: 587.33,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093,
  D7: 2349.32,
  E7: 2637.02,
  G7: 3135.96,
  A7: 3520,
} as const;

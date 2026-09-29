/**
 * Synthesized sound effects (WebAudio, no files): soft, real-ish things heard in a sunny room.
 * All UI code plays sounds ONLY through this API.
 *
 * Signal chain: voices → bus → (dry + a soft delay "room") → gentle compressor → master volume.
 * The context is created lazily inside a user gesture (iOS), follows settings.sound/volume,
 * asks iOS for the "ambient" audio session (so the silent switch is respected), and never throws.
 */
import { state } from '@/state/store';
import { createVoice, type Voice } from './synth';
import { SFX, VOICES } from './soundRecipes';

export type SfxName =
  | 'pop' // a soft pop: opening a capsule, switching tabs
  | 'chime' // check-in: a drop into water, then a rising two-note glass chime
  | 'coin' // a brass coin clinking into the jar
  | 'ratchet' // one tick of the capsule handle
  | 'thunk' // the capsule lands in the tray
  | 'crack' // the capsule's shell giving a little
  | 'reveal-common'
  | 'reveal-uncommon'
  | 'reveal-rare'
  | 'reveal-ultra'
  | 'fanfare' // perfect day, milestones: wind chimes in the window (the older name is kept)
  | 'whoosh' // a sheet: a rustle of paper (the older name is kept)
  | 'sparkle' // a glint of glass: swaps becoming a stamp
  | 'munch' // a pet eats
  | 'undo'; // the drop, falling back

export type PetVoice = 'mew' | 'moo' | 'woof' | 'squeak' | 'ribbit' | 'grr' | 'peep' | 'quack';

interface Engine {
  ctx: AudioContext;
  bus: GainNode;
  master: GainNode;
}

let engine: Engine | null = null;
let failed = false;
const lastPlayed = new Map<string, number>();
/** Identical sounds closer than this merge into one (e.g. two coins landing on the same frame). */
const MIN_GAP_MS = 28;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function settings() {
  return state.value.settings;
}

function build(): Engine | null {
  if (engine) return engine;
  if (failed || typeof window === 'undefined') return null;
  try {
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session) session.type = 'ambient';
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) {
      failed = true;
      return null;
    }
    const ctx = new AC({ latencyHint: 'interactive' });
    const bus = ctx.createGain();
    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;

    // A small, warm room: one filtered feedback delay mixed in quietly.
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.11;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.26;
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 2400;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;

    bus.connect(comp);
    bus.connect(delay);
    delay.connect(warmth).connect(wet).connect(comp);
    warmth.connect(feedback).connect(delay);
    comp.connect(master).connect(ctx.destination);
    master.gain.value = settings().volume;
    engine = { ctx, bus, master };
    return engine;
  } catch {
    failed = true;
    return null;
  }
}

function run(key: string, recipe: ((v: Voice) => void) | undefined, opts: { volume?: number; pitch?: number } = {}) {
  try {
    const s = settings();
    if (!s.sound || s.volume <= 0 || !recipe) return;
    const now = performance.now();
    if (now - (lastPlayed.get(key) ?? -Infinity) < MIN_GAP_MS) return;
    lastPlayed.set(key, now);
    const e = build();
    if (!e) return;
    if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => undefined);
    e.master.gain.setTargetAtTime(Math.min(1, Math.max(0, s.volume)), e.ctx.currentTime, 0.015);
    recipe(createVoice(e.ctx, e.bus, e.ctx.currentTime + 0.004, opts.pitch ?? 1, opts.volume ?? 1));
  } catch {
    /* Sound is decoration: it must never break an interaction. */
  }
}

export const sfx = {
  play(name: SfxName, opts?: { volume?: number; pitch?: number }): void {
    run(`sfx:${name}:${opts?.pitch ?? 1}`, SFX[name], opts);
  },
  voice(voice: PetVoice, opts?: { pitch?: number }): void {
    run(`voice:${voice}`, VOICES[voice], opts);
  },
  /** Call from the first user gesture to unlock audio on iOS. */
  unlock(): void {
    try {
      if (!settings().sound) return;
      const e = build();
      if (!e) return;
      if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => undefined);
      // iOS wants a sound started inside the gesture: one silent sample does it.
      const src = e.ctx.createBufferSource();
      src.buffer = e.ctx.createBuffer(1, 1, e.ctx.sampleRate);
      src.connect(e.ctx.destination);
      src.start();
    } catch {
      /* ignore */
    }
  },
};

/** Every sound and voice name, for galleries and tests. */
export const SFX_NAMES = Object.keys(SFX) as SfxName[];
export const PET_VOICES = Object.keys(VOICES) as PetVoice[];

/** Unlock audio on the first tap or key press anywhere (call once at boot). */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const handler = () => {
    sfx.unlock();
    if (engine?.ctx.state === 'running') for (const ev of events) window.removeEventListener(ev, handler, true);
  };
  for (const ev of events) window.addEventListener(ev, handler, { capture: true, passive: true });
}

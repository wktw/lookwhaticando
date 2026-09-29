/**
 * Synthesized sound effects (WebAudio, no files). STUB: implemented by the fxui module.
 * All UI code plays sounds ONLY through this API.
 */
export type SfxName =
  | 'pop' // generic tap
  | 'chime' // habit check-in (two notes)
  | 'coin' // coin gained / inserted
  | 'ratchet' // crank tick
  | 'thunk' // capsule drops
  | 'crack' // capsule crack (ultra taps)
  | 'reveal-common'
  | 'reveal-uncommon'
  | 'reveal-rare'
  | 'reveal-ultra'
  | 'fanfare' // perfect day / milestone
  | 'whoosh' // sheet / transition
  | 'sparkle' // stardust / star fusion
  | 'munch' // pet eats
  | 'undo';

export type PetVoice = 'mew' | 'moo' | 'woof' | 'squeak' | 'ribbit' | 'grr' | 'peep' | 'quack';

export const sfx = {
  play(_name: SfxName, _opts?: { volume?: number; pitch?: number }): void {},
  voice(_voice: PetVoice, _opts?: { pitch?: number }): void {},
  /** Call from the first user gesture to unlock audio on iOS. */
  unlock(): void {},
};

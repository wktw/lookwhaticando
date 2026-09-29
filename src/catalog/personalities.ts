import type { Personality, Species, TreatTag } from './types';

export interface PersonalityDef {
  id: Personality;
  label: string;
  /** Kept for data compatibility; catkin shows no emoji in UI chrome (DESIGN §12). */
  emoji: string;
  /** One observed line for the Pet Card ("Known for"). */
  blurb: string;
  /** Shelf behavior weights (relative): idle, wander, sit, nap, play. */
  behavior: { idle: number; wander: number; sit: number; nap: number; play: number };
  /**
   * Third-person captions shown when a pet is tapped (DESIGN §12: animals never speak). {name} = the pet's name.
   * Species-neutral: no paws, tails or whiskers, so the same line suits a frog or a cow.
   */
  lines: string[];
}

export const PERSONALITIES: readonly PersonalityDef[] = [
  {
    id: 'sleepy', label: 'Sleepy', emoji: '', blurb: 'Can sleep anywhere, and does.',
    behavior: { idle: 3, wander: 1, sit: 3, nap: 5, play: 1 },
    lines: ['{name} is asleep in the warmest spot again.', '{name} opened one eye, then closed it.', '{name} yawned, very widely.', '{name} has found the only warm tile.', '{name} is napping in the sunbeam.'],
  },
  {
    id: 'playful', label: 'Playful', emoji: '', blurb: 'Always ready for one more round.',
    behavior: { idle: 1, wander: 4, sit: 1, nap: 1, play: 5 },
    lines: ['{name} is chasing a speck of dust.', '{name} pounced on nothing in particular.', '{name} has been doing laps of the sill.', '{name} would like you to watch this.', '{name} knocked something over, gently.'],
  },
  {
    id: 'curious', label: 'Curious', emoji: '', blurb: 'Has to see what that is.',
    behavior: { idle: 2, wander: 5, sit: 2, nap: 1, play: 2 },
    lines: ['{name} is inspecting a new leaf.', '{name} is watching the pothos very closely.', '{name} has been looking out of the window for a while.', '{name} investigated the coin jar and approved.', '{name} is sniffing the watering can.'],
  },
  {
    id: 'shy', label: 'Shy', emoji: '', blurb: 'Takes a while. Worth the wait.',
    behavior: { idle: 4, wander: 2, sit: 4, nap: 2, play: 1 },
    lines: ['{name} came a little closer today.', '{name} is watching you from behind a pot.', '{name} sat next to you, not quite touching.', '{name} blinked slowly at you.', '{name} is peeking out from the leaves.'],
  },
  {
    id: 'sassy', label: 'Sassy', emoji: '', blurb: 'Has opinions, and shares them.',
    behavior: { idle: 3, wander: 3, sit: 3, nap: 1, play: 2 },
    lines: ['{name} is sitting exactly where you were about to put something.', '{name} looked at the new pot, then looked away.', '{name} has claimed the best leaf.', '{name} was here first, and would like that noted.', '{name} accepted the attention, eventually.'],
  },
  {
    id: 'gentle', label: 'Gentle', emoji: '', blurb: 'Calm company.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 2, play: 1 },
    lines: ['{name} is sitting quietly beside the pots.', '{name} leaned against you for a moment.', '{name} is watching the light move across the sill.', '{name} made room for someone smaller.', '{name} is keeping the new cutting company.'],
  },
  {
    id: 'foodie', label: 'Foodie', emoji: '', blurb: 'Always knows where the snacks are.',
    behavior: { idle: 3, wander: 3, sit: 2, nap: 2, play: 2 },
    lines: ['{name} is watching the pantry shelf.', '{name} heard a wrapper and came right over.', '{name} is sitting very politely near the treats.', '{name} checked the bowl again, just in case.', '{name} would like to discuss breakfast.'],
  },
  {
    id: 'dramatic', label: 'Dramatic', emoji: '', blurb: 'Every moment is an occasion.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 2, play: 3 },
    lines: ['{name} lay down in the middle of everything.', '{name} greeted you as if it had been a year.', '{name} flopped over in the sunbeam, with feeling.', '{name} sighed very loudly at the rain.', '{name} is posing by the window, as usual.'],
  },
  {
    id: 'sunny', label: 'Sunny', emoji: '', blurb: 'Happiest in the brightest spot.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 1, play: 3 },
    lines: ['{name} would like the sun to stay exactly where it is.', '{name} followed the sunbeam along the sill.', '{name} is basking, eyes half closed.', '{name} is facing the window, perfectly still.', '{name} found the one patch of sun on the floor.'],
  },
  {
    id: 'dreamy', label: 'Dreamy', emoji: '', blurb: 'Somewhere else, pleasantly.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 3, play: 1 },
    lines: ['{name} is watching the clouds go past.', '{name} is gazing at nothing in particular, contentedly.', '{name} is watching raindrops race down the glass.', '{name} fell asleep halfway through a thought.', '{name} is watching the dust float in the light.'],
  },
];

export const PERSONALITY_BY_ID: ReadonlyMap<Personality, PersonalityDef> = new Map(PERSONALITIES.map((p) => [p.id, p]));

export const TREAT_TAG_HINTS: Record<TreatTag, string> = {
  fruity: 'Likes something fruity',
  sweet: 'Has a sweet tooth',
  savory: 'Prefers something savoury',
  drink: 'Likes something warm to drink',
  crunchy: 'Likes something crunchy',
  fresh: 'Likes fresh green things',
};

/** Pet "voices" for the sound synth. */
export const SPECIES_VOICE: Record<Species, 'mew' | 'moo' | 'woof' | 'squeak' | 'ribbit' | 'grr' | 'peep' | 'quack'> = {
  cat: 'mew',
  cow: 'moo',
  dog: 'woof',
  bunny: 'squeak',
  frog: 'ribbit',
  bear: 'grr',
  hamster: 'peep',
  duck: 'quack',
};

/** Name suggestions for new pets (plus a reroll), per species. */
export const NAME_SUGGESTIONS: Record<Species, string[]> = {
  cat: ['Miso', 'Biscuit', 'Bean', 'Noodle', 'Sesame', 'Clementine', 'Wren', 'Figaro', 'Plum', 'Hazel'],
  cow: ['Buttercup', 'Daisy', 'Marigold', 'Oatcake', 'Primrose', 'Hattie', 'Toffee', 'Meadow', 'Blossom', 'Maude'],
  dog: ['Pretzel', 'Maple', 'Toast', 'Scout', 'Bagel', 'Olive', 'Pickle', 'Fig', 'Rosie', 'Murphy'],
  bunny: ['Cotton', 'Petal', 'Juniper', 'Pip', 'Thistle', 'Nutmeg', 'Posy', 'Willow', 'Sorrel', 'Bramble'],
  frog: ['Basil', 'Kiwi', 'Pea', 'Lily', 'Sage', 'Cress', 'Pond', 'Fennel', 'Minnow', 'Clem'],
  bear: ['Cocoa', 'Hazel', 'Rye', 'Barley', 'Cinnamon', 'Maple', 'Bruno', 'Oona', 'Pecan', 'Ursula'],
  hamster: ['Peanut', 'Chickpea', 'Button', 'Poppy', 'Crouton', 'Lentil', 'Acorn', 'Tater', 'Almond', 'Pip'],
  duck: ['Custard', 'Lemon', 'Puddle', 'Dandelion', 'Primrose', 'Pip', 'Waffle', 'Quince', 'Bramley', 'Nell'],
};

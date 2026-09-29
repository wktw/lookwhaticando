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
   * Third-person captions shown when a pet is tapped (DESIGN §12: animals never speak, and never
   * get pronouns). {name} = the pet's name. Species-neutral: no paws, tails, ears, fur or noses,
   * so the same line suits a frog, a duck or a cow. These are the `tap` row of the caption matrix
   * in lines.ts, which adds the species-true lines.
   */
  lines: string[];
}

export const PERSONALITIES: readonly PersonalityDef[] = [
  {
    id: 'sleepy', label: 'Sleepy', emoji: '', blurb: 'Can sleep anywhere, and does.',
    behavior: { idle: 3, wander: 1, sit: 3, nap: 5, play: 1 },
    lines: [
      '{name} opened one eye, then closed it again.',
      '{name} is asleep in the warmest spot on the sill.',
      '{name} stretched without quite waking up.',
      '{name} has found the warm patch above the radiator.',
      '{name} nodded off sitting up.',
    ],
  },
  {
    id: 'playful', label: 'Playful', emoji: '', blurb: 'Plays with anything that moves, and a few things that don’t.',
    behavior: { idle: 1, wander: 4, sit: 1, nap: 1, play: 5 },
    lines: [
      '{name} is chasing a speck of dust.',
      '{name} went after a leaf’s shadow and nearly caught it.',
      '{name} has been doing laps of the sill.',
      '{name} keeps looking back to check you’re watching.',
      '{name} knocked something over, gently.',
    ],
  },
  {
    id: 'curious', label: 'Curious', emoji: '', blurb: 'Has to see what that is.',
    behavior: { idle: 2, wander: 5, sit: 2, nap: 1, play: 2 },
    lines: [
      '{name} is inspecting a new leaf.',
      '{name} has been watching the window for a while.',
      '{name} looked into the coin jar for a long time.',
      '{name} is looking into the spout of the watering can.',
      '{name} is studying a chip in the rim of a pot.',
    ],
  },
  {
    id: 'shy', label: 'Shy', emoji: '', blurb: 'Watches from behind the pots at first.',
    behavior: { idle: 4, wander: 2, sit: 4, nap: 2, play: 1 },
    lines: [
      '{name} came a little closer today.',
      '{name} is watching you from behind a pot.',
      '{name} came to the front of the sill, then stopped.',
      '{name} is peeking out from the leaves.',
      '{name} looked at you, then away, then back.',
    ],
  },
  {
    id: 'sassy', label: 'Sassy', emoji: '', blurb: 'Knows which spot is best, and takes it.',
    behavior: { idle: 3, wander: 3, sit: 3, nap: 1, play: 2 },
    lines: [
      '{name} is sitting exactly where you were about to put something.',
      '{name} looked at the new pot, then looked away.',
      '{name} has claimed the best leaf.',
      '{name} got to the warm pot first and spread out.',
      '{name} accepted the attention, eventually.',
    ],
  },
  {
    id: 'gentle', label: 'Gentle', emoji: '', blurb: 'Calm company. Moves slowly, and sits close.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 2, play: 1 },
    lines: [
      '{name} is sitting quietly beside the pots.',
      '{name} leaned against you for a moment.',
      '{name} is watching the light move across the sill.',
      '{name} stepped carefully round the newest leaf.',
      '{name} is keeping the smallest plant company.',
    ],
  },
  {
    id: 'foodie', label: 'Foodie', emoji: '', blurb: 'Knows where the treats are kept, and when.',
    behavior: { idle: 3, wander: 3, sit: 2, nap: 2, play: 2 },
    lines: [
      '{name} is watching the pantry shelf.',
      '{name} heard a wrapper and came right over.',
      '{name} is sitting very politely near the treats.',
      '{name} checked the dish again, just in case.',
      '{name} is sitting by the empty dish, facing you.',
    ],
  },
  {
    id: 'dramatic', label: 'Dramatic', emoji: '', blurb: 'Always lies down in the way.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 2, play: 3 },
    lines: [
      '{name} lay down in the middle of everything.',
      '{name} dropped flat in the sunbeam.',
      '{name} is stretched out across two pots at once.',
      '{name} is lying right where the watering can goes.',
      '{name} is staring hard at a corner of the ceiling. Nothing’s there.',
    ],
  },
  {
    id: 'sunny', label: 'Sunny', emoji: '', blurb: 'Happiest in the brightest spot.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 1, play: 3 },
    lines: [
      '{name} would like the sun to stay exactly where it is.',
      '{name} shifted over to stay in the sun.',
      '{name} is basking, eyes half closed.',
      '{name} is facing the window, perfectly still.',
      '{name} found the last patch of sun on the sill.',
    ],
  },
  {
    id: 'dreamy', label: 'Dreamy', emoji: '', blurb: 'Watches the window for hours.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 3, play: 1 },
    lines: [
      '{name} is watching the clouds go past.',
      '{name} is looking at nothing in particular.',
      '{name} is watching one leaf turn in the draught.',
      '{name} dozed off facing the window.',
      '{name} is watching the dust float in the light.',
    ],
  },
];

export const PERSONALITY_BY_ID: ReadonlyMap<Personality, PersonalityDef> = new Map(PERSONALITIES.map((p) => [p.id, p]));

/**
 * The Pet Card's clue until the favourite treat is found: an observation, not a riddle. Keyed by
 * the treat's first tag (fresh covers carrots and radishes too, so it doesn't say "green").
 */
export const TREAT_TAG_HINTS: Record<TreatTag, string> = {
  fruity: 'Watches the fruit bowl closely',
  sweet: 'Perks up at anything sweet',
  savory: 'Prefers something savoury',
  drink: 'Always interested in your cup',
  crunchy: 'Comes over at the sound of a crunch',
  fresh: 'Likes things fresh from the garden',
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

/**
 * Name suggestions for new pets (plus a reroll), per species: real names, no puns, no lilies, a few
 * kitchen names at most, and none shared between species.
 */
export const NAME_SUGGESTIONS: Record<Species, string[]> = {
  cat: ['Miso', 'Biscuit', 'Wren', 'Figaro', 'Plum', 'Hazel', 'Mabel', 'Otto', 'Clementine', 'Juno'],
  cow: ['Buttercup', 'Daisy', 'Marigold', 'Oatcake', 'Primrose', 'Hattie', 'Toffee', 'Heather', 'Blossom', 'Maude'],
  dog: ['Pretzel', 'Maple', 'Scout', 'Olive', 'Rosie', 'Murphy', 'Dot', 'Bonnie', 'Alfie', 'Fig'],
  bunny: ['Cotton', 'Petal', 'Juniper', 'Pip', 'Thistle', 'Nutmeg', 'Posy', 'Willow', 'Sorrel', 'Bramble'],
  frog: ['Basil', 'Pea', 'Sage', 'Reed', 'Minnow', 'Clem', 'Moss', 'Newt', 'Fennel', 'Lottie'],
  bear: ['Cocoa', 'Bruno', 'Oona', 'Ursula', 'Barley', 'Rufus', 'Bertie', 'Hugo', 'Martha', 'Pecan'],
  hamster: ['Peanut', 'Button', 'Poppy', 'Acorn', 'Almond', 'Ivy', 'Bobbin', 'Tilly', 'Nib', 'Sprout'],
  duck: ['Custard', 'Lemon', 'Puddle', 'Dandelion', 'Quince', 'Nell', 'Dilly', 'Mae', 'Florence', 'Bramley'],
};

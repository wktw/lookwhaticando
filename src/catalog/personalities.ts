import type { Personality, Species, TreatTag } from './types';

export interface PersonalityDef {
  id: Personality;
  label: string;
  emoji: string;
  blurb: string;
  /** Meadow behavior weights (relative): idle, wander, sit, nap, play. */
  behavior: { idle: number; wander: number; sit: number; nap: number; play: number };
  /** Lines said when tapped in the meadow or on Today. {name} = pet name, {you} = user name (or "friend"). */
  lines: string[];
}

export const PERSONALITIES: readonly PersonalityDef[] = [
  {
    id: 'sleepy', label: 'Sleepy', emoji: '😴', blurb: 'Naps are a lifestyle.',
    behavior: { idle: 3, wander: 1, sit: 3, nap: 5, play: 1 },
    lines: ['*yawn* oh hi {you}…', 'Five more minutes?', 'I dreamed you drank all your water.', 'Naps count as self-care, right?', 'Zzz… proud of you… zzz'],
  },
  {
    id: 'playful', label: 'Playful', emoji: '🎾', blurb: 'Zoomies at all hours.',
    behavior: { idle: 1, wander: 4, sit: 1, nap: 1, play: 5 },
    lines: ['Tag! You\'re it!', 'Again! Again!', 'Wheee!', 'Let\'s do a victory lap!', 'You\'re my favorite human, {you}!'],
  },
  {
    id: 'curious', label: 'Curious', emoji: '🔍', blurb: 'Must sniff everything.',
    behavior: { idle: 2, wander: 5, sit: 2, nap: 1, play: 2 },
    lines: ['What\'s that? And that?', 'Ooh, a new flower!', 'How do you do all those habits?', 'I found a very interesting leaf.', 'Tell me everything, {you}.'],
  },
  {
    id: 'shy', label: 'Shy', emoji: '🙈', blurb: 'Warms up slowly, loves deeply.',
    behavior: { idle: 4, wander: 2, sit: 4, nap: 2, play: 1 },
    lines: ['Oh! Um… hi.', '…thank you for visiting.', 'I like it when you\'re here.', '*hides, but happily*', 'You\'re doing really well… I noticed.'],
  },
  {
    id: 'sassy', label: 'Sassy', emoji: '💅', blurb: 'Iconic. Knows it.',
    behavior: { idle: 3, wander: 3, sit: 3, nap: 1, play: 2 },
    lines: ['Took you long enough. Kidding! Hi!', 'Obviously I\'m the cutest one here.', 'We love a productive queen.', 'Did you see my outfit today?', 'Main character energy, {you}.'],
  },
  {
    id: 'gentle', label: 'Gentle', emoji: '🌷', blurb: 'A soft place to land.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 2, play: 1 },
    lines: ['Take a deep breath with me.', 'Be gentle with yourself today.', 'Every little step counts.', 'I\'m so glad you\'re here, {you}.', 'Rest is part of growing.'],
  },
  {
    id: 'foodie', label: 'Foodie', emoji: '🍓', blurb: 'Thinks about snacks. Often.',
    behavior: { idle: 3, wander: 3, sit: 2, nap: 2, play: 2 },
    lines: ['Is that a snack?', 'I could go for a strawberry…', 'Rating today: 10/10 snacks.', 'Did you eat something yummy today?', 'Food is love, {you}.'],
  },
  {
    id: 'dramatic', label: 'Dramatic', emoji: '🎭', blurb: 'Every moment is a scene.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 2, play: 3 },
    lines: ['At LAST! You have RETURNED!', 'This is the best day of my entire life.', 'A triumph! A masterpiece!', 'I simply cannot handle how cute you are.', 'Behold, {you}, the legend!'],
  },
  {
    id: 'sunny', label: 'Sunny', emoji: '☀️', blurb: 'Pure golden-hour energy.',
    behavior: { idle: 2, wander: 3, sit: 2, nap: 1, play: 3 },
    lines: ['Good vibes only!', 'You\'ve got this, {you}!', 'Today feels like a good day.', 'Look how far you\'ve come!', 'Sunshine, reporting for duty!'],
  },
  {
    id: 'dreamy', label: 'Dreamy', emoji: '🌙', blurb: 'Head in the clouds, heart in the right place.',
    behavior: { idle: 4, wander: 2, sit: 3, nap: 3, play: 1 },
    lines: ['Did you see that cloud? It looked like you.', 'I wonder what the stars are doing.', 'Let\'s make a wish.', 'Tiny steps, big dreams.', 'You sparkle, {you}.'],
  },
];

export const PERSONALITY_BY_ID: ReadonlyMap<Personality, PersonalityDef> = new Map(PERSONALITIES.map((p) => [p.id, p]));

export const TREAT_TAG_HINTS: Record<TreatTag, string> = {
  fruity: 'Loves something fruity 🍓',
  sweet: 'Has a sweet tooth 🧁',
  savory: 'Prefers something savory 🧀',
  drink: 'Would love a cozy drink 🥛',
  crunchy: 'Craves something crunchy 🍪',
  fresh: 'Likes fresh, green things 🥬',
};

/** Pet "voices" for the sound synth. */
export const SPECIES_VOICE: Record<Species, 'mew' | 'moo' | 'squeak' | 'ribbit' | 'grr' | 'peep' | 'quack'> = {
  cat: 'mew',
  cow: 'moo',
  bunny: 'squeak',
  frog: 'ribbit',
  bear: 'grr',
  hamster: 'peep',
  duck: 'quack',
};

/** Buddy lines shown on the Today screen. Picked per day. */
export const BUDDY_LINES = {
  morning: ['Good morning! Let\'s grow something today 🌱', 'Rise and shine, {you}! ☀️', 'Morning! I saved you a sunbeam.'],
  afternoon: ['How\'s your day going, {you}?', 'Little steps, big meadow 🌼', 'Snack break? You deserve one.'],
  evening: ['Evening, {you}! Proud of today.', 'Winding down? Me too 🌙', 'Whatever you did today was enough.'],
  night: ['It\'s late, {you}. Sleep is a habit too 💤', 'Stars are out ✨', 'Sweet dreams soon?'],
  allDone: ['Everything done! You\'re amazing 🎉', 'Perfect day!! I\'m doing a happy dance!', 'Look at you go, {you}! 💖'],
  restDay: ['Resting is part of the routine 🌙', 'Rest days grow roots.'],
  welcomeBack: ['You\'re back! I missed you 💕', 'Welcome back, {you}! Every return counts.'],
  checkIn: ['Yay!', 'Nice one!', 'Go {you}!', 'So proud!', 'Look at that!', 'Woohoo!', 'Growing!'],
};

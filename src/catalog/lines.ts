/**
 * The caption matrix and the sentence templates (DESIGN §12; the copy deck is docs/VOICE.md).
 *
 * Data, plus the few pure helpers that choose and fill a line. The narrator writes like a
 * plant-sitter's note: brief, kind, specific, observed. The animals never speak and never get
 * pronouns, so every pet line leads with {name}. The narrator reports what the animal does and
 * lets the animal be the funny one: no explaining the joke after a comma. tests/unit/voice.test.ts
 * lints all of it.
 *
 * Caption slots:
 * - {name}   the pet's name ("Pudding")
 * - {plant}  the habit's plant, with its article ("the Read plant", "the snake plant"; see `plantPhrase`)
 * - {habit}  the habit's name as she wrote it ("Walk")
 * - {treat}  the treat's name in lower case, without an article ("oat biscuit", "blueberries")
 * - {wear}   the thing to wear in lower case, without an article ("ribbon scarf", "earmuffs")
 * Treats and wearables can be plural or a drink, so no line puts a verb or a pronoun after them
 * ("the {treat} is", "had it"). Other templates list their own slots. A capitalised slot ({Plant},
 * {Count}) is the same value with a capital, because it opens a sentence. A slot filled with ''
 * also drops the ", " before it.
 */
import type { Personality, PlantSpeciesId, Rarity, Species } from './types';
import { PERSONALITIES } from './personalities';

/* ------------------------------------------------------------------------ */
/* Lines, filters and the contexts                                           */
/* ------------------------------------------------------------------------ */

/**
 * A line, with the conditions it needs to be true:
 * - `species`: only these species (a cud-chew is for cows);
 * - `minStage`: the habit's plant is at least this stage (2 = Potted: before that it's a cutting
 *   in a glass, with no pot, soil or saucer);
 * - `minLevel`: the pet is at least this friendship level (a level announces a behaviour, so the
 *   captions don't show it earlier);
 * - `night`: only between 23:00 and 06:00.
 */
export interface LineDef {
  readonly text: string;
  readonly species?: readonly Species[];
  readonly minStage?: number;
  readonly minLevel?: number;
  readonly night?: boolean;
}
export type Line = string | LineDef;

/** What the caller knows about the moment. Unknown values count as the most cautious case. */
export interface Situation {
  /** The habit's plant stage, 0 (Cutting) to 7 (Evergreen). Pass it for checkin and resident. */
  stage?: number;
  /** The pet's friendship level, 1 to 15. */
  level?: number;
  /** True between 23:00 and 06:00. */
  night?: boolean;
}

const only = (species: Species | readonly Species[], text: string): LineDef => ({
  text,
  species: typeof species === 'string' ? [species] : species,
});
/** Needs a pot: the plant is at least Potted. */
const potted = (line: string | LineDef): LineDef => ({ ...(typeof line === 'string' ? { text: line } : line), minStage: 2 });
/** Shows from this friendship level. */
const atLevel = (level: number, line: string | LineDef): LineDef => ({ ...(typeof line === 'string' ? { text: line } : line), minLevel: level });

/** Mammals, for lines about fur, ears, noses, licks, sighs and yawns. */
const MAMMALS: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster'];

/**
 * When each context applies. Idle captions follow the clock (DESIGN §8.2): `tap`, `morning` and
 * `afternoon` are daytime, `evening` is under the lamp (20:00–23:00, after sunset for most of the
 * year, so no sunsets), and `night` is asleep (23:00–06:00). `night` always wins; `rainy` replaces
 * tap, morning, afternoon and evening when the window shows rain. A tap after the lamp comes on
 * uses `evening` or `night` instead of `tap`. The event contexts (checkin, restDay, perfectDay,
 * welcomeHome, fed, fedFavourite, newWear, resident, newArrival) can fire at any hour, so their
 * lines never assume the sun is out.
 */
export const LINE_CONTEXTS = [
  'tap',
  'checkin',
  'morning',
  'afternoon',
  'evening',
  'night',
  'rainy',
  'restDay',
  'perfectDay',
  'welcomeHome',
  'fed',
  'fedFavourite',
  'newWear',
  'resident',
  'newArrival',
] as const;
export type LineContext = (typeof LINE_CONTEXTS)[number];

/** The slots a context's lines may use, so the caller always has every value it needs. */
export const CONTEXT_SLOTS: Readonly<Record<LineContext, readonly string[]>> = {
  tap: ['name'],
  checkin: ['name', 'plant', 'habit'],
  morning: ['name'],
  afternoon: ['name'],
  evening: ['name'],
  night: ['name'],
  rainy: ['name'],
  restDay: ['name'],
  perfectDay: ['name'],
  welcomeHome: ['name'],
  fed: ['name', 'treat'],
  fedFavourite: ['name', 'treat'],
  newWear: ['name', 'wear'],
  resident: ['name', 'plant', 'habit'],
  newArrival: ['name'],
};

export const lineText = (line: Line): string => (typeof line === 'string' ? line : line.text);
export const fitsSpecies = (line: Line, species: Species): boolean => typeof line === 'string' || !line.species || line.species.includes(species);
/** Whether a line is true for this species in this situation. */
export function fits(line: Line, species: Species, situation: Situation = {}): boolean {
  if (typeof line === 'string') return true;
  if (!fitsSpecies(line, species)) return false;
  if ((line.minStage ?? 0) > (situation.stage ?? 0)) return false;
  if ((line.minLevel ?? 1) > (situation.level ?? 1)) return false;
  return !line.night || situation.night === true;
}

/* ------------------------------------------------------------------------ */
/* The caption matrix: 10 personalities × 15 contexts                        */
/* ------------------------------------------------------------------------ */

type OwnContexts = Exclude<LineContext, 'tap'>;

/**
 * Personality captions per context. Tap lines live on the personality itself
 * (`PersonalityDef.lines`) and join the matrix below. Unfiltered lines suit every species: no
 * paws, tails, ears, fur, noses or sighs unless the line carries a species filter. Every pet is
 * alone on the sill for its first days, so no line assumes a friend.
 */
const OWN: Readonly<Record<Personality, Readonly<Record<OwnContexts, readonly Line[]>>>> = {
  sleepy: {
    checkin: [
      '{name} slept through the watering.',
      '{name} opened one eye at the sound of water.',
      '{name} watched the water go in, then went back to sleep.',
      '{name} dozed off again before the glass was empty.',
    ],
    morning: [
      '{name} is up, technically.',
      '{name} stretched, looked at the morning, and lay back down.',
      '{name} is still asleep in the first bit of sun.',
      '{name} has been awake a minute and is already lying down again.',
    ],
    afternoon: [
      '{name} has been asleep in the sunbeam since lunch.',
      '{name} woke up, moved one pot along, and slept again.',
      '{name} is on the second nap of the afternoon.',
      '{name} is asleep in the exact middle of the beam.',
      atLevel(5, '{name} moved along with the sunbeam without waking up.'),
    ],
    evening: [
      '{name} is asleep under the lamp.',
      '{name} is dozing in the warm circle of lamplight.',
      '{name} was asleep before the lamp came on.',
      '{name} opened one eye when the lamp came on.',
    ],
    night: [
      '{name} is fast asleep.',
      '{name} is asleep, feet twitching now and then.',
      '{name} hasn’t moved since the lamp went off.',
      '{name} is asleep in a square of moonlight.',
    ],
    rainy: [
      '{name} is asleep to the sound of the rain.',
      '{name} went back to sleep when the rain started.',
      '{name} slept through the whole shower.',
      '{name} likes a rainy day, for sleeping.',
    ],
    restDay: [
      '{name} is asleep against the resting pot.',
      '{name} got up, turned round, and lay down again.',
      '{name} hasn’t moved from the warm pot.',
      '{name} is asleep with one foot on the resting pot’s rim.',
    ],
    perfectDay: [
      '{name} slept through all of it.',
      '{name} is asleep on a fully watered sill.',
      '{name} opened one eye at all the damp soil, then closed it.',
      '{name} is asleep between two damp pots.',
    ],
    welcomeHome: [
      '{name} is asleep on the rim of a pot.',
      '{name} opened one eye, then the other.',
      '{name} is asleep on the warm pot.',
      '{name} woke up enough to stretch in your direction.',
    ],
    fed: [
      '{name} had the {treat} and went straight back to sleep.',
      '{name} had the {treat} lying down.',
      '{name} woke up for the {treat} and fell asleep beside the dish.',
      '{name} finished the {treat} with eyes half shut.',
    ],
    fedFavourite: [
      '{name} woke up all the way for the {treat}.',
      '{name} got up and walked over for the {treat}.',
      '{name} had the {treat} and then stayed awake for a whole minute.',
      '{name} is fully awake. It’s the {treat}.',
    ],
    newWear: [
      '{name} fell asleep in the {wear} straight away.',
      '{name} is wearing the {wear} to nap in.',
      '{name} tried the {wear} on, lay down, and that was that.',
      '{name} is asleep in the {wear}, and has been for a while.',
    ],
    resident: [
      '{name} is asleep in {plant}.',
      '{name} naps in {plant} most afternoons now.',
      '{name} has found a sleeping spot at the edge of {plant}.',
      '{name} sleeps under the lowest leaf of {plant}.',
      potted('{name} is asleep against the side of {plant}’s pot.'),
    ],
    newArrival: [
      '{name} fell asleep within the hour.',
      '{name} has already found the warm spot.',
      '{name} has napped in 3 different pots already.',
      '{name} took one look round and had a nap.',
    ],
  },

  playful: {
    checkin: [
      '{name} tried to catch the stream of water.',
      '{name} jumped at the first drop.',
      '{name} is chasing a drip down the side of the glass.',
      '{name} got splashed and went round again for more.',
    ],
    morning: [
      '{name} has been up for hours, going by the state of the sill.',
      '{name} is racing the sunlight along the sill.',
      '{name} woke up and started a game straight away.',
      '{name} is batting at the dust in the light.',
    ],
    afternoon: [
      '{name} is chasing the edge of the sunbeam.',
      '{name} ambushed a leaf, then let it go.',
      '{name} has been hopping in and out of the sunbeam.',
      '{name} found a button and is taking it everywhere.',
    ],
    evening: [
      '{name} is chasing the lamp’s shadow round the pot.',
      '{name} is still going, and the lamp’s been on an hour.',
      '{name} is jumping at moths that aren’t there.',
      '{name} did one last lap and lay down.',
    ],
    night: [
      '{name} fell asleep in the middle of a game.',
      '{name} is asleep, feet paddling.',
      '{name} fell asleep next to the button.',
      '{name} is finally asleep.',
    ],
    rainy: [
      '{name} is chasing raindrops down the glass.',
      '{name} jumps every time the rain gets louder.',
      '{name} is chasing the shadows of the drops across the sill.',
      '{name} was at the window at the first drops.',
    ],
    restDay: [
      '{name} doesn’t know what a rest day is, and is playing anyway.',
      '{name} is batting a leaf back and forth.',
      '{name} is resting between games.',
      '{name} brought a button over to the resting pot.',
    ],
    perfectDay: [
      '{name} did a lap of the sill and back.',
      '{name} is going from pot to pot, checking the damp soil.',
      '{name} hopped onto every rim, one after the other.',
      '{name} is jumping at the drips off the leaves.',
    ],
    welcomeHome: [
      '{name} brought a button over to show you.',
      '{name} is ready for a game.',
      '{name} hopped straight over.',
      '{name} started a game right away.',
    ],
    fed: [
      '{name} had the {treat} between laps.',
      '{name} had the {treat} at top speed.',
      '{name} finished the {treat} and went back to the game.',
      '{name} played with the empty dish after the {treat}.',
    ],
    fedFavourite: [
      '{name} did a little spin for the {treat}.',
      '{name} stopped mid-game for the {treat}.',
      '{name} had the {treat} and hopped straight up afterwards.',
      '{name} did a lap of the sill after the {treat}.',
    ],
    newWear: [
      '{name} tried to chase the {wear} first.',
      '{name} is wearing the {wear} and doing laps.',
      '{name} spent a while trying to catch the {wear}.',
      '{name} kept the {wear} on for a whole lap of the sill.',
    ],
    resident: [
      '{name} hides in {plant} and jumps out at the watering can.',
      '{name} jumps at the drips off {plant}’s leaves.',
      '{name} is doing laps round {plant}.',
      '{name} bats at the lowest leaf of {plant}.',
      potted('{name} keeps a button hidden in {plant}’s pot.'),
    ],
    newArrival: [
      '{name} has been round every pot already.',
      '{name} started playing within the minute.',
      '{name} found the one loose button on the sill.',
      '{name} is doing a first lap of the new sill.',
    ],
  },

  curious: {
    checkin: [
      '{name} leaned in to see where the water went.',
      '{name} looked into the empty glass afterwards.',
      '{name} put one foot in the water, then took it out.',
      '{name} watched the level drop in the glass.',
      potted('{name} watched the water soak into the soil.'),
      potted('{name} is inspecting the damp soil in {plant}.'),
    ],
    morning: [
      '{name} is checking every pot for overnight changes.',
      '{name} is watching the street wake up.',
      '{name} has found the one new leaf from overnight.',
      '{name} is watching a pigeon on the railing.',
    ],
    afternoon: [
      '{name} is working out where the sunbeam goes.',
      '{name} went round the back of the pots to see what’s there.',
      '{name} is watching the neighbour’s window.',
      '{name} is following a bee on the other side of the glass.',
    ],
    evening: [
      '{name} is watching the lamp come on.',
      '{name} is looking at the reflection in the dark window.',
      '{name} is watching a moth on the glass.',
      '{name} is looking up into the lampshade.',
    ],
    night: [
      '{name} is asleep, facing the window just in case.',
      '{name} fell asleep watching the street lights.',
      '{name} woke up to look at a passing car, then slept.',
      '{name} is asleep with one eye not quite shut.',
    ],
    rainy: [
      '{name} is following one raindrop all the way down the glass.',
      '{name} is watching the umbrellas go past.',
      '{name} is looking at the rain, then at you, then at the rain.',
      '{name} is listening to the rain on the ledge outside.',
    ],
    restDay: [
      '{name} walked round the resting pot once and sat down.',
      '{name} checked the resting pot twice. It’s fine.',
      '{name} is looking out of the window, pressed to the glass.',
      '{name} is watching a fly on the other side of the glass.',
    ],
    perfectDay: [
      '{name} went pot to pot to check the soil.',
      '{name} is watching a drip form under a pot.',
      '{name} looked into every pot, one after another.',
      '{name} put one foot in the soil to check it was wet.',
    ],
    welcomeHome: [
      '{name} is watching a bird on the railing.',
      '{name} is at the window, keeping an eye on things.',
      '{name} looked up from the window.',
      '{name} came over to the front of the sill.',
    ],
    fed: [
      '{name} inspected the {treat} from all sides first.',
      '{name} looked the {treat} over carefully, then had every bit.',
      '{name} finished the {treat} and checked the dish for more.',
      '{name} is investigating where the {treat} came from.',
    ],
    fedFavourite: [
      '{name} went straight past the other treats to the {treat}.',
      '{name} knew it was the {treat} before the lid was off.',
      '{name} looked from the {treat} to you and back again.',
      '{name} checked the pantry shelf for more of the {treat}.',
    ],
    newWear: [
      '{name} looked the {wear} over from every side first.',
      '{name} keeps looking at the {wear} in the window reflection.',
      '{name} keeps turning round to look at the {wear}.',
      '{name} had a good look, and kept the {wear} on.',
    ],
    resident: [
      '{name} checks {plant} for new leaves every morning.',
      '{name} watches the water go into {plant}.',
      '{name} knows every leaf on {plant}.',
      '{name} is inspecting the newest leaf on {plant}.',
    ],
    newArrival: [
      '{name} is inspecting everything, pot by pot.',
      '{name} looked inside the coin jar first.',
      '{name} has been round every pot twice.',
      '{name} has had a look at every leaf already.',
    ],
  },

  shy: {
    checkin: [
      '{name} watched from behind the pot.',
      '{name} stayed for the whole watering this time.',
      '{name} peeked out once the water stopped.',
      '{name} edged a little closer to see.',
    ],
    morning: [
      '{name} is peeking out at the morning.',
      '{name} is up, and keeping to the edge of the sill.',
      '{name} waited until the sill was quiet to come out.',
      '{name} is watching the morning from between two pots.',
    ],
    afternoon: [
      '{name} is at the edge of the sunbeam, half in shade.',
      '{name} is warming up in a small corner of the beam.',
      '{name} is in the shade of the tallest plant.',
      '{name} came out into the sun for a minute.',
    ],
    evening: [
      '{name} came out once the lamp was on.',
      '{name} is sitting at the edge of the lamplight.',
      '{name} is braver in the evenings.',
      '{name} sat a little nearer the lamp tonight.',
    ],
    night: [
      '{name} is asleep, tucked in behind a pot.',
      '{name} is asleep in the smallest space on the sill.',
      '{name} is asleep where nobody would think to look.',
      '{name} is asleep under a leaf, mostly hidden.',
    ],
    rainy: [
      '{name} is watching the rain from somewhere safe.',
      '{name} moved further in behind the pots when the rain started.',
      '{name} is tucked in behind a pot until the rain stops.',
      '{name} likes the rain. It’s quieter.',
    ],
    restDay: [
      '{name} is keeping the resting pot company, quietly.',
      '{name} likes a quiet day.',
      '{name} came out a little more today.',
      '{name} is sitting by the resting pot, out of the way.',
    ],
    perfectDay: [
      '{name} came out to look at the whole sill.',
      '{name} watched every watering from behind the same pot.',
      '{name} came right to the front of the sill today.',
      '{name} came out and sat in the middle of the sill.',
    ],
    welcomeHome: [
      '{name} came out from behind the pot.',
      '{name} looked up, and stayed out.',
      '{name} came out as far as the nearest pot.',
      '{name} peeked out and blinked.',
    ],
    fed: [
      '{name} waited until you looked away, then had the {treat}.',
      '{name} had the {treat} behind the pot.',
      '{name} had the {treat} without a sound.',
      '{name} came out for the {treat}.',
    ],
    fedFavourite: [
      '{name} came all the way out for the {treat}.',
      '{name} had the {treat} right in front of you.',
      '{name} took the {treat} and sat a little closer afterwards.',
      '{name} came out for the {treat} before the dish was even down.',
    ],
    newWear: [
      '{name} tried the {wear} on behind the pot first.',
      '{name} is not sure about the {wear} yet.',
      '{name} came out wearing the {wear}, then went back in.',
      '{name} is still wearing the {wear}, behind the pot.',
    ],
    resident: [
      '{name} lives at the back of {plant}, mostly out of sight.',
      '{name} peeks out of {plant} when you water.',
      '{name} goes back into {plant} at any loud noise.',
      '{name} is hiding in {plant}, not very well.',
    ],
    newArrival: [
      '{name} is behind the biggest pot for now.',
      '{name} peeked out once, then went back behind the pot.',
      '{name} is taking the new sill slowly.',
      '{name} found somewhere small to sit and is staying there.',
    ],
  },

  sassy: {
    checkin: [
      '{name} moved, but only just enough for the water.',
      '{name} watched the watering, then moved to a dry pot.',
      '{name} is sitting in the spot you were aiming for.',
      '{name} stepped back from the splash and sat down facing away.',
    ],
    morning: [
      '{name} was up first.',
      '{name} is sitting in the only patch of morning sun, and staying.',
      '{name} is sitting with the back to the room.',
      '{name} took the warm pot first thing.',
    ],
    afternoon: [
      '{name} has taken the whole sunbeam.',
      '{name} is lying across the beam so nobody else can.',
      '{name} moved to the warm pot and will not be moving again.',
      '{name} got into the sunbeam first and spread out to fill it.',
    ],
    evening: [
      '{name} has claimed the spot right under the lamp.',
      '{name} is sitting in the lamplight, looking at the wall.',
      '{name} turned round twice and lay down facing away.',
      '{name} would like the lamp a little to the left.',
    ],
    night: [
      '{name} is asleep in the middle, taking up room.',
      '{name} is asleep on the best cushion.',
      '{name} is asleep, stretched across the warmest spot.',
      '{name} took the warm spot and fell asleep in it.',
    ],
    rainy: [
      '{name} watched one drop hit the glass, then left.',
      '{name} moved away from the window when the rain started.',
      '{name} is sitting facing away from the window.',
      '{name} is giving the rain a long look.',
    ],
    restDay: [
      '{name} is asleep on the resting pot.',
      '{name} has had the same spot all day and isn’t moving.',
      '{name} got onto the resting pot first.',
      '{name} is lying on the dry rim of the resting pot.',
    ],
    perfectDay: [
      '{name} checked every pot, then sat down in the middle.',
      '{name} stepped in a damp saucer and shook one foot.',
      '{name} lay down in the middle of the fully watered sill.',
      '{name} is sitting on the one dry rim left.',
    ],
    welcomeHome: [
      '{name} came over, in no hurry.',
      '{name} looked over, then back at the window.',
      '{name} has the warm spot and is not giving it up.',
      '{name} let you say hello, after a while.',
    ],
    fed: [
      '{name} had the {treat}, then sat with the back to the dish.',
      '{name} looked at the {treat} for a long time first.',
      '{name} left exactly half of the {treat}, as a statement.',
      '{name} turned away from you to have the {treat}.',
    ],
    fedFavourite: [
      '{name} came over for the {treat} faster than usual.',
      '{name} finished the {treat} and waited to see if there was more.',
      '{name} was at the dish before the {treat} came out.',
      '{name} came over quickly for the {treat}, then sat down and looked away.',
    ],
    newWear: [
      '{name} tried to get the {wear} off, gave up, and sat down.',
      '{name} held still for the {wear}, then walked off.',
      '{name} is wearing the {wear} and ignoring the whole thing.',
      '{name} has the {wear} on, a little crooked.',
    ],
    resident: [
      '{name} won’t move out of {plant} for the watering can.',
      '{name} sleeps in the exact middle of {plant}.',
      '{name} lets you water {plant}.',
      '{name} doesn’t let anyone else into {plant}.',
    ],
    newArrival: [
      '{name} picked the best pot and moved in.',
      '{name} walked the length of the sill and didn’t hurry.',
      '{name} sat down in the middle of the sill and stayed there.',
      '{name} had a look round and took the warmest pot.',
    ],
  },

  gentle: {
    checkin: [
      '{name} watched the water go in without moving.',
      '{name} moved aside to make room for the glass.',
      '{name} stayed by {plant} while the water soaked in.',
      '{name} leaned in, then settled.',
    ],
    morning: [
      '{name} is sitting in the first light.',
      '{name} is up, quietly, with the plants.',
      '{name} is watching the street lamps go off.',
      '{name} is going from pot to pot, slowly.',
    ],
    afternoon: [
      '{name} is lying at the edge of the beam, leaving the middle free.',
      '{name} is lying in the beam beside the smallest pot.',
      '{name} is watching the shadows of the leaves.',
      '{name} is resting in the warm, very still.',
    ],
    evening: [
      '{name} is lying close to the lamp.',
      '{name} is sitting in the lamplight, facing you.',
      '{name} settled in at the front of the sill, nearest you.',
      '{name} is watching the lit windows across the street.',
    ],
    night: [
      '{name} is asleep against the warm side of the coin jar.',
      '{name} fell asleep beside the smallest pot.',
      '{name} is asleep with a leaf for a pillow.',
      '{name} is asleep by the pots.',
    ],
    rainy: [
      '{name} is sitting close to the glass while it rains.',
      '{name} is watching the rain, eyes half shut.',
      '{name} likes the rain on the glass.',
      '{name} moved nearer the smallest pot when the rain came.',
    ],
    restDay: [
      '{name} is keeping the resting pot company.',
      '{name} is asleep with one foot against the resting pot.',
      '{name} has been sitting still since the moon went on the pot.',
      '{name} is lying against the resting pot, eyes closed.',
    ],
    perfectDay: [
      '{name} is sitting between the damp pots, very still.',
      '{name} looked at each pot, then settled.',
      '{name} lay down beside the smallest pot.',
      '{name} went and sat by each plant in turn.',
    ],
    welcomeHome: [
      '{name} came over to the front of the sill and sat down.',
      '{name} leaned in, just for a moment.',
      '{name} is right here.',
      '{name} shifted over, then settled again.',
    ],
    fed: [
      '{name} had the {treat} slowly.',
      '{name} took a long time over the {treat}.',
      '{name} took the {treat} gently.',
      '{name} finished the {treat} and settled down at the front of the sill.',
    ],
    fedFavourite: [
      '{name} had the {treat} with eyes closed.',
      '{name} leaned in close after the {treat}.',
      '{name} took the {treat} and stayed close.',
      '{name} had the {treat} as slowly as possible.',
    ],
    newWear: [
      '{name} held still while you put the {wear} on.',
      '{name} is wearing the {wear} carefully.',
      '{name} is wearing the {wear} and hasn’t fussed once.',
      '{name} kept the {wear} on and settled down.',
    ],
    resident: [
      '{name} sits with {plant} most of the day.',
      '{name} stays by {plant} through every watering.',
      '{name} moves over for each new leaf on {plant}.',
      '{name} settles by {plant} whenever you water.',
      potted('{name} lies at the foot of {plant}’s pot.'),
    ],
    newArrival: [
      '{name} settled in straight away.',
      '{name} sat down next to the smallest pot.',
      '{name} is getting to know each plant, slowly.',
      '{name} found a quiet spot and is watching the light.',
    ],
  },

  foodie: {
    checkin: [
      '{name} checked whether the water was for drinking.',
      '{name} watched the glass in case it was milk.',
      '{name} leaned into the glass, just in case.',
      '{name} came over, saw it was only water, and left.',
    ],
    morning: [
      '{name} is up and waiting by the pantry.',
      '{name} has been sitting by the dish since first light.',
      '{name} knows the pantry restocks in the morning.',
      '{name} is watching the basket, ready.',
    ],
    afternoon: [
      '{name} is asleep by the pantry, just in case.',
      '{name} is in the sunbeam, facing the treats.',
      '{name} heard a lid somewhere and looked up.',
      '{name} has been checking the basket every hour.',
    ],
    evening: [
      '{name} is waiting by the dish for supper.',
      '{name} heard the cupboard and is on the way.',
      '{name} is under the lamp, next to the biscuit tin.',
      '{name} is sitting by the dish, facing the cupboard.',
    ],
    night: [
      '{name} is asleep next to the empty dish.',
      '{name} is asleep with the dish in sight.',
      '{name} fell asleep facing the pantry.',
      '{name} is asleep with a crumb nearby.',
    ],
    rainy: [
      '{name} came away from the window to check the dish.',
      '{name} is watching the rain from beside the biscuit tin.',
      '{name} is sitting near the treats, listening to the rain.',
      '{name} watched a drop run down the glass, then looked at the dish.',
    ],
    restDay: [
      '{name} is asleep by the pantry.',
      '{name} got up once, checked the dish, and lay down again.',
      '{name} is lying where the dish can be seen.',
      '{name} is sitting by the pantry door.',
    ],
    perfectDay: [
      '{name} came over at the sound of the watering can, hoping it was the treat tin.',
      '{name} sat down by the dish the moment the last pot was watered.',
      '{name} is sitting by the dish with both eyes on you.',
      '{name} heard the coins go in the jar and came over, hopeful.',
    ],
    welcomeHome: [
      '{name} came over, in case there were treats.',
      '{name} is sitting by the dish.',
      '{name} looked at you, then at the pantry.',
      '{name} came straight over, checking the dish on the way.',
    ],
    fed: [
      '{name} finished the {treat} and checked for more.',
      '{name} had the {treat} before the dish was all the way down.',
      '{name} had the {treat} and is looking at the pantry.',
      '{name} finished the {treat} and stayed to inspect the empty dish.',
    ],
    fedFavourite: [
      '{name} had the {treat} with total concentration.',
      '{name} knew it was the {treat} from across the sill.',
      '{name} is still sitting by the empty dish.',
      '{name} had the {treat} and sat still afterwards, eyes shut.',
    ],
    newWear: [
      '{name} checked the {wear} for crumbs.',
      '{name} tried a bite of the {wear} first.',
      '{name} is wearing the {wear} and sitting by the dish.',
      '{name} wore the {wear} straight to the pantry.',
    ],
    resident: [
      '{name} keeps an eye on the pantry from {plant}.',
      '{name} naps in {plant}, close to the treats.',
      '{name} waits in {plant} for the morning restock.',
      '{name} looks up from {plant} at any rustle.',
      potted('{name} keeps a crumb or two in {plant}’s pot.'),
    ],
    newArrival: [
      '{name} found the pantry first.',
      '{name} is already sitting by the dish.',
      '{name} knows where the treats are, somehow.',
      '{name} checked the dish before anything else.',
    ],
  },

  dramatic: {
    checkin: [
      '{name} watched the whole watering without blinking.',
      '{name} leapt back from the water, then came to watch.',
      '{name} stood up as tall as possible to watch.',
      '{name} lay down flat as soon as the water started.',
      potted('{name} lay down across {plant}’s pot, right where the water goes.'),
    ],
    morning: [
      '{name} did a lap of the sill as soon as it got light.',
      '{name} stretched, then stretched again, longer.',
      '{name} is sitting bolt upright in the first light.',
      '{name} is lying across the middle of the sill.',
    ],
    afternoon: [
      '{name} is draped across the sunbeam.',
      '{name} keeps getting up and lying down again, a little further along the beam.',
      '{name} lay down across the whole beam.',
      '{name} is spread flat in the beam, as long as possible.',
    ],
    evening: [
      '{name} is lying in the brightest bit, right under the lamp.',
      '{name} lay down in the lamplight, then moved, then lay down again.',
      '{name} took a long time getting comfortable.',
      '{name} turned round and round before lying down.',
    ],
    night: [
      '{name} is asleep with one leg stuck straight out.',
      '{name} fell asleep halfway through lying down.',
      '{name} is asleep, sprawled across more room than seems possible.',
      '{name} is asleep right across the middle of the sill.',
      only(['cat', 'dog', 'bunny', 'bear', 'hamster'], '{name} is asleep belly up, feet in the air.'),
    ],
    rainy: [
      '{name} lay down in front of the window and hasn’t moved.',
      '{name} is pressed flat against the glass, watching the rain.',
      '{name} jumped back from the window at the first loud drop.',
      '{name} is lying across the sill, facing away from the rain.',
    ],
    restDay: [
      '{name} is asleep in the middle of the sill.',
      '{name} is stretched out right in front of the resting pot.',
      '{name} is lying on the resting pot, one leg hanging over the rim.',
      '{name} lay down, got up, and lay down again, nearer the resting pot.',
    ],
    perfectDay: [
      '{name} lay down across two damp pots at once.',
      '{name} watched the last watering from the top of the tallest pot.',
      '{name} stood up tall for the last watering.',
      '{name} walked the whole row of pots, slowly, stopping at each one.',
    ],
    welcomeHome: [
      '{name} came over and dropped flat on the sill.',
      '{name} came over and lay down right in front of you.',
      '{name} did a lap of the sill and back.',
      '{name} is doing a long stretch.',
    ],
    fed: [
      '{name} walked away from the {treat}, then came back.',
      '{name} had the {treat} and lay down flat.',
      '{name} looked at the {treat} for a long moment first.',
      '{name} went round the {treat} twice before having any.',
    ],
    fedFavourite: [
      '{name} stood up the moment the {treat} came out.',
      '{name} finished the {treat} and lay down on the empty dish.',
      '{name} went round in a circle when the {treat} came out.',
      '{name} had the {treat} and stayed right by the dish afterwards.',
    ],
    newWear: [
      '{name} is walking in the {wear} with high, careful steps.',
      '{name} walked backwards in the {wear} for a bit, then forgot about the whole thing.',
      '{name} lay down flat in the {wear} and wouldn’t move.',
      '{name} froze in the {wear}, then shook once and carried on.',
    ],
    resident: [
      '{name} lies across the top of {plant}, in the way of the watering can.',
      '{name} climbs out of {plant} every time you water, and lies down in front.',
      '{name} flattens a different part of {plant} every afternoon.',
      '{name} sleeps sprawled across the whole of {plant}.',
      potted('{name} sleeps in {plant} with one leg hanging over the rim.'),
    ],
    newArrival: [
      '{name} did two laps of the sill straight away.',
      '{name} is surveying the sill from the tallest pot.',
      '{name} lay down in the middle of the sill.',
      '{name} has knocked a leaf off the sill already.',
    ],
  },

  sunny: {
    checkin: [
      '{name} is watching the water catch the light.',
      '{name} is watching the drops shine on {plant}’s leaves.',
      '{name} didn’t leave the warm spot, even for the watering.',
      '{name} watched the light in the glass as it emptied.',
    ],
    morning: [
      '{name} is waiting at the window for the sun to come round.',
      '{name} is in the first square of sun.',
      '{name} woke up with the light.',
      '{name} is watching the sky get brighter.',
    ],
    afternoon: [
      '{name} is exactly in the middle of the sunbeam.',
      '{name} turned to face the sun and stayed like that.',
      '{name} is warm to the touch, from the sun.',
      '{name} is basking, eyes shut.',
      atLevel(5, '{name} has followed the sun from one end of the sill to the other.'),
    ],
    evening: [
      '{name} is sitting where the afternoon sun was, in case it comes back.',
      '{name} moved into the lamplight, the next best thing.',
      '{name} is under the lamp, warming one side, then the other.',
      '{name} is as close to the lamp as the lamp allows.',
    ],
    night: [
      '{name} is asleep, facing the window for the morning.',
      '{name} fell asleep under the lamp, as close as possible.',
      '{name} is asleep in the warmest place left.',
      '{name} is asleep in the patch of moonlight on the sill.',
    ],
    rainy: [
      '{name} is waiting for the sun to come out.',
      '{name} is sitting where the sun would be.',
      '{name} is under the lamp until the rain stops.',
      '{name} is watching for a break in the clouds.',
    ],
    restDay: [
      '{name} is in the warmest spot, and staying.',
      '{name} is lying where the radiator warms the sill.',
      '{name} is lying next to the resting pot, facing the window.',
      '{name} is resting in the warm spot by the window.',
    ],
    perfectDay: [
      '{name} is stretched out along the row of damp pots.',
      '{name} is lying in the light, and so is the whole sill.',
      '{name} moved to the warmest pot and lay down.',
      '{name} turned to face the window and settled.',
    ],
    welcomeHome: [
      '{name} is asleep on the warm pot, face to the window.',
      '{name} looked up from the warm spot by the window.',
      '{name} is sitting in the warm patch by the window.',
      '{name} is facing the window, eyes half shut.',
    ],
    fed: [
      '{name} had the {treat} by the window.',
      '{name} had the {treat} and lay back down, facing out.',
      '{name} is having the {treat} in the warmest spot.',
      '{name} finished the {treat}, then went back to the warm spot.',
    ],
    fedFavourite: [
      '{name} had the {treat} by the window, eyes half shut.',
      '{name} had the {treat} and lay down in the brightest spot.',
      '{name} is stretched out, full of the {treat}.',
      '{name} finished the {treat} and turned back to the window.',
    ],
    newWear: [
      '{name} sat in the brightest spot in the {wear}.',
      '{name} went straight to the window in the {wear}.',
      '{name} is warm in the {wear}.',
      '{name} lay down in the warm spot, still wearing the {wear}.',
    ],
    resident: [
      '{name} likes {plant} best of all the pots.',
      '{name} moves round {plant} to the warmest side.',
      '{name} lies in {plant}’s patch of light.',
      '{name} sleeps on the window side of {plant}.',
      potted('{name} lies on the rim of {plant}’s pot.'),
    ],
    newArrival: [
      '{name} found the warmest spot in under a minute.',
      '{name} is working out which pot is warmest.',
      '{name} went straight to the window.',
      '{name} is lying by the window, already at home.',
    ],
  },

  dreamy: {
    checkin: [
      '{name} is watching the last drop hang off the glass.',
      '{name} noticed the watering a little late.',
      '{name} is watching the ripples in the glass.',
      '{name} looked round at the watering, then back at the window.',
    ],
    morning: [
      '{name} woke up and hasn’t moved since.',
      '{name} is watching the mist on the window.',
      '{name} is watching the light come in over the sill.',
      '{name} woke up and is watching the sky change colour.',
    ],
    afternoon: [
      '{name} is following a cloud across the window.',
      '{name} is lying in the beam, watching the shadows of the leaves.',
      '{name} is gazing at the sky through the top of the window.',
      '{name} is lying in the sun, looking at nothing.',
    ],
    evening: [
      '{name} is watching the lights come on across the street.',
      '{name} is watching the lamplight in the window glass.',
      '{name} is gazing at the dark window, where the room is reflected.',
      '{name} is watching a moth circle the lamp.',
    ],
    night: [
      '{name} is asleep and dreaming, by the look of it.',
      '{name} fell asleep looking at the moon.',
      '{name} is asleep against the cold glass.',
      '{name} is asleep with one foot twitching.',
    ],
    rainy: [
      '{name} is watching raindrops race down the glass.',
      '{name} is listening to the rain, eyes closed.',
      '{name} is watching the street go shiny in the rain.',
      '{name} is watching the puddle on the ledge fill up.',
    ],
    restDay: [
      '{name} has been looking out of the window for hours.',
      '{name} is spending the rest day watching the clouds.',
      '{name} is resting and gazing at the sky.',
      '{name} likes a slow day like this.',
    ],
    perfectDay: [
      '{name} is watching a drip run down a leaf.',
      '{name} noticed the damp soil, eventually.',
      '{name} is watching the light on all the wet leaves.',
      '{name} is lying still, watching the soil darken.',
    ],
    welcomeHome: [
      '{name} looked up slowly, and blinked.',
      '{name} looked away from the window for a moment.',
      '{name} drifted over.',
      '{name} is gazing out of the window.',
    ],
    fed: [
      '{name} had the {treat} without looking away from the window.',
      '{name} forgot about the {treat} halfway, then remembered.',
      '{name} had the {treat} slowly, watching the window.',
      '{name} finished the {treat} and went back to the clouds.',
    ],
    fedFavourite: [
      '{name} turned away from the window for the {treat}.',
      '{name} had the {treat} slowly, eyes closed.',
      '{name} fell asleep straight after the {treat}.',
      '{name} paid full attention to the {treat}, for once.',
    ],
    newWear: [
      '{name} hasn’t noticed it yet.',
      '{name} noticed the {wear} after a while.',
      '{name} is wearing the {wear} and gazing at the window reflection.',
      '{name} forgot about the {wear} within a minute.',
    ],
    resident: [
      '{name} watches the sky from {plant}.',
      '{name} naps in {plant}, facing out.',
      '{name} lies under {plant}, watching the leaves move.',
      '{name} lies where {plant}’s leaves hang lowest.',
    ],
    newArrival: [
      '{name} is watching the new window, taking it all in.',
      '{name} found a view and is keeping it.',
      '{name} hasn’t quite noticed the move yet.',
      '{name} is gazing at the sky from the new sill.',
    ],
  },
};

/**
 * Lines any personality may get, mixed in at half the weight of its own. Each context has
 * species-neutral lines plus a true behaviour per species. The signature ones (a slow blink for
 * cats, a cud-chew for cows, a throat puff for frogs, a nose twitch for rabbits, cheek-stuffing for
 * hamsters, a tail wag for dogs, a wing stretch for ducks, sitting up for bears) turn up in about
 * half the contexts; the rest are other real things those animals do.
 */
export const SHARED_CAPTIONS: Readonly<Record<LineContext, readonly Line[]>> = {
  tap: [
    '{name} looked up.',
    '{name} did a small hop and settled again.',
    '{name} looked round at you.',
    atLevel(3, only('cat', '{name} gave you a slow blink.')),
    only('cat', '{name} kneaded a fold of the curtain, eyes shut.'),
    only('cow', '{name} is chewing the cud, eyes half shut.'),
    only('frog', '{name}’s throat puffed out, twice.'),
    only('bunny', '{name}’s nose is twitching at full speed.'),
    only('hamster', '{name} has both cheeks full of something.'),
    only('dog', '{name} wagged, the whole back half.'),
    only('dog', '{name} did a head tilt at you.'),
    only('duck', '{name} stretched one wing out, then folded it away.'),
    only('bear', '{name} sat up to see better.'),
  ],
  checkin: [
    atLevel(2, '{name} looked up at the sound of the water.'),
    '{name} watched the glass tip.',
    '{name} moved a little closer to {plant}.',
    only('cat', '{name} gave the watering a slow blink.'),
    only('cow', '{name} kept chewing the cud through the watering.'),
    only('frog', '{name} gave a throat puff at the splash.'),
    only('bunny', '{name}’s nose twitched at the wet leaves.'),
    only('hamster', '{name} watched from the edge of the sill, cheeks full.'),
    only('dog', '{name} wagged at the water.'),
    only('duck', '{name} stretched a wing towards the water.'),
    only('bear', '{name} sat up to watch the water go in.'),
  ],
  morning: [
    '{name} is up with the light.',
    '{name} is watching the morning come in over the roofs.',
    only(['cat', 'dog', 'bunny', 'hamster'], '{name} stretched, front half first, then the back.'),
    only('cat', '{name} is having a morning wash.'),
    only('cow', '{name} gave one small, high moo at the morning.'),
    only('frog', '{name}’s throat is going in and out in the cool air.'),
    only('bunny', '{name} is doing morning laps, nose twitching.'),
    only('hamster', '{name} is packing the bedding into a corner for the day.'),
    only('dog', '{name} is wagging at the morning.'),
    only('duck', '{name} is preening, one feather at a time.'),
    only('bear', '{name} sat up and looked at the morning.'),
  ],
  afternoon: [
    '{name} is in the sunbeam.',
    '{name} is warm, and hasn’t moved in a while.',
    atLevel(5, '{name} moved along the sill with the light.'),
    only('cat', '{name} is loafing in the beam.'),
    only('cow', '{name} is lying in the sun, flicking a tail at nothing.'),
    only('frog', '{name} is sitting in the sun, throat pulsing.'),
    only('bunny', '{name} flopped over sideways in the sun.'),
    only('hamster', '{name} is asleep in a tight ball in the warm.'),
    only('dog', '{name} is asleep in the beam, tail thumping now and then.'),
    only('duck', '{name} is sunning one wing, stretched right out.'),
    only('bear', '{name} rolled onto one side and is holding both feet.'),
  ],
  evening: [
    '{name} is under the lamp.',
    '{name} is settling down for the evening.',
    '{name} moved into the lamplight.',
    only('cat', '{name} slow-blinked at the lamp.'),
    only('cow', '{name} is lying under the lamp, chewing the cud.'),
    only('frog', '{name} is under the lamp, where the moths go.'),
    only('bunny', '{name} is doing laps now the lamp’s on.'),
    only('hamster', '{name} is waking up for the evening, cheeks empty for now.'),
    only('dog', '{name} wagged once when the lamp came on.'),
    only('duck', '{name} gave a last wing stretch before settling.'),
    only('bear', '{name} is sitting up under the lamp.'),
  ],
  night: [
    '{name} is asleep.',
    '{name} is asleep, breathing slowly.',
    '{name} is fast asleep by the pots.',
    only('cat', '{name} woke, gave a slow blink, and slept again.'),
    only('cow', '{name} is asleep, folded up, still chewing the cud now and then.'),
    only('frog', '{name} is asleep, throat barely moving.'),
    only('bunny', '{name} is asleep, nose still twitching.'),
    only('hamster', '{name} is awake, actually, and filling both cheeks.'),
    only('dog', '{name} is asleep, feet paddling after something.'),
    only('duck', '{name} is asleep, head tucked under one wing.'),
    only('bear', '{name} fell asleep sitting up and slowly tipped over.'),
  ],
  rainy: [
    '{name} is watching the rain.',
    '{name} is listening to the rain on the glass.',
    '{name} is sitting close to the window in the rain.',
    only('cat', '{name} is chattering at a pigeon sheltering on the ledge.'),
    only('cow', '{name} is chewing the cud, watching the rain.'),
    only('frog', '{name} gave a double croak at the rain.'),
    only('bunny', '{name}’s nose is twitching at the smell of rain.'),
    only('hamster', '{name} is filling both cheeks and listening to the rain.'),
    only('dog', '{name} is at the glass, tail going, watching the rain.'),
    only('duck', '{name} shook out both wings at the sound of the rain.'),
    only('bear', '{name} sat up to watch the rain.'),
  ],
  restDay: [
    '{name} is resting too.',
    '{name} is lying by the resting pot.',
    '{name} is having a slow day.',
    only('cat', '{name} gave the resting pot a slow blink.'),
    only('cow', '{name} is lying down and chewing the cud, which is resting, for a cow.'),
    only('frog', '{name} is sitting very still, throat going in and out.'),
    only('bunny', '{name} flopped over sideways by the resting pot.'),
    only('hamster', '{name} is asleep in the bedding, cheeks full.'),
    only('dog', '{name} is resting, tail giving a slow wag now and then.'),
    only('duck', '{name} is standing on one leg, the other tucked up.'),
    only('bear', '{name} is sitting up against the resting pot.'),
  ],
  perfectDay: [
    '{name} looked along the whole watered sill.',
    '{name} walked the length of the sill, past every damp pot.',
    '{name} settled down on a fully watered sill.',
    only('cat', '{name} slow-blinked at the whole sill.'),
    only('cow', '{name} is chewing the cud beside the damp pots.'),
    only('frog', '{name} is sitting in a full saucer, throat going.'),
    only('bunny', '{name} did a binky: a jump with a twist in the middle.'),
    only('hamster', '{name} is digging in the damp soil, cheeks full.'),
    only('dog', '{name} is wagging at every pot.'),
    only('duck', '{name} is dabbling in the fullest saucer.'),
    only('bear', '{name} sat up to see the whole sill.'),
  ],
  welcomeHome: [
    '{name} looked up.',
    '{name} is on the warm pot.',
    '{name} is on the sill, in the middle of a stretch.',
    atLevel(3, only('cat', '{name} gave you a long slow blink.')),
    only('cat', '{name} is washing one front paw.'),
    only('cow', '{name} gave one small, high moo.'),
    only('frog', '{name}’s throat puffed out.'),
    only('bunny', '{name}’s nose started twitching.'),
    only('hamster', '{name} came over with full cheeks.'),
    only('dog', '{name} is wagging, the whole back half.'),
    only('duck', '{name} stretched both wings and waddled over.'),
    only('bear', '{name} sat up.'),
  ],
  fed: [
    '{name} had the {treat}.',
    '{name} finished the {treat} and sat back.',
    '{name} took the {treat} politely.',
    only('cat', '{name} had the {treat}, then washed the whole face.'),
    only('cow', '{name} had the {treat}, then went back to chewing the cud.'),
    only('frog', '{name} had the {treat} and blinked hard to swallow.'),
    only('bunny', '{name} had the {treat}, nose going the whole time.'),
    only('hamster', '{name} had the {treat}, then checked both cheeks.'),
    only('dog', '{name} had the {treat} and wagged.'),
    only('duck', '{name} had the {treat}, then dabbled in the water dish.'),
    only('bear', '{name} sat up to have the {treat}.'),
  ],
  fedFavourite: [
    '{name} knows which treat is the good one now: the {treat}.',
    '{name} finished every bit of the {treat}.',
    '{name} finished the {treat} and lay down right there.',
    only('cat', '{name} slow-blinked over the {treat}.'),
    only('cow', '{name} had the {treat} and did a nose-lick.'),
    only('frog', '{name} puffed right up for the {treat}.'),
    only('bunny', '{name} did a binky for the {treat}.'),
    only('hamster', '{name} had the {treat} sitting up, cheeks going.'),
    only('dog', '{name} wagged all the way through the {treat}.'),
    only('duck', '{name} stretched both wings wide for the {treat}.'),
    only('bear', '{name} sat up and held the {treat} in both paws.'),
  ],
  newWear: [
    '{name} has the {wear} on, and hasn’t fussed.',
    '{name} looks well in the {wear}.',
    '{name} kept the {wear} on.',
    only('cat', '{name} gave the {wear} a slow blink.'),
    only('cow', '{name} went on chewing the cud in the {wear}.'),
    only('frog', '{name} puffed out once and went on sitting.'),
    only('bunny', '{name}’s nose twitched at the {wear}, then settled.'),
    only('hamster', '{name} tried to pouch the {wear} first.'),
    only('dog', '{name} wagged in the {wear}.'),
    only('duck', '{name} shook the feathers out and settled in the {wear}.'),
    only('bear', '{name} sat up and looked down at the {wear}.'),
  ],
  resident: [
    '{name} keeps {plant} company.',
    '{name} lives in {plant} now.',
    '{name} is in {plant}, as usual.',
    '{name} is asleep beside {plant}.',
    only('cat', '{name} slow-blinks from {plant} when you water.'),
    only('cow', '{name} chews the cud beside {plant}.'),
    potted(only('frog', '{name} sits in {plant}’s saucer, throat going.')),
    only('frog', '{name} sits among {plant}’s leaves, throat going.'),
    only('bunny', '{name} sits by {plant}, nose twitching at every new leaf.'),
    only('hamster', '{name} fills both cheeks and naps in {plant}.'),
    only('dog', '{name} lies by {plant} and wags when you water.'),
    only('duck', '{name} stretches a wing in {plant} every morning.'),
    only('bear', '{name} sits up in {plant} to watch you water.'),
  ],
  newArrival: [
    '{name} is looking round the new sill.',
    '{name} is getting to know the place.',
    '{name} has found a first favourite spot.',
    only('cat', '{name} found the one empty pot and got in.'),
    only('cow', '{name} lay down and started chewing the cud, which means settled.'),
    only('frog', '{name} found the damp soil and puffed out.'),
    only('bunny', '{name} is checking every pot, nose twitching.'),
    only('hamster', '{name} is filling both cheeks from the treat dish.'),
    only('dog', '{name} did a play bow at the nearest pot.'),
    only('duck', '{name} stretched both wings, then waddled the length of the sill.'),
    only('bear', '{name} sat up to take it all in.'),
  ],
};

/** The full matrix: every personality × every context (tap lines come from the personality). */
export const CAPTIONS: Readonly<Record<Personality, Readonly<Record<LineContext, readonly Line[]>>>> = (() => {
  const matrix = {} as Record<Personality, Record<LineContext, readonly Line[]>>;
  for (const p of PERSONALITIES) matrix[p.id] = { tap: p.lines, ...OWN[p.id] };
  return matrix;
})();

/* ------------------------------------------------------------------------ */
/* Choosing and filling a line                                               */
/* ------------------------------------------------------------------------ */

/** A context never repeats any of its last 5 lines. */
export const RECENT_WINDOW = 5;
/** A personality's own lines are twice as likely as the shared ones. */
const OWN_WEIGHT = 2;

interface Weighted {
  text: string;
  weight: number;
}

/** Integer hash so neighbouring seeds land far apart. Accepts counters or Math.random(). */
function mix(seed: number): number {
  let h = (Number.isInteger(seed) ? seed : Math.floor(seed * 0x100000000)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function pickWeighted(pool: readonly Weighted[], seed: number, recent: readonly string[]): string {
  if (pool.length === 0) return '';
  const avoid = new Set(recent.slice(-RECENT_WINDOW));
  let fresh = pool.filter((l) => !avoid.has(l.text));
  if (fresh.length === 0) {
    // Fewer lines than the window: say whichever was said longest ago.
    const oldest = Math.min(...pool.map((l) => recent.lastIndexOf(l.text)));
    fresh = pool.filter((l) => recent.lastIndexOf(l.text) === oldest);
  }
  const total = fresh.reduce((n, l) => n + l.weight, 0);
  let r = mix(seed) % total;
  for (const l of fresh) {
    r -= l.weight;
    if (r < 0) return l.text;
  }
  return fresh[fresh.length - 1]!.text;
}

const poolCache = new Map<string, readonly Weighted[]>();

function captionPool(context: LineContext, personality: Personality, species: Species, situation: Situation): readonly Weighted[] {
  const key = `${context}|${personality}|${species}|${situation.stage ?? 0}|${situation.level ?? 1}|${situation.night ? 1 : 0}`;
  const cached = poolCache.get(key);
  if (cached) return cached;
  const pool = new Map<string, number>();
  const add = (lines: readonly Line[], weight: number) => {
    for (const line of lines) if (fits(line, species, situation) && !pool.has(lineText(line))) pool.set(lineText(line), weight);
  };
  add(CAPTIONS[personality][context], OWN_WEIGHT);
  add(SHARED_CAPTIONS[context], 1);
  const out = [...pool].map(([text, weight]) => ({ text, weight }));
  poolCache.set(key, out);
  return out;
}

/** Every line a pet of this personality and species may get in a context, in this situation. */
export function linesFor(context: LineContext, personality: Personality, species: Species, situation: Situation = {}): string[] {
  return captionPool(context, personality, species, situation).map((l) => l.text);
}

/**
 * Picks a caption template for a pet. `recent` is this context's recent picks (the returned
 * templates, oldest first); none of the last 5 comes back while there's another choice. `seed`
 * is any number: a counter, a hash of the day, or Math.random(). `situation` carries the plant's
 * stage (for checkin and resident) and the pet's friendship level; left out, only the lines that
 * are true at the start (a cutting, level 1) are used. Fill the result with `fillLine`.
 */
export function pickLine(
  context: LineContext,
  personality: Personality,
  species: Species,
  seed: number,
  recent: readonly string[] = [],
  situation: Situation = {},
): string {
  return pickWeighted(captionPool(context, personality, species, situation), seed, recent);
}

/** The same rule for any other list of lines (asides, Known for, greetings). */
export function pickFrom(lines: readonly Line[], species: Species, seed: number, recent: readonly string[] = [], situation: Situation = {}): string {
  const texts = new Set(lines.filter((line) => fits(line, species, situation)).map(lineText));
  return pickWeighted([...texts].map((text) => ({ text, weight: 1 })), seed, recent);
}

/** Fills {slots}. An empty value also drops the ", " before it ("Morning, {userName}." → "Morning."). */
export function fillLine(template: string, slots: Readonly<Record<string, string | number>>): string {
  let out = template;
  for (const [key, value] of Object.entries(slots)) {
    const text = String(value);
    if (text === '') out = out.split(`, {${key}}`).join('');
    out = out.split(`{${key}}`).join(text);
  }
  return out;
}

/** "Walk" → "Walk", "the pothos" → "The pothos": for a {Plant} or {Count} slot that opens a sentence. */
export const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Each plant's everyday name, for when the habit's own name won't read as a label. */
export const PLANT_COMMON_NAMES: Readonly<Record<PlantSpeciesId, string>> = {
  pothos: 'pothos',
  pilea: 'money plant',
  begonia: 'begonia',
  snakeplant: 'snake plant',
  catgrass: 'cat grass',
  monstera: 'monstera',
  strawberry: 'strawberry plant',
  lavender: 'lavender',
  catnip: 'catnip',
  hoya: 'hoya',
  orchid: 'orchid',
  calathea: 'prayer plant',
  violet: 'African violet',
  tulip: 'tulip',
  xmascactus: 'Christmas cactus',
  sunflower: 'sunflower',
};

/**
 * The {plant} slot. A short habit name reads as a label ("the Read plant", "the Drink water
 * plant"). A long one, one with a number, or one that starts with "The" reads like a form field
 * ("the Tidy for 10 minutes plant", "the The real plants plant"), so those use the plant's own name
 * ("the snake plant", "the pothos"). Capitalise it for {Plant}.
 */
export function plantPhrase(habitName: string, plant: PlantSpeciesId): string {
  const name = habitName.trim();
  const words = name.split(/\s+/);
  const readsAsLabel = words.length <= 2 && !/\d/.test(name) && !/^the\b/i.test(name);
  return readsAsLabel ? `the ${name} plant` : `the ${PLANT_COMMON_NAMES[plant]}`;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/**
 * A count at the start of a sentence is spelled out ("Nineteen waterings."); everywhere else
 * catkin uses numerals. Spells 1–99, and falls back to numerals ("1,204") outside that range.
 */
export function numberWord(n: number, capital = false): string {
  let word: string;
  if (!Number.isInteger(n) || n < 1 || n > 99) word = n.toLocaleString('en-GB');
  else if (n < 20) word = ONES[n]!;
  else word = TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : '');
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** Names that take no article: mass nouns ("Barley Tea"). */
const NO_ARTICLE = new Set([
  'Barley Tea', 'Cat Grass', 'Catnip', 'Fresh Clover', 'Frozen Yoghurt', 'Gingerbread', 'Honey Toast', 'Lavender',
  'Lavender Shortbread', 'Pumpkin Purée', 'Strawberry Milk', 'Warm Oats', 'Watermelon',
]);
/**
 * Plural names in the catalog, listed rather than guessed from a final s: "Christmas Cactus",
 * "Cavalier King Charles" and "Golden Pothos" are singular.
 */
const PLURAL = new Set([
  'Blueberries', 'Fish Crackers', 'Salmon Flakes', 'Sunflower Seeds', 'Stepping Stones', 'Stacked Pots', 'Starry Pajamas',
  'Earmuffs', 'Heart Sunglasses',
]);

/** "a Belted Galloway", "an Orange Tabby", "Blueberries", "The Window Seat". Capitalised with `capital`. */
export function withArticle(name: string, capital = false): string {
  if (name.startsWith('The ') || NO_ARTICLE.has(name) || PLURAL.has(name)) return name;
  const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
  return `${capital ? article.charAt(0).toUpperCase() + article.slice(1) : article} ${name}`;
}

/* ------------------------------------------------------------------------ */
/* Check-in toasts and their asides                                          */
/* ------------------------------------------------------------------------ */

/**
 * The toast after a check-in (DESIGN §9.1). Slots: {habit}, {coins}, {count}, {target}, {unit},
 * {date}. The aside, when there is one, follows after " · ".
 */
export const CHECKIN_TOASTS = {
  watered: '{habit}, watered. +{coins}',
  /** A count habit reaching its target. */
  wateredCount: '{habit}, watered. {count} {unit}. +{coins}',
  wateredTiny: '{habit}, watered: the tiny version. +{coins}',
  /** A partial tap on a count habit: no toast, only this for screen readers. */
  progress: '{count} of {target} {unit}',
  /** Beyond the budget, or a flexible check-in past its times: the watering still counts. */
  wateredNoCoins: '{habit}, watered.',
  /** History edits outside the 6-day window (never rewarded). */
  history: '{habit}, watered for {date}. History only, no coins.',
  unchecked: '{habit}, not watered after all. The {coins} coins went back in the jar.',
  uncheckedOne: '{habit}, not watered after all. The coin went back in the jar.',
  uncheckedSpent: '{habit}, not watered after all. The coins were spent already, and stay spent.',
  uncheckedNoCoins: '{habit}, not watered after all.',
  undo: 'Undo',
  addNote: 'Add a note',
  noted: 'Noted.',
  /** DESIGN §12's rest line. "Nothing here wilts" is said here and nowhere else. */
  rest: '{habit} is resting today. Nothing here wilts.',
  restUndo: '{habit} is back on for today.',
  offDay: 'Today’s off. Every plant is resting.',
  offDayUndo: 'Today’s back on.',
  paused: '{habit} is resting until {date}.',
  pausedOpen: '{habit} is resting until you bring it back.',
  resumed: '{habit} is back on the sill.',
} as const;

/** How often a check-in toast gets an aside (about 1 in 4). */
export const ASIDE_CHANCE = 0.25;

/**
 * The toast's optional aside, from the habit's companion or whoever is nearest ("Walk, watered.
 * +5 · Pudding opened one eye."). `asleep` is for 23:00–06:00 and for pets mid-nap; pass
 * `{ night: true }` to `pickFrom` at night. Pass the pet's `level` too (looking up at the water is
 * level 2's news).
 */
export const CHECKIN_ASIDES: Readonly<{ awake: readonly Line[]; asleep: readonly Line[] }> = {
  awake: [
    atLevel(2, '{name} looked up.'),
    '{name} watched the water go in.',
    '{name} moved a little closer.',
    '{name} did a small hop.',
    '{name} stretched.',
    '{name} watched from the next pot.',
    '{name} didn’t move, but noticed.',
    only('cat', '{name} gave a slow blink.'),
    only('cat', '{name} flicked an ear.'),
    only('cow', '{name} kept chewing the cud.'),
    only('cow', '{name} did a nose-lick.'),
    only('frog', '{name}’s throat puffed out.'),
    only('bunny', '{name}’s nose twitched.'),
    only('hamster', '{name} stuffed one cheek.'),
    only('dog', '{name} wagged.'),
    only('duck', '{name} stretched a wing.'),
    only('bear', '{name} sat up.'),
  ],
  asleep: [
    '{name} opened one eye.',
    '{name} slept through it.',
    '{name} shifted, still asleep.',
    '{name} stirred, then settled.',
    only('cat', '{name} twitched an ear, asleep.'),
    only('cow', '{name} kept chewing, eyes shut.'),
    only('dog', '{name}’s tail thumped once.'),
    only('duck', '{name} stayed tucked under one wing.'),
    { text: '{name} is up anyway. Hamsters keep late hours.', species: ['hamster'], night: true },
  ],
};

/* ------------------------------------------------------------------------ */
/* Plants                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * The stage names (DESIGN §5.5), Cutting (0) to Evergreen (7). The single source: domain/growth.ts,
 * the plant art and the fx layer re-export this list.
 */
export const STAGE_NAMES = ['Cutting', 'Rooting', 'Potted', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;
export type StageName = (typeof STAGE_NAMES)[number];

/**
 * One line per stage, Cutting (0) to Evergreen (7), for the toast or banner when a plant
 * reaches it. Slot: {Plant} (`capitalise(plantPhrase(...))`). At Blooming, prefer the species'
 * own line from BLOOM_LINES; index 5 here is the fallback.
 */
export const STAGE_LINES: readonly string[] = [
  '{Plant} is a cutting in a glass of water. It roots with the first watering.',
  'White roots are showing in the glass. {Plant} is rooting.',
  '{Plant} is potted up.',
  '{Plant} has put out new leaves.',
  'There’s a bud on {plant}, still closed tight.',
  '{Plant} is Blooming.',
  '{Plant} is spilling over the rim of the pot.',
  '{Plant} is Evergreen. There’s a small brass watering can on the pot now.',
];

/**
 * The same moments in the past tense, for notes ("The Read plant was potted up on Thursday.").
 * At Blooming, prefer the species' own BLOOM_EVENTS; index 5 is the fallback.
 */
export const STAGE_EVENTS: readonly string[] = [
  'was planted as a cutting',
  'put down roots',
  'was potted up',
  'put out new leaves',
  'showed a first bud',
  'reached Blooming',
  'spilled over the rim',
  'turned Evergreen',
];

/** Habit Detail's forecast (DESIGN §9.2): counted in waterings, never a date or a deadline. Slots: {count}, {stage}. */
export const STAGE_FORECAST = {
  one: '1 more watering to {stage}.',
  other: '{count} more waterings to {stage}.',
  evergreen: 'Evergreen. Small visitors arrive from here on.',
} as const;

/** What Blooming looks like for each species: foliage plants "bloom" as their peak form (DESIGN §5.5). Slot: {Plant}. */
export const BLOOM_LINES: Readonly<Record<PlantSpeciesId, string>> = {
  pothos: '{Plant} is trailing past the edge of the sill.',
  pilea: '{Plant} has a crown of round leaves, and a small pup at the base.',
  begonia: '{Plant} has pink flowers under the spotted leaves.',
  snakeplant: '{Plant} has sent up a spike of small cream flowers, which snake plants hardly ever do.',
  catgrass: '{Plant} is thick and tall enough to lie in.',
  monstera: '{Plant} has opened a first split leaf.',
  strawberry: '{Plant} has white flowers and the first small berries.',
  lavender: '{Plant} has purple spikes, and the sill smells of lavender.',
  catnip: '{Plant} has small white flowers at the tips.',
  hoya: '{Plant} has a cluster of star-shaped flowers.',
  orchid: '{Plant} has opened the first flower on the long stem.',
  calathea: '{Plant} has a new striped leaf, and folds up every evening.',
  violet: '{Plant} has small purple flowers above the soft leaves.',
  tulip: '{Plant} has opened a single cup.',
  xmascactus: '{Plant} is flowering pink at the tips of the stems.',
  sunflower: '{Plant} has opened one flower, turned towards the window.',
};

/** Blooming in the past tense, per species, for notes and margins ("The Walk plant grew thick enough to lie in"). */
export const BLOOM_EVENTS: Readonly<Record<PlantSpeciesId, string>> = {
  pothos: 'trailed past the edge of the sill',
  pilea: 'grew a crown of round leaves',
  begonia: 'opened pink flowers',
  snakeplant: 'sent up a spike of flowers',
  catgrass: 'grew thick enough to lie in',
  monstera: 'opened a first split leaf',
  strawberry: 'flowered and set the first berries',
  lavender: 'opened purple spikes',
  catnip: 'flowered at the tips',
  hoya: 'opened a cluster of flowers',
  orchid: 'opened a first flower',
  calathea: 'put out a new striped leaf',
  violet: 'opened small purple flowers',
  tulip: 'opened a single cup',
  xmascactus: 'flowered pink at the tips',
  sunflower: 'opened one flower',
};

/** After Evergreen, every +60 sunshine brings a permanent visitor, in this order (DESIGN §5.5). Slots: {plant}, {Plant}. */
export const FLOURISH_LINES: readonly string[] = [
  'A ladybird has moved into {plant}.',
  'A bee visits {plant} now.',
  'A robin looks in at {plant} from the ledge most mornings.',
  'A butterfly stops at {plant} most afternoons.',
  'There’s a new shoot at the base of {plant}.',
  'Moss has grown round the foot of {plant}.',
  '{Plant} has grown taller than the window latch.',
  '{Plant} has a ribbon tied round the pot.',
];

/** Harvest (DESIGN §8.2): the aside on a completing check-in, one serving per plant per day. */
export const HARVEST_LINES: Readonly<Partial<Record<PlantSpeciesId, string>>> = {
  catgrass: 'A pinch of cat grass, into the basket.',
  catnip: 'A few catnip leaves, into the basket.',
  strawberry: 'One strawberry, into the basket.',
  lavender: 'Lavender for shortbread, into the basket.',
};

/* ------------------------------------------------------------------------ */
/* Capsule reveals                                                           */
/* ------------------------------------------------------------------------ */

/**
 * The line on the paper insert. Slots: {series} ("No. 02 · Cows"), {A} (the item with its
 * article, capitalised; see `withArticle`). The item's flavor text follows on its own line.
 */
export const REVEAL_LINES: Readonly<Record<Rarity, readonly string[]>> = {
  common: ['{series}. {A}.'],
  uncommon: ['{series}. {A}, one of the Specials.'],
  rare: ['{series}. {A}, one of the Rares.'],
  ultra: ['{series}. {A}, one of the Super rares.'],
};

/**
 * The Secret reveal: the one exclamation mark catkin has (DESIGN §12 allows it). Slots: {series},
 * {A}, {secretLine} (from SECRET_LINES).
 */
export const SECRET_REVEAL = '{series}, the secret one! {A}, {secretLine}';

/**
 * One observed line per series Secret, finishing the SECRET_REVEAL sentence. The flavor text
 * prints just below it, so each says something the flavor doesn't.
 */
export const SECRET_LINES: Readonly<Record<string, string>> = {
  'pet-cat-mainecoon': 'with a tail as long as the rest put together, and already asleep across two pots.',
  'pet-cow-highland': 'about the size of your thumb, who would like somewhere soft.',
  'pet-dog-samoyed': 'white all over, and already shedding a little on the sill.',
  'pet-duck-mandarin': 'asleep on one leg on the saucer’s rim, bill tucked into the back feathers.',
  'pet-bunny-angora': 'sitting in the draught from the window, fur lifting in it.',
  'pet-bear-spectacled': 'sitting up and holding both back feet, the way bear cubs do.',
  'pet-cow-nightsky': 'lying down already, with one star right on the nose.',
  'pet-cow-spice': 'already lying in the fallen leaves, chewing the cud.',
  'pet-duck-eider': 'the size of an egg cup, and asleep before the capsule was all the way open.',
  'pet-cat-birman': 'already kneading the paper insert.',
  'pet-duck-crested': 'with a crest that wobbles a moment after every nod.',
  'pet-frog-golden': 'waving one front foot, the way golden frogs do.',
};

/**
 * Duplicates (DESIGN §7.2). Slots: {A} (the item with its article, capitalised: "A Holstein",
 * "Blueberries"), {swaps}, {name} (the pet who already lives here). The friendship it earns shows
 * as dots on the Pet Card, never as a number.
 */
export const DUPLICATE_LINES = {
  item: '{A}, again. Onto the swap shelf · +{swaps} swaps',
  pet: '{A}, again. Onto the swap shelf · +{swaps} swaps · {name} came over to look.',
  /** Every 10 swaps make a stamp. Slot: {count} (stamps). */
  toStamp: 'The swap shelf is full: 10 swaps, traded for 1 stamp.',
  toStamps: 'The swap shelf filled up: {count} stamps, onto the card.',
} as const;

/**
 * Keepsakes you earn rather than open (the `exclusive` GameEvent), keyed by collectible id.
 * `fallback` takes {A}.
 */
export const EXCLUSIVE_LINES: Readonly<Record<string, string>> & { readonly fallback: string } = {
  'decor-window-seat': 'The Window Seat is yours: a cushioned seat built into the window, with the best light in the place.',
  'wear-laurel-sprig': 'A laurel sprig, from the first plant to reach Evergreen. It’s in the wardrobe now.',
  'wear-party-hat': 'A paper party hat, folded from a birthday card. It’s in the wardrobe now.',
  'decor-birthday-cake': 'A tiny cake, three layers and one candle. It’s on the Shelf now.',
  'decor-reading-chair': 'The Cats page is full. A reading chair, for the Shelf.',
  'decor-pasture-fence': 'The Cows page is full. A length of pasture fence, for the Shelf.',
  'decor-stepping-stones': 'The Pond Club page is full. Stepping stones, for the Shelf.',
  fallback: '{A}, yours to keep. It’s on the Shelf now.',
};

/* ------------------------------------------------------------------------ */
/* Friendship                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Plain names for friendship levels 1–10 and bond levels 11–15 (DESIGN §8.2), with the line that
 * announces each. Levels change behaviour, so the line says what the pet does now, and the
 * captions hold that behaviour back until the level (`minLevel`). Slots: {name}, {friend} (level 8:
 * the pet's best friend on the sill). Level 8 uses `solo` while the pet has no friend yet.
 */
export const FRIENDSHIP_LEVELS: readonly { level: number; name: string; lines: readonly Line[]; solo?: string }[] = [
  { level: 1, name: 'New here', lines: ['{name} is new here.'] },
  { level: 2, name: 'Looks up', lines: ['{name} looks up when you water now.'] },
  {
    level: 3,
    name: 'Knows you',
    lines: [
      only('cat', '{name} slow-blinks back at you now.'),
      only('cow', '{name} does a nose-lick when you say hello now.'),
      only('dog', '{name} wags when you say hello now.'),
      only('bunny', '{name} hops over when you say hello now.'),
      only('frog', '{name} stays put when you say hello now.'),
      only('duck', '{name} waddles over when you say hello now.'),
      only('bear', '{name} sits up when you say hello now.'),
      only('hamster', '{name} comes out of the bedding when you say hello now.'),
    ],
  },
  { level: 4, name: 'Has a favourite spot', lines: ['{name} has claimed a favourite spot on the sill.'] },
  { level: 5, name: 'Follows the sun', lines: ['{name} follows the sunbeam along the sill now.'] },
  { level: 6, name: 'Brings you things', lines: ['{name} leaves small things on the sill now, on days you water. A button, a leaf, a bead.'] },
  { level: 7, name: 'Naps near you', lines: ['{name} naps at the front of the sill now, nearest you.'] },
  {
    level: 8,
    name: 'Afternoon naps',
    lines: ['{name} naps next to {friend} now, most afternoons.'],
    solo: '{name} naps in the same spot every afternoon now.',
  },
  { level: 9, name: 'Waits for you', lines: ['{name} is usually waiting at the front of the sill now.'] },
  { level: 10, name: 'Best friends', lines: ['{name} is your best friend now. There’s a small brass tag to show it.'] },
  { level: 11, name: 'Settled in', lines: ['{name} has settled in for good, and falls asleep mid-stroke now.'] },
  { level: 12, name: 'Part of the furniture', lines: ['{name} is part of the furniture now, with a cushion that has a dent in it.'] },
  { level: 13, name: 'Has a routine', lines: ['{name} has a routine now: the sunbeam after lunch, the lamp after dark.'] },
  { level: 14, name: 'Knows every pot', lines: ['{name} knows every pot on the sill now, and which ones are warm.'] },
  { level: 15, name: 'Old friends', lines: ['{name} is an old friend now, and here for good.'] },
];

/** A Memory arrives on the Pet Card every so often after best friends (DESIGN §8.2). Slots: {name}, {memory}. */
export const MEMORY_LINE = 'A new Memory on {name}’s card: ‘{memory}’.';

/** The daily found thing from friendship level 6 (a `stardust` event of 1). Slots: {name}, {found} (FOUND_THINGS). */
export const FOUND_LINE = '{name} left a {found} on the sill. +1 swap';

/* ------------------------------------------------------------------------ */
/* Keeping Company: routine archetypes and "Known for"                       */
/* ------------------------------------------------------------------------ */

/**
 * The 14 routine archetypes (DESIGN §14.1): how a companion relates to the habit's objects the
 * way real animals do, never performing the human activity.
 */
export const ARCHETYPES = ['read', 'learn', 'walk', 'mat', 'water', 'sleep', 'mind', 'create', 'tidy', 'cook', 'care', 'plan', 'connect', 'garden'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

/** Every habit icon's archetype (unknown icons fall back to 'garden', the watering can). */
export const ARCHETYPE_BY_ICON: Readonly<Record<string, Archetype>> = {
  book: 'read',
  lightbulb: 'learn', laptop: 'learn', language: 'learn',
  walk: 'walk', run: 'walk', bike: 'walk', swim: 'walk', sun: 'walk',
  stretch: 'mat', yoga: 'mat', dumbbell: 'mat',
  water: 'water', tea: 'water',
  'moon-sleep': 'sleep', 'no-phone': 'sleep',
  lotus: 'mind', pray: 'mind', smile: 'mind', sparkle: 'mind',
  palette: 'create', yarn: 'create', music: 'create', camera: 'create',
  broom: 'tidy', 'sparkle-clean': 'tidy', bathtub: 'tidy', laundry: 'tidy', dishes: 'tidy', house: 'tidy', wrench: 'tidy',
  salad: 'cook', apple: 'cook', cart: 'cook',
  skincare: 'care', tooth: 'care', vitamins: 'care', paw: 'care',
  'piggy-bank': 'plan', calendar: 'plan', star: 'plan', journal: 'plan',
  phone: 'connect', 'heart-date': 'connect', gift: 'connect',
  'watering-can': 'garden', leaf: 'garden', flower: 'garden',
};

const NOT_FROG: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster', 'duck'];

type KnownFor = { readonly starting: readonly Line[]; readonly settled: readonly Line[] };

/**
 * The Pet Card's "Known for" line. `starting` shows from Potted on days the habit was done;
 * `settled` is permanent from Blooming. No subject, so no pronoun: "Known for: Sleeps on the open
 * book whenever you read." Use `knownFor(icon)`, which applies the icon overrides below.
 */
export const KNOWN_FOR: Readonly<Record<Archetype, KnownFor>> = {
  read: {
    starting: ['Has started sleeping on your book in the evenings.', 'Has started lying across the open page.'],
    settled: ['Sleeps on the open book whenever you read.', 'Keeps your place in the book, by lying on it.'],
  },
  learn: {
    starting: ['Has started lying on the warm laptop.', 'Has started sitting on your notes.'],
    settled: ['Lies on the warm laptop whenever you study.', 'Sits on whichever page you need next.'],
  },
  walk: {
    starting: ['Has started waiting by the door when it’s nearly time to go out.'],
    settled: ['Waits by the door before you go out, and is there when you’re in again.', 'Knows when you’re about to head out.'],
  },
  mat: {
    starting: ['Has started lying on the mat.'],
    settled: ['Lies in the middle of the mat whenever you get it out.', 'Is on the mat before you’ve finished unrolling it.'],
  },
  water: {
    starting: [
      only(NOT_FROG, 'Has started drinking from the bowl whenever you have a drink.'),
      only('frog', 'Has started sitting in the water dish whenever you have a drink.'),
    ],
    settled: [
      only(NOT_FROG, 'Drinks from the bowl every time you do.'),
      only('duck', 'Dabbles in the water dish every time you have a drink.'),
      only('frog', 'Sits in the water dish every time you have a drink.'),
    ],
  },
  sleep: {
    starting: ['Has started getting into bed before you.'],
    settled: ['Is in bed before you every night.', 'Takes the warm spot on the pillow at bedtime.'],
  },
  mind: {
    starting: ['Has started sitting with you, very still, when you take a quiet minute.'],
    settled: ['Sits with you, very still, for every quiet minute.', 'Breathes slowly with you, or seems to.'],
  },
  create: {
    starting: ['Has started sitting on whatever you’re making.'],
    settled: ['Sits right in the middle of whatever you’re making.', 'Sleeps in whatever bag or case you’ve left open.'],
  },
  tidy: {
    starting: ['Has started sitting in the laundry basket.'],
    settled: ['Sits in the laundry basket whenever you tidy.', 'Inspects each tidy surface, then sits on it.'],
  },
  cook: {
    starting: ['Has started watching from the kitchen counter when you cook.', 'Has started inspecting every shopping bag as it comes in.'],
    settled: ['Watches all the cooking from the counter.', 'Waits by the chopping board, hopeful.'],
  },
  care: {
    starting: ['Has started sitting on the bathroom mat while you get ready.'],
    settled: ['Sits on the bathroom mat through the whole routine.', 'Watches the whole routine from the edge of the sink.'],
  },
  plan: {
    starting: ['Has started sitting on the papers.'],
    settled: ['Sits on the papers you need, every time.', 'Lies across the notebook whenever it’s open.'],
  },
  connect: {
    starting: ['Has started sitting close by whenever you call someone.'],
    settled: ['Sits close by for every call.', 'Sits by the phone whenever it rings.'],
  },
  garden: {
    starting: ['Has started following the watering can round the room.'],
    settled: ['Follows the watering can from plant to plant.', 'Checks each real plant after you water it.'],
  },
};

/** Icons whose objects differ from their archetype's (Pet care is bowls, not the bathroom mat). */
export const KNOWN_FOR_BY_ICON: Readonly<Record<string, KnownFor>> = {
  paw: {
    starting: ['Has started watching when you fill the real bowls.'],
    settled: ['Sits by the real food bowls at feeding time, as if it helps.'],
  },
  journal: {
    starting: ['Has started lying across the open journal.'],
    settled: ['Lies on the page you’re writing on.'],
  },
};

/** The Known-for lines for a habit's icon. */
export const knownFor = (icon: string): KnownFor => KNOWN_FOR_BY_ICON[icon] ?? KNOWN_FOR[ARCHETYPE_BY_ICON[icon] ?? 'garden'];

/* ------------------------------------------------------------------------ */
/* Sunday Note, Herbarium page, Garden Journal                               */
/* ------------------------------------------------------------------------ */

/**
 * The Sunday Note (DESIGN §13): a small card in the narrator's voice. Built in order: opener,
 * waterings (only from WATERINGS_MIN up: a bare "Two waterings." reads as a grade), up to two
 * highlights, the quoted note if there is one, a P.S., the stamps. Never a percentage. {Count} is
 * spelled out with a capital (`numberWord(n, true)`), {count} is a numeral. A `{ one, other }`
 * pair is chosen by the count.
 */
export const SUNDAY_NOTE = {
  /** {weekOf}: "Sep 22". */
  opener: 'Week of {weekOf}.',
  waterings: '{Count} waterings.',
  /**
   * Slots: {habit}, {plant} / {Plant} (`plantPhrase`), {weekday} ("Thursday"), {stageEvent}
   * (STAGE_EVENTS, or BLOOM_EVENTS at Blooming), {name}, {anchor}, {count}.
   * `stageUpCompanion` only when the plant is Potted or later and the day was Friday or earlier,
   * so there were afternoons since; otherwise `stageUpCompanionShort`.
   */
  highlights: {
    stageUp: '{Plant} {stageEvent} on {weekday}.',
    stageUpCompanion: '{Plant} {stageEvent} on {weekday}, and {name} has napped in it every afternoon since.',
    stageUpCompanionShort: '{Plant} {stageEvent} on {weekday}, and {name} has kept it company since.',
    everyDay: '{habit}, watered every day.',
    topHabit: { one: '{habit}, watered on 1 day.', other: '{habit}, watered on {count} days.' },
    newcomer: '{name} came home on {weekday}.',
    newcomerMovedIn: '{name} came home on {weekday} and moved into {plant}.',
    newHabit: '{Plant} was planted on {weekday}, as a cutting.',
    tiny: { one: 'The tiny version of {habit} was enough on 1 day.', other: 'The tiny version of {habit} was enough on {count} days.' },
    kept: { one: '{habit} came right after {anchor} on 1 day.', other: '{habit} came right after {anchor} on {count} days.' },
  },
  /** Her own words, quoted back as written. Slots: {weekday}, {quote}. Only a note she has starred. */
  quote: 'On {weekday} you wrote: ‘{quote}’.',
  /**
   * The P.S. With a companion: {routine} from SUNDAY_ROUTINES and {times} ("four evenings",
   * "twice", "every day"). Without one, a sill line, and only if it happened: the found thing and
   * the nap pile are recorded; the sunbeam line needs the pet's afternoons on the sill, and never
   * two weeks running.
   */
  ps: {
    companion: 'P.S. {name} {routine} {times}.',
    sill: [
      'P.S. On {weekday}, {name} left a {found} on the sill.',
      'P.S. {name} and {friend} napped in a pile on {weekday}.',
      'P.S. {name} spent the afternoons in the sunbeam.',
    ],
  },
  stamps: { one: 'One stamp, enclosed.', other: '{Count} stamps, enclosed.' },
} as const;

/** The Sunday Note's count sentence shows from this many waterings. */
export const WATERINGS_MIN = 5;

/** The companion's routine in the past tense, for the Sunday Note P.S. ("P.S. Juniper slept on the book four evenings."). */
export const SUNDAY_ROUTINES: Readonly<Record<Archetype, string>> = {
  read: 'slept on the book',
  learn: 'lay on the warm laptop',
  walk: 'waited by the door',
  mat: 'lay on the mat',
  water: 'sat by the water dish',
  sleep: 'was in bed first',
  mind: 'sat with you, very still,',
  create: 'sat on whatever you were making',
  tidy: 'sat in the laundry basket',
  cook: 'watched from the counter',
  care: 'sat on the bathroom mat',
  plan: 'sat on the papers',
  connect: 'sat close by for the calls',
  garden: 'followed the watering can',
};

/** The same, for the icons with their own Known-for lines. */
export const SUNDAY_ROUTINES_BY_ICON: Readonly<Record<string, string>> = {
  paw: 'sat by the real food bowls',
  journal: 'lay across the journal',
};

/** Things a pet leaves on the sill from friendship level 6 ({found}). */
export const FOUND_THINGS: readonly string[] = ['button', 'leaf', 'bead', 'blue thread', 'seed', 'bottle top', 'feather'];

/**
 * The Herbarium page (DESIGN §13): each habit's pressing is labelled in small type, rest days
 * press as small flowers, and there's never a percentage. Slots: {Month}, {habit}, {Plant},
 * {count}, {rests}, {name}, {date}.
 */
export const HERBARIUM = {
  title: '{Month}, pressed.',
  label: '{habit} · {count}',
  labelRests: { one: '{habit} · {count} · 1 rest', other: '{habit} · {count} · {rests} rests' },
  restNote: 'Rest days are pressed as the small flowers.',
  margin: ['{Plant} reached Blooming this month.', '{name} came home on {date}.', '{Plant} was planted this month.'],
  firstPage: 'The first page.',
  stamps: { one: 'One stamp, enclosed.', other: '{Count} stamps, enclosed.' },
} as const;

/**
 * Garden Journal (Habit Detail, DESIGN §14.2): up to five plain sentences that ink in from week 2.
 * Until then each shows a pencil line saying when it will fill in, counted in waterings, never a
 * deadline. Slots: {time}, {weekday}, {count}, {anchor}, {look}, {when} ("before 9 am, usually",
 * "after 6 pm, usually", "at all sorts of times").
 */
export const GARDEN_JOURNAL = {
  usualTime: {
    ink: 'You usually water it around {time}.',
    pencil: { one: 'Your usual time fills in after 1 more watering.', other: 'Your usual time fills in after {count} more waterings.' },
  },
  steadiestDay: {
    ink: '{weekday}s are when it’s watered most.',
    pencil: 'The steadiest day fills in after the second week.',
  },
  tinyDays: {
    ink: { one: 'The tiny version was enough on 1 day.', other: 'The tiny version was enough on {count} days.' },
    pencil: 'Tiny days fill in the first time you use the tiny version.',
  },
  keptTogether: {
    ink: { one: 'Watered right after {anchor} on 1 day.', other: 'Watered right after {anchor} on {count} days.' },
    pencil: 'Days in a pair fill in once it follows another habit.',
  },
  whyItLooks: {
    ink: 'It blooms {look} because you water it {when}.',
    pencil: 'Why it looks the way it does fills in at Blooming.',
  },
} as const;

/* ------------------------------------------------------------------------ */
/* Greetings                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * The Today greeting (top left of the band). Slot: {userName}; an empty name drops ", {userName}".
 * Periods by the clock's hour: early 4–6, morning 6–12, afternoon 12–17, evening 17–22, late 22–4.
 * Plain words a friend would use: no "Good afternoon", and no "Evening" at 2 am.
 */
export const GREETINGS = {
  early: ['Early start, {userName}.', 'Morning, {userName}. The lamp’s still on.'],
  morning: ['Morning, {userName}.'],
  afternoon: ['Afternoon, {userName}.'],
  evening: ['Evening, {userName}.'],
  late: ['Hello, {userName}. The lamp’s on.', 'Hello, {userName}. Everything on the sill is asleep.'],
  birthday: ['Happy birthday, {userName}.'],
} as const;
export type GreetingPeriod = Exclude<keyof typeof GREETINGS, 'birthday'>;

export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 4 && hour < 6) return 'early';
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late';
}

/* ------------------------------------------------------------------------ */
/* Today: the card status line, the vine chip, the rows (VOICE.md §5)        */
/* ------------------------------------------------------------------------ */

/**
 * The card status line (DESIGN §9.1.1, first match wins). `statusLine()` in format.ts picks the
 * template from the card's `status` data. Slots: {count}, {target}, {unit}, {period} (PERIOD_WORDS),
 * {run} (a RUN template filled). Never a 0, never a deadline, never what's left.
 */
export const STATUS_LINE = {
  rested: 'Resting today',
  count: '{count}/{target} {unit}',
  countBare: '{count}/{target}',
  tiny: 'Tiny version ✓',
  period: '{count} of {target} this {period}',
  /** A selected past day in a closed period. */
  periodThen: '{count} of {target} that {period}',
  periodDone: 'Watered for the {period} ✓',
  heldOff: 'Held off {run}',
  rooting: 'Rooting · {count} more to pot up',
  new: 'Just planted',
} as const;

/**
 * How often a habit is on (VOICE.md §22, the Habit Editor and Habit Detail): "Every day" ·
 * "Mon/Wed/Fri" · "3 times a week" · "Once every 2 weeks" · "Twice a month" · "Once a quarter".
 * `scheduleText()` in format.ts builds it. A rule change in the history: "From Oct 6: Mon/Wed/Fri",
 * the first rule "Since Sep 22: Every day", and a count rule adds its target ("Every day · 8 glasses").
 * Slots: {count}, {times}, {every}, {date}, {schedule}, {target}, {unit}.
 */
export const SCHEDULE_LINES = {
  daily: 'Every day',
  times: { 1: 'Once', 2: 'Twice', other: '{count} times' },
  weekly: { 1: 'a week', 2: 'every 2 weeks', 3: 'every 3 weeks', 4: 'every 4 weeks' },
  monthly: { 1: 'a month', 2: 'every 2 months', 3: 'a quarter', 6: 'every 6 months', 12: 'a year' },
  flexible: '{times} {every}',
  from: 'From {date}: {schedule}',
  since: 'Since {date}: {schedule}',
  target: '{schedule} · {target} {unit}',
  targetBare: '{schedule} · {target}',
} as const;

/** Flexible periods by `every` (weekly: 1–4 weeks; monthly: 1, 2, 3, 6, 12 months). */
export const PERIOD_WORDS = {
  weekly: { 1: 'week', 2: 'fortnight', 3: '3 weeks', 4: '4 weeks' },
  monthly: { 1: 'month', 2: '2 months', 3: 'quarter', 6: 'half-year', 12: 'year' },
} as const;

/**
 * A run, "in a row" (VOICE.md §3: the word for a streak). `short` is the card's own daily form ("12
 * days"); every other place, and every other unit, says "in a row". Slot: {count}.
 */
export const RUN = {
  days: { short: { one: '1 day', other: '{count} days' }, long: { one: '1 day in a row', other: '{count} days in a row' } },
  times: { one: '1 in a row', other: '{count} in a row' },
  weeks: { one: '1 week in a row', other: '{count} weeks in a row' },
  months: { one: '1 month in a row', other: '{count} months in a row' },
} as const;

/**
 * The rolling phrase (DESIGN §5.4). Slots: {count}, {span}, {days} ("Mon/Wed/Fri"), {tiny}. `soFar`
 * is for a flexible habit before a full span has passed.
 */
export const CONSISTENCY_LINES = {
  days: { one: '{count} of the last 1 day', other: '{count} of the last {span} days' },
  weekdays: '{count} of your last {span} {days}',
  weeks: {
    1: { full: '{count} of the last {span} weeks', soFar: { one: '{count} of 1 week so far', other: '{count} of {span} weeks so far' } },
    2: { full: '{count} of the last {span} fortnights', soFar: { one: '{count} of 1 fortnight so far', other: '{count} of {span} fortnights so far' } },
    3: { full: '{count} of the last {span} 3-week stretches', soFar: { one: '{count} of 1 3-week stretch so far', other: '{count} of {span} 3-week stretches so far' } },
    4: { full: '{count} of the last {span} 4-week stretches', soFar: { one: '{count} of 1 4-week stretch so far', other: '{count} of {span} 4-week stretches so far' } },
  },
  months: {
    1: { full: '{count} of the last {span} months', soFar: { one: '{count} of 1 month so far', other: '{count} of {span} months so far' } },
    2: { full: '{count} of the last {span} 2-month stretches', soFar: { one: '{count} of 1 2-month stretch so far', other: '{count} of {span} 2-month stretches so far' } },
    3: { full: '{count} of the last {span} quarters', soFar: { one: '{count} of 1 quarter so far', other: '{count} of {span} quarters so far' } },
    6: { full: '{count} of the last {span} half-years', soFar: { one: '{count} of 1 half-year so far', other: '{count} of {span} half-years so far' } },
    12: { full: '{count} of the last {span} years', soFar: { one: '{count} of 1 year so far', other: '{count} of {span} years so far' } },
  },
  tiny: '{phrase} · {tiny} tiny',
} as const;

/** The rest of Today (VOICE.md §5, §17, §23). Slots as named. */
export const TODAY_LINES = {
  blocks: { morning: 'Morning', midday: 'Midday', evening: 'Evening', anytime: 'Anytime' },
  /** A folded block: "Morning 3/3". */
  blockSummary: '{block} {done}/{total}',
  /** The vine chip on the sill ledge. */
  vine: '{done} of {total}',
  vineCoins: { one: '{done} of {total} · +1 coin', other: '{done} of {total} · +{coins} coins' },
  /** Only flexible habits watered, nothing day-based on. */
  vineFlexible: '{count} watered',
  /** Screen readers: the day's progress, and a week-strip day ({date} is the long date). */
  dayAria: '{done} of {total} watered',
  weekDayAria: '{date}, {done} of {total} watered',
  rows: { doneForWeek: 'Watered for the week', doneForPeriod: 'Watered for the {period}', thisMonth: 'This month', otherDays: 'Other days' },
  resting: { one: 'Resting: 1 habit', other: 'Resting: {count} habits' },
  restingBack: '{resting} · back {date}',
  backdating: 'Logging for {date}',
  backToToday: 'Back to today',
  /** Button names while a past day is selected: "Walk for Saturday". */
  forDay: '{habit} for {weekday}',
  startEarlier: 'Start tracking {habit} from {date}?',
  startFrom: 'Start from {date}',
  notNow: 'Not now',
  historyNote: 'Fixes history. No coins for this one.',
  clockBehind: 'The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again.',
  openShelf: 'Open the Shelf',
  firstCapsule: 'Your first capsule: water anything.',
  letterWaiting: { sundayNote: 'There’s a note on the sill.', herbarium: 'There’s a page on the sill.', anniversary: 'There’s a note on the sill.' },
  storyWaiting: 'There’s a story on the plant tag for {habit}.',
  /** A count habit's card, for screen readers ("Drink water, 5 of 8 glasses"). */
  cardAria: '{habit}, {count} of {target} {unit}',
  cardAriaBare: '{habit}, {count} of {target}',
  addOne: 'Add {step} {unit} to {habit}',
  /** Collapsed band. */
  takeTodayOff: 'Take today off',
  takeTodayOffConfirm: 'Take today off? Every habit rests, the same as a rest day.',
  offDayAllowance: 'Days off this month: {count}. Up to 4 count as rests.',
  restAllowance: 'Up to {count} rest days a week count as watered. More still get a moon, and the numbers count the first {count}.',
  restDaysAhead: 'Resting {days}',
  notePlaceholder: 'A line about today',
  saveNote: 'Save note',
  srWatered: '{habit}, watered. Plus {coins} coins.',
  srWateredOne: '{habit}, watered. Plus 1 coin.',
  srWateredMany: '{count} habits watered. Plus {coins} coins.',
} as const;

/* ------------------------------------------------------------------------ */
/* Progress (VOICE.md §6)                                                    */
/* ------------------------------------------------------------------------ */

/** Counted nouns, in numerals. Slot: {count}. */
export const COUNTS = {
  waterings: { one: '1 watering', other: '{count} waterings' },
  days: { one: '1 day', other: '{count} days' },
  habits: { one: '1 habit', other: '{count} habits' },
  stamps: { one: '1 stamp', other: '{count} stamps' },
  coins: { one: '1 coin', other: '{count} coins' },
  swaps: { one: '1 swap', other: '{count} swaps' },
  tickets: { one: 'a ticket', other: '{count} tickets' },
} as const;

/**
 * Progress looks back only at what happened: a lower number is simply not shown. Slots: {days},
 * {span}, {Month} ("September"), {Mon} ("Aug"), {count}, {habit}, {year}, {run}, {weekday}.
 */
export const PROGRESS_LINES = {
  showedUp: 'You showed up {days} of the last {span} days',
  monthSoFar: '{Month} so far: {days} of {span} days',
  soFar: '{count} of {span} so far',
  week: '{count} of {span} this week',
  up: 'Up on the same days last month',
  level: 'Level with the same days last month',
  fact: {
    current: { one: '1 watering so far in {Month}.', other: '{count} waterings so far in {Month}.' },
    closed: { one: '1 watering in {Month}.', other: '{count} waterings in {Month}.' },
  },
  steadiest: { current: '{habit} is the steadiest.', closed: '{habit} was the steadiest.' },
  goals: { one: '1 goal on track', other: '{count} goals on track' },
  rests: { one: '1 rest', other: '{count} rests' },
  offDays: { one: '1 day off', other: '{count} days off' },
  monthBar: { one: '{Mon} · 1 day', other: '{Mon} · {days} days' },
  /** Slots: {waterings}, {days} (COUNTS filled). */
  year: '{waterings} in {year}, across {days}',
  records: {
    waterings: 'Waterings: {count}',
    tiny: 'Tiny versions: {count}',
    longest: 'Longest run: {habit}, {run}',
    bestMonth: 'Best month: {Month}',
    perfectDays: { one: 'Everything watered: 1 day', other: 'Everything watered: {count} days' },
    showUpDays: 'Days showing up: {count}',
  },
  insights: {
    weekday: '{weekday}s are the steadiest.',
    habit: '{habit} is the steadiest habit.',
    time: {
      morning: 'Mornings are when most watering happens.',
      midday: 'Middays are when most watering happens.',
      evening: 'Evenings are when most watering happens.',
      night: 'Late nights are when most watering happens.',
    },
  },
  empty: 'This fills in as you water.',
  calendarNoNotes: 'No notes on {date}.',
  recordsEmpty: 'Records fill in as you go.',
  insightsEmpty: 'Insights fill in after 2 weeks of watering.',
  pinsEmpty: 'Your pins go on this shelf as you earn each one.',
  memoryShelf: 'Memory shelf',
  memoryShelfEmpty: 'Sunday Notes, Herbarium pages and retired plants are kept here.',
  memoryItems: { sundayNote: 'Sunday Note · Week of {date}', herbarium: '{Month}, pressed', retired: '{habit} · retired {date}', season: '{Season}, on the sill' },
  moments: 'Notes you add after watering show up here.',
  moment: '{date} · {habit}',
} as const;

/* ------------------------------------------------------------------------ */
/* Pets: the Pet Card, gestures, Memories, places (VOICE.md §9, §11)         */
/* ------------------------------------------------------------------------ */

export const PET_CARD = {
  fields: {
    likes: 'Likes',
    knownFor: 'Known for',
    spot: 'Favourite spot',
    cameHome: 'Came home',
    friendship: 'Friendship',
    personality: 'Personality',
    favouriteTreat: 'Favourite treat',
    wardrobe: 'Wardrobe',
    company: 'Keeps {habit} company',
    memories: 'Memories',
    bestFriend: 'Best friend',
    place: 'Spends the day in',
  },
  /** "Likes" once the favourite is found (before, the TREAT_TAG_HINTS line). */
  likesTreat: '{Treat}, most of all',
  cameHomeToday: 'Came home: today',
  buttons: {
    hello: 'Say hello',
    stroke: 'Stroke',
    touchNose: 'Touch nose',
    touchBeak: 'Touch beak',
    touchHead: 'Touch head',
    pickUp: 'Pick up',
    putDown: 'Put down',
    feed: 'Feed',
    rename: 'Rename',
    findPlant: 'Find {name} a plant',
    letChoose: 'Let {name} choose',
    notNow: 'Not now',
    move: 'Move {name}',
    putOn: 'Put it on',
    takeOff: 'Take it off',
    bakeTray: 'Bake a tray · 10 coins',
  },
  nameTag: '{name}’s card',
  name: 'Name',
  anotherName: 'Another name',
  favouriteFound: '{name}’s favourite is the {treat}. It’s on the Pet Card now.',
  enough: '{name} has had enough for today.',
  restocked: 'The pantry restocked: 2 servings of each treat.',
  baked: 'Baked: 5 servings of {treat}, in the pantry.',
  lastServing: 'That’s the last of the {treat} for today. 2 more servings in the morning.',
  memoriesEmpty: 'Memories start once you’re best friends.',
  shelfEmpty: 'The sill is ready for someone. Your first capsule is on the Capsules tab.',
  basketEmpty: 'Harvests land here, from Blooming cat grass, catnip, strawberries and lavender.',
  pantryEmpty: 'Treats you collect restock here every morning.',
  decorEmpty: 'Decor from capsules goes here.',
  bestFriendsBanner: { eyebrow: 'Best friends', title: 'You and {name}', text: 'There’s a small brass tag to show it.' },
} as const;

/**
 * Dated Memories on the Pet Card (DESIGN §8.2), like dates in a diary. Kinds match
 * `PetMemory['kind']`. Slots: {date} ("Sep 29"), {habit}, {plant}, {treat}, {weekday}. `MEMORY_LINE`
 * announces each.
 */
export const MEMORIES = {
  'best-friends': 'Best friends, {date}',
  'came-home': 'Came home {date}',
  bloomed: 'The day {habit} bloomed',
  'moved-in': 'Moved into {plant}, {date}',
  favourite: 'The day the {treat} turned out to be the favourite',
  day: 'A quiet {weekday}, {date}',
} as const;

/**
 * Places (VOICE.md §11): the map, moving a pet, and the opening lines (with the pet who loves the
 * place most, or without). Slots: {name}, {place} (the place's name with its article, `placePhrase`).
 */
export const PLACE_LINES = {
  free: 'free',
  price: '{price} coins',
  open: 'Open for {price} coins',
  room: 'Room for 2 more pets',
  moved: '{name} moved to {place}.',
  movedHome: '{name} moved back to the Sill.',
  chose: '{name} chose {place}.',
  opened: {
    pond: { withPet: 'The Saucer Pond is open. {name} went straight to the lily pad.', alone: 'The Saucer Pond is open: a saucer of water, a pebble island and one lily pad.' },
    grass: { withPet: 'The Cat-grass Tray is open. {name} is out in the grass already.', alone: 'The Cat-grass Tray is open. A pasture, at this size.' },
    bookshelf: { withPet: 'The Bookshelf is open. {name} is on the top shelf, under the lamp.', alone: 'The Bookshelf is open: two shelves of paperbacks and a reading lamp.' },
    balcony: { withPet: 'The Balcony Box is open. There’s weather out there now, and room to roam.', alone: 'The Balcony Box is open. There’s weather out there now, and room to roam.' },
    quilt: { withPet: 'The Quilt is open: a folded patchwork quilt, deep enough to disappear into.', alone: 'The Quilt is open: a folded patchwork quilt, deep enough to disappear into.' },
  },
} as const;

/* ------------------------------------------------------------------------ */
/* Keeping Company, Blooms Like You, the Season Review (VOICE.md §12–§14)    */
/* ------------------------------------------------------------------------ */

/** The Keeping Company offer (§14.1). Slots: {name}, {habit}, {plant}. A decline says nothing back. */
export const COMPANION = {
  reveal: { find: 'Find {name} a plant', choose: 'Let {name} choose', notNow: 'Not now' },
  editor: { title: 'Who keeps it company?', none: 'No one, for now' },
  card: { keeps: 'Keeps {habit} company', find: 'Find {name} a plant' },
  movedIn: '{name} moved into {plant}.',
  chose: '{name} chose {plant}, for the sun.',
  moveOut: 'Move {name} out',
  movedOut: '{name} moved back to the sill.',
} as const;

/** The three stories (§14.1). Slots: {name}, {plant}/{Plant}, {habit}, {date}, {Count}, {why}, {momentDate}, {moment}. */
export const STORIES = {
  titles: { start: 'The start', why: 'Why it matters', lookAtUs: 'Look at us' },
  waiting: 'There’s a story on the plant tag for {habit}.',
  start: 'The start. {name} moved into {plant} on {date}. {Count} waterings later, {name} has a favourite side of the pot.',
  why: {
    ask: '{name} has kept {habit} company since {date}. If you like, write down why it’s on the sill.',
    placeholder: 'A line, just for you',
    keep: 'Keep it',
    notNow: 'Not now',
    kept: 'Why it matters: ‘{why}’.',
  },
  lookAtUs: {
    withMoment: '{Plant} is Blooming, and {name} is asleep under it. On {momentDate} you wrote: ‘{moment}’.',
    withoutMoment: '{Plant} is Blooming, and {name} is asleep under it. {Count} waterings, from a cutting.',
    memory: 'The day {habit} bloomed',
  },
} as const;

/** Keepsake captions (§14.1), prefilled from her latest Moment, otherwise from the family. Slots: {date}, {moment}. */
export const KEEPSAKE_CAPTIONS = {
  moment: '{date} · ‘{moment}’',
  move: '{date} · Left by the pot: a pebble from the path.',
  read: '{date} · Left by the pot: a paper bookmark.',
  hydrate: '{date} · Left by the pot: a piece of sea glass.',
  rest: '{date} · Left by the pot: a small feather.',
  mind: '{date} · Left by the pot: a smooth grey stone.',
  create: '{date} · Left by the pot: a scrap of yarn.',
  tidy: '{date} · Left by the pot: a spare button.',
  cook: '{date} · Left by the pot: a dried bean.',
  care: '{date} · Left by the pot: a hair tie.',
  garden: '{date} · Left by the pot: a seed.',
  connect: '{date} · Left by the pot: a folded note.',
  plan: '{date} · Left by the pot: a paperclip.',
  'brass-seed': '{date} · Left by the pot: a brass seed.',
} as const;

/** Blooms Like You (§14.2): plain words, and it pays nothing. Slots: {plant}, {look}, {count}, {anchor}. */
export const LOOKS = {
  colours: { dawn: 'Dawn', sunlit: 'Sunlit', twilight: 'Twilight', wildflower: 'Wildflower' },
  colourWhy: {
    dawn: 'you usually water it before 9',
    sunlit: 'you usually water it in the middle of the day',
    twilight: 'you usually water it after 6 pm',
    wildflower: 'you water it at all sorts of times',
  },
  shapes: { classic: 'Classic', petite: 'Petite', paired: 'Paired' },
  shapeWhy: {
    petite: { one: 'the tiny version counted on 1 day', other: 'the tiny version counted on {count} days' },
    paired: { one: 'on 1 day it came right after {anchor}', other: 'on {count} days it came right after {anchor}' },
  },
  /** The plant tag: "Dawn · Paired: you usually water it before 9, and on 18 days it came right after Walk." */
  tag: '{look}: {why}.',
  tagBoth: '{look}: {why}, and {shapeWhy}.',
  show: 'Show this look',
  classic: 'Classic',
  helper: 'Classic is always here, if you prefer it.',
  newLook: 'A new look for {plant}: {look}.',
  stacking: { after: 'After {anchor}', kept: { one: 'Right after {anchor} on 1 day', other: 'Right after {anchor} on {count} days' } },
} as const;

/** The move-it-to-Evening nudge (§14.2): offered once; a "Leave it" is remembered. Slots: {habit}, {set}, {usual}, {Block}, {Set}. */
export const TIME_NUDGE = {
  ask: 'You set {habit} for {set} but usually water it {usual}. Move it to {Block}?',
  move: 'Move to {Block}',
  leave: 'Leave it in {Set}',
  set: { morning: 'mornings', midday: 'the middle of the day', evening: 'evenings', anytime: 'anytime' },
  usual: { morning: 'in the morning', midday: 'in the middle of the day', evening: 'after 6 pm' },
} as const;

/** The Season Review card (§14.3). Slots: {Season}, {season}, {habit}, {from}, {to}, {count}, {date}. */
export const SEASON_REVIEW = {
  title: '{Season}, on the sill.',
  plant: { one: '{habit} · {from} to {to} · 1 watering', other: '{habit} · {from} to {to} · {count} waterings' },
  plantSame: { one: '{habit} · {to} · 1 watering', other: '{habit} · {to} · {count} waterings' },
  ask: '{Season} starts today. How should each habit go on?',
  chips: { keep: 'Keep going', tinier: 'Tinier', grow: 'Grow', rest: 'Rest till next season', finish: 'Finish' },
  chipHelp: { keep: 'Just as it is.', tinier: 'A smaller version, for {season}.', grow: 'A little more. +1 stamp', rest: 'Paused until {date}.', finish: 'To the balcony shelf, with a ribbon.' },
  keepEverything: 'Keep everything',
  later: 'Later',
  done: 'All set for {season}.',
  justThisSeason: '{habit} was just for {season}. It’s on the balcony shelf now, with a ribbon.',
  tune: 'Tune my habits',
} as const;

/** Birthday (§13). Slots: {userName}, {name}. */
export const BIRTHDAY = {
  label: 'Birthday',
  helper: 'For a small surprise on the day. Optional.',
  card: 'There’s a tiny cake on the sill, and a ticket.',
  pets: ['{name} sat by the cake all morning.', '{name} left a leaf next to the cake.', '{name} is wearing the paper party hat, more or less.', '{name} has been keeping an eye on the candle.'],
} as const;

/** Came-home days and the moving-in anniversary (§13). Slots: {name}, {years}, {habit}, {Count}, {Years}. */
export const CAME_HOME = {
  pet: { one: '{name} came home a year ago today.', other: '{name} came home {years} years ago today.' },
  anniversary: {
    first: 'A year on this sill. The first cutting was {habit}.',
    later: '{Years} years on this sill. {Count} waterings since the first one.',
  },
} as const;

/* ------------------------------------------------------------------------ */
/* Onboarding, empty states, errors, install, reminders, data, settings      */
/* ------------------------------------------------------------------------ */

/** Onboarding (§16, DESIGN §9.6). Every step skippable. */
export const ONBOARDING = {
  skip: 'Skip',
  sill: 'New place. Which plants came with you?',
  nameLabel: 'Your name',
  nameHelper: 'For the greeting. Optional.',
  pick: 'Pick up to 3.',
  moreIdeas: 'More ideas',
  makeOwn: 'Make my own',
  more: 'More can go on the sill anytime.',
  doneToday: 'Anything already done today?',
  topUp: 'There are 25 coins in the jar. That’s a capsule.',
  firstPick: 'Who comes home first?',
  firstPickLead: 'Your first capsule is on the house. Choose a cabinet.',
  notYet: 'Not yet, I’ll earn it',
  firstCapsuleCard: 'Your first capsule: water anything.',
} as const;

/** Empty states (§17). */
export const EMPTY = {
  today: 'An empty sill. Add a habit, and it starts as a cutting in a glass of water.',
  addHabit: 'Add a habit',
  nothingOn: 'Nothing’s on today. The plants are fine.',
  allResting: 'Everything is resting today.',
  progress: 'This fills in as you water.',
  calendarNoNotes: 'No notes on {date}.',
  records: 'Records fill in as you go.',
  insights: 'Insights fill in after 2 weeks of watering.',
  pins: 'Your pins go on this shelf as you earn each one.',
  memoryShelf: 'Sunday Notes, Herbarium pages and retired plants are kept here.',
  moments: 'Notes you add after watering show up here.',
  shelf: 'The sill is ready for someone. Your first capsule is on the Capsules tab.',
  fieldGuidePage: '{Species} come from the {number} cabinet.',
  basket: 'Harvests land here, from Blooming cat grass, catnip, strawberries and lavender.',
  pantry: 'Treats you collect restock here every morning.',
  decor: 'Decor from capsules goes here.',
  memories: 'Memories start once you’re best friends.',
  archived: 'Nothing archived.',
  iconPicker: 'No icon for that. The watering can suits anything.',
  reminders: 'No watering times set.',
  snapshots: 'The first daily copy is made tonight.',
  specialOrder: 'Everything in the Field Guide is yours.',
} as const;

/** Errors and recovery (§18): what happened and what to do. */
export const ERRORS = {
  screen: 'This screen didn’t load. Your plants and coins are saved.',
  reload: 'Reload',
  save: 'That change didn’t save yet. catkin is trying again, and your last backup is safe.',
  otherWindow: 'catkin is open in another window · Use here',
  useHere: 'Use here',
  newerSave: 'This save is from a newer catkin, so it opens read-only here. Update to make changes.',
  clock: 'The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again.',
  safariTab: 'In a Safari tab, a save can be cleared after 7 days. Keep catkin on your Home Screen to keep it safe.',
  copy: 'Couldn’t copy. Select the text and copy it by hand.',
  share: 'Saved to Downloads instead.',
  notBackup: 'That file isn’t a catkin backup.',
  newerBackup: 'This backup is from a newer catkin. Update, then import it.',
  fileBuild: 'Test copy · saved only in this browser, for this file',
  diagnostics: 'Copy report',
} as const;

/** The install guide (§19). */
export const INSTALL = {
  gate: 'Keep catkin on your Home Screen',
  peek: 'Just peek',
  ios: ['Tap Share.', 'Tap Add to Home Screen.', 'Open catkin from there.'],
  macSafari: ['Choose File › Add to Dock.', 'Open catkin from the Dock.'],
  chromium: ['Click Install in the address bar.', 'Open catkin from your apps.'],
  android: ['Tap the menu, then Install app.'],
  singleFile: ['Double-click catkin.html. It works offline, in this browser.'],
  handoff: 'Move my plants into the app',
  handoffCopied: 'Copied. Open catkin from your Home Screen and tap Paste my plants.',
  paste: 'Paste my plants',
  updateReady: 'A new version is ready · Reload',
  upToDate: 'Up to date.',
  checkUpdates: 'Check for updates',
  reloadApp: 'Reload app',
} as const;

/**
 * Watering time (§20): calendar events she adds herself. `wateringTimeIcs()` (domain/profile.ts)
 * writes the file from these. Slots: {Block} ("Morning"), {habits} ("Walk, Stretch, Take vitamins").
 */
export const REMINDERS = {
  title: 'Watering time',
  rows: { morning: 'Morning', midday: 'Midday', evening: 'Evening' },
  add: 'Add to calendar',
  helper: 'catkin can’t send notifications, so it makes a calendar event that repeats every day. Your calendar does the reminding.',
  summary: 'Watering time',
  description: '{Block} plants: {habits}.',
  descriptionEmpty: '{Block} plants.',
  alarm: 'Watering time',
  file: 'catkin-watering-time-{block}.ics',
} as const;

/** Data (§21). Slots: {count}, {habits}, {waterings}, {pets}, {date}, {habit}. */
export const DATA = {
  save: 'Save a backup',
  saved: 'Backup saved.',
  file: 'catkin-backup-{date}.json',
  copy: 'Copy backup',
  copied: 'Copied. Paste it somewhere safe, like a note to yourself.',
  import: 'Import a backup',
  preview: 'This backup has {habits} habits, {waterings} waterings and {pets} pets. Saved {date}.',
  importButton: 'Import',
  keep: 'Keep what’s here',
  imported: 'Imported. You can undo this for 24 hours.',
  undoImport: 'Undo import',
  undone: 'Back to how things were before the import.',
  snapshots: 'Daily copies, kept on this device: 7 daily and 4 weekly.',
  restoreSnapshot: 'Restore this copy',
  csv: 'Export waterings as CSV',
  csvFile: 'catkin-waterings-{date}.csv',
  /** The CSV's header row and state words (`exportCsv`). */
  csvColumns: ['date', 'habit', 'count', 'target', 'state'],
  csvStates: { watered: 'watered', tiny: 'tiny', partial: 'partial', rest: 'rest' },
  storage: { device: 'Saved on this device', tab: 'Saved in this browser tab' },
  lastBackup: 'Last backup: {date}',
  noBackup: 'No backup yet',
  nudge: 'Worth saving a backup: the last one is from {date}.',
  startOver: 'Start over',
  startOverConfirm: 'Start over? Every habit, plant and pet on this device goes. Save a backup first, just in case.',
  keepEverything: 'Keep everything',
  demo: 'Try the demo',
  leaveDemo: 'Leave the demo',
  archive: 'Archive {habit}? The plant moves to the balcony shelf, and you can bring it back anytime.',
  delete: 'Delete {habit}? The plant and its history go too.',
  keepPlant: 'Keep the plant on the balcony shelf?',
  keepOnBalcony: 'Keep it on the balcony',
  deleteEverything: 'Delete everything',
  restored: '{habit} is back on the sill. The time it spent archived counts as a pause.',
} as const;

/** Settings and the Habit Editor (§22). */
export const SETTINGS = {
  name: { label: 'Your name', helper: 'For the greeting.' },
  birthday: { label: 'Birthday', helper: 'For a small surprise on the day. Optional.' },
  weekStart: { label: 'Week starts on', helper: 'Changes apply from next week.' },
  dayStart: { label: 'Day starts at', helper: 'Late nights count towards the day before, until this time.' },
  theme: { label: 'Look', options: { auto: 'Automatic', light: 'Day', night: 'Lamplight' } },
  sounds: { label: 'Sounds', helper: 'Small real sounds: a coin, water, a purr.' },
  volume: { label: 'Volume' },
  haptics: { label: 'Haptics', helper: 'Where your device supports it.' },
  reduceMotion: { label: 'Reduce motion', options: { auto: 'Automatic', on: 'On', off: 'Off' } },
  quickOpen: { label: 'Quick open', helper: 'Skip the wait when opening capsules.' },
  quietRewards: { label: 'Quiet rewards', helper: 'Hide coins, capsules and the wallet. Just the tracker.' },
  compactToday: { label: 'Compact Today', helper: 'Smaller cards, more habits on screen.' },
  companions: { label: 'Show companions', helper: 'Show who keeps each habit company, on its card.' },
  quoteNotes: { label: 'Quote my notes in the Sunday Note', helper: 'Only notes you’ve starred.' },
  hemisphere: { label: 'Where’s your summer?', options: { north: 'June to August', south: 'December to February' } },
  reminders: { label: 'Watering time' },
  editor: {
    name: 'Name',
    icon: 'Icon',
    colour: 'Colour',
    plant: 'Plant',
    pot: 'Pot',
    howOften: { label: 'How often', options: { daily: 'Every day', days: 'On certain days', weekly: 'A few times a week', monthly: 'A few times a month' } },
    howMuch: 'How much',
    tiny: { label: 'Tiny version', placeholder: 'Shoes on, step outside' },
    effort: { label: 'About how long?', options: { light: 'Under 5 minutes', steady: '5 to 30 minutes', big: 'Longer' } },
    when: { label: 'When', options: { morning: 'Morning', midday: 'Midday', evening: 'Evening', anytime: 'Anytime' } },
    anchor: { label: 'After…', placeholder: 'After I pour my coffee' },
    polarity: { label: 'Build or avoid', options: { build: 'Do it', avoid: 'Avoid it' } },
    why: 'Why it matters',
    company: 'Who keeps it company?',
    season: 'Just this season',
    create: 'Plant it',
    save: 'Save',
    tooManyBig: '3 long habits is the most at once. Pick a shorter time, or pause one of the others.',
  },
  about: { tagline: 'Look after the little things.', explainer: 'Your habits grow the plants. The plants become a home.', how: 'How it works', credits: 'Credits', version: 'Version {version}' },
} as const;

/** The wallet sheet, "What can I get?" (§4). */
export const WALLET = {
  title: 'What can I get?',
  coins: 'Coins come from watering, and buy capsules (25 each) and new places for the Shelf.',
  stamps: 'Stamps buy No. 07 · Night and Special Orders, and come from the Showing-up ladder, Sunday Notes, Herbarium pages, pins, swaps, and growing a habit a little bigger.',
  swaps: 'Swaps come from capsules you already had, and from the small things pets leave on the sill. Every 10 make a stamp.',
  tickets: 'Tickets come from the Showing-up ladder, welcome-home days and your birthday. Each one is a free capsule from any series.',
} as const;

/** Field Guide and Special Order category names (pets as a category are "pets", §3). */
export const CATEGORY_LABELS = { pet: 'Pets', wearable: 'Wardrobe', treat: 'Treats', decor: 'Decor', plant: 'Plants', pot: 'Pots' } as const;

/**
 * Capsule notices (§10): calm, plain, with the way forward, and never a count of 0. Slots:
 * {series}, {price}, {count}, {tier}, {season}, {from}, {to}.
 */
export const CAPSULE_NOTICES = {
  coins: { some: '{series} is {price} coins a capsule. There are {count} in the jar.', one: '{series} is {price} coins a capsule. There’s 1 in the jar.', none: '{series} is {price} coins a capsule. Watering fills the jar.', link: 'Water something on Today' },
  stamps: { some: '{series} is {price} stamps. There are {count} on the card.', one: '{series} is {price} stamps. There’s 1 on the card.', none: '{series} is {price} stamps. The card fills from showing up.', link: 'Where stamps come from' },
  ticket: 'Tickets come from the Showing-up ladder, welcome-home days and your birthday.',
  away: '{season} is here from {from} to {to}.',
  awayVisited: 'Anything it has brought before can be ordered at the counter.',
  tray: 'There’s a capsule in the tray. Open that one first.',
  order: { some: 'A {tier} is {price} stamps at the counter. There are {count} on the card.', one: 'A {tier} is {price} stamps at the counter. There’s 1 on the card.', none: 'A {tier} is {price} stamps at the counter. The card fills from showing up.' },
  owned: 'Already in the Field Guide.',
  notSold: 'This one isn’t sold at the counter. It comes from showing up.',
  notVisited: 'The {season} hasn’t visited yet. Its things can be ordered once it has.',
} as const;

/** The names the M1 contract map uses for two of the groups above. */
export const PROGRESS_HERO = PROGRESS_LINES;
export const PLACES_OPENED = PLACE_LINES.opened;

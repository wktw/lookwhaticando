/**
 * The caption matrix and the sentence templates (DESIGN §12; the copy deck is docs/VOICE.md).
 *
 * Data, plus the few pure helpers that choose and fill a line. The narrator writes like a
 * plant-sitter's note: brief, kind, specific, observed. The animals never speak and never get
 * pronouns, so every pet line leads with {name}. tests/unit/voice.test.ts lints all of it.
 *
 * Caption slots:
 * - {name}   the pet's name ("Pudding")
 * - {plant}  the habit's plant, with its article ("the Read plant"; see `plantPhrase`)
 * - {habit}  the habit's name as she wrote it ("Walk")
 * - {treat}  the treat's name in lower case, without an article ("oat biscuit")
 * Other templates list their own slots. A slot filled with '' also drops the ", " before it.
 */
import type { Personality, PlantSpeciesId, Rarity, Species } from './types';
import { PERSONALITIES } from './personalities';

/* ------------------------------------------------------------------------ */
/* Lines, species filters and the contexts                                   */
/* ------------------------------------------------------------------------ */

/** A line for every species, or only for the species listed (a cud-chew is for cows). */
export type Line = string | { readonly text: string; readonly species: readonly Species[] };

const only = (species: Species | readonly Species[], text: string): Line => ({
  text,
  species: typeof species === 'string' ? [species] : species,
});

/** Mammals, for lines about fur, ears, noses, licks and yawns. */
const MAMMALS: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster'];

/**
 * When each context applies. Idle captions follow the clock (DESIGN §8.2): `tap`, `morning` and
 * `afternoon` are daytime, `evening` is under the lamp (20:00–23:00), `night` is asleep
 * (23:00–06:00), and `rainy` wins when the window shows rain. A tap after the lamp comes on uses
 * `evening` or `night` instead of `tap`. The event contexts (checkin, restDay, perfectDay,
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
  newWear: ['name'],
  resident: ['name', 'plant', 'habit'],
  newArrival: ['name'],
};

export const lineText = (line: Line): string => (typeof line === 'string' ? line : line.text);
export const fitsSpecies = (line: Line, species: Species): boolean => typeof line === 'string' || line.species.includes(species);

/* ------------------------------------------------------------------------ */
/* The caption matrix: 10 personalities × 15 contexts                        */
/* ------------------------------------------------------------------------ */

type OwnContexts = Exclude<LineContext, 'tap'>;

/**
 * Personality captions per context. Tap lines live on the personality itself
 * (`PersonalityDef.lines`) and join the matrix below. Unfiltered lines suit every species: no
 * paws, tails, ears, fur or noses unless the line carries a species filter.
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
      '{name} has been awake for a minute and would like a nap.',
    ],
    afternoon: [
      '{name} is asleep in the sunbeam, as planned.',
      '{name} moved along with the sunbeam without waking up.',
      '{name} is on the second nap of the afternoon.',
      '{name} is asleep in the exact middle of the beam.',
    ],
    evening: [
      '{name} is asleep under the lamp.',
      '{name} is dozing in the warm circle of lamplight.',
      '{name} went to bed early, and seems pleased about it.',
      '{name} opened one eye when the lamp came on.',
    ],
    night: [
      '{name} is fast asleep.',
      '{name} is asleep, feet twitching now and then.',
      '{name} is sleeping very seriously.',
      '{name} is asleep in a square of moonlight.',
    ],
    rainy: [
      '{name} is asleep to the sound of the rain.',
      '{name} has decided the rain means another nap.',
      '{name} slept through the whole shower.',
      '{name} likes a rainy afternoon, for sleeping.',
    ],
    restDay: [
      '{name} is resting too, very thoroughly.',
      '{name} approves of a rest day.',
      '{name} took the rest day seriously and has not moved.',
      '{name} is showing everyone how resting is done.',
    ],
    perfectDay: [
      '{name} slept through the whole thing, very contentedly.',
      '{name} is asleep on a fully watered sill.',
      '{name} opened one eye at all the damp soil, then closed it.',
      '{name} marked the occasion with a nap.',
    ],
    welcomeHome: [
      '{name} is asleep in the usual spot.',
      '{name} opened one eye and seems glad.',
      '{name} is asleep on the warm pot, like always.',
      '{name} woke up enough to stretch in your direction.',
    ],
    fed: [
      '{name} had the {treat} and went straight back to sleep.',
      '{name} had the {treat} lying down.',
      '{name} woke up for the {treat}, which says a lot.',
      '{name} finished the {treat} with eyes half shut.',
    ],
    fedFavourite: [
      '{name} woke up all the way for the {treat}.',
      '{name} sat up for the {treat}, which never happens.',
      '{name} had the {treat} and then stayed awake for a whole minute.',
      '{name} is fully awake. It’s the {treat}.',
    ],
    newWear: [
      '{name} fell asleep in it straight away.',
      '{name} is wearing it to nap in.',
      '{name} tried it on, lay down, and that was that.',
      '{name} kept it on through a whole nap, which is a good sign.',
    ],
    resident: [
      '{name} is asleep in {plant}.',
      '{name} naps in {plant} most afternoons now.',
      '{name} has found a sleeping spot by the rim of {plant}.',
      '{name} is asleep against the side of {plant}’s pot.',
    ],
    newArrival: [
      '{name} fell asleep within the hour.',
      '{name} has already found the warm spot.',
      '{name} is testing each pot for warmth, one nap at a time.',
      '{name} took one look round and had a nap.',
    ],
  },

  playful: {
    checkin: [
      '{name} tried to catch the stream of water.',
      '{name} jumped at the first drop.',
      '{name} is chasing a drip down the side of the pot.',
      '{name} got splashed and went round again for more.',
    ],
    morning: [
      '{name} has been up for hours, going by the state of the sill.',
      '{name} is racing the sunlight along the sill.',
      '{name} woke up and started a game straight away.',
      '{name} is having a very busy morning.',
    ],
    afternoon: [
      '{name} is chasing the edge of the sunbeam.',
      '{name} ambushed a leaf, then let it go.',
      '{name} has been hopping in and out of the sunbeam.',
      '{name} found a button and is taking it everywhere.',
    ],
    evening: [
      '{name} is chasing the lamp’s shadow round the pot.',
      '{name} has one more round in, apparently.',
      '{name} is jumping at moths that aren’t there.',
      '{name} is winding down, slowly, with one last lap.',
    ],
    night: [
      '{name} fell asleep in the middle of a game.',
      '{name} is chasing something in a dream.',
      '{name} fell asleep next to the button.',
      '{name} is finally asleep.',
    ],
    rainy: [
      '{name} is chasing raindrops down the glass.',
      '{name} is trying to catch the rain through the window.',
      '{name} races each raindrop to the bottom of the pane.',
      '{name} has made up a game with the rain.',
    ],
    restDay: [
      '{name} doesn’t know what a rest day is, and is playing anyway.',
      '{name} is playing quietly, for once.',
      '{name} is resting between games.',
      '{name} brought a button over to the resting pot.',
    ],
    perfectDay: [
      '{name} did a victory lap of the whole sill.',
      '{name} is running from pot to pot, checking the damp soil.',
      '{name} hopped onto every rim, one after the other.',
      '{name} is more excited than anyone about the watering.',
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
      '{name} played with the dish once the {treat} was gone.',
    ],
    fedFavourite: [
      '{name} did a little spin for the {treat}.',
      '{name} stopped playing for the {treat}, which says everything.',
      '{name} had the {treat} and hopped straight up afterwards.',
      '{name} is doing laps about the {treat}.',
    ],
    newWear: [
      '{name} tried to chase it first.',
      '{name} is wearing it and doing laps to show it off.',
      '{name} has decided it’s part of the game.',
      '{name} kept it on for a whole lap of the sill.',
    ],
    resident: [
      '{name} is playing hide-and-seek in {plant}.',
      '{name} jumps out of {plant} when you water.',
      '{name} keeps a button hidden in {plant}’s pot.',
      '{name} is doing laps round {plant}’s pot.',
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
      '{name} watched the water soak into the soil.',
      '{name} leaned in to see where the water went.',
      '{name} looked into the empty glass afterwards.',
      '{name} is inspecting the damp soil in {plant}.',
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
      '{name} is looking up at the lampshade, very closely.',
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
      '{name} is inspecting the resting pot to see what’s different.',
      '{name} checked the resting pot twice. It’s fine.',
      '{name} is using the rest day to look out of the window.',
      '{name} is looking round for what’s different today.',
    ],
    perfectDay: [
      '{name} went pot to pot to check the soil.',
      '{name} is inspecting all that damp soil.',
      '{name} looked into every pot, one after another.',
      '{name} noticed the whole sill is watered, and had a look at each pot.',
    ],
    welcomeHome: [
      '{name} came over to see what’s new.',
      '{name} is at the window, keeping an eye on things.',
      '{name} looked up to see who it was.',
      '{name} came over to inspect you.',
    ],
    fed: [
      '{name} inspected the {treat} from all sides first.',
      '{name} looked the {treat} over carefully, then had it.',
      '{name} finished the {treat} and checked the dish for more.',
      '{name} is investigating where the {treat} came from.',
    ],
    fedFavourite: [
      '{name} has worked out that the {treat} is the good one.',
      '{name} knew what the {treat} was before the lid was off.',
      '{name} looked at the {treat}, then at you, as if you’d finally got it right.',
      '{name} checked the pantry shelf for more of the {treat}.',
    ],
    newWear: [
      '{name} inspected it thoroughly before agreeing.',
      '{name} keeps looking at it in the window reflection.',
      '{name} is trying to see it from every angle.',
      '{name} had a good look, and kept it on.',
    ],
    resident: [
      '{name} checks {plant} for new leaves every morning.',
      '{name} watches the water go into {plant}.',
      '{name} knows every leaf on {plant}.',
      '{name} is inspecting the newest leaf on {plant}.',
    ],
    newArrival: [
      '{name} is inspecting everything, one pot at a time.',
      '{name} looked inside the coin jar first.',
      '{name} is learning the sill by heart.',
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
      '{name} moved closer to the others when the rain started.',
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
      '{name} sat in the middle of the sill, which is new.',
    ],
    welcomeHome: [
      '{name} came out from behind the pot.',
      '{name} looked up, and stayed out.',
      '{name} came a little closer than usual.',
      '{name} peeked out and blinked.',
    ],
    fed: [
      '{name} waited until you looked away, then had the {treat}.',
      '{name} took the {treat} behind the pot.',
      '{name} had the {treat} very quietly.',
      '{name} came out for the {treat}.',
    ],
    fedFavourite: [
      '{name} came all the way out for the {treat}.',
      '{name} had the {treat} right in front of you.',
      '{name} took the {treat} and sat a little closer afterwards.',
      '{name} came out for the {treat} before the dish was even down.',
    ],
    newWear: [
      '{name} tried it on behind the pot first.',
      '{name} is not sure about it yet.',
      '{name} came out wearing it, then went back in.',
      '{name} kept it on, which is a big step.',
    ],
    resident: [
      '{name} lives at the back of {plant}, mostly out of sight.',
      '{name} peeks out of {plant} when you water.',
      '{name} feels safest in {plant}.',
      '{name} is hiding in {plant}, not very well.',
    ],
    newArrival: [
      '{name} is behind the biggest pot for now.',
      '{name} peeked out once, which is a start.',
      '{name} is taking the new sill slowly.',
      '{name} found somewhere small to sit and is staying there.',
    ],
  },

  sassy: {
    checkin: [
      '{name} moved, but only just enough for the water.',
      '{name} watched the watering and had some notes.',
      '{name} is sitting in the spot you were aiming for.',
      '{name} looked at the water, then at you, unimpressed.',
    ],
    morning: [
      '{name} was up first.',
      '{name} is sitting in the only patch of morning sun, and staying.',
      '{name} is facing the other way, on purpose.',
      '{name} gave the morning a look.',
    ],
    afternoon: [
      '{name} has taken the whole sunbeam.',
      '{name} is lying across the beam so nobody else can.',
      '{name} moved to the warm pot and will not be moving again.',
      '{name} is in the sun and has no plans to share it.',
    ],
    evening: [
      '{name} has claimed the spot right under the lamp.',
      '{name} is sitting in the lamplight as if it were put there on purpose.',
      '{name} turned round twice and lay down facing away.',
      '{name} would like the lamp a little to the left.',
    ],
    night: [
      '{name} is asleep in the middle, taking up room.',
      '{name} is asleep on the best cushion.',
      '{name} is asleep and would still like some space.',
      '{name} took the warm spot and fell asleep in it.',
    ],
    rainy: [
      '{name} is watching the rain as if it were personal.',
      '{name} does not approve of the rain.',
      '{name} turned away from the window until it stops.',
      '{name} is giving the rain a long look.',
    ],
    restDay: [
      '{name} has been resting like this for years.',
      '{name} thinks every day should be a rest day.',
      '{name} is resting, and very good at it.',
      '{name} is lying on the resting pot, making a point.',
    ],
    perfectDay: [
      '{name} is taking some of the credit.',
      '{name} inspected the watering and has no notes, for once.',
      '{name} lay down in the middle of the fully watered sill.',
      '{name} looked round at all the damp soil and allowed it.',
    ],
    welcomeHome: [
      '{name} is in your spot.',
      '{name} looked over, then back at the window.',
      '{name} has the warm spot and is not giving it up.',
      '{name} accepted a hello, eventually.',
    ],
    fed: [
      '{name} had the {treat}, without comment.',
      '{name} looked at the {treat} for a long time first.',
      '{name} left exactly half of the {treat}, as a statement.',
      '{name} took the {treat} and turned away to have it.',
    ],
    fedFavourite: [
      '{name} had the {treat} and forgot to look unimpressed.',
      '{name} dropped the act for the {treat}.',
      '{name} finished every bit of the {treat}, which is a first.',
      '{name} came over quickly for the {treat}, then pretended otherwise.',
    ],
    newWear: [
      '{name} is wearing it as if it were the plan all along.',
      '{name} allowed it.',
      '{name} looks very good in it and knows.',
      '{name} kept it on, as a favour.',
    ],
    resident: [
      '{name} considers {plant} private property.',
      '{name} sits in {plant} as if it were built for the purpose.',
      '{name} lets you water {plant}.',
      '{name} runs {plant}, and everyone knows it.',
    ],
    newArrival: [
      '{name} picked the best pot and moved in.',
      '{name} walked the length of the sill as if it had always been home.',
      '{name} sat down in the middle of the sill and stayed there.',
      '{name} had a look round and chose the sunniest pot, obviously.',
    ],
  },

  gentle: {
    checkin: [
      '{name} watched the water go in, very calmly.',
      '{name} moved aside to make room for the glass.',
      '{name} stayed by {plant} while the water soaked in.',
      '{name} leaned in, then settled.',
    ],
    morning: [
      '{name} is sitting in the first light.',
      '{name} is up, quietly, with the plants.',
      '{name} is watching the morning come in.',
      '{name} is going from pot to pot, slowly.',
    ],
    afternoon: [
      '{name} is sharing the sunbeam with everyone.',
      '{name} is lying in the beam, leaving room for others.',
      '{name} is watching the shadows of the leaves.',
      '{name} is resting in the warm, very still.',
    ],
    evening: [
      '{name} is lying close to the lamp.',
      '{name} is sitting in the lamplight with everyone else.',
      '{name} settled in beside you.',
      '{name} is watching the window go dark.',
    ],
    night: [
      '{name} is asleep beside a friend.',
      '{name} fell asleep keeping someone company.',
      '{name} is asleep with a friend for a pillow.',
      '{name} is asleep by the pots.',
    ],
    rainy: [
      '{name} is sitting close to the others while it rains.',
      '{name} is watching the rain, quite content.',
      '{name} likes the rain on the glass.',
      '{name} moved nearer the smallest one when the rain came.',
    ],
    restDay: [
      '{name} is keeping the resting pot company.',
      '{name} is resting too, close by.',
      '{name} thinks this is a good day for sitting still.',
      '{name} is lying by the resting pot, quite content.',
    ],
    perfectDay: [
      '{name} is sitting between the pots, very pleased.',
      '{name} looked at each pot, then settled.',
      '{name} is quietly pleased about the whole sill.',
      '{name} went and sat by each plant in turn.',
    ],
    welcomeHome: [
      '{name} came over and sat beside you.',
      '{name} leaned in, just for a moment.',
      '{name} is right here.',
      '{name} moved over to make room.',
    ],
    fed: [
      '{name} had the {treat} slowly.',
      '{name} left a little of the {treat} for someone smaller.',
      '{name} took the {treat} very gently.',
      '{name} finished the {treat} and settled down beside you.',
    ],
    fedFavourite: [
      '{name} had the {treat} with eyes closed, very content.',
      '{name} leaned against you after the {treat}.',
      '{name} took the {treat} and stayed close.',
      '{name} had the {treat} slowly, to make it last.',
    ],
    newWear: [
      '{name} held very still while you put it on.',
      '{name} is wearing it carefully.',
      '{name} seems to like it.',
      '{name} kept it on and didn’t fuss.',
    ],
    resident: [
      '{name} sits with {plant} most of the day.',
      '{name} is keeping {plant} company.',
      '{name} lies at the foot of {plant}’s pot.',
      '{name} settles by {plant} whenever you water it.',
    ],
    newArrival: [
      '{name} settled in straight away.',
      '{name} sat down next to the smallest pot.',
      '{name} is getting to know everyone, slowly.',
      '{name} found a quiet spot and is watching the light.',
    ],
  },

  foodie: {
    checkin: [
      '{name} checked whether the water was for drinking.',
      '{name} watched the glass in case it was milk.',
      '{name} looked hopefully at the glass.',
      '{name} came over, saw it was only water, and left.',
    ],
    morning: [
      '{name} is up and waiting by the pantry.',
      '{name} has been sitting by the dish since first light.',
      '{name} knows the pantry restocks in the morning.',
      '{name} is watching the basket very closely this morning.',
    ],
    afternoon: [
      '{name} is asleep by the pantry, just in case.',
      '{name} is in the sunbeam, facing the treats.',
      '{name} is thinking about the next meal.',
      '{name} has been checking the basket every hour.',
    ],
    evening: [
      '{name} is waiting by the dish for supper.',
      '{name} heard the cupboard and is on the way.',
      '{name} is under the lamp, next to the biscuit tin.',
      '{name} would like one more thing before bed.',
    ],
    night: [
      '{name} is asleep next to the empty dish.',
      '{name} is dreaming about something good to eat, by the look of it.',
      '{name} fell asleep facing the pantry.',
      '{name} is asleep with a crumb nearby.',
    ],
    rainy: [
      '{name} thinks rain calls for a snack.',
      '{name} is watching the rain from beside the biscuit tin.',
      '{name} is sitting near the treats until the rain stops.',
      '{name} is waiting out the rain by the pantry.',
    ],
    restDay: [
      '{name} would like the rest day to include a snack.',
      '{name} is resting near the pantry, sensibly.',
      '{name} is spending the rest day by the dish.',
      '{name} rests best after something to eat.',
    ],
    perfectDay: [
      '{name} thinks a fully watered sill calls for a treat.',
      '{name} is by the pantry, in case there’s a celebration.',
      '{name} is sitting by the dish, expectantly.',
      '{name} heard the coins go in the jar and came over, hopeful.',
    ],
    welcomeHome: [
      '{name} came over, checking your hands for treats.',
      '{name} is sitting by the dish.',
      '{name} looked at you, then at the pantry.',
      '{name} came straight over, hopeful.',
    ],
    fed: [
      '{name} finished the {treat} and checked for more.',
      '{name} finished the {treat} in no time.',
      '{name} had the {treat} and is looking at the pantry.',
      '{name} had the {treat} and would like another.',
    ],
    fedFavourite: [
      '{name} has been waiting for the {treat} all day.',
      '{name} had the {treat} with total concentration.',
      '{name} knew it was the {treat} from across the sill.',
      '{name} is still thinking about the {treat}.',
    ],
    newWear: [
      '{name} checked it for crumbs.',
      '{name} tried to eat it, then wore it.',
      '{name} is wearing it, and hoping it came with a snack.',
      '{name} would have preferred a biscuit, but will wear it.',
    ],
    resident: [
      '{name} keeps an eye on the pantry from {plant}.',
      '{name} naps in {plant}, close to the treats.',
      '{name} keeps a crumb or two in {plant}’s pot.',
      '{name} waits in {plant} for the morning restock.',
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
      '{name} watched the watering as if it were a play.',
      '{name} leapt back from the water, then came to watch.',
      '{name} lay down across {plant}’s pot, overcome.',
      '{name} stood very tall to look at the water.',
    ],
    morning: [
      '{name} greeted the morning as if it were a surprise.',
      '{name} stretched, at great length, for an audience.',
      '{name} is in the first light, looking noble.',
      '{name} would like everyone to know it’s morning.',
    ],
    afternoon: [
      '{name} is draped across the sunbeam.',
      '{name} is lying in the beam like a painting.',
      '{name} lay down across the whole beam.',
      '{name} is posing in the sun for nobody in particular.',
    ],
    evening: [
      '{name} is lying under the lamp as if it were a spotlight.',
      '{name} sighed at the sunset.',
      '{name} made a big show of getting comfortable.',
      '{name} turned round four times before lying down.',
    ],
    night: [
      '{name} is asleep in a very theatrical position.',
      '{name} fell asleep in the middle of a sigh.',
      '{name} is asleep, sprawled across more room than seems possible.',
      '{name} is asleep with great commitment.',
      only(['cat', 'dog', 'bunny', 'bear', 'hamster'], '{name} is asleep belly up, feet in the air.'),
    ],
    rainy: [
      '{name} sighed very loudly at the rain.',
      '{name} is at the window, watching the rain like someone in a film.',
      '{name} pressed up against the glass to watch the rain, tragically.',
      '{name} is taking the rain very hard.',
    ],
    restDay: [
      '{name} is resting as if it were a full-time job.',
      '{name} lay down across the resting pot and sighed.',
      '{name} is resting in a very visible spot.',
      '{name} is resting, and would like that acknowledged.',
    ],
    perfectDay: [
      '{name} lay down in the middle of the fully watered sill, overcome.',
      '{name} watched the last watering like a finale.',
      '{name} stood up very straight for the last watering.',
      '{name} is treating the whole sill as a stage today.',
    ],
    welcomeHome: [
      '{name} made an entrance.',
      '{name} came over and lay down right in front of you.',
      '{name} greeted you with a lot of feeling.',
      '{name} is doing a big stretch, for you specifically.',
    ],
    fed: [
      '{name} received the {treat} like an award.',
      '{name} had the {treat} and lay down, overwhelmed.',
      '{name} looked at the {treat} for a long, meaningful moment.',
      '{name} had the {treat} with a great deal of ceremony.',
    ],
    fedFavourite: [
      '{name} gave the {treat} a standing ovation, more or less.',
      '{name} had the {treat} and had to lie down, overcome.',
      '{name} has never been happier, going by the display.',
      '{name} took the {treat} with enormous feeling.',
    ],
    newWear: [
      '{name} is modelling it in the window light.',
      '{name} walked the length of the sill to show it off.',
      '{name} struck a pose.',
      '{name} wore it into the light, where it could be seen.',
    ],
    resident: [
      '{name} treats {plant} as a stage.',
      '{name} makes an entrance from {plant} every time you water.',
      '{name} lies across {plant}’s pot at the best angle.',
      '{name} poses in {plant} in the afternoon light.',
    ],
    newArrival: [
      '{name} made quite an entrance.',
      '{name} is surveying the sill from the tallest pot.',
      '{name} lay down in the middle of the sill to be seen.',
      '{name} is taking in the new place, dramatically.',
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
      '{name} has followed the sun from one end of the sill to the other.',
      '{name} is warm all the way through.',
      '{name} is basking, eyes shut.',
    ],
    evening: [
      '{name} followed the last of the sun, then the lamp.',
      '{name} is sitting where the sun was, still warm.',
      '{name} moved into the lamplight, the next best thing.',
      '{name} watched the sun go down behind the roofs.',
    ],
    night: [
      '{name} is asleep, facing the window for the morning.',
      '{name} fell asleep under the lamp, as close as possible.',
      '{name} is asleep in the warmest place left.',
      '{name} is asleep in a patch of moonlight, which will do.',
    ],
    rainy: [
      '{name} is waiting for the sun to come out.',
      '{name} is sitting where the sun would be.',
      '{name} is under the lamp until the rain stops.',
      '{name} is watching for a break in the clouds.',
    ],
    restDay: [
      '{name} is spending the rest day in the warmest spot.',
      '{name} rests best in a sunbeam.',
      '{name} is lying next to the resting pot, where the sun comes in.',
      '{name} is resting in the warm spot by the window.',
    ],
    perfectDay: [
      '{name} is stretched out along the row of damp pots.',
      '{name} is lying in the light, and so is the whole sill.',
      '{name} moved to the warmest spot to celebrate.',
      '{name} turned to face the window, very pleased.',
    ],
    welcomeHome: [
      '{name} is in the warm spot, and there’s room for you.',
      '{name} looked up from the warm spot by the window.',
      '{name} is sitting in the warm patch by the window.',
      '{name} is facing the window, eyes half shut, as usual.',
    ],
    fed: [
      '{name} took the {treat} over to the window.',
      '{name} had the {treat} by the window.',
      '{name} is having the {treat} in the warmest spot.',
      '{name} finished the {treat}, then went back to basking.',
    ],
    fedFavourite: [
      '{name} had the {treat} by the window, eyes half shut.',
      '{name} carried the {treat} to the brightest part of the sill.',
      '{name} is basking, full of the {treat}.',
      '{name} would like the {treat} and the sun, always.',
    ],
    newWear: [
      '{name} is wearing it in the light, where it looks best.',
      '{name} went straight to the window to see it in the light.',
      '{name} is warm in it.',
      '{name} kept it on in the warm spot, which is saying something.',
    ],
    resident: [
      '{name} likes {plant} because it gets the morning sun.',
      '{name} basks on the rim of {plant}’s pot.',
      '{name} follows the sun round {plant} all day.',
      '{name} lies in {plant}’s patch of light.',
    ],
    newArrival: [
      '{name} found the warmest spot in under a minute.',
      '{name} is working out which pot gets the most sun.',
      '{name} went straight to the window.',
      '{name} is lying by the window, already at home.',
    ],
  },

  dreamy: {
    checkin: [
      '{name} is watching the last drop hang off the glass.',
      '{name} noticed the watering a little late.',
      '{name} is watching the ripples in the glass.',
      '{name} looked up from somewhere else entirely, then back.',
    ],
    morning: [
      '{name} is still half in a dream.',
      '{name} is watching the mist on the window.',
      '{name} is watching the light come in, slowly.',
      '{name} woke up and is watching the sky change colour.',
    ],
    afternoon: [
      '{name} is following a cloud across the window.',
      '{name} is lying in the beam, watching the shadows of the leaves.',
      '{name} is gazing at the sky through the top of the window.',
      '{name} is miles away, in the sun.',
    ],
    evening: [
      '{name} is watching for the first star.',
      '{name} is watching the lamplight in the window glass.',
      '{name} is gazing at the dark window, where the room is reflected.',
      '{name} is watching the sky go lilac.',
    ],
    night: [
      '{name} is asleep and dreaming, by the look of it.',
      '{name} fell asleep looking at the moon.',
      '{name} is asleep and dreaming about clouds, probably.',
      '{name} is asleep, somewhere far away.',
    ],
    rainy: [
      '{name} is watching raindrops race down the glass.',
      '{name} is listening to the rain, eyes closed.',
      '{name} is watching the street go shiny in the rain.',
      '{name} picked one raindrop and followed it down.',
    ],
    restDay: [
      '{name} is daydreaming, which is a kind of resting.',
      '{name} spent the rest day watching the clouds.',
      '{name} is resting and gazing at the sky.',
      '{name} likes a slow day like this.',
    ],
    perfectDay: [
      '{name} is gazing at the sill as if it were a painting.',
      '{name} noticed the whole sill is watered, eventually.',
      '{name} is watching the light on all the wet leaves.',
      '{name} is lying very still, quietly amazed.',
    ],
    welcomeHome: [
      '{name} looked up slowly, and blinked.',
      '{name} was watching the clouds, and now you.',
      '{name} drifted over.',
      '{name} is gazing out of the window, as ever.',
    ],
    fed: [
      '{name} had the {treat}, thinking about something else.',
      '{name} forgot about the {treat} halfway, then remembered.',
      '{name} had the {treat} very slowly, watching the window.',
      '{name} finished the {treat} and went back to the clouds.',
    ],
    fedFavourite: [
      '{name} came back down to earth for the {treat}.',
      '{name} had the {treat} slowly, eyes closed.',
      '{name} is dreaming about the {treat} now.',
      '{name} paid full attention to the {treat}, for once.',
    ],
    newWear: [
      '{name} hasn’t noticed it yet.',
      '{name} noticed it after a while, and seemed pleased.',
      '{name} is wearing it and gazing at the window reflection.',
      '{name} wore it straight into a daydream.',
    ],
    resident: [
      '{name} watches the sky from {plant}.',
      '{name} naps in {plant} and dreams.',
      '{name} lies under {plant}, watching the leaves move.',
      '{name} likes the shade {plant} makes.',
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
 * species-neutral lines plus the true behaviours: a slow blink for cats, a cud-chew for cows,
 * a throat puff for frogs, a nose twitch for rabbits, cheek-stuffing for hamsters, a tail wag
 * for dogs, a wing stretch for ducks and sitting up for bears.
 */
export const SHARED_CAPTIONS: Readonly<Record<LineContext, readonly Line[]>> = {
  tap: [
    '{name} looked up.',
    '{name} did a small hop and settled again.',
    '{name} blinked at you.',
    only('cat', '{name} gave you a slow blink.'),
    only('cow', '{name} is chewing the cud, eyes half shut.'),
    only('frog', '{name}’s throat puffed out, twice.'),
    only('bunny', '{name}’s nose is twitching at full speed.'),
    only('hamster', '{name} has both cheeks full of something.'),
    only('dog', '{name} wagged, the whole back half.'),
    only('duck', '{name} stretched one wing out, then folded it away.'),
    only('bear', '{name} sat up to see better.'),
  ],
  checkin: [
    '{name} looked up at the sound of the water.',
    '{name} watched the glass tip.',
    '{name} moved a little closer to {plant}.',
    only('cat', '{name} gave the watering a slow blink.'),
    only('cow', '{name} kept chewing the cud through the watering.'),
    only('frog', '{name} gave a throat puff at the splash.'),
    only('bunny', '{name}’s nose twitched at the wet soil.'),
    only('hamster', '{name} watched from the rim, cheeks full.'),
    only('dog', '{name} wagged at the water.'),
    only('duck', '{name} stretched a wing towards the water.'),
    only('bear', '{name} sat up to watch the water go in.'),
  ],
  morning: [
    '{name} stretched, front half first, then the back.',
    '{name} is up with the light.',
    '{name} is watching the morning come in over the roofs.',
    only('cat', '{name} is having a morning wash.'),
    only('cow', '{name} is chewing the cud in the morning light.'),
    only('frog', '{name}’s throat is going in and out in the cool air.'),
    only('bunny', '{name} is doing morning laps, nose twitching.'),
    only('hamster', '{name} is filling both cheeks for later.'),
    only('dog', '{name} is wagging at the morning.'),
    only('duck', '{name} is stretching a wing and a leg on the same side.'),
    only('bear', '{name} sat up and looked at the morning.'),
  ],
  afternoon: [
    '{name} is in the sunbeam.',
    '{name} moved along the sill with the light.',
    '{name} is warm and very still.',
    only('cat', '{name} is loafing in the beam.'),
    only('cow', '{name} is lying in the sun, chewing the cud.'),
    only('frog', '{name} is sitting in the sun, throat pulsing.'),
    only('bunny', '{name} is stretched out flat in the sun, nose twitching.'),
    only('hamster', '{name} is in the sun, cheeks full.'),
    only('dog', '{name} is asleep in the beam, tail thumping now and then.'),
    only('duck', '{name} is sunning one wing, stretched right out.'),
    only('bear', '{name} is sitting up in the sun like a small person.'),
  ],
  evening: [
    '{name} is under the lamp.',
    '{name} is settling down for the evening.',
    '{name} moved into the lamplight.',
    only('cat', '{name} slow-blinked at the lamp.'),
    only('cow', '{name} is lying under the lamp, chewing the cud.'),
    only('frog', '{name} is under the lamp, where the moths go.'),
    only('bunny', '{name}’s nose is twitching at the evening air.'),
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
    only('dog', '{name} is asleep, tail thumping once in a dream.'),
    only('duck', '{name} is asleep, head tucked under one wing.'),
    only('bear', '{name} fell asleep sitting up, then slowly less so.'),
  ],
  rainy: [
    '{name} is watching the rain.',
    '{name} is listening to the rain on the glass.',
    '{name} is sitting close to the window in the rain.',
    only('cat', '{name} gave the rain a slow blink.'),
    only('cow', '{name} is chewing the cud, watching the rain.'),
    only('frog', '{name} puffed up at the rain, delighted.'),
    only('bunny', '{name}’s nose is twitching at the smell of rain.'),
    only('hamster', '{name} is stocking up, cheeks full, in case the rain goes on.'),
    only('dog', '{name} wagged at the rain, in case it wants to play.'),
    only('duck', '{name} is stretching a wing, clearly wanting to be out in it.'),
    only('bear', '{name} sat up to watch the rain.'),
  ],
  restDay: [
    '{name} is resting too.',
    '{name} is lying by the resting pot.',
    '{name} is having a slow day.',
    only('cat', '{name} gave the resting pot a slow blink.'),
    only('cow', '{name} is lying down and chewing the cud, which is resting, for a cow.'),
    only('frog', '{name} is sitting very still, throat going in and out.'),
    only('bunny', '{name} is lying flat, nose twitching slowly.'),
    only('hamster', '{name} is resting with both cheeks full, just in case.'),
    only('dog', '{name} is resting, tail giving a slow wag now and then.'),
    only('duck', '{name} stretched a wing and settled down again.'),
    only('bear', '{name} is sitting up, resting.'),
  ],
  perfectDay: [
    '{name} looked along the whole watered sill.',
    '{name} is out on the sill with everyone.',
    '{name} settled down on a fully watered sill.',
    only('cat', '{name} slow-blinked at the whole sill.'),
    only('cow', '{name} is chewing the cud, very satisfied.'),
    only('frog', '{name}’s throat puffed out, pleased.'),
    only('bunny', '{name} did a little jump, nose twitching.'),
    only('hamster', '{name} is stuffing both cheeks to celebrate.'),
    only('dog', '{name} is wagging at every pot.'),
    only('duck', '{name} stretched both wings out wide.'),
    only('bear', '{name} sat up to see the whole sill.'),
  ],
  welcomeHome: [
    '{name} looked up.',
    '{name} is in the usual spot.',
    '{name} is on the sill, as ever.',
    only('cat', '{name} gave you a long slow blink.'),
    only('cow', '{name} looked up, still chewing the cud.'),
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
    only('cat', '{name} finished the {treat} and gave a slow blink.'),
    only('cow', '{name} had the {treat}, then went back to chewing the cud.'),
    only('frog', '{name} had the {treat}, throat puffing.'),
    only('bunny', '{name} had the {treat}, nose going the whole time.'),
    only('hamster', '{name} had the {treat}, then checked both cheeks.'),
    only('dog', '{name} had the {treat} and wagged.'),
    only('duck', '{name} had the {treat} and stretched a wing.'),
    only('bear', '{name} sat up to have the {treat}.'),
  ],
  fedFavourite: [
    '{name} knows the {treat} is the good one.',
    '{name} finished every bit of the {treat}.',
    '{name} is very content after the {treat}.',
    only('cat', '{name} slow-blinked over the {treat}.'),
    only('cow', '{name} had the {treat} and did a nose-lick.'),
    only('frog', '{name} puffed right up for the {treat}.'),
    only('bunny', '{name} did a little jump for the {treat}.'),
    only('hamster', '{name} packed away the {treat}, both cheeks.'),
    only('dog', '{name} wagged all the way through the {treat}.'),
    only('duck', '{name} stretched both wings wide for the {treat}.'),
    only('bear', '{name} sat up and held the {treat} in both paws.'),
  ],
  newWear: [
    '{name} is wearing it.',
    '{name} looks well in it.',
    '{name} kept it on.',
    only('cat', '{name} gave it a slow blink and kept it on.'),
    only('cow', '{name} chewed the cud and wore it, calmly.'),
    only('frog', '{name} puffed out, which seems to mean yes.'),
    only('bunny', '{name}’s nose twitched at it, then settled.'),
    only('hamster', '{name} tried to fit it in a cheek, then wore it.'),
    only('dog', '{name} wagged in it.'),
    only('duck', '{name} stretched a wing to show it off.'),
    only('bear', '{name} sat up to show it off.'),
  ],
  resident: [
    '{name} keeps {plant} company.',
    '{name} lives in {plant} now.',
    '{name} is in {plant}, as usual.',
    only('cat', '{name} slow-blinks from {plant} when you water it.'),
    only('cow', '{name} chews the cud in the shade of {plant}.'),
    only('frog', '{name} sits in {plant}’s saucer, throat going.'),
    only('bunny', '{name} sits by {plant}, nose twitching at every new leaf.'),
    only('hamster', '{name} fills both cheeks and naps in {plant}.'),
    only('dog', '{name} lies by {plant} and wags when you water it.'),
    only('duck', '{name} stretches a wing in {plant} every morning.'),
    only('bear', '{name} sits up in {plant} to watch you water.'),
  ],
  newArrival: [
    '{name} is looking round the new sill.',
    '{name} is getting to know the place.',
    '{name} has found a first favourite spot.',
    only('cat', '{name} gave the sill a slow blink, which is a good sign.'),
    only('cow', '{name} lay down and started chewing the cud, which means settled.'),
    only('frog', '{name} found the damp soil and puffed out.'),
    only('bunny', '{name} is checking every pot, nose twitching.'),
    only('hamster', '{name} is filling both cheeks from the treat dish.'),
    only('dog', '{name} wagged at everyone on the sill.'),
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

function captionPool(context: LineContext, personality: Personality, species: Species): Weighted[] {
  const pool = new Map<string, number>();
  const add = (lines: readonly Line[], weight: number) => {
    for (const line of lines) if (fitsSpecies(line, species) && !pool.has(lineText(line))) pool.set(lineText(line), weight);
  };
  add(CAPTIONS[personality][context], OWN_WEIGHT);
  add(SHARED_CAPTIONS[context], 1);
  return [...pool].map(([text, weight]) => ({ text, weight }));
}

/** Every line a pet of this personality and species may get in a context. */
export function linesFor(context: LineContext, personality: Personality, species: Species): string[] {
  return captionPool(context, personality, species).map((l) => l.text);
}

/**
 * Picks a caption template for a pet. `recent` is this context's recent picks (the returned
 * templates, oldest first); none of the last 5 comes back while there's another choice. `seed`
 * is any number: a counter, a hash of the day, or Math.random(). Fill the result with `fillLine`.
 */
export function pickLine(context: LineContext, personality: Personality, species: Species, seed: number, recent: readonly string[] = []): string {
  return pickWeighted(captionPool(context, personality, species), seed, recent);
}

/** The same rule for any other list of lines (asides, Known for, greetings). */
export function pickFrom(lines: readonly Line[], species: Species, seed: number, recent: readonly string[] = []): string {
  const texts = new Set(lines.filter((line) => fitsSpecies(line, species)).map(lineText));
  return pickWeighted([...texts].map((text) => ({ text, weight: 1 })), seed, recent);
}

/** Fills {slots}. An empty value also drops the ", " before it ("Good morning, {userName}." → "Good morning."). */
export function fillLine(template: string, slots: Readonly<Record<string, string | number>>): string {
  let out = template;
  for (const [key, value] of Object.entries(slots)) {
    const text = String(value);
    if (text === '') out = out.split(`, {${key}}`).join('');
    out = out.split(`{${key}}`).join(text);
  }
  return out;
}

/** "the Read plant": a habit's plant, as captions name it. */
export const plantPhrase = (habitName: string): string => `the ${habitName} plant`;

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

/** Names that take no article: mass nouns ("Barley Tea") and plurals ("Blueberries"). */
const NO_ARTICLE = new Set([
  'Barley Tea', 'Cat Grass', 'Catnip', 'Fresh Clover', 'Frozen Yoghurt', 'Gingerbread', 'Honey Toast', 'Lavender',
  'Lavender Shortbread', 'Pumpkin Purée', 'Strawberry Milk', 'Warm Oats', 'Watermelon',
]);
/** Singular names that happen to end in s. */
const SINGULAR_S = new Set(['Golden Pothos']);

/** "a Belted Galloway", "an Orange Tabby", "Blueberries", "The Window Seat". Capitalised with `capital`. */
export function withArticle(name: string, capital = false): string {
  const plural = /[^s]s$/.test(name) && !SINGULAR_S.has(name);
  if (name.startsWith('The ') || NO_ARTICLE.has(name) || plural) return name;
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
  unchecked: '{habit}, unchecked. The {coins} coins went back in the jar.',
  uncheckedOne: '{habit}, unchecked. The coin went back in the jar.',
  uncheckedSpent: '{habit}, unchecked. The coins were already spent, and stay spent.',
  uncheckedNoCoins: '{habit}, unchecked.',
  undo: 'Undo',
  addNote: 'Add a note',
  noted: 'Noted.',
  rest: '{habit} is resting today. Nothing here wilts.',
  restUndo: '{habit} is back on for today.',
  offDay: 'Today’s off. Every plant is resting, and nothing wilts.',
  offDayUndo: 'Today’s back on.',
  paused: '{habit} is resting until {date}.',
  pausedOpen: '{habit} is resting until you resume it.',
  resumed: '{habit} is back on the sill.',
} as const;

/** How often a check-in toast gets an aside (about 1 in 4). */
export const ASIDE_CHANCE = 0.25;

/**
 * The toast's optional aside, from the habit's companion or whoever is nearest ("Walk, watered.
 * +5 · Pudding opened one eye."). `asleep` is for 23:00–06:00 and for pets mid-nap.
 */
export const CHECKIN_ASIDES: Readonly<{ awake: readonly Line[]; asleep: readonly Line[] }> = {
  awake: [
    '{name} looked up.',
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
    '{name} sighed and slept on.',
    only('cat', '{name} twitched an ear, asleep.'),
    only('cow', '{name} kept chewing, eyes shut.'),
    only('dog', '{name}’s tail thumped once.'),
    only('duck', '{name} stayed tucked under one wing.'),
    only('hamster', '{name} is up anyway. Hamsters keep late hours.'),
  ],
};

/* ------------------------------------------------------------------------ */
/* Plants                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * One line per stage, Cutting (0) to Evergreen (7), for the toast or banner when a plant
 * reaches it. Slot: {habit}.
 */
export const STAGE_LINES: readonly string[] = [
  'Your {habit} plant is a cutting in a glass of water. It roots with the first watering.',
  'White roots are showing in the glass. Your {habit} plant is rooting.',
  'Your {habit} plant is potted up.',
  'Your {habit} plant has put out new leaves.',
  'Your {habit} plant has a bud.',
  'Your {habit} plant is in flower.',
  'Your {habit} plant is spilling over the rim of the pot.',
  'Your {habit} plant is Evergreen. There’s a small brass watering can on the pot now.',
];

/** The same moments in the past tense, for notes ("The Read plant was potted up on Thursday."). */
export const STAGE_EVENTS: readonly string[] = [
  'was planted as a cutting',
  'put down roots',
  'was potted up',
  'put out new leaves',
  'showed a first bud',
  'opened a first flower',
  'spilled over the rim',
  'turned Evergreen',
];

/** Habit Detail's forecast (DESIGN §9.2): counted in waterings, never a deadline. Slots: {count}, {stage}, {date}. */
export const STAGE_FORECAST = {
  one: '1 more watering to {stage}.',
  other: '{count} more waterings to {stage}, around {date}.',
  evergreen: 'Evergreen. Small visitors arrive from here on.',
} as const;

/** What Blooming looks like for each species: foliage plants "bloom" as their peak form (DESIGN §5.5). Slot: {habit}. */
export const BLOOM_LINES: Readonly<Record<PlantSpeciesId, string>> = {
  pothos: 'Your {habit} plant is trailing past the edge of the sill.',
  pilea: 'Your {habit} plant has a crown of round leaves, and a small pup at the base.',
  begonia: 'Your {habit} plant has pink flowers under the spotted leaves.',
  snakeplant: 'Your {habit} plant has sent up a spike of small cream flowers, which snake plants hardly ever do.',
  catgrass: 'Your {habit} plant is thick and tall enough to lie in.',
  monstera: 'Your {habit} plant has opened its first split leaf.',
  strawberry: 'Your {habit} plant has white flowers and the first small berries.',
  lavender: 'Your {habit} plant has purple spikes, and the sill smells of lavender.',
  catnip: 'Your {habit} plant has small white flowers at the tips.',
  hoya: 'Your {habit} plant has a cluster of star-shaped flowers.',
  orchid: 'Your {habit} plant has opened the first flower on the long stem.',
  calathea: 'Your {habit} plant has a new striped leaf, and folds up every evening.',
  violet: 'Your {habit} plant has small purple flowers above the soft leaves.',
  tulip: 'Your {habit} plant has opened a single cup.',
  xmascactus: 'Your {habit} plant is flowering pink at the tips of the stems.',
  sunflower: 'Your {habit} plant has opened one flower, turned towards the window.',
};

/** After Evergreen, every +60 sunshine brings a permanent visitor, in this order (DESIGN §5.5). Slot: {habit}. */
export const FLOURISH_LINES: readonly string[] = [
  'A ladybird has moved into your {habit} plant.',
  'A bee visits your {habit} plant now.',
  'A small snail lives on your {habit} plant’s pot.',
  'A butterfly stops at your {habit} plant most afternoons.',
  'Your {habit} plant has started to trail.',
  'Moss has grown round the foot of your {habit} plant.',
  'Your {habit} plant has a second shoot.',
  'Your {habit} plant has a ribbon tied round the pot.',
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
 * The line on the paper insert. Slots: {series} ("No. 02 · Cows"), {A} / {a} (the item with its
 * article, capitalised or not; see `withArticle`). The item's flavor text follows on its own line.
 */
export const REVEAL_LINES: Readonly<Record<Rarity, readonly string[]>> = {
  common: ['{series}. {A}.'],
  uncommon: ['{series}. {A}, one of the Specials.'],
  rare: ['{series}. A Rare: {a}.'],
  ultra: ['{series}. A Super rare: {a}.'],
};

/**
 * The Secret reveal: the one exclamation mark catkin has. Slots: {series}, {A}, {secretLine}
 * (from SECRET_LINES).
 */
export const SECRET_REVEAL = '{series}, the secret one! {A}, {secretLine}';

/** One observed line per series Secret, finishing the SECRET_REVEAL sentence. */
export const SECRET_LINES: Readonly<Record<string, string>> = {
  'pet-cat-mainecoon': 'with tufted ears and a tail as long as the rest put together.',
  'pet-cow-highland': 'about the size of your thumb, who would like somewhere soft.',
  'pet-dog-samoyed': 'white all over, and already shedding a little on the sill.',
  'pet-duck-mandarin': 'orange sails up, in colours that look painted on by hand.',
  'pet-bunny-angora': 'mostly fluff, with a nose in there somewhere, twitching.',
  'pet-bear-spectacled': 'with cream rings round the eyes and a very studious stare.',
  'pet-cow-nightsky': 'with the whole night sky for patches, and one star right on the nose.',
  'pet-cow-spice': 'cream with pumpkin-spice patches, and already lying in the leaves.',
  'pet-duck-eider': 'the size of an egg cup, and softer than anything else on the sill.',
  'pet-cat-birman': 'with lilac points, white mittens, and blue eyes on you already.',
  'pet-duck-crested': 'with a pom-pom of feathers that wobbles a moment after every nod.',
  'pet-frog-golden': 'waving one front foot, the way golden frogs do.',
};

/** Duplicates (DESIGN §7.2). Slots: {item}, {swaps}, {name} (the pet who already lives here). */
export const DUPLICATE_LINES = {
  item: 'Another {item}. Onto the swap shelf · +{swaps} swaps',
  pet: 'Another {item}. Onto the swap shelf · +{swaps} swaps · {name} +20 friendship',
  /** Every 10 swaps make a stamp. Slot: {count} (stamps). */
  toStamp: 'The swap shelf is full: 10 swaps, traded for 1 stamp.',
  toStamps: 'The swap shelf filled up: {count} stamps, onto the card.',
} as const;

/* ------------------------------------------------------------------------ */
/* Friendship                                                                */
/* ------------------------------------------------------------------------ */

/**
 * Plain names for friendship levels 1–10 and bond levels 11–15 (DESIGN §8.2), with the line that
 * announces each. Levels change behaviour, so the line says what the pet does now. Slots: {name},
 * {friend} (level 8: the pet's best friend on the sill).
 */
export const FRIENDSHIP_LEVELS: readonly { level: number; name: string; lines: readonly Line[] }[] = [
  { level: 1, name: 'New here', lines: ['{name} is new here.'] },
  { level: 2, name: 'Looks up', lines: ['{name} looks up when you water now.'] },
  {
    level: 3,
    name: 'Knows you',
    lines: [
      only('cat', '{name} slow-blinks back at you now.'),
      only('cow', '{name} does a nose-lick when you say hello now.'),
      only(['dog', 'bunny', 'frog', 'bear', 'hamster', 'duck'], '{name} blinks back at you now.'),
    ],
  },
  { level: 4, name: 'Has a favourite spot', lines: ['{name} has claimed a favourite spot on the sill.'] },
  { level: 5, name: 'Follows the sun', lines: ['{name} follows the sunbeam along the sill now.'] },
  { level: 6, name: 'Brings you things', lines: ['{name} leaves small things on the sill now, on days you water. A button, a leaf, a bead.'] },
  { level: 7, name: 'Naps near you', lines: ['{name} naps against the edge of the screen now, as close to you as possible.'] },
  { level: 8, name: 'Has a best friend', lines: ['{name} naps next to {friend} now, most afternoons.'] },
  { level: 9, name: 'Always nearby', lines: ['{name} is usually within reach now.'] },
  { level: 10, name: 'Best friends', lines: ['{name} and you are best friends. There’s a small brass tag to show it.'] },
  { level: 11, name: 'Old friends', lines: ['{name} and you: old friends. A new Memory on the Pet Card.'] },
  { level: 12, name: 'Part of the furniture', lines: ['{name} is part of the furniture now. A new Memory on the Pet Card.'] },
  { level: 13, name: 'Family', lines: ['{name} is family. A new Memory on the Pet Card.'] },
  { level: 14, name: 'One of the household', lines: ['{name} is one of the household. A new Memory on the Pet Card.'] },
  { level: 15, name: 'Kin', lines: ['{name} and you are kin. A new Memory on the Pet Card.'] },
];

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
  lotus: 'mind', pray: 'mind', smile: 'mind',
  palette: 'create', yarn: 'create', music: 'create', camera: 'create',
  broom: 'tidy', 'sparkle-clean': 'tidy', bathtub: 'tidy', laundry: 'tidy', dishes: 'tidy', house: 'tidy', wrench: 'tidy',
  salad: 'cook', apple: 'cook', cart: 'cook',
  skincare: 'care', tooth: 'care', vitamins: 'care', paw: 'care',
  'piggy-bank': 'plan', calendar: 'plan', star: 'plan', journal: 'plan',
  phone: 'connect', 'heart-date': 'connect', gift: 'connect',
  'watering-can': 'garden', leaf: 'garden', flower: 'garden', sparkle: 'garden',
};

const NOT_FROG: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster', 'duck'];

/**
 * The Pet Card's "Known for" line. `starting` shows from Potted on days the habit was done;
 * `settled` is permanent from Blooming. No subject, so no pronoun: "Known for: Sleeps on the open
 * book whenever you read."
 */
export const KNOWN_FOR: Readonly<Record<Archetype, { starting: readonly Line[]; settled: readonly Line[] }>> = {
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
    settled: ['Lies in the middle of the mat whenever you get it out.', 'Joins in on the mat, mostly by lying on it.'],
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
    settled: ['Sits right in the middle of whatever you’re making.', 'Sleeps in the craft basket while you work.'],
  },
  tidy: {
    starting: ['Has started sitting in the laundry basket.'],
    settled: ['Sits in the laundry basket whenever you tidy.', 'Inspects each tidy surface, then sits on it.'],
  },
  cook: {
    starting: ['Has started watching from the kitchen counter when you cook.'],
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
    settled: ['Sits close by for every call.', 'Lies across your lap whenever someone’s over.'],
  },
  garden: {
    starting: ['Has started following the watering can round the room.'],
    settled: ['Follows the watering can from plant to plant.', 'Checks each real plant after you water it.'],
  },
};

/* ------------------------------------------------------------------------ */
/* Sunday Note, Herbarium page, Garden Journal                               */
/* ------------------------------------------------------------------------ */

/**
 * The Sunday Note (DESIGN §13): a small card in the narrator's voice. Built in order: opener,
 * waterings, up to two highlights, the quoted note if there is one, a P.S., the stamps. Never a
 * percentage. {Count} is spelled out with a capital (`numberWord(n, true)`), {count} is a numeral.
 */
export const SUNDAY_NOTE = {
  /** {weekOf}: "Sep 22". */
  opener: 'Week of {weekOf}.',
  waterings: { one: 'One watering.', other: '{Count} waterings.' },
  /** Slots: {habit}, {weekday} ("Thursday"), {stageEvent} (STAGE_EVENTS), {name}, {count}. */
  highlights: {
    stageUp: 'The {habit} plant {stageEvent} on {weekday}.',
    stageUpCompanion: 'The {habit} plant {stageEvent} on {weekday}, and {name} has napped in it every afternoon since.',
    everyDay: '{habit} was watered every day.',
    topHabit: '{habit} was watered on {count} days.',
    newcomer: '{name} came home on {weekday}.',
    newcomerMovedIn: '{name} came home on {weekday} and moved into the {habit} plant.',
    newHabit: '{habit} was planted on {weekday}, as a cutting.',
    tiny: 'The tiny version of {habit} was enough on {count} days.',
    kept: '{habit} and {anchor} were kept together on {count} days.',
  },
  /** Her own words, quoted back as written. Slots: {weekday}, {quote}. */
  quote: 'On {weekday} you wrote: ‘{quote}’.',
  /**
   * The P.S. With a companion: {routine} from SUNDAY_ROUTINES and {times} ("four evenings",
   * "twice", "every day"). Without one, a sill line.
   */
  ps: {
    companion: 'P.S. {name} {routine} {times}.',
    sill: [
      'P.S. {name} spent the afternoons in the sunbeam.',
      'P.S. {name} left a {found} on the sill on {weekday}.',
      'P.S. {name} and {friend} napped in a pile on {weekday}.',
    ],
  },
  stamps: { one: 'One stamp, enclosed.', other: '{Count} stamps, enclosed.' },
} as const;

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

/** Things a pet leaves on the sill from friendship level 6 ({found} in the P.S.). */
export const FOUND_THINGS: readonly string[] = ['button', 'leaf', 'bead', 'blue thread', 'seed', 'bottle top', 'feather'];

/**
 * The Herbarium page (DESIGN §13): each habit's pressing is labelled in small type, rest days
 * press as small flowers, and there's never a percentage. Slots: {Month}, {habit}, {count},
 * {rests}, {name}, {date}.
 */
export const HERBARIUM = {
  title: '{Month}, pressed.',
  label: '{habit} · {count}',
  labelRests: { one: '{habit} · {count} · 1 rest', other: '{habit} · {count} · {rests} rests' },
  restNote: 'Rest days are pressed as the small flowers.',
  margin: ['{habit} flowered this month.', '{name} came home on {date}.', '{habit} was planted this month.'],
  firstPage: 'The first page.',
  stamps: { one: 'One stamp, enclosed.', other: '{Count} stamps, enclosed.' },
} as const;

/**
 * Garden Journal (Habit Detail, DESIGN §14.2): up to five plain sentences that ink in from week 2.
 * Until then each shows a pencil line saying when it will fill in, counted in waterings, never a
 * deadline. Slots: {time}, {weekday}, {count}, {anchor}, {look}, {when}.
 */
export const GARDEN_JOURNAL = {
  usualTime: {
    ink: 'You usually water it around {time}.',
    pencil: 'Your usual time fills in after {count} more waterings.',
  },
  steadiestDay: {
    ink: '{weekday}s are when it’s watered most.',
    pencil: 'The steadiest day fills in after the second week.',
  },
  tinyDays: {
    ink: 'The tiny version was enough on {count} days.',
    pencil: 'Tiny days fill in the first time you use the tiny version.',
  },
  keptTogether: {
    ink: 'Watered right after {anchor} on {count} days.',
    pencil: 'Kept-together days fill in once it follows another habit.',
  },
  whyItLooks: {
    ink: 'It blooms {look} because you usually water it {when}.',
    pencil: 'Why it looks the way it does fills in at Blooming.',
  },
} as const;

/* ------------------------------------------------------------------------ */
/* Greetings                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * The Today greeting (top left of the band). Slot: {userName}; an empty name drops ", {userName}".
 * Periods by the clock's hour: early 4–6, morning 6–12, afternoon 12–17, evening 17–22, late 22–4.
 */
export const GREETINGS = {
  early: ['Early start, {userName}.', 'Morning, {userName}. The light’s only just in.'],
  morning: ['Good morning, {userName}.'],
  afternoon: ['Good afternoon, {userName}.'],
  evening: ['Good evening, {userName}.'],
  late: ['Hello, {userName}. The lamp’s on.', 'Evening, {userName}.'],
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

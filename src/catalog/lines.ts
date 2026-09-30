/**
 * The copy deck in code: the caption matrix and the sentence templates (DESIGN §12; the deck is
 * docs/VOICE.md). Screens import every line from here. The deck lives in four modules, so the
 * first paint carries only what it needs (scripts/size-budget.mjs):
 * - lineKit.ts: what a line is, the filters, and the helpers that fill and word one;
 * - captionMatrix.ts: the caption matrix and choosing a line;
 * - linesCore.ts: the lines the domain, the view models and the fx layer need at first paint;
 * - this file: everything else (the screens' copy), re-exporting the other three.
 * Code on the first-paint path (src/domain, src/state, src/fx, the shell) imports from lineKit.ts
 * or linesCore.ts, never from here or from the `@/catalog` barrel.
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
import type { PlantSpeciesId, Rarity, Species, WearableSlot } from './types';
import { atLevel, only, type Line } from './lineKit';
import { LETTER_WAITING, PET_CARD_CORE, STORIES } from './linesCore';

// The deck is split in three so the first paint carries only what it needs; this module re-exports
// all of it, so screens import every line from here.
export * from './lineKit';
export * from './captionMatrix';
export * from './linesCore';

/* ------------------------------------------------------------------------ */
/* Check-in asides                                                           */
/* ------------------------------------------------------------------------ */

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

/** A Memory arrives on the Pet Card every so often after best friends (DESIGN §8.2). Slots: {name}, {memory}. */
export const MEMORY_LINE = 'A new Memory on {name}’s card: ‘{memory}’.';

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
  /** The same card while the onboarding capsule is still on the house (`firstCapsuleWaiting`). */
  firstCapsuleWaiting: 'Your first capsule is waiting on the Capsules tab.',
  letterWaiting: LETTER_WAITING,
  storyWaiting: 'There’s a story on the plant tag for {habit}.',
  /** After the note from the sill is put away: where it went (the Progress tab's memory shelf). Slot: {shelf}. */
  filed: 'It’s on the {shelf} now, in Progress.',
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
  enough: '{name} has had enough for today.',
  restocked: 'The pantry restocked: 2 servings of each treat.',
  baked: 'Baked: 5 servings of {treat}, in the pantry.',
  lastServing: 'That’s the last of the {treat} for today. 2 more servings in the morning.',
  memoriesEmpty: 'Memories start once you’re best friends.',
  shelfEmpty: 'The sill is ready for someone. Your first capsule is on the Capsules tab.',
  basketEmpty: 'Harvests land here, from Blooming cat grass, catnip, strawberries and lavender.',
  pantryEmpty: 'Treats you collect restock here every morning.',
  decorEmpty: 'Decor from capsules goes here.',
  ...PET_CARD_CORE,
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

/** The move-it-to-Evening nudge (§14.2): offered once; a "Leave it" is remembered. Slots: {habit}, {set}, {usual}, {Block}, {Set}. */
export const TIME_NUDGE = {
  ask: 'You set {habit} for {set} but usually water it {usual}. Move it to {Block}?',
  move: 'Move to {Block}',
  leave: 'Leave it in {Set}',
  set: { morning: 'mornings', midday: 'the middle of the day', evening: 'evenings', anytime: 'anytime' },
  usual: { morning: 'in the morning', midday: 'in the middle of the day', evening: 'after 6 pm' },
} as const;

/** Birthday (§13). Slots: {userName}, {name}. */
export const BIRTHDAY = {
  label: 'Birthday',
  helper: 'For a small surprise on the day. Optional.',
  card: 'There’s a tiny cake on the sill, and a ticket.',
  pets: ['{name} sat by the cake all morning.', '{name} left a leaf next to the cake.', '{name} is wearing the paper party hat, more or less.', '{name} has been keeping an eye on the candle.'],
} as const;

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
  /** No persistent storage at all this session (blocked or missing): nothing is kept past closing. */
  volatile: 'This browser isn’t keeping catkin’s save right now. Save a backup before you close it.',
  otherWindow: 'catkin is open in another window · Use here',
  useHere: 'Use here',
  newerSave: 'This save is from a newer catkin, so it opens read-only here. Update to make changes.',
  /** Another window started over (or erased the save), and this one followed it (WP-A2). DEC-V: pending owner approval. */
  startedOver: 'catkin was started over in another window, so it starts fresh here too. The daily copies stay on this device.',
  clock: 'The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again.',
  /**
   * The load notes and their buttons (WP-A7, audit data-d10): a save that couldn't be read, so the
   * one before it (`:backup`) opened, or so it was kept aside (`:corrupt`); "Try again" on a save
   * that didn't go through, and what a Try again that still didn't save says. DEC-V: pending owner approval.
   */
  recovered: 'catkin couldn’t read the latest save on this device, so it opened the one before it.',
  corrupt: 'catkin couldn’t read the save on this device. The file is kept aside, just as it was.',
  saveDamaged: 'Save the damaged file',
  tryAgain: 'Try again',
  stillNotSaved: 'Still not saved. catkin keeps trying.',
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
  /** Reload while a change isn't written yet (WP-A7, P-persistence-01). DEC-V: pending owner approval. */
  reloadUnsaved: 'Your latest changes aren’t saved yet. Reloading now would clear anything that isn’t saved.',
  reloadAnyway: 'Reload anyway',
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
  /** Commit before reveal (audit FS4, FS10): a capsule or order whose save didn't go through is rolled back, never shown. */
  notSaved: 'This capsule couldn’t be saved, so it wasn’t opened. Nothing was spent.',
  notKept: 'This browser isn’t keeping catkin’s save, so the capsule stayed closed. Nothing was spent.',
  settling: 'One moment: catkin is still getting ready in this window. Nothing was spent.',
  orderNotSaved: 'That order couldn’t be saved, so it wasn’t placed. No stamps were spent.',
  orderNotKept: 'This browser isn’t keeping catkin’s save, so the order wasn’t placed. No stamps were spent.',
  orderSettling: 'One moment: catkin is still getting ready in this window. No stamps were spent.',
} as const;

/** The names the M1 contract map uses for two of the groups above. */
export const PROGRESS_HERO = PROGRESS_LINES;
export const PLACES_OPENED = PLACE_LINES.opened;

/* ------------------------------------------------------------------------ */
/* Screen chrome: section names, buttons and small labels (VOICE.md §24)     */
/* ------------------------------------------------------------------------ */

/* Today (DESIGN §9.1): features/today/copy.ts re-exports these. */
/** The Season Review's ask once the new season is under way (the deck's ask says "starts today"). */
export const SEASON_ASK_LATER = '{Season} is here. How should each habit go on?';

export const TODAY_COPY = {
  /** The day's progressbar name. */
  today: 'Today',
  whatCanIGet: 'What can I get?',
  /** The week strip. */
  week: 'The last 7 days',
  /** The ⋯ menu (DESIGN §9.1): Tiny version · Rest day · Add note · Details · Edit. */
  more: 'More for {habit}',
  menu: { tiny: 'Tiny version', howMany: 'How many…', rest: 'Rest day', note: 'Add a note', editNote: 'Edit the note', details: 'Details', edit: 'Edit' },
  /** A count habit's inline stepper and number pad. */
  howMany: 'How many for {habit}',
  pad: { done: 'Done', tiny: 'Tiny version' },
  /** Folded rows open and close. */
  show: 'Show',
  addHabit: 'Add a habit',
  /** The note field's sheet title. */
  noteTitle: 'A note for {habit}',
  /** Letters and stories on the sill. */
  open: 'Open',
  read: 'Read it',
  close: 'Close',
  toCapsules: 'Go to Capsules',
  /** The Keeping Company offer's habit chips. */
  pickPlant: 'Pick a plant for {name}',
} as const;

/* The Habit Editor (VOICE §22): features/habits/editor/copy.ts re-exports these. */
/**
 * The Habit Editor's own words that the copy deck has no constant for yet (VOICE §22 names the
 * fields; these are the small labels around them).
 */
export const EDITOR_COPY = {
  newTitle: 'A new habit',
  editTitle: 'Edit {habit}',
  ideas: 'Ideas',
  ideaGroups: 'Kinds of ideas',
  /** The disclosure after name, ideas, how often and when. */
  more: 'Colour, plant, amount and more',
  /** Closing a form with something in it. */
  leaveTitle: 'Leave without saving?',
  leaveNew: 'The habit isn’t planted yet.',
  leaveEdit: 'Your changes aren’t saved yet.',
  keepEditing: 'Keep editing',
  leave: 'Leave it',
  searchIcons: 'Find an icon',
  chooseIcon: 'Choose an icon',
  suggested: 'Suggested from the name',
  unit: 'Unit',
  step: 'Each tap adds',
  amount: 'Amount',
  times: 'How many times',
  every: 'Every',
  days: 'Which days',
  follow: 'Or follow a habit',
  /** Under the chips once one is picked: a follower sorts after its habit on Today, whatever the arrangement in You. */
  followHelp: 'On Today, it comes just after {habit}.',
  tinyCount: 'Tiny amount',
  seasonHelp: 'Until {date}, then it goes to the balcony shelf with a ribbon.',
  whyPlaceholder: 'A line, just for you',
  applyFrom: 'From when?',
  applyOptions: { today: 'From today', 'next-period': 'From next {period}', tomorrow: 'From tomorrow' },
  archive: 'Archive',
  delete: 'Delete',
  keepsCompany: 'Keeps {habit} company',
  locked: 'In {series}',
  planted: '{Plant} is a cutting in a glass of water now.',
  saved: 'Saved.',
} as const;

/* The Shelf (DESIGN §9.4): features/shelf/copy.ts re-exports these. */
export const SHELF_COPY = {
  title: 'Shelf',
  sceneLabel: 'The Shelf: the sill and the places you have opened',
  /** The row of place names under the scene: a jump to each. */
  placesNav: 'Go to a place on the Shelf',
  decorate: 'Decorate',
  done: 'Done',
  basket: 'Basket',
  fieldGuide: 'Field Guide',
  pets: 'Pets',
  out: 'Out on the Shelf',
  indoors: 'Indoors',
  places: 'Places',
  /** Decor edit mode (DESIGN §9.4). */
  decor: {
    title: 'Decorate',
    hint: 'Drag a thing to move it. Tap one to flip it or put it away.',
    /** A thing's button in edit mode, after its name (screen readers). */
    keys: 'Arrow keys move it, F flips it, Delete removes it.',
    add: 'Add to {place}',
    flip: 'Flip',
    putAway: 'Put away',
    full: '{Place} has room for 24 things.',
    keepsake: 'Keepsake',
    placed: '{thing}, on {place}.',
    removed: '{thing}, put away.',
    /** She owns things, and every one of them is already out. */
    allOut: 'Everything you have is out. More comes from the capsules.',
  },
  /** The basket and the pantry (DESIGN §8.2). */
  basketSheet: {
    title: 'Basket and pantry',
    basket: 'The basket',
    pantry: 'The pantry',
    servings: { one: '1 serving', other: '{count} servings' },
    none: 'More in the morning',
    restock: 'Each treat restocks 2 servings every morning, up to 5.',
  },
  fieldGuideSheet: {
    title: 'Field Guide',
    pages: 'Pages',
    notYet: 'not yet',
    secret: 'Secret',
    of: '{owned} of {total}',
    visits: 'Visits {from} to {to}',
    pageFull: 'This page is full.',
    moonlit: 'Moonlit',
  },
  placeMap: {
    here: '{count} here',
    short: '{Place} is {price} coins. There are {count} in the jar.',
    shortOne: '{Place} is {price} coins. There’s 1 in the jar.',
    shortNone: '{Place} is {price} coins. Watering fills the jar.',
    go: 'Go to {place}',
    visit: 'Go there',
    confirm: 'Open {place}?',
    /** Said once, under Places, while a place is out of reach. */
    jar: 'There are {count} coins in the jar.',
    jarOne: 'There’s 1 coin in the jar.',
    jarNone: 'Watering fills the jar.',
  },
  /** The found thing on the sill, for VoiceOver: "A button, from Pudding". */
  foundLabel: '{A}, from {name}',
  capsules: 'Go to Capsules',
} as const;

/* The Pet Card (VOICE §9): features/pets/petCopy.ts re-exports these. */
/** The Pet Card's chrome where VOICE.md has no line yet (sentence case, no pronouns). */
export const PET_CARD_UI = {
  friendshipAria: 'Friendship: {level}',
  out: 'Out on the Shelf',
  outHint: 'Indoors, {name} rests and waits for a place on the Shelf.',
  noRoom: 'The Shelf has room for {count} pets out. Bring someone indoors first.',
  keep: 'Keep it',
  cancel: 'Not now',
  nameHint: 'Or one of these',
  slots: { head: 'Head', face: 'Face', neck: 'Neck', body: 'Outfit' } as Record<WearableSlot, string>,
  wearing: 'Wearing',
  nothingToWear: 'Things to wear come from the capsules.',
  noTreats: 'Treats you collect restock here every morning.',
  servingsOne: '1 serving',
  servings: '{count} servings',
  servingsNone: 'More in the morning',
  favourite: 'Favourite',
  markFavourite: 'Favourite',
  keepsakes: 'Left by the pot',
  pantry: 'Basket and pantry',
  indoors: 'Indoors',
  /** A Find-a-plant chip for a habit someone already keeps company. */
  keptBy: '{name} keeps it company',
  /** Asked before a companion moves out to make room. */
  moveOutAsk: 'Move {name} out of {plant}?',
} as const;

/* Progress and Habit Detail (VOICE §6, §7): features/progress/copy.ts re-exports these. */
/** The screen's own words: section names, buttons and labels (VOICE.md where it has them). */
export const PROGRESS_UI = {
  title: 'Progress',
  sections: {
    months: 'Recent months',
    plants: 'Plants',
    balcony: 'Balcony shelf',
    calendar: 'Calendar',
    year: 'The year',
    records: 'Records',
    insights: 'Insights',
    pins: 'Pins',
    memory: 'Memory shelf',
  },
  /** Under the month's ring: what the percentage is a share of. */
  hero: { ringCaption: 'of this month’s waterings' },
  soFarMark: 'so far',
  calendar: {
    prev: 'Previous month',
    next: 'Next month',
    filter: 'Show habit',
    all: 'All habits',
    water: 'Water it for {date}',
    unwater: 'Not watered after all',
    windowNote: 'The last 6 days are watered from the week strip on Today.',
    openToday: 'Open Today',
    refused: 'That day is watered from the week strip on Today.',
    watered: 'watered',
    tiny: 'the tiny version',
    rest: 'resting',
    off: 'a day off',
    paused: 'resting',
    note: 'a note',
    part: '{count} of {target}',
    partUnit: '{count} of {target} {unit}',
  },
  year: { prev: 'Previous year', next: 'Next year' },
  plants: { open: '{habit}, {stage}', retired: '{habit}, on the balcony shelf' },
  pins: { notYet: 'not yet', earned: 'Earned {date}', progress: '{have} of {need}', stamps: { one: '+1 stamp', other: '+{count} stamps' }, pinLabel: '{name}, not yet', more: { one: '1 more pin', other: '{count} more pins' } },
  memory: { new: 'New', balcony: { one: '1 plant on the balcony shelf', other: '{count} plants on the balcony shelf' } },
} as const;

/** Habit Detail's own words (VOICE.md §7, §12, §13, §14, §21 where it has them). */
export const DETAIL_UI = {
  forecastEvergreen: 'Evergreen',
  sections: {
    tag: 'The plant tag',
    journal: 'Garden Journal',
    stats: 'How it’s going',
    why: STORIES.titles.why,
    moments: 'Moments',
    history: 'History',
    ladder: 'In a row',
    company: 'Keeping company',
    actions: 'Look after it',
  },
  ladder: { reached: 'Rungs reached: {count} of {total}' },
  stats: { lately: 'Lately', now: 'Now', longest: 'Longest run', longestLine: 'Longest run: {run}', waterings: 'Waterings', newRhythm: 'New rhythm', since: 'Since {date}', tiny: 'Tiny versions: {count}' },
  star: 'Star this note',
  starred: 'Starred for the Sunday Note',
  quoteHelp: 'Only notes you’ve starred are quoted in the Sunday Note.',
  /** VOICE §7, graduation. */
  grow: { title: 'A bigger pot?', text: '{habit} has been steady for 4 weeks. Make it a little bigger? +1 stamp', textQuiet: '{habit} has been steady for 4 weeks. Make it a little bigger?', yes: 'Grow it', no: 'Keep it as it is' },
  tinier: { title: 'Make it tinier?', text: 'A smaller version still counts, and still waters the plant.', yes: 'Make it tinier', no: 'Keep it as it is', done: '{habit} is tinier now.' },
  story: { new: 'New', remaining: { one: 'About 1 more watering together.', other: 'About {count} more waterings together.' }, waits: 'After the one before it.' },
  actions: {
    edit: 'Edit',
    pause: 'Pause {habit}',
    pauseShort: 'Pause',
    backOn: 'Back on…',
    backOnLabel: 'Back on',
    pauseOpen: 'Until you bring it back',
    bringBack: 'Bring it back',
    startFrom: 'Start tracking from…',
    startFromLabel: 'Start tracking from',
    archive: 'Archive',
    restore: 'Bring it back to the sill',
    delete: 'Delete',
    tune: 'Tune my habits',
    cancel: 'Not now',
    confirmArchive: 'Archive',
  },
  pausedUntil: 'Resting until {date}',
  pausedOpen: 'Resting until you bring it back',
  pauseFrom: 'Resting from {date}',
  archivedOn: 'On the balcony shelf since {date}',
  ribbon: 'Finished {date}, with a ribbon',
  looks: { label: 'Which look', stake: 'Classic' },
  close: 'Close',
} as const;

/* You and onboarding (DESIGN §9.5, §9.6): features/you/copy.ts re-exports these. */
export const YOU_UI = {
  title: 'You',
  sinceLine: 'On this sill since {date}',
  sections: {
    profile: 'Profile',
    habits: 'Habits',
    days: 'Your days',
    look: 'Look and sound',
    today: 'Today and capsules',
    access: 'Accessibility',
    data: 'Your data',
    install: 'On your Home Screen',
    about: 'About',
  },
} as const;

export const HABITS_COPY = {
  arrange: 'Arrange',
  done: 'Done',
  archived: 'Archived',
  bringBack: 'Bring it back',
  bringBackLabel: 'Bring it back: {habit}',
  editWord: 'Edit',
  move: 'Move {habit}',
  moveUp: 'Move {habit} up',
  moveDown: 'Move {habit} down',
  moveHint: 'Drag, or use the arrow keys.',
  moved: '{habit}, {pos} of {count}.',
  resting: 'Resting',
} as const;

export const PREFS_COPY = {
  weekdays: { 1: 'Monday', 0: 'Sunday' },
  shortcuts: { label: 'Keyboard shortcuts', helper: '1–5 switch tabs, N plants a habit.' },
  birthdayMonth: 'Month',
  birthdayDay: 'Day',
  notSet: 'Not set',
  off: 'Off',
} as const;

export const DATA_COPY = {
  snapshotsRow: 'Daily copies',
  /** DATA.snapshots without repeating the sheet's title. */
  snapshotsKept: 'Kept on this device: 7 daily and 4 weekly.',
  snapshotKinds: { daily: 'Daily copy', weekly: 'Weekly copy', 'pre-import': 'Before an import' },
  snapshotLine: '{habits} habits · {waterings} waterings',
  restoredSnapshot: 'Back to the copy from {date}.',
  chooseFile: 'Choose a file',
  pasteLabel: 'Or paste a backup here',
  pasteHelper: 'A backup starts with CK1, or it is a catkin backup file.',
  noUndoTitle: 'Import without an undo?',
  noUndo: 'catkin couldn’t keep a copy of what’s here, so there is no Undo import this time.',
  importAnyway: 'Import anyway',
  /** An import that kept no copy to go back to (WP-A3, VOICE §21). DEC-V: pending owner approval. */
  importedNoUndo: 'Imported. There is no Undo import this time.',
  /** A restore with no copy of what's here: asked once more, like import (WP-A3). DEC-V: pending owner approval. */
  restoreNoUndoTitle: 'Restore without an undo?',
  restoreNoUndo: 'catkin couldn’t keep a copy of what’s here, so there is no undo for this restore.',
  /** The Undo row after a restore (DEC-P13's generic label). DEC-V: pending owner approval. */
  undoRestore: 'Undo last replacement',
  undoneRestore: 'Back to how things were before the restore.',
  /** An import, restore or Undo that changed nothing, and why (WP-A3). DEC-V: pending owner approval. */
  notReplaced: 'That couldn’t be saved on this device, so nothing changed.',
  superseded: 'The save changed just then, so nothing was replaced. Try again.',
  copyUnreadable: 'That copy can’t be read on this device right now, so nothing changed.',
  copyGone: 'That copy isn’t on this device any more, so nothing changed.',
  /** A daily copy a newer catkin kept (WP-A4, P-persistence-04). DEC-V: pending owner approval. */
  copyNewer: 'That copy is from a newer catkin. Update, then restore it.',
  /** An Undo no longer on offer (expired, or the save shown is another one): its copy may still be there. DEC-V: pending owner approval. */
  undoGone: 'That Undo isn’t on offer any more, so nothing changed.',
  cannotOpen: 'This browser can’t open that backup. Try the backup file instead.',
  readOnly: 'This window can’t change the save right now.',
  inDemo: 'Leave the demo to import a backup. The demo keeps its own plants.',
  startOverAgainTitle: 'Start over now?',
  startOverAgain: 'Everything here goes. The daily copies stay on this device.',
  demoLine: 'A made-up sill with a few months of watering. Your own sill stays just as it is.',
  /** The demo doesn't open over a change that hasn't been written yet. */
  demoWaits: 'The demo opens once your last change is saved.',
  demoPill: 'The demo',
  copyTitle: 'Your backup',
  copyHelper: 'Select it all, copy it, and keep it somewhere safe.',
  csvSaved: 'Waterings saved.',
  /**
   * The storage row while this window waits to become the one that saves; the daily copies when
   * they can't be read; a damaged save kept aside, saved as a file of its own bytes (WP-A7). DEC-V:
   * pending owner approval.
   */
  storageAcquiring: 'Getting ready to save',
  snapshotsError: 'The daily copies can’t be read on this device right now.',
  damagedFile: 'catkin-damaged-save-{date}.txt',
  damagedSaved: 'The damaged file is saved.',
  /**
   * The CSV of a newer catkin's save shown read-only: only what this catkin can read of it, so it
   * says so, in its note and its file name; and a newer save it can't read at all gives none (WP-A4,
   * FS2). DEC-V: pending owner approval.
   */
  csvPartial: 'Saved the waterings this catkin can read. A backup keeps the whole newer save.',
  csvNewer: 'This catkin can’t read the waterings in a newer save. A backup keeps all of it.',
  fileBuild: 'Saved in this browser, for this file',
} as const;

export const ABOUT_COPY = {
  principlesTitle: 'What catkin keeps to',
  principles: [
    'Growth only adds. A resting plant keeps every leaf.',
    'With Quiet rewards on, catkin is just the tracker.',
    'The odds are printed on every cabinet.',
  ],
  how: [
    { title: 'Your habits are plants', text: 'Each habit starts as a cutting in a glass of water. Watering it counts the day, and the plant grows as you keep the habit: roots, a pot, leaves, buds, flowers.' },
    { title: 'Showing up, over time', text: 'Progress reads as days you showed up, like 26 of the last 30. Rest days and paused habits count as rest.' },
    { title: 'Coins and capsules', text: 'Watering drops brass coins in the jar. The capsule cabinets take coins, and each capsule holds a small animal, something to wear, a treat or a bit of decor.' },
    { title: 'Pets and plants', text: 'Pets keep habits company. Each pet moves into a plant and is there on the sill at every watering. The friendship grows with the habit.' },
    { title: 'Kept on this device', text: 'Your plants live in this browser or on your Home Screen. There is no account. Save a backup now and then.' },
    { title: 'Sound and haptics', text: 'Both are extras. Everything works with both off.' },
  ],
  credits: [
    { title: 'Drawn in code', text: 'Every plant, pot, pet and cabinet is drawn by hand as code, lit by one window.' },
    { title: 'Type', text: 'Castoro by Tiffany Wardle and Nunito by Vernon Adams, both under the SIL Open Font License.' },
    { title: 'Made with', text: 'Preact, Vite and Workbox.' },
  ],
  build: { pwa: 'Home Screen app', tab: 'In the browser', single: 'Single file', dev: 'Development' },
  updatesSingle: 'This copy updates when you download a new catkin.html.',
  updatesOther: 'Updates arrive with the hosted app.',
  checking: 'Checking',
  diagnosticsIn: 'Diagnostics in {n} taps',
} as const;

export const DIAG_COPY = {
  title: 'Diagnostics',
  back: 'You',
  lead: 'What this device says about catkin. Copy the report to share it.',
  device: 'This device',
  copied: 'Report copied.',
  measure: 'Measure frame timing',
  checkClock: 'Check the clock',
} as const;

export const ONBOARDING_COPY = {
  next: 'Next',
  plantOne: 'Plant it',
  plantMany: 'Plant these',
  makeOwnLabel: 'Your own habit',
  add: 'Add',
  lessIdeas: 'Fewer ideas',
  pickFull: 'That’s 3. More can go on the sill anytime.',
  remove: 'Take {habit} off the sill',
  toToday: 'On to Today',
  choose: 'Who comes home first? Choose a cabinet',
  notice: 'Name',
  nameIdeas: 'Name ideas',
  anotherName: 'Another name',
  plantsLead: 'Tap a plant, and {name} moves in.',
  stepOf: 'Step {n} of {count}',
} as const;

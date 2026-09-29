/**
 * The copy the first paint needs: the domain's field notes and file words, the view models' status
 * and schedule words, and the fx layer's celebration and check-in lines. Everything else in the
 * deck is in lines.ts, which re-exports this module; screens import from `@/catalog/lines`. Code on
 * the first-paint path (src/domain, src/state, src/fx) imports from here, never from lines.ts, so
 * the screens' copy loads with the screens (scripts/size-budget.mjs).
 */
import type { PlantSpeciesId } from './types';
import { only, type Line } from './lineKit';

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

/** Harvest (DESIGN §8.2): the aside on a completing check-in, one serving per plant per day. */
export const HARVEST_LINES: Readonly<Partial<Record<PlantSpeciesId, string>>> = {
  catgrass: 'A pinch of cat grass, into the basket.',
  catnip: 'A few catnip leaves, into the basket.',
  strawberry: 'One strawberry, into the basket.',
  lavender: 'Lavender for shortbread, into the basket.',
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

/** The daily found thing from friendship level 6 (a `stardust` event of 1). Slots: {name}, {found} (FOUND_THINGS). */
export const FOUND_LINE = '{name} left a {found} on the sill. +1 swap';

/** Things a pet leaves on the sill from friendship level 6 ({found}). */
export const FOUND_THINGS: readonly string[] = ['button', 'leaf', 'bead', 'blue thread', 'seed', 'bottle top', 'feather'];

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
  /** A flexible habit before the period's first watering (the same line's shape, never a 0). */
  periodGoal: '{target} this {period}',
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

/**
 * The Habit Editor's field notes (VOICE.md §22), by `HabitIssue.code` (domain/habits.ts): what to
 * do, never "invalid" or "error". Slot: {max}.
 */
export const HABIT_ISSUES = {
  name: 'Give it a name, up to {max} characters.',
  icon: 'Pick an icon.',
  color: 'Pick a colour.',
  'plant-locked': 'That plant is still in a capsule.',
  'pot-locked': 'That pot is still in a capsule.',
  effort: 'Pick about how long it takes.',
  'too-many-big': '{max} long habits is the most at once. Pick a shorter time, or pause one of the others.',
  'time-of-day': 'Pick a time of day.',
  polarity: 'Do it, or avoid it?',
  'due-day': 'Pick a day from 1 to 31, or the last day of the month.',
  anchor: 'Keep it under {max} characters.',
  unit: 'Keep it under {max} characters.',
  notes: 'Keep it under {max} characters.',
  why: 'Keep it under {max} characters.',
  'anchor-self': 'Pick another habit to follow.',
  'anchor-unknown': 'Pick another habit to follow.',
  'anchor-archived': 'Pick another habit to follow.',
  'anchor-cycle': 'Pick another habit to follow.',
  'ends-on': 'Pick a last day from today on.',
  'days-empty': 'Pick at least one day.',
  'days-invalid': 'Pick days of the week.',
  'every-invalid': 'Pick how often.',
  'times-range': 'That’s more times than the stretch has days for.',
  'flexible-target': 'A few-times-a-week habit counts one watering a day.',
  'target-range': 'Pick an amount from 1 to {max}.',
  'step-range': 'Pick a step of at least 1.',
  'tiny-label': 'The tiny version needs a few words.',
  'tiny-count-range': 'Make the tiny version smaller than the whole amount.',
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

/**
 * The keepsake's note when it arrives (§13): "{name} left {thing} by the pot." The things are the
 * caption's own words, by family (KEEPSAKE_CAPTIONS).
 */
export const KEEPSAKE_NOTE = '{name} left {thing} by the pot.';

export const KEEPSAKE_THINGS = Object.fromEntries(
  Object.entries(KEEPSAKE_CAPTIONS)
    .filter(([k]) => k !== 'moment')
    .map(([k, v]) => [k, v.slice(v.indexOf(': ') + 2, -1)]),
) as Readonly<Record<Exclude<keyof typeof KEEPSAKE_CAPTIONS, 'moment'>, string>>;

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

/** The Season Review card (§14.3). Slots: {Season}, {season}, {habit}, {from}, {to}, {count}, {date}. */
export const SEASON_REVIEW = {
  title: '{Season}, on the sill.',
  /** The note when the card arrives: it says where the card is. */
  waiting: '{Season}, on the sill. It’s on Today.',
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

/** Came-home days and the moving-in anniversary (§13). Slots: {name}, {years}, {habit}, {Count}, {Years}. */
/** Perfect day (§5): every habit that's on is watered or resting. "perfect day" is the internal name only. */
export const PERFECT_DAY = {
  title: 'Everything’s watered',
  text: 'The whole sill is in the sun.',
  /** From 8 pm, or with the lamp on. */
  lampText: 'The whole sill is in the lamplight.',
  /** As an "also" line under a bigger moment. */
  line: 'Everything watered',
} as const;

/** Welcome home (§5) never mentions the gap. */
export const WELCOME_HOME = { none: 'Everything kept.', ticket: 'Everything kept. There’s a ticket on the sill.' } as const;

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

/** Today's note on the sill (TODAY_LINES.letterWaiting), by letter kind; the fx layer words its arrival with it. */
export const LETTER_WAITING = { sundayNote: 'There’s a note on the sill.', herbarium: 'There’s a page on the sill.', anniversary: 'There’s a note on the sill.' } as const;

/** The two Pet Card lines the fx layer announces (spread into PET_CARD). */
export const PET_CARD_CORE = {
  favouriteFound: '{name}’s favourite is the {treat}. It’s on the Pet Card now.',
  bestFriendsBanner: { eyebrow: 'Best friends', title: 'You and {name}', text: 'There’s a small brass tag to show it.' },
} as const;

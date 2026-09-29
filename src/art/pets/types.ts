import type { JSX } from 'preact';
import type { Species, WearableSlot } from '@/catalog/types';
import type { Light } from '@/art/light';

/**
 * What a pet's face is doing (DESIGN §10.4). No mouth at rest; a mouth appears only for a yawn,
 * a blep or chewing. Happy is a squint, a blush and a posture, never an open grin.
 * `idle`, `love`, `eat` and `wink` are the Mochi-era names, kept as aliases.
 */
export type Expression = 'rest' | 'blink' | 'happy' | 'sleep' | 'yawn' | 'blep' | 'chew' | 'surprised' | 'idle' | 'love' | 'eat' | 'wink';
export type CanonicalExpression = Exclude<Expression, 'idle' | 'love' | 'eat' | 'wink'>;
export const EXPRESSIONS: readonly CanonicalExpression[] = ['rest', 'blink', 'happy', 'sleep', 'yawn', 'blep', 'chew', 'surprised'] as const;

const ALIASES: Record<Expression, CanonicalExpression> = {
  rest: 'rest',
  blink: 'blink',
  happy: 'happy',
  sleep: 'sleep',
  yawn: 'yawn',
  blep: 'blep',
  chew: 'chew',
  surprised: 'surprised',
  idle: 'rest',
  love: 'happy',
  eat: 'chew',
  wink: 'blink',
};
export const canonicalExpression = (e: Expression | undefined): CanonicalExpression => (e ? ALIASES[e] : undefined) ?? 'rest';

/** True postures (DESIGN §8.1). `walk` alternates two key frames in CSS. */
export type Pose = 'sit' | 'loaf' | 'stand' | 'walk' | 'sleep';
export const POSES: readonly Pose[] = ['sit', 'loaf', 'stand', 'walk', 'sleep'] as const;

/**
 * Coat markings. Each species draws the ones that exist on that animal; a test checks that every
 * look only asks for markings its species can draw.
 */
export type MarkId =
  // shared
  | 'belly' // pale chest and belly
  | 'muzzle' // pale muzzle
  | 'socks' // pale paws
  | 'points' // colour points: mask, ears, legs, tail
  // cats
  | 'tabby'
  | 'patches' // calico and cow-cat patches (mark, mark2)
  | 'tuxedo' // white bib, chin and socks
  | 'van' // Turkish Van: colour on the head and tail only
  | 'heart' // one heart-ish patch
  | 'ticked' // Abyssinian ticking
  | 'brindle' // tortoiseshell mottling
  | 'blaze' // a white inverted V on the muzzle
  // cows
  | 'holstein' // map patches
  | 'belt' // Belted Galloway
  | 'roan' // blue-roan speckle
  | 'whiteface' // Hereford
  | 'ring' // pale muzzle ring (Jersey, Brown Swiss)
  | 'stars' // Night-sky Cow: a static star field inside the patches
  | 'shag' // Highland: a shaggy scalloped hem
  // dogs
  | 'saddle' // a dark back (beagle)
  | 'tricolour' // Bernese
  | 'spots' // Dalmatian
  | 'urajiro' // Shiba: cream cheeks, brows, chest
  | 'mask' // Husky
  | 'blenheim' // Cavalier ear and eye patches
  // rabbits
  | 'dutch'
  | 'harlequin'
  | 'silver' // Silver Fox ticking
  // frogs
  | 'throat'
  | 'dots' // dark spots (Golden Frog, Blue Frog)
  | 'x' // Spring Peeper
  | 'glass' // Glass Frog: pale belly with a visible heart dot
  | 'moss' // raised bumps
  | 'jeans' // Strawberry Frog: blue legs
  | 'flanks' // Red-eyed Tree Frog: blue flanks
  // bears
  | 'panda'
  | 'crescent' // Sun Bear chest crescent
  | 'spectacles'
  // hamsters
  | 'dorsal' // a dark stripe down the back
  | 'brows' // Roborovski pale brows
  // ducks
  | 'mallard'
  | 'mandarin'
  | 'sheen' // Cayuga green sheen
  | 'speculum'; // a blue wing flash

/** Real anatomy that changes the drawing, not just the colour. */
export type TraitId =
  | 'lop' // lop ears
  | 'fold' // Scottish Fold ears
  | 'tufts' // lynx tips on the ears
  | 'ruff' // a mane of chest fur
  | 'longhair' // a plumed tail and a fuller coat
  | 'sphynx' // no fur: skin with a few wrinkle lines
  | 'mane' // Lionhead
  | 'angora' // all fluff
  | 'short-ears' // Netherland Dwarf
  | 'big-feet' // Snowshoe Hare
  | 'long-horns' // Highland
  | 'fringe' // Highland fringe over the eyes
  | 'fluffy' // Pomeranian, Samoyed
  | 'pointy-ears'
  | 'bat-ears'
  | 'floppy-ears'
  | 'long-ears' // beagle, cavalier: ears past the jaw
  | 'curled-tail'
  | 'long-body' // dachshund, corgi
  | 'crest' // Crested Duck
  | 'upright' // Runner Duck
  | 'toe-pads' // tree frogs
  | 'wave'; // Golden Frog waves when happy

export interface PetPalette {
  /** The main coat. */
  coat: string;
  /** Pale underside: chest, belly, the inside of the legs. */
  under?: string;
  /** Primary marking colour. */
  mark?: string;
  /** Secondary marking colour (calico's third colour). */
  mark2?: string;
  /** Colour points and masks. */
  point?: string;
  /** Head colour, when it differs from the coat (a mallard's hood, a Hereford's face). */
  head?: string;
  /** Outer ear. Defaults to the head colour. */
  ear?: string;
  /** Inner ear. */
  earIn?: string;
  nose?: string;
  /** Cow, bear and dog muzzles. */
  muzzle?: string;
  /** Iris colour: the eye becomes an iris with a graphite pupil. */
  eye?: string;
  /** The second eye, for odd eyes. */
  eye2?: string;
  /** Legs, when they differ from the coat. */
  leg?: string;
  /** Socks, mittens, paws. */
  paw?: string;
  tail?: string;
  /** Tail tip. */
  tip?: string;
  horn?: string;
  hoof?: string;
  /** A duck's bill. */
  bill?: string;
  /** Webbed feet, toe pads. */
  foot?: string;
}

export interface PetLook {
  species: Species;
  palette: PetPalette;
  marks?: readonly MarkId[];
  traits?: readonly TraitId[];
  /** A dark coat: pale eye rings by day and a rim light at night (DESIGN §10.4). */
  dark?: boolean;
  /** Size relative to the species (a Maine Coon is big for a cat; a Call Duck is small). */
  scale?: number;
  /** Width relative to height (a stocky Highland). */
  stocky?: number;
  /** Moonlit variants: a few pale static flecks on the coat. */
  flecks?: boolean;
}

/**
 * What a wearable renderer receives. Head and face wear draw in the head's own frame (origin at
 * the head centre), so they follow every pose and tilt. Neck wear draws in a collar frame (origin
 * at the throat, x along the collar). Body wear draws in the canonical body frame (0–100 × 0–100,
 * rump to chest and back to belly), clipped to the torso, so it fits every posture.
 */
export interface WearCtx {
  species: Species;
  pose: Pose;
  /** The light in the art's own frame, so shade can go on the side away from it. */
  light: Light;
  uid: string;
  /** Head frame: where a hat sits (centre of the crown, usable width, tilt), the eyes, a clip spot. */
  head: {
    hat: { x: number; y: number; w: number; r: number };
    eyes: { y: number; left: number; right: number };
    ear: { x: number; y: number; r: number };
  };
  /** Collar frame: half-width of the neck. */
  neck: { w: number };
  /** Body frame: how much wider than tall one frame unit is on screen (to keep motifs round). */
  body: { aspect: number };
}

export interface WearableArt {
  /** Head and face wear draw in the head frame, neck wear in the collar frame, body wear in the body frame. */
  slot: WearableSlot;
  render: (ctx: WearCtx) => JSX.Element | null;
  /** Head wear that sits in front of ears and horns (a clip, a wreath) rather than behind them. */
  front?: boolean;
  /** Poses this item cannot sit well in; it hides there. */
  hideIn?: readonly Pose[];
  /** Body wear with a hood that stays up: drawn in the head frame, behind the ears. */
  hood?: (ctx: WearCtx) => JSX.Element | null;
  /** Standalone art on a 100×100 canvas for inventory tiles and reveals. */
  icon: () => JSX.Element;
}

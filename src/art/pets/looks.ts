import { MOONLIT_PREFIX, moonlitBase } from '@/catalog/collectibles';
import type { MarkId, PetLook, PetPalette, TraitId } from './types';
import { luma, mix } from './palette';

/**
 * Every catalog pet, true to breed (DESIGN §8.1): real coats and anatomy; fantasy only in colour
 * and pattern. Colours are the warm pastel family of the style frames, graphite never black.
 */

const WHITE = '#F9F3EA';
const CREAM = '#F7EDE0';
const SOOT = '#4A4146';
const PLUM_BLACK = '#3A3238';
const PINK_NOSE = '#DB959A';
const BLUE_EYE = '#8FC1E3';
const GOLD_EYE = '#EDC869';

interface Opts {
  marks?: MarkId[];
  traits?: TraitId[];
  dark?: boolean;
  scale?: number;
  stocky?: number;
}

const cow = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'cow', palette: { horn: '#F1E3C3', ...palette }, ...o });
const frog = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'frog', palette: { foot: palette.leg ?? palette.coat, ...palette }, ...o });
const dog = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'dog', palette: { nose: SOOT, earIn: '#E8B1A8', ...palette }, ...o });
const bunny = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'bunny', palette: { nose: '#DE9CA3', tail: palette.under ?? WHITE, ...palette }, ...o });
const bear = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'bear', palette: { nose: SOOT, ...palette }, ...o });
const hamster = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'hamster', palette: { nose: '#DE9CA3', earIn: '#EFB4B6', ...palette }, ...o });
const duck = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'duck', palette: { bill: '#F0B35A', foot: '#EDA65A', ...palette }, ...o });
const cat = (palette: PetPalette, o: Opts = {}): PetLook => ({ species: 'cat', palette: { nose: PINK_NOSE, ...palette }, ...o });

export const LOOKS: Record<string, PetLook> = {
  /* ------------------------------------------------------------------ cats */
  'pet-cat-orange': cat({ coat: '#EDB585', mark: '#D6936A', muzzle: '#F8EBDC', tip: '#D6936A' }, { marks: ['tabby', 'muzzle'] }),
  'pet-cat-grey': cat({ coat: '#BDB4AF', mark: '#8A807C', muzzle: '#F1ECE8', tip: '#8A807C', nose: '#C98E92' }, { marks: ['tabby', 'muzzle'] }),
  'pet-cat-tuxedo': cat({ coat: '#3F363C', under: WHITE, paw: WHITE, nose: '#E2A4A8', eye: '#CFD98A' }, { marks: ['tuxedo'], dark: true }),
  'pet-cat-calico': cat({ coat: WHITE, mark: '#E3A27D', mark2: SOOT, tail: '#E3A27D', nose: '#D99A9A' }, { marks: ['patches'] }),
  'pet-cat-black': cat({ coat: PLUM_BLACK, eye: GOLD_EYE, nose: '#5B4B53' }, { dark: true }),
  'pet-cat-tortie': cat({ coat: '#5C4842', mark: '#D9925C', mark2: '#9A6446', tail: '#5C4842', nose: '#6E5550', eye: '#E0C067' }, { marks: ['brindle'], dark: true }),
  'pet-cat-siamese': cat({ coat: '#F4EADB', point: '#6E5549', ear: '#6E5549', leg: '#6E5549', tail: '#6E5549', nose: '#5E473E', eye: BLUE_EYE }, { marks: ['points'] }),
  'pet-cat-cowcat': cat({ coat: WHITE, mark: SOOT, mark2: SOOT, tail: SOOT }, { marks: ['patches'] }),
  'pet-cat-oddeyed': cat({ coat: WHITE, eye: BLUE_EYE, eye2: GOLD_EYE, earIn: '#F4BCC0' }),
  'pet-cat-mainecoon': cat(
    { coat: '#A98163', mark: '#6F5343', under: '#F1E5D6', muzzle: '#F1E5D6', tip: '#6F5343', point: '#5C4538', eye: '#D9B45E', nose: '#B7837A' },
    { marks: ['tabby', 'muzzle', 'belly'], traits: ['tufts', 'ruff', 'longhair'], scale: 1.12 },
  ),
  'pet-cat-smoke': cat({ coat: '#645E66', under: '#CFCAD0', eye: GOLD_EYE, nose: '#7A6E76' }, { traits: ['ruff'], dark: true }),
  'pet-cat-russianblue': cat({ coat: '#98A1B0', eye: '#A6CF8C', nose: '#6F7182', earIn: '#C9B4BC' }),
  'pet-cat-scottishfold': cat({ coat: '#CFC5BE', mark: '#9D918B', muzzle: '#F3EEE9', tip: '#9D918B', eye: '#E6BD66' }, { marks: ['tabby', 'muzzle'], traits: ['fold'] }),
  'pet-cat-norwegian': cat(
    { coat: '#A3907E', mark: '#6D5C4F', under: '#F4EEE6', muzzle: '#F4EEE6', tip: '#6D5C4F', point: '#5D4D42', eye: '#C9B866' },
    { marks: ['tabby', 'muzzle', 'belly'], traits: ['tufts', 'ruff', 'longhair'], scale: 1.1 },
  ),
  'pet-cat-snowshoe': cat({ coat: '#EFE4D4', point: '#7B6253', ear: '#7B6253', leg: '#7B6253', tail: '#7B6253', paw: WHITE, under: WHITE, nose: '#E0A2A6', eye: BLUE_EYE }, { marks: ['points', 'blaze'] }),
  'pet-cat-heartspot': cat({ coat: WHITE, mark: '#A39AA0', tail: '#A39AA0' }, { marks: ['heart'] }),
  'pet-cat-ragdoll': cat(
    { coat: '#F5EEE4', point: '#A68D7F', ear: '#A68D7F', tail: '#A68D7F', paw: WHITE, eye: BLUE_EYE, nose: '#C99A93' },
    { marks: ['points'], traits: ['longhair', 'ruff'] },
  ),
  'pet-cat-birman': cat(
    { coat: '#F3EDE8', point: '#B3A6B6', ear: '#B3A6B6', leg: '#B3A6B6', tail: '#B3A6B6', paw: WHITE, eye: '#79A7DE', nose: '#B79AA6' },
    { marks: ['points'], traits: ['longhair', 'ruff'] },
  ),
  'pet-cat-turkishvan': cat({ coat: WHITE, mark: '#D38C5E', tail: '#D38C5E', eye: '#E6C06A' }, { marks: ['van'] }),
  'pet-cat-abyssinian': cat({ coat: '#D8A46C', mark: '#A2703F', under: '#F1D8B4', tip: '#8E5F36', eye: '#CDB65B', nose: '#C07E6A' }, { marks: ['ticked', 'belly'] }),
  'pet-cat-sphynx': cat({ coat: '#EFC8B8', earIn: '#E8A7A3', nose: '#D48F8E', eye: '#B9CC7A' }, { traits: ['sphynx'] }),

  /* ------------------------------------------------------------------ cows */
  'pet-cow-holstein': cow({ coat: WHITE, mark: SOOT, muzzle: '#F3C6C6', tail: SOOT, nose: '#C98E8C' }, { marks: ['holstein'] }),
  'pet-cow-jersey': cow({ coat: '#D6A87E', head: '#CC9C71', muzzle: '#4F4341', under: '#F6EBDD', tail: '#C29469', tip: '#4F4341', earIn: '#E7B3A2' }, { marks: ['ring'] }),
  'pet-cow-brownswiss': cow({ coat: '#AC9A8C', muzzle: '#6B605A', under: '#F1E9E0', tail: '#9C8A7C', tip: '#4F4642', earIn: '#E2B7AE' }, { marks: ['ring'], traits: ['long-ears'] }),
  'pet-cow-beltie': cow({ coat: '#4B4247', under: '#F6EEE2', muzzle: '#6C6267', earIn: '#8E7773' }, { marks: ['belt'], dark: true }),
  'pet-cow-hereford': cow({ coat: '#BC6A45', head: WHITE, ear: '#BC6A45', muzzle: '#F2C8C1', under: WHITE, tip: WHITE, nose: '#C98E8C' }, { marks: ['whiteface'] }),
  'pet-cow-dexter': cow({ coat: '#403639', muzzle: '#5E5256', earIn: '#7A6368' }, { dark: true, scale: 0.86 }),
  'pet-cow-strawberry': cow({ coat: '#FCF1EF', mark: '#EFA2B0', muzzle: '#F8CACE', tail: '#EFA2B0', nose: '#D98E9A' }, { marks: ['holstein'] }),
  'pet-cow-redholstein': cow({ coat: '#FBF3EA', mark: '#B6604A', muzzle: '#F3C6C0', tail: '#B6604A', tip: '#FBF3EA', nose: '#C98E8C' }, { marks: ['holstein'] }),
  'pet-cow-blueroan': cow({ coat: '#A0A8B6', mark: '#6E7587', muzzle: '#5F6371', tail: '#6E7587', earIn: '#C4A9B0' }, { marks: ['roan'] }),
  'pet-cow-highland': cow(
    { coat: '#DE9E78', mark: '#C8845F', muzzle: '#F2D2BD', ear: '#C8845F', horn: '#F4E9D2', tail: '#C8845F', tip: '#B97453', nose: '#C99080' },
    { marks: ['shag'], traits: ['long-horns', 'fringe'], stocky: 1.08, scale: 0.94 },
  ),
  'pet-cow-nightsky': cow({ coat: '#F7F2EA', mark: '#3F4672', mark2: '#F4E3A1', muzzle: '#F1CFD3', tail: '#3F4672', nose: '#C98E8C' }, { marks: ['stars'] }),
  'pet-cow-spice': cow({ coat: '#F7EBDD', mark: '#D38F5C', muzzle: '#F3CDBE', tail: '#D38F5C', nose: '#C98E8C' }, { marks: ['holstein'] }),

  /* ----------------------------------------------------------------- frogs */
  'pet-frog-tree': frog({ coat: '#AFCB93', mark: '#96B67F', under: '#F1F0D9' }, { marks: ['dots'], traits: ['toe-pads'] }),
  'pet-frog-tomato': frog({ coat: '#E88A5E', under: '#F3C29D', mark: '#D9774D' }, { stocky: 1.06 }),
  'pet-frog-glass': frog({ coat: '#CCDFB4', under: '#F5F7EA', mark: '#B7CE9C', eye: '#E3DDB0' }, { marks: ['glass'], traits: ['toe-pads'] }),
  'pet-frog-mossy': frog({ coat: '#8FA67B', mark: '#6E855D', mark2: '#B7C79F', under: '#D9DFC4' }, { marks: ['moss'] }),
  'pet-frog-peeper': frog({ coat: '#CFAA84', mark: '#916D51', under: '#F1E3CF' }, { marks: ['x'], scale: 0.8 }),
  'pet-frog-blue': frog({ coat: '#7FA6DA', mark: '#2F3552', under: '#A9C2E6' }, { marks: ['dots'] }),
  'pet-frog-strawberry': frog({ coat: '#E4695B', leg: '#6F90CA', under: '#EE9285' }, { marks: ['jeans'], scale: 0.8 }),
  'pet-frog-redeyed': frog({ coat: '#8FC57B', eye: '#E0584B', foot: '#F0A25A', leg: '#8FC57B', mark: '#6F94C9', mark2: '#F4F1E4', under: '#F2EFD6' }, { marks: ['flanks'], traits: ['toe-pads'] }),
  'pet-frog-golden': frog({ coat: '#EFC75A', mark: '#4F4136', under: '#F7E3A5' }, { marks: ['dots'], traits: ['wave'] }),

  /* ------------------------------------------------------------------ dogs */
  'pet-dog-corgi': dog({ coat: '#E3A36D', under: WHITE, muzzle: WHITE, paw: WHITE }, { marks: ['muzzle', 'belly', 'blaze'], traits: ['pointy-ears', 'long-body'] }),
  'pet-dog-dachshund': dog({ coat: '#B9754B', ear: '#A4643F', muzzle: '#C98B62' }, { traits: ['long-ears', 'long-body'] }),
  'pet-dog-pom': dog({ coat: '#F0B87C', under: '#F7D6AE', muzzle: '#F4C995' }, { marks: ['muzzle'], traits: ['fluffy', 'pointy-ears', 'curled-tail'], scale: 0.82 }),
  'pet-dog-shiba': dog({ coat: '#DC955A', under: '#F7E8D3', muzzle: '#F7E8D3', tail: '#DC955A' }, { marks: ['urajiro'], traits: ['pointy-ears', 'curled-tail'] }),
  'pet-dog-golden': dog({ coat: '#E7B770', ear: '#DDA35F', muzzle: '#EFC98C' }, { marks: ['muzzle'] }),
  'pet-dog-dalmatian': dog({ coat: WHITE, mark: SOOT, ear: SOOT, tail: WHITE }, { marks: ['spots'] }),
  'pet-dog-frenchie': dog({ coat: '#DCC3A2', ear: '#D2B592', muzzle: '#7E6A5C', earIn: '#E7B6A6' }, { marks: ['muzzle'], traits: ['bat-ears'], scale: 0.92 }),
  'pet-dog-bernese': dog({ coat: '#3F3638', mark: '#C98552', under: WHITE, paw: WHITE, tip: WHITE }, { marks: ['tricolour'], dark: true, scale: 1.06 }),
  'pet-dog-samoyed': dog({ coat: '#F8F2EA', under: '#FFFCF6', muzzle: '#FFFCF6', earIn: '#EFC4C0' }, { traits: ['fluffy', 'pointy-ears', 'curled-tail'], scale: 1.04 }),
  'pet-dog-beagle': dog({ coat: '#D69B5F', mark: SOOT, under: WHITE, muzzle: WHITE, paw: WHITE, tip: WHITE, ear: '#C98A50' }, { marks: ['saddle', 'muzzle', 'belly', 'blaze'], traits: ['long-ears'] }),
  'pet-dog-husky': dog({ coat: '#8F909B', under: WHITE, eye: BLUE_EYE, earIn: '#D9B2B0' }, { marks: ['mask'], traits: ['pointy-ears', 'curled-tail'], scale: 1.04 }),
  'pet-dog-cavalier': dog({ coat: WHITE, mark: '#C57B4B', ear: '#C57B4B', tail: WHITE }, { marks: ['blenheim'], traits: ['long-ears'], scale: 0.9 }),
  'pet-dog-labrador': dog({ coat: '#ECCB90', ear: '#E1BA7D', muzzle: '#F2D9A8' }, { marks: ['muzzle'] }),

  /* --------------------------------------------------------------- rabbits */
  'pet-bunny-dutch': bunny({ coat: WHITE, mark: '#8D6B58', ear: '#8D6B58', leg: '#8D6B58', paw: WHITE, tail: '#8D6B58' }, { marks: ['dutch'] }),
  'pet-bunny-lionhead': bunny({ coat: '#E7C8A4', under: '#F6E8D7' }, { marks: ['belly'], traits: ['mane'] }),
  'pet-bunny-lop': bunny({ coat: '#CFAD8F', ear: '#BE9B7D', under: '#F1E3D4' }, { marks: ['belly'], traits: ['lop'] }),
  'pet-bunny-himalayan': bunny({ coat: WHITE, point: '#6F5B53', ear: '#6F5B53', leg: WHITE, paw: '#6F5B53', tail: '#6F5B53', eye: '#CF7E88', nose: '#6F5B53' }, { marks: ['points'] }),
  'pet-bunny-angora': bunny({ coat: '#F6EFE6', under: '#FFFCF6', earIn: '#F1C7C4' }, { traits: ['angora'], scale: 1.04 }),
  'pet-bunny-silverfox': bunny({ coat: '#3F3B42', mark: '#D9D5DD', under: '#57525A', nose: '#6A5E66' }, { marks: ['silver'], dark: true }),
  'pet-bunny-cinnamon': bunny({ coat: '#B9774F', under: '#E3BFA2', ear: '#A9683F' }, { marks: ['belly'] }),
  'pet-bunny-snowshoe': bunny({ coat: '#F6F2EC', under: '#FFFCF6', ear: '#F6F2EC' }, { traits: ['big-feet'], scale: 1.04 }),
  'pet-bunny-minirex': bunny({ coat: '#8C6652', under: '#A8826C', nose: '#B98A86' }, { marks: ['belly'] }),
  'pet-bunny-netherland': bunny({ coat: '#D9C0A7', under: '#F3E8DB' }, { marks: ['belly'], traits: ['short-ears'], scale: 0.8 }),
  'pet-bunny-harlequin': bunny({ coat: '#E49B5A', mark: SOOT, mark2: '#E49B5A', ear: SOOT, under: '#F1C79E' }, { marks: ['harlequin'] }),

  /* ----------------------------------------------------------------- bears */
  'pet-bear-brown': bear({ coat: '#9E7050', muzzle: '#D9B592', earIn: '#C79C7C' }),
  'pet-bear-panda': bear({ coat: WHITE, mark: SOOT, ear: SOOT, leg: SOOT, muzzle: WHITE, tail: WHITE }, { marks: ['panda'] }),
  'pet-bear-sun': bear({ coat: '#3F3638', mark: '#E8B560', muzzle: '#D6AB7B', earIn: '#6B5A5E' }, { marks: ['crescent'], dark: true }),
  'pet-bear-spectacled': bear({ coat: '#3F3638', mark: '#EFDDB9', muzzle: '#EFDDB9', earIn: '#6B5A5E' }, { marks: ['spectacles'], dark: true }),
  'pet-bear-black': bear({ coat: '#3B3337', muzzle: '#B78B6B', earIn: '#6B5A5E' }, { dark: true }),
  'pet-bear-polar': bear({ coat: '#F5EEDF', muzzle: '#FBF6EC', earIn: '#EBD3C8' }),

  /* -------------------------------------------------------------- hamsters */
  'pet-hamster-syrian': hamster({ coat: '#E4AF70', under: WHITE, muzzle: '#F7E7D2' }, { marks: ['belly'] }),
  'pet-hamster-winterwhite': hamster({ coat: '#BBB6B6', mark: '#6E6768', under: WHITE, muzzle: '#F1EEEE' }, { marks: ['dorsal', 'belly'] }),
  'pet-hamster-robo': hamster({ coat: '#DEC096', under: WHITE, muzzle: '#F8EEE0' }, { marks: ['belly', 'brows'], scale: 0.86 }),
  'pet-hamster-longhair': hamster({ coat: '#F2DEC0', under: '#FBF2E4', muzzle: '#FBF2E4' }, { traits: ['longhair'] }),
  'pet-hamster-sapphire': hamster({ coat: '#A9B0C1', mark: '#747C8F', under: '#F4F3F6', muzzle: '#E9EAF0' }, { marks: ['dorsal', 'belly'] }),
  'pet-hamster-black': hamster({ coat: '#3C3639', muzzle: '#4E464A', nose: '#F3ECE8', earIn: '#6E5E64' }, { dark: true }),
  'pet-hamster-pearl': hamster({ coat: '#F5F1EC', mark: '#CFC8C8', under: '#FFFCF6', muzzle: '#FFFCF6' }, { marks: ['dorsal'] }),

  /* ----------------------------------------------------------------- ducks */
  'pet-duck-pekin': duck({ coat: '#F8F0E2' }),
  'pet-duck-yellow': duck({ coat: '#F6DB84', bill: '#EDA253', foot: '#EDA253' }),
  'pet-duck-mallard': duck(
    { coat: '#BAB5B0', head: '#40795A', mark: '#8C5C49', mark2: '#9B8E82', point: '#6282C6', bill: '#E6C35C', foot: '#E99A56' },
    { marks: ['mallard', 'speculum'] },
  ),
  'pet-duck-call': duck({ coat: WHITE }, { scale: 0.78 }),
  'pet-duck-mandarin': duck(
    { coat: '#E5CBA8', head: '#6F7B5E', under: WHITE, point: '#E38A4B', mark: '#7B5B80', mark2: '#C9A98A', bill: '#DA6A5B', foot: '#E4935A' },
    { marks: ['mandarin'] },
  ),
  'pet-duck-cayuga': duck({ coat: '#303432', mark: '#3F6B53', bill: '#4B4B47', foot: '#403E3C' }, { marks: ['sheen'], dark: true }),
  'pet-duck-runner': duck({ coat: '#E9D5B9', under: WHITE, bill: '#93A56E', foot: '#DE9A5E' }, { marks: ['belly'], traits: ['upright'] }),
  'pet-duck-crested': duck({ coat: WHITE }, { traits: ['crest'] }),
  'pet-duck-eider': duck({ coat: '#AAA5A0', under: '#CBC6C0', bill: '#6F6A66', foot: '#8F8A82' }, { marks: ['belly'] }),
};

/* --------------------------------------------------------------- moonlit */

const MOON = '#9FA8D8';
const cache = new Map<string, PetLook>();

/**
 * Moonlit variants (DESIGN §7.1): the same animal in night colours. The coat shifts toward a
 * blue-lavender, the markings go lighter, and a few pale static flecks appear. Quiet, not neon.
 */
export function moonlit(look: PetLook): PetLook {
  const p = look.palette;
  const shift = (c: string | undefined, k = 0.34) => (c ? mix(c, MOON, k) : undefined);
  // Markings go lighter but keep their place against the coat: dark marks become soft slate,
  // pale marks go paler, so a tabby keeps its stripes.
  const coatLuma = luma(p.coat);
  const lighter = (c: string | undefined) => (c ? mix(mix(c, MOON, 0.34), '#F2EEFA', luma(c) < coatLuma ? 0.08 : 0.28) : undefined);
  const palette: PetPalette = {
    ...p,
    coat: shift(p.coat)!,
    under: shift(p.under, 0.22),
    mark: lighter(p.mark),
    mark2: lighter(p.mark2),
    point: lighter(p.point),
    head: shift(p.head),
    ear: shift(p.ear),
    leg: shift(p.leg),
    paw: shift(p.paw, 0.2),
    tail: shift(p.tail),
    tip: lighter(p.tip),
    muzzle: shift(p.muzzle, 0.2),
  };
  for (const k of Object.keys(palette) as (keyof PetPalette)[]) if (palette[k] === undefined) delete palette[k];
  return { ...look, palette, flecks: true };
}

const FALLBACK = LOOKS['pet-cat-orange']!;

/** The look for any pet id, including 'moonlit:<petId>'. Unknown ids fall back to the orange tabby. */
export function getLook(petId: string): PetLook {
  const direct = LOOKS[petId];
  if (direct) return direct;
  const base = moonlitBase(petId);
  if (base) {
    const hit = cache.get(petId);
    if (hit) return hit;
    const look = moonlit(LOOKS[base] ?? FALLBACK);
    cache.set(petId, look);
    return look;
  }
  return FALLBACK;
}

export { MOONLIT_PREFIX };

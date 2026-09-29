/**
 * The Pet Card's words (DESIGN §8.2, §8.5, §14.1; VOICE §9, §11, §13), from the view model's data:
 * every template is lines.ts's (PET_CARD, FRIENDSHIP_LEVELS, KNOWN_FOR, MEMORIES, PLACE_LINES,
 * COMPANION). The chrome that VOICE.md has no row for yet is in `PET_CARD_UI`, and NOTES-w2-shelf.md
 * asks for its rows. Pure functions, so the card's wording is unit-tested.
 */
import { getCollectible } from '@/catalog/collectibles';
import { FRIENDSHIP_LEVELS, KEEPSAKE_CAPTIONS, PET_CARD, capitalise, fillLine, fitsSpecies, knownFor, lineText, pickFrom, plantPhrase } from '@/catalog/lines';
import { memoryText, placePhrase } from '@/catalog/format';
import { TREAT_TAG_HINTS } from '@/catalog/personalities';
import type { PlaceId, PlantSpeciesId, Species, WearableSlot } from '@/catalog/types';
import type { PetVM } from '@/state/selectors';
import type { Keepsake, PetMemory } from '@/state/types';
import { monthDayLabel } from '@/domain/dates';

/** The Pet Card's chrome where VOICE.md has no line yet (sentence case, no pronouns). */
export const PET_CARD_UI = {
  friendshipAria: 'Friendship: {level}',
  out: 'Out on the Shelf',
  outHint: 'Indoors, {name} rests and waits for a place on the Shelf.',
  noRoom: 'The Shelf has room for {count} pets out. Bring someone indoors first.',
  placeFull: '{Place} has room for 2.',
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
  indoors: 'Indoors',
} as const;

/** "Knows you" · "Best friends" · "Old friends" (bond levels 11–15 keep their own names). */
export function levelName(level: number): string {
  return FRIENDSHIP_LEVELS.find((l) => l.level === level)?.name ?? FRIENDSHIP_LEVELS[0]!.name;
}

/** What the pet does now (the level's line, species-true), for the friendship row. */
export function levelLine(name: string, level: number, species: Species | null, friend: string | null): string {
  const def = FRIENDSHIP_LEVELS.find((l) => l.level === level) ?? FRIENDSHIP_LEVELS[0]!;
  if (level === 8 && !friend && def.solo) return fillLine(def.solo, { name });
  const line = def.lines.find((l) => !species || fitsSpecies(l, species)) ?? def.lines[0]!;
  return fillLine(lineText(line), { name, friend: friend ?? '' });
}

/** "Likes": the favourite once found ("Blueberries, most of all"), before that the hint. */
export function likesLine(likes: PetVM['likes']): string | null {
  if (!likes) return null;
  if (likes.kind === 'treat') return fillLine(PET_CARD.likesTreat, { Treat: getCollectible(likes.treatId)?.name ?? likes.treatId });
  if (likes.kind === 'tag') return TREAT_TAG_HINTS[likes.tag];
  return TREAT_TAG_HINTS.fresh;
}

/** "Known for" (§14.1): the routine's line for this pet, the same one on every visit. */
export function knownForLine(company: PetVM['company'], species: Species | null, petId: string): string | null {
  const k = company.knownFor;
  if (!k) return null;
  const lines = knownFor(k.icon)[k.routine.phase === 'settled' ? 'settled' : 'starting'];
  return pickFrom(lines, species ?? 'cat', hash(petId));
}

/** "Favourite spot": a pot ("The Read plant") or a place ("The Saucer Pond"). */
export function spotLine(spot: PetVM['spot'], habits: readonly { id: string; name: string; plant: PlantSpeciesId }[]): string | null {
  if (!spot) return null;
  if (spot.kind === 'place') return capitalise(placePhrase(spot.place));
  const h = habits.find((x) => x.id === spot.habitId);
  return h ? capitalise(plantPhrase(h.name, h.plant)) : null;
}

/** "Keeps Read company". */
export const keepsLine = (habit: string): string => fillLine(PET_CARD.fields.company, { habit });

/** A dated Memory in the diary's words ("Came home Sep 29", "The day Read bloomed"). */
export function memoryLine(m: PetMemory, habits: readonly { id: string; name: string; plant: PlantSpeciesId }[]): string {
  const h = m.habitId ? habits.find((x) => x.id === m.habitId) : undefined;
  const treat = m.treatId ? (getCollectible(m.treatId)?.name ?? '').toLowerCase() : '';
  return memoryText({ kind: m.kind, date: m.date, habit: h?.name ?? '', plant: h ? plantPhrase(h.name, h.plant) : '', treat });
}

/** The gesture buttons (VOICE §9): "Touch nose", or "Touch beak" for ducks, "Touch head" for frogs. */
export function boopLabel(species: Species | null): string {
  return species === 'duck' ? PET_CARD.buttons.touchBeak : species === 'frog' ? PET_CARD.buttons.touchHead : PET_CARD.buttons.touchNose;
}

/** "Find Pudding a plant", "Let Pudding choose", "Move Pudding". */
export const withName = (template: string, name: string): string => fillLine(template, { name });

/** The place's name in a sentence ("the Saucer Pond"), capitalised to open one. */
export const PlacePhrase = (place: PlaceId): string => capitalise(placePhrase(place));

/** "3 servings" (never a 0: "More in the morning"). */
export function servingsLine(n: number): string {
  if (n <= 0) return PET_CARD_UI.servingsNone;
  return n === 1 ? PET_CARD_UI.servingsOne : fillLine(PET_CARD_UI.servings, { count: n });
}

/** A small stable hash, so a pet's "Known for" line doesn't change from one visit to the next. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A keepsake's dated caption (§14.1): her Moment when it has one, else its family's line. */
export function keepsakeCaption(k: Pick<Keepsake, 'kind' | 'date' | 'note'>): string {
  if (k.note?.text) return fillLine(KEEPSAKE_CAPTIONS.moment, { date: monthDayLabel(k.note.date), moment: k.note.text });
  return fillLine(KEEPSAKE_CAPTIONS[k.kind], { date: monthDayLabel(k.date) });
}

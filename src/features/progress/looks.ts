import type { PlantLookArt } from '@/art/plants';
import type { AppState, PlantLook } from '@/state/types';

/**
 * The look a plant shows (Blooms Like You, DESIGN §14.2) as PlantArt takes it: its colour and
 * shape, and for Paired the partner habit's card colour. Undefined: Classic.
 */
export function lookArtOf(s: Pick<AppState, 'plantLooks' | 'habits'>, habitId: string, look?: PlantLook | null): PlantLookArt | undefined {
  const pl = s.plantLooks?.[habitId];
  const l = look === undefined ? (pl && pl.shown !== null ? pl.looks[pl.shown] : undefined) : (look ?? undefined);
  if (!l) return undefined;
  const partnerId = l.evidence.keptTogether?.habitId ?? s.habits.find((h) => h.id === habitId)?.anchorHabitId;
  const partner = partnerId ? s.habits.find((h) => h.id === partnerId) : undefined;
  return { colour: l.colour, shape: l.shape, ...(l.shape === 'paired' && partner ? { partnerColour: partner.color } : {}) };
}

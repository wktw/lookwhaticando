/** Earned plant identity, independent of a screen's damp soil, pulse, routine or bow. */
import type { PlantLookArt } from '@/art/plants';
import type { AppState, Habit, Outfit, PlantLook } from '../types';
import { companionOf } from '@/domain/company';
import { plantVM, type ViewEnv } from './common';

export interface PlantPresentation {
  species: Habit['plant'];
  pot: Habit['pot'];
  stage: number;
  progress: number;
  blooms: number | undefined;
  flourishes: number;
  look: PlantLookArt | undefined;
  resident: { petId: string; outfit: Outfit } | undefined;
}

/** Paired follows the recorded earning partner; deleting it leaves the earned shape intact. */
export function lookArtOf(s: Pick<AppState, 'plantLooks' | 'habits'>, habitId: string, look?: PlantLook | null): PlantLookArt | undefined {
  const pl = s.plantLooks?.[habitId];
  if (look === undefined && pl?.confirmed?.shown) {
    const c = pl.confirmed;
    const partner = c.partnerId ? s.habits.find((h) => h.id === c.partnerId) : undefined;
    return { colour: c.colour, shape: c.shape, ...(c.shape === 'paired' && partner ? { partnerColour: partner.color } : {}) };
  }
  const l = look === undefined ? (pl && pl.shown !== null ? pl.looks[pl.shown] : undefined) : (look ?? undefined);
  if (!l) return undefined;
  const partnerId = l.evidence.keptTogether?.habitId ?? s.habits.find((h) => h.id === habitId)?.anchorHabitId;
  const partner = partnerId ? s.habits.find((h) => h.id === partnerId) : undefined;
  return { colour: l.colour, shape: l.shape, ...(l.shape === 'paired' && partner ? { partnerColour: partner.color } : {}) };
}

export function plantPresentation(s: AppState, habitId: string, env: ViewEnv): PlantPresentation | null {
  const habit = s.habits.find((h) => h.id === habitId);
  if (!habit) return null;
  const p = plantVM(s, habit, env.today, env.local);
  const petId = companionOf(s, habit);
  const pet = petId ? s.pets[petId] : undefined;
  return {
    species: p.species, pot: p.pot, stage: p.displayStage, progress: p.progress,
    blooms: p.blooms, flourishes: p.flourishes, look: lookArtOf(s, habitId),
    resident: pet ? { petId: pet.id, outfit: pet.outfit } : undefined,
  };
}

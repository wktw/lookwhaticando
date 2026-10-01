import { signal } from '@preact/signals';

/**
 * How any screen opens the shared sheets. Each sheet's host is mounted once by the app shell
 * (src/app/SheetHosts.tsx) and loaded lazily the first time its request is set.
 */
export interface HabitEditorRequest {
  /** Edit this habit; omit to create a new one. */
  id?: string;
  /** Start a new habit from this template. */
  templateId?: string;
}

/** What a Pet Card is opened to do (WP-C7): the chooser for a plant to keep company, or the Feed row. */
export type PetIntent = 'findPlant' | 'feed';
export const PET_INTENTS: readonly PetIntent[] = ['findPlant', 'feed'];

export interface PetCardRequest {
  id: string;
  /** Land on this part of the card, with focus in it; omit for the card as it opens from the Shelf. */
  intent?: PetIntent;
}

export const habitEditorRequest = signal<HabitEditorRequest | null>(null);
export const habitDetailRequest = signal<string | null>(null);
export const petCardRequest = signal<PetCardRequest | null>(null);

export function openHabitEditor(req: HabitEditorRequest = {}): void {
  habitEditorRequest.value = { ...req };
}
export function closeHabitEditor(): void {
  habitEditorRequest.value = null;
}
export function openHabitDetail(habitId: string): void {
  habitDetailRequest.value = habitId;
}
export function closeHabitDetail(): void {
  habitDetailRequest.value = null;
}
export function openPetCard(petId: string, opts: { intent?: PetIntent } = {}): void {
  petCardRequest.value = opts.intent ? { id: petId, intent: opts.intent } : { id: petId };
}
export function closePetCard(): void {
  petCardRequest.value = null;
}

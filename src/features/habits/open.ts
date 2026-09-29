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

export const habitEditorRequest = signal<HabitEditorRequest | null>(null);
export const habitDetailRequest = signal<string | null>(null);
export const petCardRequest = signal<string | null>(null);

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
export function openPetCard(petId: string): void {
  petCardRequest.value = petId;
}
export function closePetCard(): void {
  petCardRequest.value = null;
}

import { signal } from '@preact/signals';

/**
 * How any screen opens a ritual in its reader (DESIGN §13): a Sunday Note, a Herbarium page or an
 * anniversary note by its letter id, or a filed season by its first day. Today opens the note on
 * the sill with `openRitual(letterWaiting.id)`; the memory shelf opens any of them.
 *
 * The reader's host (`./RitualReaderHost`, default export) renders whatever is requested. It is
 * mounted by the Progress screen and can also be mounted once by the app shell (SheetHosts);
 * only one mounted host ever draws the sheet.
 */
export type RitualRequest = { kind: 'letter'; id: string } | { kind: 'season'; key: string };

export const ritualRequest = signal<RitualRequest | null>(null);

export function openRitual(letterId: string): void {
  ritualRequest.value = { kind: 'letter', id: letterId };
}

export function openSeason(key: string): void {
  ritualRequest.value = { kind: 'season', key };
}

export function closeRitual(): void {
  ritualRequest.value = null;
}

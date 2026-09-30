import { signal } from '@preact/signals';

/**
 * How any screen opens a ritual in its reader (DESIGN §13): a Sunday Note, a Herbarium page or an
 * anniversary note by its letter id, or a filed season by its first day. Today opens the note on
 * the sill (and the Shelf its clipped note) with `openRitual(letterWaiting.id, { fromSill: true })`;
 * the memory shelf opens any of them.
 *
 * The reader's host (`./RitualReaderHost`, default export) renders whatever is requested. It is
 * loaded and mounted by the app shell (SheetHosts) the first time one is asked for, with a retry
 * if its chunk can't load; if two hosts are ever mounted, only one draws the sheet.
 */
/** `fromSill`: opened from the note on the sill, so closing it says where it went (the memory shelf). */
export type RitualRequest = { kind: 'letter'; id: string; fromSill?: boolean } | { kind: 'season'; key: string };

export const ritualRequest = signal<RitualRequest | null>(null);

export function openRitual(letterId: string, opts: { fromSill?: boolean } = {}): void {
  ritualRequest.value = { kind: 'letter', id: letterId, ...(opts.fromSill ? { fromSill: true } : {}) };
}

export function openSeason(key: string): void {
  ritualRequest.value = { kind: 'season', key };
}

export function closeRitual(): void {
  ritualRequest.value = null;
}

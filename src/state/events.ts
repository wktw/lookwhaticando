import type { GameEvent } from './api';

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

/**
 * Events kept for the next listener while held (`holdGameEvents`), or null. The celebration host
 * loads after first paint (fx/celebrationHostLoader), and this keeps what happens before it listens.
 */
let held: GameEvent[] | null = null;
let onFirstHeld: (() => void) | undefined;

/**
 * Subscribe to game events (coins, milestones, badges…). Returns an unsubscribe fn. While events
 * are held, the listener is handed what was kept, in order, and the hold ends.
 */
export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  if (held) {
    const kept = held;
    dropHeldGameEvents();
    for (const e of kept) fn(e);
  }
  return () => listeners.delete(fn);
}

export function emitGameEvents(events: GameEvent[]): void {
  if (held) {
    if (!events.length) return;
    const first = !held.length;
    held.push(...events);
    if (first) onFirstHeld?.();
    return;
  }
  for (const e of events) for (const l of listeners) l(e);
}

/**
 * Keep events from now on, until a listener subscribes (it is handed them) or the hold is let go.
 * `onFirst` is told when the first event is kept.
 */
export function holdGameEvents(onFirst?: () => void): void {
  held ??= [];
  onFirstHeld = onFirst;
}

/** Let the hold go: what was kept is dropped, and events flow again. */
export function dropHeldGameEvents(): void {
  held = null;
  onFirstHeld = undefined;
}

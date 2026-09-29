import type { GameEvent } from './api';

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

/** Subscribe to game events (coins, milestones, badges…). Returns an unsubscribe fn. */
export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitGameEvents(events: GameEvent[]): void {
  for (const e of events) for (const l of listeners) l(e);
}

/**
 * Screen-reader announcements through shared visually-hidden live regions
 * ("Walk done, plus 5 coins"). Safe to call anywhere, any time.
 */
import { topNotesSlot } from './sheetStack';

const regions: Partial<Record<'polite' | 'assertive', HTMLElement>> = {};
const timers: Partial<Record<'polite' | 'assertive', number>> = {};

function region(politeness: 'polite' | 'assertive'): HTMLElement {
  const existing = regions[politeness];
  if (existing?.isConnected) return existing;
  const el = document.createElement('div');
  el.className = 'sr-only';
  el.setAttribute('role', politeness === 'polite' ? 'status' : 'alert');
  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', 'true');
  document.body.appendChild(el);
  regions[politeness] = el;
  return el;
}

export function announce(message: string | (() => string), politeness: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined' || !message) return;
  const el = region(politeness);
  // Clear first so repeating the same sentence is still announced.
  el.textContent = '';
  clearTimeout(timers[politeness]);
  timers[politeness] = window.setTimeout(() => {
    const text = typeof message === 'function' ? message() : message;
    if (!text) return;
    // Modal screen readers must hear the same note whose actions are inside their focus scope.
    (topNotesSlot() ?? document.body).appendChild(el);
    el.textContent = text;
  }, 60);
}

/** The burst rule's quiet time (DESIGN §9.1): rapid check-ins are announced once, after this. */
export const SETTLE_MS = 1200;

const settling = new Map<string, { timer: number; message: () => string }>();

/**
 * Announce once things have gone quiet (the burst rule, DESIGN §9.1). Each call restarts the
 * group's timer and replaces what will be said, so four quick check-ins are read as one
 * sentence 1.2 s after the last tap. Pass a function to build that sentence when it is spoken.
 */
export function announceSettled(group: string, message: string | (() => string), quietMs = SETTLE_MS): void {
  if (typeof window === 'undefined') return;
  const prev = settling.get(group);
  if (prev) clearTimeout(prev.timer);
  const entry = {
    message: typeof message === 'function' ? message : () => message,
    timer: window.setTimeout(() => {
      settling.delete(group);
      announce(entry.message);
    }, quietMs),
  };
  settling.set(group, entry);
}

/** Drop a group's pending announcement (an undo before it was spoken). */
export function cancelSettled(group: string): void {
  const prev = settling.get(group);
  if (!prev) return;
  clearTimeout(prev.timer);
  settling.delete(group);
}

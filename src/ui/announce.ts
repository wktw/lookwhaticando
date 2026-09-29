/**
 * Screen-reader announcements through shared visually-hidden live regions
 * ("Walk done, plus 5 coins"). Safe to call anywhere, any time.
 */
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

export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined' || !message) return;
  const el = region(politeness);
  // Clear first so repeating the same sentence is still announced.
  el.textContent = '';
  clearTimeout(timers[politeness]);
  timers[politeness] = window.setTimeout(() => (el.textContent = message), 60);
}

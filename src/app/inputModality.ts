/**
 * How she last moved around the app: with the keyboard, or with a pointer (touch, mouse, pen).
 * A tab change by keyboard moves focus to the new screen's heading; by touch it stays put.
 */
let last: 'keyboard' | 'pointer' = 'pointer';
let installed = false;

export function trackInputModality(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', (e) => !e.metaKey && !e.ctrlKey && !e.altKey && (last = 'keyboard'), true);
  window.addEventListener('pointerdown', () => (last = 'pointer'), true);
}

export function lastInputWasKeyboard(): boolean {
  return last === 'keyboard';
}

/** For tests. */
export function setInputModality(m: 'keyboard' | 'pointer'): void {
  last = m;
}

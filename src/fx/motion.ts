/**
 * Reduced-motion resolution shared by FX and UI.
 * <html data-motion="reduced|full"> (from settings) wins; otherwise the OS preference applies.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  const pref = document.documentElement.dataset.motion;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

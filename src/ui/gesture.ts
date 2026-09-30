/**
 * Gesture abort (WP-C2). Every drag, flick and press here has four ends: begin, move, release and
 * abort. A release may commit (dismiss, move, count); an abort never does. It puts the visual state
 * back, commits nothing and clears every flag. Aborts come from `touchcancel` / `pointercancel`,
 * a pointer capture lost without a pointerup, unmounting, and the window losing focus or the page
 * being hidden mid-gesture (a call, Control Centre, an app switch), which is what this helper
 * listens for. Each primitive keeps its own release; only the abort is shared.
 */

/**
 * While a gesture is under way: call `abort` if the window loses focus or the page is hidden.
 * Returns the detach, which the gesture calls when it ends and its owner calls on unmount.
 */
export function onInterrupt(abort: () => void): () => void {
  const blur = () => abort();
  const hidden = () => document.visibilityState === 'hidden' && abort();
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', hidden);
  };
}

/**
 * A click with no pointer press behind it: Enter or Space on a focused button, or an assistive
 * activation. Click suppression after a pointer gesture never applies to one of these.
 */
export const keyboardClick = (e: MouseEvent): boolean => e.detail === 0;

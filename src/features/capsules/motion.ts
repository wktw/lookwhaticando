import { state } from '@/state/store';

/**
 * Whether to use reduced motion for JS-driven animation (physics, WAAPI). CSS animations
 * are already neutralized globally (global.css); this mirrors the same resolution order:
 * the root's data-motion attribute, then the user's preference, then the OS setting.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  const attr = document.documentElement.dataset.motion;
  if (attr === 'reduced') return true;
  if (attr === 'full') return false;
  const pref = state.value.settings.reduceMotion;
  if (pref !== 'auto') return pref === 'on';
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Promise that resolves after `ms` (used to sequence choreography). */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve when a Web Animation ends, even if it is cancelled (keeps sequences from stalling). */
export function done(anim: Animation | undefined): Promise<void> {
  if (!anim) return Promise.resolve();
  return anim.finished.then(
    () => undefined,
    () => undefined,
  );
}

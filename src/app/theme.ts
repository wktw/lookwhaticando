/**
 * Applies settings.theme (auto/light/night) to <html data-theme>, settings.reduceMotion to
 * <html data-motion>, and keeps the browser chrome in step via meta theme-color. index.html runs
 * the same logic inline before first paint (no flash).
 *
 * The iOS status bar style stays "default" in both themes (index.html): iOS reads that tag only
 * at launch, so a per-theme style would be wrong after the first switch (white text on cream
 * when a night-launched app turns light). "default" takes its tint from theme-color and picks
 * readable text itself.
 */
import { computed, effect } from '@preact/signals';
import { state } from '@/state/store';
import type { Settings } from '@/state/types';

export type ResolvedTheme = 'light' | 'night';

export const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#FFF9F2', night: '#221C30' };

export function resolveTheme(pref: Settings['theme'], systemDark: boolean): ResolvedTheme {
  return pref === 'auto' ? (systemDark ? 'night' : 'light') : pref;
}

function meta(name: string): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]:not([media])`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'night' ? 'dark' : 'light';
  // One unconditional theme-color: the media-query pair in index.html would follow the OS, not the setting.
  for (const m of document.querySelectorAll('meta[name="theme-color"][media]')) m.remove();
  meta('theme-color').content = THEME_COLOR[theme];
}

export function applyMotion(pref: Settings['reduceMotion']): void {
  const root = document.documentElement;
  if (pref === 'on') root.dataset.motion = 'reduced';
  else if (pref === 'off') root.dataset.motion = 'full';
  else delete root.dataset.motion;
}

/** Follow settings (and the OS, for 'auto') until the returned stop fn is called. */
export function startThemeSync(): () => void {
  const dark = matchMedia('(prefers-color-scheme: dark)');
  // Computed values only notify on change, so check-ins and other state updates don't re-apply.
  const theme = computed(() => state.value.settings.theme);
  const motion = computed(() => state.value.settings.reduceMotion);
  const onSystem = () => applyTheme(resolveTheme(theme.value, dark.matches));
  dark.addEventListener('change', onSystem);
  const stopTheme = effect(() => applyTheme(resolveTheme(theme.value, dark.matches)));
  const stopMotion = effect(() => applyMotion(motion.value));
  return () => {
    dark.removeEventListener('change', onSystem);
    stopTheme();
    stopMotion();
  };
}

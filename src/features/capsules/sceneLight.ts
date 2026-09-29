import { useEffect, useState } from 'preact/hooks';
import { DAY_LIGHT, NIGHT_LIGHT, windowLight, type Light } from '@/art/light';

/** Whether the page is in Lamplight (the night theme, or the OS asking for dark with no theme set). */
export function isLamplight(): boolean {
  if (typeof document === 'undefined') return false;
  const theme = document.documentElement.dataset.theme;
  if (theme === 'night') return true;
  if (theme === 'light') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * The light the capsule art takes (DESIGN §10.4): the lamp when the page is in Lamplight,
 * otherwise the real window at this time of day (the same light as the sill), which never
 * turns to night on a daylight page.
 */
export function sceneLight(now: Date = new Date(), lamplight: boolean = isLamplight()): Light {
  if (lamplight) return NIGHT_LIGHT;
  const w = windowLight(now);
  return w.night ? DAY_LIGHT : { from: w.from, night: false };
}

const QUARTER_HOUR = 15 * 60_000;

/** The scene light, kept current: every 15 minutes and whenever the theme changes. */
export function useSceneLight(): Light {
  const [light, setLight] = useState<Light>(() => sceneLight());
  useEffect(() => {
    const update = () =>
      setLight((prev) => {
        const next = sceneLight();
        return next.from === prev.from && next.night === prev.night ? prev : next;
      });
    const timer = window.setInterval(update, QUARTER_HOUR);
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(update) : null;
    observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    media?.addEventListener?.('change', update);
    return () => {
      clearInterval(timer);
      observer?.disconnect();
      media?.removeEventListener?.('change', update);
    };
  }, []);
  return light;
}

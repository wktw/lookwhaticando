/**
 * One light for the whole app (DESIGN §10.4: "one global light direction … from the real window, updated in 15-minute
 * steps"). The scenes, the card plants, the capsule art and the UI's small drawings all read these signals, so a
 * crescent on a card never disagrees with the band above it.
 *
 * - `windowClock`: the clock, re-read at each quarter hour and when the page comes back into view.
 * - `windowHemisphere`: the hemisphere from settings (or todayVM.season.hemisphere); set it once at start-up.
 * - `windowMoment`: the moment at the window (the light, the sky, the season, the hour), for scenes.
 * - `pageLamplight`: whether the page is in Lamplight (the night theme, or the OS dark with no theme chosen).
 * - `artLight`: the light for art outside a scene: the lamp on a Lamplight page, otherwise the window at this hour (the
 *   same side as the band), and the morning window when a daylight page is open after dark.
 *
 * The clock runs only while something uses it (`retainWindowClock`, which the hooks call).
 */
import { computed, signal, type ReadonlySignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { DAY_LIGHT, NIGHT_LIGHT, type Hemisphere, type Light } from '@/art/light';
import { momentAt, type Moment } from './time';

export const windowClock = signal<Date>(new Date());
export const windowHemisphere = signal<Hemisphere>('north');

/** Whether the page shows Lamplight right now (read from the document). */
export function readLamplight(): boolean {
  if (typeof document === 'undefined') return false;
  const theme = document.documentElement.dataset.theme;
  if (theme === 'night') return true;
  if (theme === 'light') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export const pageLamplight = signal<boolean>(readLamplight());

/** The same quarter hour gives the same moment object, so nothing downstream re-renders in between. */
const quarter = computed(() => {
  const d = windowClock.value;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 15)}`;
});

export const windowMoment: ReadonlySignal<Moment> = computed(() => {
  void quarter.value;
  return momentAt(windowClock.peek(), windowHemisphere.value);
});

/** The light for art outside a scene (see the module notes). Pure, for tests and the functions below. */
export function artLightFor(moment: Moment, lamplight: boolean): Light {
  if (lamplight) return NIGHT_LIGHT;
  return moment.light.night ? DAY_LIGHT : { from: moment.light.from, night: false };
}

export const artLight: ReadonlySignal<Light> = computed(() => artLightFor(windowMoment.value, pageLamplight.value));

/** Sets the hemisphere (settings, or the Today view's season). */
export function setWindowHemisphere(h: Hemisphere): void {
  if (windowHemisphere.peek() !== h) windowHemisphere.value = h;
}

/** Milliseconds from `now` to the next quarter hour on the local clock (at least 1 s). */
export function msToNextQuarter(now: Date): number {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(Math.floor(now.getMinutes() / 15) * 15 + 15);
  return Math.max(1000, next.getTime() - now.getTime());
}

let users = 0;
let stop: (() => void) | null = null;

function startClock(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    clearTimeout(timer);
    const t = new Date();
    windowClock.value = t;
    pageLamplight.value = readLamplight();
    timer = setTimeout(tick, msToNextQuarter(t));
  };
  tick();
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };
  const onTheme = () => (pageLamplight.value = readLamplight());
  document.addEventListener('visibilitychange', onVisible);
  const observer = typeof MutationObserver === 'function' ? new MutationObserver(onTheme) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  media?.addEventListener?.('change', onTheme);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
    observer?.disconnect();
    media?.removeEventListener?.('change', onTheme);
  };
}

/** Keeps the clock running while the caller needs it; returns the release. */
export function retainWindowClock(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (users++ === 0) stop = startClock();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--users === 0) {
      stop?.();
      stop = null;
    }
  };
}

/** The app's art light, kept current (a hook: it runs the shared clock while mounted). */
export function useArtLight(): Light {
  useEffect(() => retainWindowClock(), []);
  return artLight.value;
}

/** The art light right now, for code outside components (`themeLight`, `sceneLight`). */
export function artLightNow(): Light {
  return artLightFor(momentAt(new Date(), windowHemisphere.peek()), readLamplight());
}

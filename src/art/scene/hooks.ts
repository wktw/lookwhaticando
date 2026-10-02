/** Small DOM hooks for scenes: their width in room units, pausing when nobody can see them, and the clock. */
import { getPlatform } from '@/platform/capabilities';
import type { RefObject } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { retainWindowClock, windowClock, windowHemisphere, windowMoment } from './moment';
import type { Hemisphere } from '@/art/light';
import { momentAt, type Moment } from './time';

/**
 * The element's width in room units (its width ÷ its height × 100), rounded up to `step` units so
 * a resize re-lays the scene out only now and then. `fallback` is used before the first measure.
 */
export function useWidthUnits(ref: RefObject<HTMLElement>, fallback: number, step = 4): number {
  const [units, setUnits] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setUnits(Math.ceil(((el.clientWidth / h) * 100) / step) * step);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return units;
}

/**
 * Whether the scene is on screen and its tab visible. While not, `data-paused` is set on it (CSS
 * animations stop) and `onChange(false)` lets the pets' director stop scheduling.
 */
export function useVisible(ref: RefObject<HTMLElement>, onChange?: (visible: boolean) => void): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = true;
    const apply = () => {
      const v = onScreen && !getPlatform().lifecycle.hidden;
      if (v) el.removeAttribute('data-paused');
      else el.setAttribute('data-paused', '');
      setVisible(v);
      onChange?.(v);
    };
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            onScreen = entries.some((e) => e.isIntersecting);
            apply();
          });
    io?.observe(el);
    const stopLifecycle = getPlatform().lifecycle.subscribe(apply);
    apply();
    return () => {
      io?.disconnect();
      stopLifecycle();
    };
  }, [ref, onChange]);
  return visible;
}

export { msToNextQuarter } from './moment';

/**
 * The window's moment, kept current (DESIGN §10.4: Windowlight updates in 15-minute steps). With no pinned `moment`
 * or `now`, it follows the app's one shared clock (`windowMoment` in moment.ts: re-read at each quarter hour and when
 * the page comes back into view), re-rendering only when the moment actually changes: at most 96 times a day. A
 * `hemisphere` different from the app's is honoured for this scene.
 */
export function useWindowMoment(opts: { now?: Date; moment?: Moment; hemisphere?: Hemisphere }): Moment {
  const { now, moment, hemisphere } = opts;
  const follow = !moment && !now;
  useEffect(() => (follow ? retainWindowClock() : undefined), [follow]);
  const shared = follow ? windowMoment.value : null;
  const own = follow && hemisphere && hemisphere !== windowHemisphere.value ? windowClock.value : null;
  const date = now ?? own;
  const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${Math.floor(date.getMinutes() / 15)}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computedMoment = useMemo(() => (date ? momentAt(date, hemisphere) : null), [key, hemisphere]);
  return moment ?? computedMoment ?? shared!;
}

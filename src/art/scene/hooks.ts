/** Small DOM hooks for scenes: their width in room units, pausing when nobody can see them, and the clock. */
import type { RefObject } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
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
      const v = onScreen && (typeof document === 'undefined' || document.visibilityState !== 'hidden');
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
    document.addEventListener('visibilitychange', apply);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', apply);
    };
  }, [ref, onChange]);
  return visible;
}

/** Milliseconds from `now` to the next quarter hour on the local clock (at least 1 s). */
export function msToNextQuarter(now: Date): number {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(Math.floor(now.getMinutes() / 15) * 15 + 15);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * The window's moment, kept current (DESIGN §10.4: Windowlight updates in 15-minute steps). With no
 * pinned `moment` or `now`, it re-reads the clock at each quarter hour and when the page comes back
 * into view (a resumed app), and re-renders only when the moment actually changed: at most 96 times
 * a day, never per frame.
 */
export function useWindowMoment(opts: { now?: Date; moment?: Moment; hemisphere?: Hemisphere }): Moment {
  const { now, moment, hemisphere } = opts;
  const follow = !moment && !now;
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (!follow) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reread = () => {
      clearTimeout(timer);
      const t = new Date();
      // Same quarter hour, same light: keep the old Date so nothing downstream re-renders.
      setClock((prev) => (quarterKey(prev) === quarterKey(t) ? prev : t));
      timer = setTimeout(reread, msToNextQuarter(t));
    };
    timer = setTimeout(reread, msToNextQuarter(new Date()));
    const onVisible = () => {
      if (document.visibilityState === 'visible') reread();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [follow]);
  const date = now ?? clock;
  const key = quarterKey(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computed = useMemo(() => momentAt(date, hemisphere), [key, hemisphere]);
  return moment ?? computed;
}

function quarterKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 15)}`;
}

/** Small DOM hooks for scenes: their width in room units, and pausing when nobody can see them. */
import type { RefObject } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/**
 * The element's width in room units (its width ÷ its height × 100), rounded to 4 units so a
 * resize re-lays the scene out only now and then. `fallback` is used before the first measure.
 */
export function useWidthUnits(ref: RefObject<HTMLElement>, fallback: number): number {
  const [units, setUnits] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setUnits(Math.ceil(((el.clientWidth / h) * 100) / 4) * 4);
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

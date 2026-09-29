/** Small hooks behind PlantArt: stable ids, watering detection and off-screen pausing. */
import { useEffect, useId, useRef, useState } from 'preact/hooks';

/** An id safe for clip-path / gradient references, unique per mounted instance. */
export function useUid(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * Counts waterings: how many times `pulse` has gone UP since mount. Decreases (an undone check-in,
 * a counter reset at midnight) and the first value never water the plant, so lists stay calm on render.
 */
export function useWaterings(pulse: number | undefined): number {
  const [count, setCount] = useState(0);
  const last = useRef(pulse);
  useEffect(() => {
    const previous = last.current;
    last.current = pulse;
    if (pulse !== undefined && Number.isFinite(pulse) && pulse > (previous ?? -Infinity)) setCount((c) => c + 1);
  }, [pulse]);
  return count;
}

/* One observer shared by every plant: idle loops pause while a plant is scrolled out of view. */
const listeners = new WeakMap<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | undefined;

function observe(el: Element, onChange: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) listeners.get(e.target)?.(e.isIntersecting);
  });
  listeners.set(el, onChange);
  observer.observe(el);
  return () => {
    observer?.unobserve(el);
    listeners.delete(el);
  };
}

/** Whether the element is on screen (always true when `enabled` is false or the API is missing). */
export function useInView(ref: { current: Element | null }, enabled: boolean): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    const stop = observe(el, setVisible);
    return () => {
      stop();
      setVisible(true);
    };
  }, [enabled]);
  return visible;
}

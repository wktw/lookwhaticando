/**
 * The frame a long scene scrolls in: a focusable scroller that Arrow keys move one pot pitch at a
 * time (Home and End go to the ends), a quiet wall-coloured fade at whichever end has more room to
 * see, and on mouse-and-trackpad devices two 44 px chevrons. The ends are tracked by a passive
 * scroll listener writing data attributes, never re-rendering the scene.
 */
import type { ComponentChildren, JSX, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import s from './shelf.module.css';

export interface ScrollFrameProps {
  sceneRef: RefObject<HTMLDivElement>;
  /** The room's wall paint: the edge fades melt into it. */
  wall: string;
  /** Arrow-key step in room units (a pot pitch). */
  step: number;
  label: string;
  night?: boolean;
  time: string;
  class?: string;
  style?: JSX.CSSProperties;
  children: ComponentChildren;
}

/** Where a key moves a scroller of this width and scroll range, one `step` px at a time. */
export function scrollKeyTarget(key: string, left: number, max: number, step: number): number | null {
  if (key === 'ArrowRight') return Math.min(max, left + step);
  if (key === 'ArrowLeft') return Math.max(0, left - step);
  if (key === 'Home') return 0;
  if (key === 'End') return max;
  return null;
}

export function ScrollFrame({ sceneRef, wall, step, label, night, time, class: cls, style, children }: ScrollFrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sceneRef.current;
    const box = frame.current;
    if (!el || !box) return;
    let raf = 0;
    const mark = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      box.toggleAttribute('data-more-left', el.scrollLeft > 2);
      box.toggleAttribute('data-more-right', el.scrollLeft < max - 2);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(mark);
    };
    mark();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    ro?.observe(el);
    ro?.observe(el.firstElementChild ?? el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [sceneRef]);

  const unit = () => (sceneRef.current?.clientHeight ?? 0) / 100;
  const go = (to: number | null) => {
    const el = sceneRef.current;
    if (!el || to == null) return false;
    el.scrollTo({ left: to, behavior: 'smooth' });
    return true;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const el = sceneRef.current;
    if (!el) return;
    if (go(scrollKeyTarget(e.key, el.scrollLeft, el.scrollWidth - el.clientWidth, step * unit()))) e.preventDefault();
  };
  const by = (dir: 1 | -1) => {
    const el = sceneRef.current;
    if (el) go(scrollKeyTarget(dir > 0 ? 'ArrowRight' : 'ArrowLeft', el.scrollLeft, el.scrollWidth - el.clientWidth, Math.max(step * unit(), el.clientWidth * 0.6)));
  };
  const fade = { '--wall': wall } as JSX.CSSProperties;
  return (
    <div ref={frame} class={[s.frame, cls].filter(Boolean).join(' ')} style={{ ...fade, ...style }}>
      <div ref={sceneRef} class={[s.scene, night ? s.night : ''].filter(Boolean).join(' ')} style={{ background: wall }} tabIndex={0} role="group" aria-label={label} onKeyDown={onKeyDown} data-time={time}>
        {children}
      </div>
      <span class={`${s.edge} ${s.edgeLeft}`} aria-hidden="true" />
      <span class={`${s.edge} ${s.edgeRight}`} aria-hidden="true" />
      <button type="button" class={`${s.chevron} ${s.chevronLeft}`} aria-label="Scroll left" tabIndex={-1} onClick={() => by(-1)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M14.5 6L8.5 12L14.5 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button type="button" class={`${s.chevron} ${s.chevronRight}`} aria-label="Scroll right" tabIndex={-1} onClick={() => by(1)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M9.5 6L15.5 12L9.5 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  );
}

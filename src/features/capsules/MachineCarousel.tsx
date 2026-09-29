import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { MachineDef, MachineId } from '@/catalog/types';
import { seriesLabel } from '@/catalog/machines';
import type { Light } from '@/art/light';
import { Icon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { CapsuleMachine } from './CapsuleMachine';
import { LeafletCard } from './Leaflet';
import type { PlaceHandlers } from './RevealOverlay';
import { cx } from '@/ui/cx';
import { prefersReducedMotion } from './motion';
import s from './CapsulesScreen.module.css';

export interface MachineCarouselProps extends PlaceHandlers {
  machines: readonly MachineDef[];
  index: number;
  onIndex: (i: number) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onLineup: () => void;
  light: Light;
  /** Cabinets whose next capsule is the free first one (capsulesView `free`). */
  free?: ReadonlySet<MachineId>;
}

/**
 * The cabinets on the counter, one per page with scroll-snap, each with its lineup leaflet
 * beside it (DESIGN §7.2 step 1). Arrows and dots below, and ←/→ keys. Only the cabinet on
 * screen takes input; its neighbours render at rest, and pages further away stay empty.
 */
export function MachineCarousel({ machines, index, onIndex, busy, onBusyChange, onLineup, light, free, onPlace, onLetThemChoose }: MachineCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  /** The dots are one tab stop (roving tabindex): arrow keys move along them, and focus follows. */
  const dotFocus = useRef(false);
  const frame = useRef(0);
  /** Focus was inside the outgoing page (which turns inert), so hand it to the new one. */
  const carryFocus = useRef(false);
  /** Page a programmatic smooth scroll is heading to; its in-between scroll events are ignored. */
  const heading = useRef<number | null>(null);
  const n = machines.length;

  const scrollToIndex = (i: number, smooth: boolean) => {
    const el = track.current;
    const left = i * (el?.clientWidth ?? 0);
    if (!el || Math.abs(el.scrollLeft - left) < 1) return;
    heading.current = i;
    el.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
  };

  // Come back to the cabinet you were last looking at.
  useEffect(() => {
    const el = track.current;
    if (el && el.clientWidth && Math.round(el.scrollLeft / el.clientWidth) !== index) scrollToIndex(index, false);
  }, []);

  useEffect(() => {
    const onResize = () => scrollToIndex(index, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index]);

  useEffect(() => {
    if (dotFocus.current) {
      dotFocus.current = false;
      dots.current?.querySelector<HTMLElement>('[aria-current]')?.focus({ preventScroll: true });
    }
    if (!carryFocus.current) return;
    carryFocus.current = false;
    track.current?.children[index]?.querySelector<HTMLElement>('button:not([tabindex="-1"])')?.focus({ preventScroll: true });
  }, [index]);

  const go = (i: number) => {
    if (busy) return;
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === index) return;
    carryFocus.current = !!track.current?.contains(document.activeElement);
    sfx.play('pop', { volume: 0.4 });
    scrollToIndex(next, true);
    onIndex(next);
  };

  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = track.current;
      if (!el || !el.clientWidth) return;
      const at = el.scrollLeft / el.clientWidth;
      if (heading.current !== null) {
        if (Math.abs(at - heading.current) > 0.01) return;
        heading.current = null;
      }
      const i = Math.round(at);
      if (i !== index && i >= 0 && i < n) onIndex(i);
    });
  };

  const onDotKey = (e: KeyboardEvent) => {
    const to = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    dotFocus.current = true;
    go(to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, [role="slider"]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <div class={s.carousel} role="region" aria-roledescription="carousel" aria-label="Capsule cabinets" onKeyDown={onKeyDown}>
      <div
        ref={track}
        class={cx(s.track, busy && s.locked)}
        onScroll={onScroll}
        // A touch or wheel takes over from any scroll we started.
        onPointerDown={() => (heading.current = null)}
        onWheel={() => (heading.current = null)}
      >
        {machines.map((m, i) => {
          const current = i === index;
          const near = Math.abs(i - index) <= 1;
          return (
            <div
              key={m.id}
              class={cx(s.page, light.night && s.pageNight)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${seriesLabel(m)}, ${i + 1} of ${n}`}
              inert={!current}
              aria-hidden={!current}
              style={{ '--series': m.theme.body } as JSX.CSSProperties}
            >
              {near ? (
                <div class={s.pageInner}>
                  <div class={s.cabinetSlot}>
                    <CapsuleMachine
                      machine={m}
                      active={current}
                      light={light}
                      onBusyChange={current ? onBusyChange : undefined}
                      free={free?.has(m.id)}
                      onPlace={onPlace}
                      onLetThemChoose={onLetThemChoose}
                    />
                  </div>
                  <div class={s.leafletSlot}>
                    <LeafletCard machine={m} onOpen={onLineup} />
                  </div>
                </div>
              ) : (
                <div class={s.pagePlaceholder} />
              )}
            </div>
          );
        })}
      </div>

      <div class={s.pager}>
        <button type="button" class={s.arrow} onClick={() => go(index - 1)} disabled={busy || index === 0} aria-label="Previous cabinet">
          <Icon name="chevron-left" size={22} />
        </button>
        <div ref={dots} class={s.dots} role="group" aria-label="Choose a cabinet" onKeyDown={onDotKey}>
          {machines.map((m, i) => (
            <button
              key={m.id}
              type="button"
              class={s.dot}
              onClick={() => go(i)}
              disabled={busy}
              tabIndex={i === index ? 0 : -1}
              aria-label={seriesLabel(m)}
              aria-current={i === index ? 'true' : undefined}
              style={{ '--dot': m.theme.body } as JSX.CSSProperties}
            >
              <span />
            </button>
          ))}
        </div>
        <button type="button" class={s.arrow} onClick={() => go(index + 1)} disabled={busy || index === n - 1} aria-label="Next cabinet">
          <Icon name="chevron-right" size={22} />
        </button>
      </div>
    </div>
  );
}

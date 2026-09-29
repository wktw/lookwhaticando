import { useEffect, useRef } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { Icon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { CapsuleMachine } from './CapsuleMachine';
import { cx } from './ui/CandyButton';
import { prefersReducedMotion } from './motion';
import s from './CapsulesScreen.module.css';

export interface MachineCarouselProps {
  machines: readonly MachineDef[];
  index: number;
  onIndex: (i: number) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}

/**
 * One machine per page with scroll-snap, pagination dots, arrow buttons and ←/→ keys.
 * Only the visible machine is interactive; its neighbors render at rest so a swipe shows
 * them, and pages further away are empty placeholders to keep the DOM lean.
 */
export function MachineCarousel({ machines, index, onIndex, busy, onBusyChange }: MachineCarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const n = machines.length;

  const scrollToIndex = (i: number, smooth: boolean) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
  };

  // Come back to the machine you were last looking at.
  useEffect(() => {
    const el = track.current;
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== index) scrollToIndex(index, false);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onResize = () => scrollToIndex(index, false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [index]);

  const go = (i: number) => {
    if (busy) return;
    const next = Math.max(0, Math.min(n - 1, i));
    if (next === index) return;
    sfx.play('pop', { volume: 0.5 });
    scrollToIndex(next, true);
    onIndex(next);
  };

  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = track.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== index && i >= 0 && i < n) onIndex(i);
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <div class={s.carousel} role="region" aria-roledescription="carousel" aria-label="Capsule machines" onKeyDown={onKeyDown}>
      <div ref={track} class={cx(s.track, busy && s.locked)} onScroll={onScroll}>
        {machines.map((m, i) => {
          const current = i === index;
          return (
            <div
              key={m.id}
              class={s.page}
              role="group"
              aria-roledescription="slide"
              aria-label={`${m.name}, ${i + 1} of ${n}`}
              inert={!current}
              aria-hidden={!current}
            >
              {Math.abs(i - index) <= 1 ? (
                <CapsuleMachine machine={m} active={current} onBusyChange={current ? onBusyChange : undefined} />
              ) : (
                <div class={s.pagePlaceholder} />
              )}
            </div>
          );
        })}
      </div>

      <button type="button" class={cx(s.arrow, s.arrowPrev)} onClick={() => go(index - 1)} disabled={busy || index === 0} aria-label="Previous machine">
        <Icon name="chevron-left" size={24} />
      </button>
      <button type="button" class={cx(s.arrow, s.arrowNext)} onClick={() => go(index + 1)} disabled={busy || index === n - 1} aria-label="Next machine">
        <Icon name="chevron-right" size={24} />
      </button>

      <div class={s.dots} role="group" aria-label="Choose a machine">
        {machines.map((m, i) => (
          <button
            key={m.id}
            type="button"
            class={s.dot}
            onClick={() => go(i)}
            disabled={busy}
            aria-label={m.name}
            aria-current={i === index ? 'true' : undefined}
            style={{ '--dot': m.theme.body === '#FFFFFF' ? m.theme.trim : m.theme.body } as Record<string, string>}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}

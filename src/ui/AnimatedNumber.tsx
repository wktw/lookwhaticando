import { useLayoutEffect, useRef } from 'preact/hooks';
import { inboundFlight, type WalletKind } from '@/fx/coinFly';
import { prefersReducedMotion } from '@/fx/motion';

export interface AnimatedNumberProps {
  value: number;
  /**
   * When set and coins/stars are flying toward this counter, the number ticks up as each
   * sprite lands instead of jumping early.
   */
  walletKind?: WalletKind;
  format?: (n: number) => string;
  /** Tween length when not synced to a flight (ms). */
  duration?: number;
  class?: string;
}

const defaultFormat = (n: number) => n.toLocaleString();
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts to its new value. Text is written straight to the DOM from rAF,
 * so counting never re-renders the component tree.
 */
export function AnimatedNumber({ value, walletKind, format = defaultFormat, duration = 650, class: cls }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (n: number) => {
      shown.current = n;
      el.textContent = format(n);
    };
    const from = shown.current;
    if (from === null || from === value || prefersReducedMotion()) {
      write(value);
      return;
    }

    const flight = walletKind && value > from ? inboundFlight(walletKind) : null;
    if (flight) {
      const off = flight.onLand((landed, count) => write(Math.round(from + ((value - from) * landed) / count)));
      return () => {
        off();
        write(value);
      };
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      write(Math.round(from + (value - from) * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      write(value);
    };
  }, [value]);

  return <span ref={ref} class={cls} style={{ fontVariantNumeric: 'tabular-nums' }} />;
}

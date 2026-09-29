import { useLayoutEffect, useRef } from 'preact/hooks';
import { onPendingChange, pendingFor, type WalletKind } from '@/fx/walletLedger';
import { prefersReducedMotion } from '@/fx/motion';

export interface AnimatedNumberProps {
  value: number;
  /**
   * A wallet counter: amounts still flying toward it (see fx/walletLedger) are held back, so
   * the number ticks up as each coin lands instead of jumping early.
   */
  walletKind?: WalletKind;
  format?: (n: number) => string;
  /** Tween length for a plain value change (ms). */
  duration?: number;
  class?: string;
}

const defaultFormat = (n: number) => n.toLocaleString();
const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** A landing coin's tick: quick, so a stream of landings reads as counting. */
const LANDING_MS = 220;

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
    let raf = 0;
    const write = (n: number) => {
      shown.current = n;
      el.textContent = format(n);
    };
    const target = () => Math.max(0, value - (walletKind ? pendingFor(walletKind) : 0));
    const tweenTo = (to: number, ms: number) => {
      cancelAnimationFrame(raf);
      const from = shown.current;
      if (from === null || from === to || prefersReducedMotion()) return write(to);
      const start = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / ms);
        write(Math.round(from + (to - from) * easeOut(t)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    tweenTo(target(), duration);
    // Next frame, not now: a reward is reserved in the same tick the store commits it, before
    // this component has re-rendered with the new value. Landings only ever count up; a flight
    // reserved after its coins were already shown never makes the number dip.
    let soon = 0;
    const off = walletKind
      ? onPendingChange(() => {
          cancelAnimationFrame(soon);
          soon = requestAnimationFrame(() => {
            const to = target();
            if (to > (shown.current ?? -Infinity)) tweenTo(to, LANDING_MS);
          });
        })
      : undefined;
    return () => {
      off?.();
      cancelAnimationFrame(soon);
      cancelAnimationFrame(raf);
    };
  }, [value, walletKind]);

  return <span ref={ref} class={cls} style={{ fontVariantNumeric: 'tabular-nums' }} />;
}

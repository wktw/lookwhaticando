import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export interface FocusTrapOptions {
  onEscape?: () => void;
  /** Where focus goes on close when the element that had it before is gone. */
  returnFocus?: () => HTMLElement | null | undefined;
}

/**
 * Modal focus handling: moves focus inside `ref` when `active` turns on, keeps Tab cycling
 * within it, calls `onEscape` on Esc, and on close gives focus back to whatever had it before
 * (or to `returnFocus`), unless another dialog has taken focus in the meantime.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, options: FocusTrapOptions = {}) {
  const opts = useRef(options);
  opts.current = options;
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!root.contains(document.activeElement)) (focusables(root)[0] ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && opts.current.onEscape) {
        e.stopPropagation();
        opts.current.onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      const now = document.activeElement;
      const ours = !now || now === document.body || root.contains(now);
      if (!ours) return;
      const target = previous?.isConnected && previous !== document.body ? previous : opts.current.returnFocus?.();
      target?.focus({ preventScroll: true });
    };
  }, [active]);
}

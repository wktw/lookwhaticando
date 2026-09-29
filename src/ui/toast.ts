/**
 * Toast queue. `toast()` from anywhere; <Toaster/> (mounted once by the app) renders it.
 * Toasts with the same `key` coalesce: the visible one updates in place and its timer restarts,
 * which is how rapid events ("+5", "+5", "+8") become one calm "+18".
 */
import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import type { Tone } from './tone';
import { announce } from './announce';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  message: ComponentChildren;
  /** Text for screen readers (defaults to `message` when it is a string). */
  label?: string;
  /** Leading art: a pet face, a currency icon… */
  art?: ComponentChildren;
  tone?: Tone;
  action?: ToastAction;
  /** Auto-dismiss after ms (default 3200, or 5200 with an action). 0 = stay until dismissed. */
  duration?: number;
  /** Coalescing key: a queued toast with the same key is replaced instead of stacking. */
  key?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
  /** Bumps on every coalesced update, restarting the timer and replaying the pop. */
  version: number;
  leaving?: boolean;
}

export const MAX_VISIBLE = 3;
export const EXIT_MS = 220;

export const toasts = signal<ToastItem[]>([]);

/**
 * The bottom edge (px from the top of the viewport) of a celebration banner that shares the
 * top of the screen; the toast stack slides below it so nothing hides underneath. 0 = none.
 */
export const toastLaneTop = signal(0);

/** While > 0 (a full-screen moment is up), toast timers wait so nothing expires unseen. */
export const toastsHeld = signal(0);

/** Pause every toast's timer until the returned function is called. */
export function holdToasts(): () => void {
  toastsHeld.value++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    toastsHeld.value--;
  };
}

let seq = 0;

/** Pure: insert a toast, or update the live toast with the same key in place. */
export function upsertToast(list: readonly ToastItem[], opts: ToastOptions, id: string): { list: ToastItem[]; id: string } {
  const existing = opts.key ? list.find((t) => t.key === opts.key && !t.leaving) : undefined;
  if (existing) {
    return { list: list.map((t) => (t === existing ? { ...t, ...opts, id: t.id, version: t.version + 1 } : t)), id: existing.id };
  }
  return { list: [...list, { ...opts, id, version: 0 }], id };
}

/** Pure: the toasts on screen right now (FIFO; later ones wait their turn). */
export function visibleToasts(list: readonly ToastItem[]): ToastItem[] {
  return list.slice(0, MAX_VISIBLE);
}

export function toastDuration(t: ToastOptions): number {
  return t.duration ?? (t.action ? 5200 : 3200);
}

/** Show (or coalesce) a toast. Its text is announced through the shared aria-live="polite" region. */
export function toast(opts: ToastOptions): string {
  const { list, id } = upsertToast(toasts.value, opts, `t${++seq}`);
  toasts.value = list;
  const text = opts.label ?? (typeof opts.message === 'string' ? opts.message : '');
  if (text) announce(opts.action ? `${text}. ${opts.action.label} available.` : text);
  return id;
}

export function findToast(key: string): ToastItem | undefined {
  return toasts.value.find((t) => t.key === key && !t.leaving);
}

export function dismissToast(id: string): void {
  const t = toasts.value.find((x) => x.id === id);
  if (!t || t.leaving) return;
  toasts.value = toasts.value.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  setTimeout(() => (toasts.value = toasts.value.filter((x) => x.id !== id)), EXIT_MS);
}

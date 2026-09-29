/**
 * Toast queue. `toast()` from anywhere; <Toaster/> (mounted once by the app) renders each one as
 * a small paper note ("Walk, watered. +5 · Pudding opened one eye. · Undo · Add a note").
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
  /** The note's first line, in Castoro ("Walk, watered. +5"). */
  message: ComponentChildren;
  /** An observed second line in Castoro italic ("Pudding opened one eye."). */
  note?: ComponentChildren;
  /** Text for screen readers (defaults to `message` and `note` when they are strings). */
  label?: string;
  /** A small leading drawing: a water drop, a currency token, a plant. */
  art?: ComponentChildren;
  tone?: Tone;
  /** Up to two buttons on the note, in order ("Undo" · "Add a note"). */
  actions?: readonly ToastAction[];
  /** One button: the older single form of `actions` (both may be given; `action` goes first). */
  action?: ToastAction;
  /** Auto-dismiss after ms (default 3200, or 4000 with an action, like Undo). 0 = stay until dismissed. */
  duration?: number;
  /** Coalescing key: a queued toast with the same key is replaced instead of stacking. */
  key?: string;
  /** Not announced here: the caller announces it (check-ins wait for quiet, DESIGN §9.1). */
  silent?: boolean;
}

export interface ToastItem extends ToastOptions {
  id: string;
  /** Bumps on every coalesced update, restarting the timer and replaying the pop. */
  version: number;
  leaving?: boolean;
}

export const MAX_VISIBLE = 2;
/** A note holds at most two buttons (DESIGN §5.2: "Undo" and "Add a note"). */
export const MAX_ACTIONS = 2;
export const EXIT_MS = 220;

export const toasts = signal<ToastItem[]>([]);

/**
 * The bottom edge (px from the top of the viewport) of a celebration banner at the top of the
 * screen. Notes normally sit at the bottom; when a sheet lifts them to the top, they slide
 * below the banner so nothing hides underneath. 0 = none.
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

/** A note's buttons: `action` then `actions`, at most MAX_ACTIONS. */
export function toastActions(t: Pick<ToastOptions, 'action' | 'actions'>): ToastAction[] {
  return [...(t.action ? [t.action] : []), ...(t.actions ?? [])].slice(0, MAX_ACTIONS);
}

export function toastDuration(t: ToastOptions): number {
  return t.duration ?? (toastActions(t).length ? 4000 : 3200);
}

/**
 * Show (or coalesce) a toast. Its text is announced through the shared aria-live="polite" region,
 * unless it is `silent`.
 */
export function toast(opts: ToastOptions): string {
  const { list, id } = upsertToast(toasts.value, opts, `t${++seq}`);
  toasts.value = list;
  const text = opts.label ?? [opts.message, opts.note].filter((x): x is string => typeof x === 'string').join(' ');
  const buttons = toastActions(opts).map((a) => a.label);
  if (text && !opts.silent) announce(buttons.length ? `${text}. ${buttons.join(' or ')} available.` : text);
  return id;
}

export function findToast(key: string): ToastItem | undefined {
  return toasts.value.find((t) => t.key === key && !t.leaving);
}

/**
 * Press one of a note's buttons: the note is put away first, then the action runs. An action
 * that shows a note of its own (Undo shows "not watered after all") therefore never lands on the
 * note that is leaving, and is never dismissed along with it.
 */
export function runToastAction(id: string, action: ToastAction): void {
  dismissToast(id);
  action.onAction();
}

export function dismissToast(id: string): void {
  const t = toasts.value.find((x) => x.id === id);
  if (!t || t.leaving) return;
  toasts.value = toasts.value.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  setTimeout(() => (toasts.value = toasts.value.filter((x) => x.id !== id)), EXIT_MS);
}

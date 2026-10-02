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
import { anyLayerOpen, momentOpen, topNotesSlot } from './sheetStack';

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
  /** A caller-owned announcement can settle once this note enters the active focus scope. */
  onReachable?: () => void;
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
 * Show (or coalesce) a toast. Plain statuses announce immediately; actionable notes wait until
 * their mounted card enters the active focus scope. A `silent` caller owns its announcement.
 */
export function toast(opts: ToastOptions): string {
  const { list, id } = upsertToast(toasts.value, opts, `t${++seq}`);
  // Plain status lines have no expiring action to make reachable first.
  if (!opts.silent && !toastActions(opts).length) {
    const item = list.find((item) => item.id === id)!;
    lifetime(item).announced = true;
    announce(() => {
      const current = toasts.peek().find((t) => t.id === id && t.version === item.version && !t.leaving);
      return current ? current.label ?? [current.message, current.note].filter((x): x is string => typeof x === 'string').join(' ') : '';
    });
  }
  toasts.value = list;
  return id;
}

/** Kept by item identity so a portal move or full-screen moment cannot restart its clock. */
const lifetimes = new WeakMap<ToastItem, { remaining: number; announced?: boolean }>();
function lifetime(item: ToastItem) {
  let value = lifetimes.get(item);
  if (!value) lifetimes.set(item, value = { remaining: toastDuration(item) });
  return value;
}

export type ToastContent = Pick<ToastOptions, 'message' | 'note' | 'label'>;

/** Change presentation without replaying the note, replacing its actions, or resetting its clock. */
export function updateToastContent(id: string, content: ToastContent): void {
  const current = toasts.peek().find((item) => item.id === id && !item.leaving);
  if (!current || (current.message === content.message && current.note === content.note && current.label === content.label)) return;
  const next = { ...current, ...content };
  // The old card's layout cleanup still charges elapsed time to this same clock object.
  lifetimes.set(next, lifetime(current));
  toasts.value = toasts.peek().map((item) => item === current ? next : item);
}

/** Run only while the card is visible and unpaused; cleanup preserves elapsed time. */
export function runToastClock(item: ToastItem): () => void {
  const clock = lifetime(item);
  if (!toastDuration(item) || item.leaving) return () => undefined;
  const started = performance.now();
  const timer = setTimeout(() => dismissToast(item.id), clock.remaining);
  return () => {
    clearTimeout(timer);
    clock.remaining = Math.max(0, clock.remaining - (performance.now() - started));
  };
}

export function toastIsReachable(id: string): boolean {
  if (typeof document === 'undefined' || document.hidden || momentOpen() || toastsHeld.peek() > 0) return false;
  const item = toasts.peek().find((t) => t.id === id && !t.leaving);
  const card = document.querySelector(`[data-toast-id="${id}"]`);
  return !!item && !!card && (!anyLayerOpen() || !!topNotesSlot()?.contains(card));
}

/** Called after the card is in the DOM; re-check at the live-region write, too. */
export function announceToast(item: ToastItem): void {
  if (!toastIsReachable(item.id)) return;
  item.onReachable?.();
  const clock = lifetime(item);
  if (item.silent || clock.announced) return;
  announce(() => {
    if (!toastIsReachable(item.id) || !toasts.peek().includes(item)) return '';
    clock.announced = true;
    const text = item.label ?? [item.message, item.note].filter((x): x is string => typeof x === 'string').join(' ');
    const buttons = toastActions(item).map((a) => a.label);
    return text && buttons.length ? `${text.replace(/\.$/, '')}. ${buttons.join(' or ')} available.` : text;
  });
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

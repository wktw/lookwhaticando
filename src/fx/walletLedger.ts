/**
 * Rewards that are already in the store but still "in the air". A reward is reserved in the
 * same tick the store commits it; flying coins release it as they land. Wallet counters show
 * `value − pending`, so they hold the old number and tick up with each landing instead of
 * jumping before a single coin has left.
 */
export type WalletKind = 'coins' | 'stars';

export interface Reservation {
  readonly kind: WalletKind;
  /** Amount not yet released. */
  readonly left: number;
  /** Hold back more (another reward from the same action). */
  add(amount: number): void;
  /** Release part of the amount (default: all that is left). */
  release(amount?: number): void;
  /** Keep holding for `ms` more (Infinity = until released). Holds never shorten. */
  hold(ms: number): void;
}

/** Rewards from one action, per wallet counter. */
export type Payout = Partial<Record<WalletKind, Reservation>>;

/** How long an unflown reservation holds a counter back before letting it catch up on its own. */
const DEFAULT_HOLD_MS = 2500;

const pending: Record<WalletKind, number> = { coins: 0, stars: 0 };
const listeners = new Set<() => void>();

export function pendingFor(kind: WalletKind): number {
  return pending[kind];
}

/** Called whenever a pending amount changes (a reservation, a landing, a timeout). */
export function onPendingChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function change(kind: WalletKind, delta: number) {
  pending[kind] = Math.max(0, pending[kind] + delta);
  for (const fn of [...listeners]) fn();
}

export function reserve(kind: WalletKind, amount: number, holdMs = DEFAULT_HOLD_MS): Reservation {
  let left = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let until = 0;
  const r: Reservation = {
    kind,
    get left() {
      return left;
    },
    add(amount) {
      const n = Math.max(0, Math.round(amount));
      if (!n) return;
      const wasEmpty = !left;
      left += n;
      change(kind, n);
      if (wasEmpty) r.hold(holdMs);
    },
    release(amount = left) {
      const n = Math.min(left, Math.max(0, Math.round(amount)));
      if (!n) return;
      left -= n;
      if (!left) {
        clearTimeout(timer);
        until = 0;
      }
      change(kind, -n);
    },
    hold(ms) {
      if (!left) return;
      const next = performance.now() + ms;
      if (next <= until) return;
      until = next;
      clearTimeout(timer);
      if (Number.isFinite(ms)) timer = setTimeout(() => r.release(), ms);
    },
  };
  r.add(amount);
  return r;
}

/** Add `amount` to the payout's reservation for `kind` (creating it on first use). */
export function reserveInto(payout: Payout, kind: WalletKind, amount: number): void {
  const r = payout[kind];
  if (r) r.add(amount);
  else payout[kind] = reserve(kind, amount);
}

export function holdPayout(payout: Payout | undefined, ms: number): void {
  payout?.coins?.hold(ms);
  payout?.stars?.hold(ms);
}

export function releasePayout(payout: Payout | undefined): void {
  payout?.coins?.release();
  payout?.stars?.release();
}

/** Split `amount` into `count` near-equal whole chunks (landing i releases chunk i). */
export function chunkOf(amount: number, count: number, i: number): number {
  return Math.floor(((i + 1) * amount) / count) - Math.floor((i * amount) / count);
}

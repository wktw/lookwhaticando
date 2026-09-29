/**
 * Computed values that keep their last result while it is the same data. The store's views rebuild
 * their arrays on any change (a stroke pays a pet XP, so `shelfView.out` is a new array), and a new
 * array would re-render the whole scene. A `stable` computed hands on its old value when the new one
 * is structurally equal, so its readers only hear about real changes.
 */
import { computed, type ReadonlySignal } from '@preact/signals';

/** Deep equality for plain view data (arrays, plain objects, primitives; functions by identity). */
export function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!same(a[i], bb[i])) return false;
    return true;
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

/** A computed that returns its previous value (the same reference) while `eq` says nothing changed. */
export function stable<T>(fn: () => T, eq: (a: T, b: T) => boolean = same): ReadonlySignal<T> {
  let prev: { v: T } | null = null;
  return computed(() => {
    const next = fn();
    if (prev && eq(prev.v, next)) return prev.v;
    prev = { v: next };
    return next;
  });
}

/**
 * A computed of one slice of a bigger value, rebuilt only when that slice's reference changes (the
 * store keeps untouched slices, like `collection`, as they were).
 */
export function keyed<K, T>(key: () => K, build: () => T): ReadonlySignal<T> {
  let prev: { k: K; v: T } | null = null;
  return computed(() => {
    const k = key();
    if (prev && Object.is(prev.k, k)) return prev.v;
    const v = build();
    prev = { k, v };
    return v;
  });
}

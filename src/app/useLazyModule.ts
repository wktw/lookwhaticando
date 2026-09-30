import { useEffect, useRef, useState } from 'preact/hooks';
import { demoMode, flushSaves, hasUnsavedWork } from '@/state/store';

/**
 * A lazily loaded module (a sheet, a screen's second chunk), shared by everything that asks for
 * it. The import runs once; a rejected import is forgotten, so the next `load()` tries again,
 * and a loaded module stays loaded (`current()` gives it at once, so a remount never waits).
 */
export interface LazyModule<T> {
  /** The module, once it has loaded; else null. */
  current(): T | null;
  /** Loads it (or joins the load already under way). */
  load(): Promise<T>;
}

export function lazyModule<T>(importer: () => Promise<T>): LazyModule<T> {
  let value: T | null = null;
  let pending: Promise<T> | null = null;
  return {
    current: () => value,
    load: () =>
      (pending ??= importer().then(
        (m) => (value = m),
        (e: unknown) => {
          pending = null;
          throw e;
        },
      )),
  };
}

/** How the page reloads: a seam for tests (jsdom cannot navigate). */
export const pageReload = { run: (): void => location.reload() };

/**
 * A retry that failed in the page, tried the only way that works in every engine: a reload.
 * Chromium keeps a failed module fetch for the life of the page, so importing the same chunk again
 * fails at once even when the network is back; a fresh page fetches it anew. It reloads only when
 * that is safe: online (offline, a reload could land on the browser's own offline page), outside
 * the demo (a peek lives only in this page), and with every change on disk. `before` runs just
 * before, to keep what was asked for. Returns whether it reloads.
 */
export function reloadToRetry(before?: () => void): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if (demoMode.value) return false;
  flushSaves();
  if (hasUnsavedWork()) return false;
  before?.();
  pageReload.run();
  return true;
}

export type LazyStatus = 'idle' | 'loading' | 'error' | 'ready';

export interface LazyState<T> {
  /** idle: not wanted (yet); loading; error: the last attempt failed; ready: `module` is set. */
  status: LazyStatus;
  module: T | null;
  /** Loading again after a failure (the error's own UI can stay up, busy, until it settles). */
  retrying: boolean;
  /** Try the import again (after an error; while a load is under way it joins that load). */
  retry: () => void;
}

export interface LazyOptions {
  /** Runs just before a failed retry reloads the page (`reloadToRetry`), to keep what was asked for. */
  beforeReload?: () => void;
}

/**
 * The load state of a lazy module, for a component that shows it (WP-C4): loading, an error with
 * a retry, or the module. It loads while `wanted`; when `wanted` goes false the error is
 * forgotten, so the next time it is wanted it loads afresh. Only the latest attempt of a mounted
 * component settles its state: a load that finishes after a newer attempt, after `wanted` went
 * false or after unmounting changes nothing here (a module that did load is still kept by
 * `mod`, for next time).
 *
 * `retry()` imports again in the page; if that fails too, the page reloads when it safely can
 * (`reloadToRetry`), since some engines never fetch a failed chunk again in the same page.
 */
export function useLazyModule<T>(mod: LazyModule<T>, wanted = true, options: LazyOptions = {}): LazyState<T> {
  const module = mod.current();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  /** Failed attempts since the module was last wanted (0 once it loads). */
  const [failures, setFailures] = useState(0);
  /** The next attempt was asked for by `retry()`. */
  const retried = useRef(false);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const byRetry = retried.current;
    retried.current = false;
    if (!wanted) {
      setLoading(false);
      setFailures(0);
      return;
    }
    if (mod.current()) return;
    let live = true;
    setLoading(true);
    mod.load().then(
      () => {
        if (!live) return;
        setLoading(false);
        setFailures(0);
      },
      () => {
        if (!live) return;
        if (byRetry && reloadToRetry(latest.current.beforeReload)) return;
        setLoading(false);
        setFailures((n) => n + 1);
      },
    );
    return () => {
      live = false;
    };
  }, [mod, wanted, attempt]);

  const status: LazyStatus = module ? 'ready' : !wanted ? 'idle' : !loading && failures > 0 ? 'error' : 'loading';
  const retry = () => {
    retried.current = true;
    setLoading(true);
    setAttempt((n) => n + 1);
  };
  return { status, module, retrying: status === 'loading' && failures > 0, retry };
}

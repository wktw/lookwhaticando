/**
 * Loads ./CelebrationArt (and with it the art library: pets, plants, items, pins) out of the
 * first-paint bundle. <CelebrationHost/> preloads it once the browser is idle after first paint,
 * and waits for it before showing a banner or the epic moment, so a note never appears without
 * its drawing. Toasts draw a same-sized blank until it arrives (only ever on the very first one).
 */
import { useEffect, useState } from 'preact/hooks';
import type { CelebrationArt as ArtSpec } from './celebrationPlan';

type ArtModule = typeof import('./CelebrationArt');

let loaded: ArtModule | null = null;
let pending: Promise<ArtModule> | null = null;

/** The art module, once (a failed load is retried on the next call). */
export function loadCelebrationArt(): Promise<ArtModule> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= import('./CelebrationArt').then(
    (m) => (loaded = m),
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/** The module if it has arrived. */
export function celebrationArtModule(): ArtModule | null {
  return loaded;
}

/** Fetch the art while the browser is idle, after first paint. */
export function preloadCelebrationArtWhenIdle(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const run = () => void loadCelebrationArt().catch(() => undefined);
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(run, { timeout: 3000 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(run, 1200);
  return () => clearTimeout(t);
}

export interface LazyArtProps {
  art: ArtSpec;
  size: number;
  animated?: boolean;
}

/** <CelebrationArt/>, drawn from the loaded module: a blank of the same size until it arrives. */
export function LazyCelebrationArt(props: LazyArtProps) {
  const [mod, setMod] = useState<ArtModule | null>(loaded);
  useEffect(() => {
    if (mod) return;
    let live = true;
    loadCelebrationArt()
      .then((m) => live && setMod(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!mod) return <span aria-hidden="true" style={{ display: 'inline-block', width: `${props.size}px`, height: `${props.size}px` }} />;
  const Art = mod.CelebrationArt;
  return <Art {...props} />;
}

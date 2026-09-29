/**
 * Auto-lite (DESIGN §11.1): the Shelf keeps a couple of dozen small loops going (breaths, blinks,
 * ear and tail flicks, a frog's throat, plants swaying). On a slow phone that can cost more than a
 * frame. So when the Shelf opens, the frame rate is sampled for 2 s; if the median frame takes
 * more than 25 ms, <html data-lite> is set for the session and the CSS stops the flicks, the
 * throat pulses and the sway, keeping the breathing and the blinks (src/styles/global.css).
 *
 * Whatever the device, pets off screen hold still (data-offscreen), and only the few pets nearest
 * the middle of the viewport flick (data-flick="off" on the rest).
 */

/** Median frame time above which the page goes lite. */
export const LITE_MEDIAN_MS = 25;
/** How long the frame rate is sampled. */
export const SAMPLE_MS = 2000;
/** Pets allowed to flick at once. */
export const MAX_FLICKING = 4;

export function median(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Whether these frame times call for auto-lite (a handful of frames says nothing). */
export function shouldGoLite(frameTimes: readonly number[], threshold = LITE_MEDIAN_MS): boolean {
  return frameTimes.length >= 10 && median(frameTimes) > threshold;
}

/** Frame-to-frame times (ms) over `ms`, from requestAnimationFrame. Stops early when `signal` aborts. */
export function sampleFrames(ms = SAMPLE_MS, signal?: AbortSignal): Promise<number[]> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') return resolve([]);
    const times: number[] = [];
    let last = 0;
    let start = 0;
    let raf = 0;
    const tick = (t: number) => {
      if (signal?.aborted) return resolve(times);
      if (!start) start = t;
      else times.push(t - last);
      last = t;
      if (t - start >= ms) return resolve(times);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    signal?.addEventListener('abort', () => {
      cancelAnimationFrame(raf);
      resolve(times);
    });
  });
}

/** Whether the page is lite. */
export function isLite(): boolean {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-lite');
}

export function setLite(on: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.toggleAttribute('data-lite', on);
}

/**
 * Ranks pets for flicking: those on screen, nearest the middle of the viewport first. Pure (the
 * rects are given), so it is testable. Returns the ids allowed to flick.
 */
export function nearestFlickers(pets: readonly { id: string; rect: { top: number; bottom: number; left: number; right: number } }[], viewport: { width: number; height: number }, max = MAX_FLICKING): Set<string> {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const onScreen = pets.filter((p) => p.rect.bottom > 0 && p.rect.top < viewport.height && p.rect.right > 0 && p.rect.left < viewport.width);
  const dist = (p: (typeof pets)[number]) => Math.hypot((p.rect.left + p.rect.right) / 2 - cx, (p.rect.top + p.rect.bottom) / 2 - cy);
  return new Set([...onScreen].sort((a, b) => dist(a) - dist(b)).slice(0, max).map((p) => p.id));
}

const PET = '.pet-art';

/**
 * Watches a scene (the Shelf): samples the frame rate once per session and goes lite if it must,
 * holds off-screen pets still, and lets only the nearest few flick. Returns a stop function.
 */
export function watchScene(root: HTMLElement, { sample = true }: { sample?: boolean } = {}): () => void {
  const abort = new AbortController();
  if (sample && !isLite() && !sampled) {
    sampled = true;
    void sampleFrames(SAMPLE_MS, abort.signal).then((times) => {
      // Left before the sample was whole: sample again next time the Shelf opens.
      if (abort.signal.aborted) sampled = false;
      else if (shouldGoLite(times)) setLite(true);
    });
  }

  const ids = new WeakMap<Element, string>();
  let seq = 0;
  const idOf = (el: Element) => {
    let id = ids.get(el);
    if (!id) ids.set(el, (id = `p${++seq}`));
    return id;
  };

  let frame = 0;
  const rank = () => {
    frame = 0;
    const pets = [...root.querySelectorAll<HTMLElement>(PET)];
    const allowed = nearestFlickers(
      pets.map((el) => ({ id: idOf(el), rect: el.getBoundingClientRect() })),
      { width: innerWidth, height: innerHeight },
    );
    for (const el of pets) el.dataset.flick = allowed.has(idOf(el)) ? 'on' : 'off';
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(rank);
  };

  const io =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-offscreen', !e.isIntersecting);
          schedule();
        })
      : null;
  const seen = new WeakSet<Element>();
  const observeAll = () => {
    for (const el of root.querySelectorAll(PET)) {
      if (seen.has(el)) continue;
      seen.add(el);
      io?.observe(el);
    }
    schedule();
  };
  observeAll();
  const mo = typeof MutationObserver === 'function' ? new MutationObserver(observeAll) : null;
  mo?.observe(root, { childList: true, subtree: true });
  addEventListener('scroll', schedule, { passive: true, capture: true });
  addEventListener('resize', schedule);

  return () => {
    abort.abort();
    io?.disconnect();
    mo?.disconnect();
    removeEventListener('scroll', schedule, { capture: true });
    removeEventListener('resize', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}

/** The frame rate is sampled once a session. */
let sampled = false;

/** For tests. */
export function resetFrameMonitor(): void {
  sampled = false;
  setLite(false);
}

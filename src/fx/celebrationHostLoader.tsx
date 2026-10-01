/**
 * Mounts <CelebrationHost/> (./celebrations, with the planner, its copy, the notes, banners, the
 * epic moment and the coin flight) from its own chunk, so none of it is on the first paint.
 *
 * The host starts listening in its first effect; it used to mount with the shell, so it listened
 * from just after first paint, and events from before then (hydrate's, at boot) were never
 * celebrated. This loader holds the event bus at that same moment (`holdGameEvents`), so what
 * happens before the chunk arrives (a tap on a screen that loaded first) is kept and handed to the
 * host when it listens (a screen that claimed a check-in in that gap keeps its coins: the host
 * does not reserve them again, see markCelebratedLocally). A chunk that can't load lets what was
 * kept go, so nothing piles up, and the next game event asks for it again. That recovers in
 * engines that fetch a failed chunk again; Chromium keeps a failed module fetch for the life of
 * the page (WP-C4), so there each retry fails at once (cheap: no request) and celebrations stay
 * off until the page reloads. No reload is forced for them: they are not worth losing a page.
 *
 * This chunk is not the host's alone. Today (features/today/checkin.ts) and Onboarding (through
 * ./checkin) import markCelebratedLocally from it, the built capsule steps' chunk imports it too,
 * and they and others import ./copy, a chunk of its own. So if either chunk can't load, those
 * screens fail like any lazy screen, through the shell's load sheet (WP-C4: "Try again" reloads
 * in Chromium when that is safe), and Today is the first screen. The retry above then serves
 * only events from screens that load without these chunks. The service worker precaches every
 * chunk, so this needs a first visit or a cache miss.
 */
import { useEffect, useState } from 'preact/hooks';
import { dropHeldGameEvents, holdGameEvents } from '@/state/events';

type HostModule = typeof import('./celebrations');

let loaded: HostModule | null = null;
let pending: Promise<HostModule> | null = null;

/** The host's module, once (a failed load is tried again on the next call). */
export function loadCelebrationHost(): Promise<HostModule> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= import('./celebrations').then(
    (m) => (loaded = m),
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

export function LazyCelebrationHost() {
  const [mod, setMod] = useState<HostModule | null>(loaded);
  useEffect(() => {
    if (mod) return;
    let live = true;
    const load = () =>
      void loadCelebrationHost().then(
        (m) => live && setMod(m),
        () => {
          if (!live) return;
          dropHeldGameEvents();
          holdGameEvents(load);
        },
      );
    holdGameEvents();
    load();
    return () => {
      live = false;
      dropHeldGameEvents();
    };
  }, []);
  return mod ? <mod.CelebrationHost /> : null;
}

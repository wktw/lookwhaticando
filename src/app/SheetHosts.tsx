import type { ComponentType } from 'preact';
import type { Signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { PET_INTENTS, closeHabitDetail, closeHabitEditor, closePetCard, habitDetailRequest, habitEditorRequest, petCardRequest, type PetIntent } from '@/features/habits/open';
import { closeRitual, ritualRequest } from '@/features/rituals/open';
import { SCREEN_COPY } from './copy';
import { LoadSheet } from './LoadSheet';
import { lazyModule, useLazyModule, type LazyModule } from './useLazyModule';

type Host = LazyModule<{ default: ComponentType }>;

/** Each shared sheet: its lazily loaded host, its request, how it closes, and what a request may look like. */
interface SheetSpec {
  host: Host;
  request: Signal<unknown>;
  close: () => void;
  valid: (r: unknown) => boolean;
  /** A kept request in an older shape (a reload can land on a newer build), as this build asks for it. */
  upgrade?: (r: unknown) => unknown;
}

const isId = (r: unknown) => typeof r === 'string' && r.length > 0;
const isObject = (r: unknown): r is Record<string, unknown> => typeof r === 'object' && r !== null && !Array.isArray(r);

const SHEETS = {
  editor: {
    host: lazyModule(() => import('@/features/habits/editor/HabitEditorHost')),
    request: habitEditorRequest,
    close: closeHabitEditor,
    valid: (r) => isObject(r) && Object.entries(r).every(([k, v]) => (k === 'id' || k === 'templateId') && isId(v)),
  },
  detail: { host: lazyModule(() => import('@/features/habits/detail/HabitDetailHost')), request: habitDetailRequest, close: closeHabitDetail, valid: isId },
  pet: {
    host: lazyModule(() => import('@/features/pets/PetCardHost')),
    request: petCardRequest,
    close: closePetCard,
    valid: (r) => isObject(r) && isId(r.id) && Object.entries(r).every(([k, v]) => k === 'id' || (k === 'intent' && PET_INTENTS.includes(v as PetIntent))),
    // Before WP-C7 a Pet Card request was the pet's id.
    upgrade: (r) => (isId(r) ? { id: r } : r),
  },
  ritual: {
    host: lazyModule(() => import('@/features/rituals/RitualReaderHost')),
    request: ritualRequest,
    close: closeRitual,
    valid: (r) => isObject(r) && ((r.kind === 'letter' && isId(r.id)) || (r.kind === 'season' && isId(r.key))),
  },
} satisfies Record<string, SheetSpec>;
type SheetName = keyof typeof SHEETS;

/**
 * A failed retry reloads the page (`reloadToRetry`, ./useLazyModule.ts); the request it was for is
 * kept here for this tab, and asked for again once the shell is back.
 */
export const SHEET_RETRY_KEY = 'catkin-sheet-retry';

function keepForReload(name: SheetName): void {
  try {
    sessionStorage.setItem(SHEET_RETRY_KEY, JSON.stringify({ name, request: SHEETS[name].request.peek() }));
  } catch {
    /* nowhere to keep it: after the reload she asks again */
  }
}

function askAgainAfterReload(): void {
  let kept: unknown = null;
  try {
    kept = JSON.parse(sessionStorage.getItem(SHEET_RETRY_KEY) ?? 'null');
    sessionStorage.removeItem(SHEET_RETRY_KEY);
  } catch {
    return;
  }
  if (!isObject(kept) || typeof kept.name !== 'string' || !Object.prototype.hasOwnProperty.call(SHEETS, kept.name)) return;
  const sheet: SheetSpec = SHEETS[kept.name as SheetName];
  const request = sheet.upgrade ? sheet.upgrade(kept.request) : kept.request;
  if (sheet.valid(request) && sheet.request.peek() === null) sheet.request.value = request;
}

/**
 * How long a sheet's first load may take before a small sheet says so (P-ui-23). The service worker
 * keeps every chunk once it is installed, so this is only ever seen before that: a quick load
 * opens its sheet with nothing in between.
 */
export const SLOW_SHEET_MS = 700;

/** True once `active` has held for `ms` (false again as soon as it stops). */
function useHeldFor(active: boolean, ms: number): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    setHeld(false);
    if (!active) return;
    const t = setTimeout(() => setHeld(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return active && held;
}

/**
 * A sheet host, loaded the first time its sheet is asked for and then kept mounted (WP-C4). A first
 * load that takes a moment gets a small sheet, "One moment", with Close (P-ui-23). If its
 * chunk can't load (offline before it was ever kept, or an update took the old chunk away), the
 * small sheet says so: "Try again" keeps the request and opens what was asked for once it loads
 * (the sheet stays up, busy, while it tries; a retry that fails in the page reloads it when that is
 * safe, and the request is asked for again after); "Close" (and Esc) clears the request, so the
 * next request loads afresh. It is one sheet throughout: loading, the error and a retry change its
 * words, and it goes the moment the sheet asked for opens. The small sheet is the shell's own
 * `LoadSheet` (./LoadSheet.tsx), so the paper Sheet stays off the first paint.
 */
function LazySheet({ name }: { name: SheetName }) {
  const sheet: SheetSpec = SHEETS[name];
  const { status, module, retrying, retry } = useLazyModule(sheet.host, sheet.request.value !== null, { beforeReload: () => keepForReload(name) });
  const slow = useHeldFor(status === 'loading' && !retrying, SLOW_SHEET_MS);
  const open = status === 'error' || retrying || slow;
  // What it says while it is up, and still as it slides away (Close clears what it was showing).
  const face = useRef({ slow: false, busy: false });
  if (open) face.current = { slow, busy: retrying || slow };
  if (module) {
    const Loaded = module.default;
    return <Loaded />;
  }
  return (
    <LoadSheet
      open={open}
      title={face.current.slow ? SCREEN_COPY.sheetSlow : SCREEN_COPY.sheetTitle}
      message={face.current.slow ? undefined : SCREEN_COPY.sheetText}
      retryLabel={SCREEN_COPY.sheetRetry}
      closeLabel={SCREEN_COPY.sheetClose}
      busy={face.current.busy}
      onRetry={retry}
      onClose={sheet.close}
    />
  );
}

/**
 * The shared sheets any screen can open (src/features/habits/open.ts, src/features/rituals/open.ts).
 * This is their one loader: no screen loads a sheet host of its own.
 */
export function SheetHosts() {
  useEffect(askAgainAfterReload, []);
  return (
    <>
      <LazySheet name="editor" />
      <LazySheet name="detail" />
      <LazySheet name="pet" />
      <LazySheet name="ritual" />
    </>
  );
}

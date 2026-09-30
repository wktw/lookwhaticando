import type { ComponentType } from 'preact';
import type { Signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { closeHabitDetail, closeHabitEditor, closePetCard, habitDetailRequest, habitEditorRequest, petCardRequest } from '@/features/habits/open';
import { closeRitual, ritualRequest } from '@/features/rituals/open';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { SCREEN_COPY } from './copy';
import { lazyModule, useLazyModule, type LazyModule } from './useLazyModule';

type Host = LazyModule<{ default: ComponentType }>;

/** Each shared sheet: its lazily loaded host, its request, how it closes, and what a request may look like. */
interface SheetSpec {
  host: Host;
  request: Signal<unknown>;
  close: () => void;
  valid: (r: unknown) => boolean;
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
  pet: { host: lazyModule(() => import('@/features/pets/PetCardHost')), request: petCardRequest, close: closePetCard, valid: isId },
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
  if (sheet.valid(kept.request) && sheet.request.peek() === null) sheet.request.value = kept.request;
}

/**
 * A sheet host, loaded the first time its sheet is asked for and then kept mounted (WP-C4). If its
 * chunk can't load (offline before it was ever kept, or an update took the old chunk away), a
 * small sheet says so: "Try again" keeps the request and opens what was asked for once it loads
 * (the sheet stays up, busy, while it tries; a retry that fails in the page reloads it when that is
 * safe, and the request is asked for again after); "Close" (and Esc) clears the request, so the
 * next request loads afresh.
 */
function LazySheet({ name }: { name: SheetName }) {
  const sheet: SheetSpec = SHEETS[name];
  const { status, module, retrying, retry } = useLazyModule(sheet.host, sheet.request.value !== null, { beforeReload: () => keepForReload(name) });
  if (module) {
    const Loaded = module.default;
    return <Loaded />;
  }
  return (
    <ConfirmDialog
      open={status === 'error' || retrying}
      title={SCREEN_COPY.sheetTitle}
      message={SCREEN_COPY.sheetText}
      confirmLabel={SCREEN_COPY.sheetRetry}
      cancelLabel={SCREEN_COPY.sheetClose}
      busy={retrying}
      onConfirm={retry}
      onCancel={sheet.close}
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

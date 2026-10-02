import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { saveEpoch } from '@/state/store';
import { peekHead, SAVE_KEY } from '@/state/persist';
import { LoadSheet } from './LoadSheet';
import { SCREEN_COPY } from './copy';
import { lazyModule, useLazyModule } from './useLazyModule';

type Kind = 'snapshots' | 'import' | 'backup' | 'damaged';
type Request = { kind: Kind; epoch: number };
const request = signal<Request | null>(null);
const module = lazyModule(() => import('@/features/you/recovery'));
const RETRY_KEY = 'catkin-recovery-retry';
const known = (kind: unknown): kind is Kind => ['snapshots', 'import', 'backup', 'damaged'].includes(kind as string);

export function requestRecovery(kind: Kind): void {
  // A prefetched delivery action keeps the tap's user activation for the native share sheet.
  const ready = module.current();
  if (ready && (kind === 'backup' || kind === 'damaged')) {
    void (kind === 'backup' ? ready.saveBackupNow() : ready.saveDamagedFile());
    return;
  }
  request.value = { kind, epoch: saveEpoch.peek() };
}
export function prefetchRecovery(): void { void module.load().catch(() => undefined); }

/** A cached failed chunk needs a fresh page; retain only the intent and its durable save head. */
function keepRequest(): void {
  const pending = request.peek();
  if (!pending || pending.epoch !== saveEpoch.peek()) return;
  try { sessionStorage.setItem(RETRY_KEY, JSON.stringify({ kind: pending.kind, head: peekHead(localStorage, SAVE_KEY) })); } catch { /* the next tap can ask again */ }
}
function resumeRequest(): void {
  try {
    const raw = sessionStorage.getItem(RETRY_KEY);
    sessionStorage.removeItem(RETRY_KEY);
    if (!raw) return;
    const kept = JSON.parse(raw) as { kind?: unknown; head?: unknown };
    if (known(kept.kind) && JSON.stringify(kept.head) === JSON.stringify(peekHead(localStorage, SAVE_KEY))) requestRecovery(kept.kind);
  } catch { /* malformed or inaccessible session storage keeps no request */ }
}

/** Shell recovery keeps its request through a failed load and cancels it when the save changes. */
export function RecoveryHost() {
  useState(() => { resumeRequest(); return 0; });
  const pending = request.value;
  const epoch = saveEpoch.value;
  const wanted = pending !== null && pending.epoch === epoch;
  const { status, module: mod, retrying, retry } = useLazyModule(module, wanted, { beforeReload: keepRequest });
  const close = () => { request.value = null; };
  useEffect(() => {
    if (pending && pending.epoch !== saveEpoch.peek()) { close(); return; }
    if (!pending || !mod) return;
    if (pending.kind === 'backup' || pending.kind === 'damaged') {
      close();
      void (pending.kind === 'backup' ? mod.saveBackupNow() : mod.saveDamagedFile());
    }
  }, [pending, mod, epoch]);
  if (mod) return <mod.RecoverySheets open={wanted && (pending.kind === 'snapshots' || pending.kind === 'import') ? pending.kind : null} onClose={close} />;
  return <LoadSheet open={wanted} title={status === 'error' ? SCREEN_COPY.sheetTitle : SCREEN_COPY.sheetSlow}
    message={status === 'error' ? SCREEN_COPY.loadErrorText : undefined}
    retryLabel={SCREEN_COPY.sheetRetry} closeLabel={SCREEN_COPY.sheetClose}
    busy={status !== 'error' || retrying} onRetry={retry} onClose={close} />;
}

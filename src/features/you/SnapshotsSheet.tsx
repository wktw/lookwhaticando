/**
 * "Daily copies" (VOICE §21): the copies kept on this device, newest first, each with "Restore this
 * copy". Shared by You › Data and the shell's recovery notes (WP-A7).
 *
 * The list has three states (audit data-d12): being read ("One moment", for screen readers), read
 * (the copies, or "The first daily copy is made tonight." when there are none yet), and unreadable
 * ("The daily copies can’t be read on this device right now." with "Try again"), so a list that
 * can't be read is never shown as none. A restore goes through the store's one replacement protocol
 * (WP-A3); whatever it answers, or if it throws, the question closes or asks once more, and the
 * controls are usable again.
 */
import { useEffect, useState } from 'preact/hooks';
import { DATA, EMPTY, ERRORS, fillLine } from '@/catalog/lines';
import { num } from '@/catalog/format';
import { demoMode, listSnapshots, replacing, restoreSnapshot } from '@/state/store';
import type { ReplaceResult, SnapshotList } from '@/state/api';
import { SCREEN_COPY } from '@/app/copy';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { DATA_COPY } from './copy';
import { replaceErrorText, toastRestored } from './ImportSheet';
import { saveLocked } from './lock';
import { dayOf } from './when';
import s from './You.module.css';

type Snapshot = Extract<SnapshotList, { ok: true }>['snapshots'][number];

type Listing = { kind: 'reading' } | { kind: 'unreadable' } | { kind: 'read'; snapshots: Snapshot[] };

export function SnapshotsSheet({ open, onClose, onRestored }: { open: boolean; onClose: () => void; onRestored: () => void }) {
  const [list, setList] = useState<Listing>({ kind: 'reading' });
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState<{ id: string; label: string; withoutUndo?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setList({ kind: 'reading' });
    if (!open) return;
    let live = true;
    listSnapshots().then(
      (l) => live && setList(l.ok ? { kind: 'read', snapshots: [...l.snapshots].sort((a, b) => b.savedAt - a.savedAt) } : { kind: 'unreadable' }),
      () => live && setList({ kind: 'unreadable' }),
    );
    return () => {
      live = false;
    };
  }, [open, attempt]);

  const restore = async () => {
    if (!confirm) return;
    setBusy(true);
    let res: ReplaceResult;
    try {
      res = await restoreSnapshot(confirm.id, { withoutUndo: confirm.withoutUndo ?? false });
    } catch {
      // The store answers with results; if a read throws anyway, nothing was committed.
      res = { ok: false, error: 'unavailable' };
    } finally {
      setBusy(false);
    }
    if (!res.ok && res.error === 'no-undo') {
      // No copy of what's here could be kept: asked once more, like an import.
      setConfirm({ ...confirm, withoutUndo: true });
      return;
    }
    setConfirm(null);
    if (res.ok) {
      onClose();
      toastRestored(confirm.label, res.undo, onRestored);
      onRestored();
      return;
    }
    const text = replaceErrorText(res.error);
    if (text) toast({ key: 'snapshot-no', message: text, tone: 'butter' });
  };
  const withoutUndo = confirm?.withoutUndo ?? false;
  return (
    <>
      <Sheet open={open} onClose={onClose} title={DATA_COPY.snapshotsRow} description={DATA_COPY.snapshotsKept} size="md">
        {list.kind === 'reading' ? (
          <p class="sr-only" aria-busy="true">
            {SCREEN_COPY.loading}
          </p>
        ) : list.kind === 'unreadable' ? (
          <div class={s.stack}>
            <p class={s.helper} role="alert">
              {DATA_COPY.snapshotsError}
            </p>
            <div class={s.actions}>
              <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                {ERRORS.tryAgain}
              </Button>
            </div>
          </div>
        ) : list.snapshots.length === 0 ? (
          <p class={s.helper}>{EMPTY.snapshots}</p>
        ) : (
          <ul class={s.snapshots}>
            {list.snapshots.map((snap) => {
              const label = dayOf(snap.savedAt);
              return (
                <li key={snap.id} class={s.snapshot}>
                  <span class={s.rowText}>
                    <span class={s.label}>
                      {label} · {DATA_COPY.snapshotKinds[snap.kind as keyof typeof DATA_COPY.snapshotKinds] ?? DATA_COPY.snapshotKinds.daily}
                    </span>
                    <span class={s.helper}>{fillLine(DATA_COPY.snapshotLine, { habits: num(snap.habits), waterings: num(snap.checkins) })}</span>
                  </span>
                  <Button variant="secondary" size="sm" disabled={demoMode.value || saveLocked() || replacing.value} onClick={() => setConfirm({ id: snap.id, label })}>
                    {DATA.restoreSnapshot}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirm !== null}
        title={withoutUndo ? DATA_COPY.restoreNoUndoTitle : DATA.restoreSnapshot}
        message={confirm ? (withoutUndo ? DATA_COPY.restoreNoUndo : `${confirm.label}. ${DATA.snapshots}`) : undefined}
        confirmLabel={DATA.restoreSnapshot}
        cancelLabel={DATA.keep}
        tone={withoutUndo ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={() => void restore()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

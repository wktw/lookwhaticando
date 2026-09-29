/**
 * You › Your data (DESIGN §9.5, VOICE §21): where the save lives and when it was last backed up,
 * "Save a backup" (the share sheet, else a download), "Copy backup" (CK1), "Import a backup" with
 * a preview and 24 hours of "Undo import", the daily copies, the CSV, the demo, and "Start over"
 * behind two confirmations.
 */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { DATA, ERRORS, fillLine } from '@/catalog/lines';
import { num } from '@/catalog/format';
import { dayOf } from './when';
import {
  canUndoImport,
  demoMode,
  enterDemo,
  exitDemo,
  exportCsv,
  backupJson,
  backupPayload,
  markBackup,
  listSnapshots,
  readOnly,
  resetAll,
  restoreSnapshot,
  saveStatus,
  state,
  today,
  undoImport,
} from '@/state/store';
import { navigate } from '@/app/router';
import { currentInstallPlatform } from '@/app/installPrompt';
import { reloadProgress } from '@/features/onboarding/progress';
import { ListRow } from '@/ui/ListRow';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { SectionHeader } from '@/ui/SectionHeader';
import { EMPTY } from '@/catalog/lines';
import { DATA_COPY, YOU } from './copy';
import { copyLater, saveFile } from './files';
import { ImportSheet } from './ImportSheet';
import { saveLocked } from './lock';
import s from './You.module.css';
import cs from '@/ui/ConfirmDialog.module.css';

const DAY = 86_400_000;

export const dateOfMs = (ms: number) => dayOf(ms);

/** "catkin-backup-2025-09-29.json" */
export const backupFileName = (day: string) => fillLine(DATA.file, { date: day });

/** A backup nudge: only once there is something worth keeping, and the last backup is over a month old. */
export function backupNudge(opts: { lastBackupAt?: number; checkins: number; now: number }): string | null {
  if (!opts.lastBackupAt || opts.checkins < 1) return null;
  return opts.now - opts.lastBackupAt > 30 * DAY ? fillLine(DATA.nudge, { date: dateOfMs(opts.lastBackupAt) }) : null;
}

function isStandalone(): boolean {
  return currentInstallPlatform() === 'installed';
}

function StatusRow() {
  const app = state.value;
  const standalone = isStandalone();
  const full = saveStatus.value.status === 'storage-full';
  const last = app.lastBackupAt;
  const nudge = backupNudge({ lastBackupAt: last, checkins: app.lifetime.checkins, now: Date.now() });
  const platform = currentInstallPlatform();
  const safariTab = platform === 'ios-safari' || platform === 'mac-safari';
  return (
    <ListRow
      leading={<span class={cx(s.dot, !standalone && s.dotTab)} aria-hidden="true" />}
      title={full ? ERRORS.save : standalone ? DATA.storage.device : DATA.storage.tab}
      subtitle={
        <>
          {last ? fillLine(DATA.lastBackup, { date: dateOfMs(last) }) : DATA.noBackup}
          {nudge && <span class={s.nudge} style={{ display: 'block' }}>{nudge}</span>}
          {safariTab && !nudge && <span style={{ display: 'block', marginTop: '4px' }}>{ERRORS.safariTab}</span>}
        </>
      }
    />
  );
}

function SnapshotsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof listSnapshots>> | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return setList(null);
    let live = true;
    listSnapshots().then(
      (l) => live && setList([...l].sort((a, b) => b.savedAt - a.savedAt)),
      () => live && setList([]),
    );
    return () => {
      live = false;
    };
  }, [open]);
  const restore = async () => {
    if (!confirm) return;
    setBusy(true);
    const ok = await restoreSnapshot(confirm.id);
    setBusy(false);
    setConfirm(null);
    if (ok) {
      onClose();
      toast({ key: 'snapshot-restored', message: fillLine(DATA_COPY.restoredSnapshot, { date: confirm.label }), tone: 'sage' });
    } else toast({ key: 'snapshot-no', message: readOnly.value || demoMode.value ? DATA_COPY.readOnly : ERRORS.notBackup, tone: 'butter' });
  };
  return (
    <>
      <Sheet open={open} onClose={onClose} title={DATA_COPY.snapshotsRow} description={DATA_COPY.snapshotsKept} size="md">
        {list === null ? null : list.length === 0 ? (
          <p class={s.helper}>{EMPTY.snapshots}</p>
        ) : (
          <ul class={s.snapshots}>
            {list.map((snap) => {
              const label = dateOfMs(snap.savedAt);
              return (
                <li key={snap.id} class={s.snapshot}>
                  <span class={s.rowText}>
                    <span class={s.label}>
                      {label} · {DATA_COPY.snapshotKinds[snap.kind as keyof typeof DATA_COPY.snapshotKinds] ?? DATA_COPY.snapshotKinds.daily}
                    </span>
                    <span class={s.helper}>{fillLine(DATA_COPY.snapshotLine, { habits: num(snap.habits), waterings: num(snap.checkins) })}</span>
                  </span>
                  <Button variant="secondary" size="sm" disabled={demoMode.value || saveLocked()} onClick={() => setConfirm({ id: snap.id, label })}>
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
        title={DATA.restoreSnapshot}
        message={confirm ? `${confirm.label}. ${DATA.snapshots}` : undefined}
        confirmLabel={DATA.restoreSnapshot}
        cancelLabel={DATA.keep}
        busy={busy}
        onConfirm={() => void restore()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

/** How long the last "Start over" stays unarmed after it appears, so a double tap can't reach it. */
export const FINAL_ARM_MS = 700;

/**
 * The second "Start over": the reverse of the first dialog. "Keep everything" stands where the
 * first dialog's "Start over" was, and "Start over" (below it) only answers a tap that began
 * after it had been on screen for a moment. Two quick taps on the first dialog keep everything.
 */
export function FinalStartOver({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const messageId = useId();
  const openedAt = useRef(0);
  const armedPress = useRef(false);
  if (open && openedAt.current === 0) openedAt.current = performance.now();
  if (!open) openedAt.current = 0;
  const armed = () => openedAt.current > 0 && performance.now() - openedAt.current >= FINAL_ARM_MS;
  return (
    <Sheet open={open} onClose={onCancel} title={DATA_COPY.startOverAgainTitle} hideTitle describedBy={messageId} size="sm" role="alertdialog" showClose={false} initialFocus="[data-cancel]">
      <div class={cs.content}>
        <p class={cs.title} aria-hidden="true">
          {DATA_COPY.startOverAgainTitle}
        </p>
        <p class={cs.message} id={messageId}>
          {DATA_COPY.startOverAgain}
        </p>
        <div class={cs.actions}>
          <Button variant="primary" size="lg" block onClick={onCancel} data-cancel>
            {DATA.keepEverything}
          </Button>
          <Button
            variant="danger"
            size="lg"
            block
            data-confirm
            onPointerDown={() => (armedPress.current = armed())}
            onClick={(e: MouseEvent) => {
              // A pointer tap counts only if it began once the button was armed; a keyboard press (detail 0) is deliberate.
              const ok = e.detail === 0 || armedPress.current;
              armedPress.current = false;
              if (ok) onConfirm();
            }}
          >
            {DATA.startOver}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function CopyByHand({ text, onClose }: { text: string | null; onClose: () => void }) {
  return (
    <Sheet open={text !== null} onClose={onClose} title={DATA_COPY.copyTitle} description={ERRORS.copy} size="md">
      <textarea class={s.payload} readOnly value={text ?? ''} aria-label={DATA_COPY.copyTitle} onFocus={(e) => e.currentTarget.select()} data-autofocus />
    </Sheet>
  );
}

export function DataSection() {
  const [importing, setImporting] = useState(false);
  const [snapshots, setSnapshots] = useState(false);
  const [byHand, setByHand] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [, bump] = useState(0);
  const inDemo = demoMode.value;
  const locked = saveLocked();
  const undoable = !inDemo && !locked && canUndoImport();

  const saveBackup = async () => {
    const json = backupJson();
    const outcome = await saveFile(backupFileName(today.value), json);
    if (outcome === 'cancelled') return;
    // Marked only once it is really saved (a cancelled share leaves the nudge up).
    markBackup();
    toast({ key: 'backup', message: outcome === 'downloaded-instead' ? ERRORS.share : DATA.saved, tone: 'sage' });
  };

  // No await before the copy starts: iPhone Safari only copies from inside the tap.
  const copyBackup = () => {
    const payload = backupPayload();
    void copyLater(payload).then(async (ok) => {
      if (ok) {
        markBackup();
        toast({ key: 'backup-copied', message: DATA.copied, tone: 'sage' });
      }
      else setByHand(await payload);
    });
  };

  // The share sheet on a phone (a blob download goes nowhere in an installed iPhone app), else a download.
  const csv = async () => {
    const file = exportCsv();
    const outcome = await saveFile(file.name, file.text, 'text/csv');
    if (outcome === 'cancelled') return;
    toast({ key: 'csv', message: outcome === 'downloaded-instead' ? ERRORS.share : DATA_COPY.csvSaved, tone: 'sage' });
  };

  const undo = async () => {
    if (await undoImport()) toast({ key: 'import-undone', message: DATA.undone, tone: 'sage' });
    bump((n) => n + 1);
  };

  const startOver = () => {
    setResetStep(0);
    resetAll();
    reloadProgress();
    navigate('today');
  };

  return (
    <section class={s.group} aria-labelledby="you-data">
      <SectionHeader title={YOU.sections.data} id="you-data" />
      <div class={s.card}>
        <StatusRow />
        <ListRow leading="download" leadingTone="sage" title={DATA.save} chevron={false} onClick={() => void saveBackup()} />
        <ListRow leading="export" leadingTone="sage" title={DATA.copy} chevron={false} onClick={copyBackup} />
        <ListRow leading="import" leadingTone="sky" title={DATA.import} subtitle={inDemo ? DATA_COPY.inDemo : undefined} disabled={locked} onClick={() => setImporting(true)} />
        {undoable && <ListRow leading="undo" leadingTone="sky" title={DATA.undoImport} chevron={false} onClick={() => void undo()} />}
        <ListRow leading="calendar" leadingTone="lavender" title={DATA_COPY.snapshotsRow} onClick={() => setSnapshots(true)} />
        <ListRow leading="note" leadingTone="butter" title={DATA.csv} chevron={false} onClick={() => void csv()} />
        <ListRow
          leading="sprout"
          leadingTone="blush"
          title={inDemo ? DATA.leaveDemo : DATA.demo}
          subtitle={inDemo ? undefined : DATA_COPY.demoLine}
          chevron={false}
          disabled={locked}
          onClick={() => (inDemo ? exitDemo() : (enterDemo(), navigate('today')))}
        />
      </div>
      <div class={s.card} style={{ marginTop: 'var(--s-3)' }}>
        <ListRow leading="trash" leadingTone="peach" title={DATA.startOver} destructive chevron={false} disabled={locked || !!readOnly.value} onClick={() => setResetStep(1)} />
      </div>

      <ImportSheet open={importing} onClose={() => setImporting(false)} onImported={() => bump((n) => n + 1)} />
      <SnapshotsSheet open={snapshots} onClose={() => setSnapshots(false)} />
      <CopyByHand text={byHand} onClose={() => setByHand(null)} />
      <ConfirmDialog
        open={resetStep === 1}
        title={DATA.startOver}
        message={DATA.startOverConfirm}
        confirmLabel={DATA.startOver}
        cancelLabel={DATA.keepEverything}
        tone="danger"
        onConfirm={() => setResetStep(2)}
        onCancel={() => setResetStep(0)}
      />
      <FinalStartOver open={resetStep === 2} onConfirm={startOver} onCancel={() => setResetStep(0)} />
    </section>
  );
}

/**
 * You › Your data (DESIGN §9.5, VOICE §21): where the save lives and when it was last backed up,
 * "Save a backup" (the share sheet, else a download), "Copy backup" (CK1), "Import a backup" with
 * a preview and 24 hours of "Undo import", the daily copies, the CSV, the demo, and "Start over"
 * behind two confirmations. Restores and Undo go through the store's one replacement protocol
 * (WP-A3): every "Back to…" note comes from `{ ok: true }`, and while a replacement is under way
 * the other replacements, the demo and Start over wait.
 *
 * The storage row says what is true about the save right now (WP-A7): saved, a change that didn't
 * save yet, a browser that keeps nothing, or a window still getting ready to save. While a damaged
 * save is kept aside, "Save the damaged file" gives its bytes.
 */
import { useId, useRef, useState } from 'preact/hooks';
import { DATA, ERRORS, fillLine } from '@/catalog/lines';
import { dayOf } from './when';
import {
  damagedSave,
  demoMode,
  enterDemo,
  exitDemo,
  eraseEverything,
  erasePending,
  erasing,
  exportCsv,
  backupPayload,
  markBackup,
  readOnly,
  replacing,
  resetAll,
  ownsSave,
  ownership,
  saveEpoch,
  durability,
  state,
  undoOffer,
  type Durability,
  type EraseResult,
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
import { DATA_COPY, YOU } from './copy';
import { copyLater, saveFile } from './files';
import { ImportSheet, undoLastReplacement } from './ImportSheet';
import { SnapshotsSheet } from './SnapshotsSheet';
import { backupFileName, saveBackupNow, saveDamagedFile } from './recovery';
import { saveLocked } from './lock';
import s from './You.module.css';
import cs from '@/ui/ConfirmDialog.module.css';

const DAY = 86_400_000;

export const dateOfMs = (ms: number) => dayOf(ms);

export { backupFileName };

/** A backup nudge: only once there is something worth keeping, and the last backup is over a month old. */
export function backupNudge(opts: { lastBackupAt?: number; checkins: number; now: number }): string | null {
  if (!opts.lastBackupAt || opts.checkins < 1) return null;
  return opts.now - opts.lastBackupAt > 30 * DAY ? fillLine(DATA.nudge, { date: dateOfMs(opts.lastBackupAt) }) : null;
}

function isStandalone(): boolean {
  return currentInstallPlatform() === 'installed';
}

/**
 * What the storage row says (WP-A7, audit data-d1, data-d10): never "Saved" while a change is
 * failing, nothing can be kept, or this window is still waiting to become the one that saves. A
 * window that doesn't own the save (another window, a newer catkin) shows where the save is; the
 * shell's note says who owns it.
 */
export function storageLine(d: Durability, standalone: boolean): string {
  switch (d.kind) {
    case 'volatile':
      return ERRORS.volatile;
    case 'failing':
      return ERRORS.save;
    case 'acquiring':
      return DATA_COPY.storageAcquiring;
    default:
      return standalone ? DATA.storage.device : DATA.storage.tab;
  }
}

function StatusRow() {
  const app = state.value;
  const standalone = isStandalone();
  const last = app.lastBackupAt;
  const nudge = backupNudge({ lastBackupAt: last, checkins: app.lifetime.checkins, now: Date.now() });
  const platform = currentInstallPlatform();
  const safariTab = platform === 'ios-safari' || platform === 'mac-safari';
  return (
    <ListRow
      leading={<span class={cx(s.dot, !standalone && s.dotTab)} aria-hidden="true" />}
      title={erasePending.value ? ERRORS.erasePaused : storageLine(durability.value, standalone)}
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

/** How long the last "Start over" stays unarmed after it appears, so a double tap can't reach it. */
export const FINAL_ARM_MS = 700;

/**
 * The second "Start over": the reverse of the first dialog. "Keep everything" stands where the
 * first dialog's "Start over" was, and "Start over" (below it) only answers a tap that began
 * after it had been on screen for a moment. Two quick taps on the first dialog keep everything.
 */
export function FinalStartOver({ open, onConfirm, onCancel, minHeight = 0 }: { open: boolean; onConfirm: () => void; onCancel: () => void; minHeight?: number }) {
  const messageId = useId();
  const openedAt = useRef(0);
  const armedPress = useRef(false);
  if (open && openedAt.current === 0) openedAt.current = performance.now();
  if (!open) openedAt.current = 0;
  const armed = () => openedAt.current > 0 && performance.now() - openedAt.current >= FINAL_ARM_MS;
  return (
    <Sheet open={open} onClose={onCancel} title={DATA_COPY.startOverAgainTitle} hideTitle describedBy={messageId} size="sm" role="alertdialog" showClose={false} initialFocus="[data-cancel]">
      <div class={cs.content} style={minHeight ? { minHeight } : undefined}>
        <p class={cs.title} aria-hidden="true">
          {DATA_COPY.startOverAgainTitle}
        </p>
        <p class={cs.message} id={messageId}>
          {DATA_COPY.startOverAgain}
        </p>
        <div class={cs.actions} style={minHeight ? { marginTop: 'auto' } : undefined}>
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
  const [resetStep, setResetStep] = useState<0 | 1 | 2 | 3>(0);
  const [eraseResult, setEraseResult] = useState<EraseResult | null>(null);
  const eraseEpoch = useRef(0);
  const firstMessage = useRef<HTMLSpanElement>(null);
  const [resetHeight, setResetHeight] = useState(0);
  const [, bump] = useState(0);
  const inDemo = demoMode.value;
  const locked = saveLocked();
  const busyReplacing = replacing.value;
  const busyErasing = erasing.value;
  const offer = !inDemo && !locked ? undoOffer() : null;
  const damaged = damagedSave() !== null;

  // No await before the copy starts: iPhone Safari only copies from inside the tap.
  const copyBackup = () => {
    const epoch = saveEpoch.peek();
    const payload = backupPayload();
    void copyLater(payload).then(async (ok) => {
      if (ok) {
        if (saveEpoch.peek() === epoch) markBackup();
        toast({ key: 'backup-copied', message: DATA.copied, tone: 'sage' });
      }
      else {
        const text = await payload;
        if (saveEpoch.peek() === epoch) setByHand(text);
      }
    });
  };

  // The share sheet on a phone (a blob download goes nowhere in an installed iPhone app), else a download.
  // From a newer catkin's save it is only what this catkin can read, and says so (WP-A4).
  const csv = async () => {
    const file = exportCsv();
    if (!file) {
      toast({ key: 'csv', message: DATA_COPY.csvNewer, tone: 'butter' });
      return;
    }
    const outcome = await saveFile(file.name, file.text, 'text/csv');
    if (outcome === 'cancelled') return;
    toast({ key: 'csv', message: outcome === 'downloaded-instead' ? ERRORS.share : file.partial ? DATA_COPY.csvPartial : DATA_COPY.csvSaved, tone: 'sage' });
  };

  const undo = async () => {
    if (!offer) return;
    // It never rejects: a failure is said in a note (data-d12).
    await undoLastReplacement(offer.kind);
    bump((n) => n + 1);
  };

  const startOver = () => {
    if (!ownsSave()) return;
    setResetStep(0);
    resetAll();
    reloadProgress();
    navigate('today');
  };

  const erase = async () => {
    if (!erasePending.value && eraseEpoch.current !== saveEpoch.value) {
      setEraseResult({ ok: false, error: 'superseded' });
      return;
    }
    const result = await eraseEverything();
    setEraseResult(result);
    if (result.ok) {
      setResetStep(0);
      reloadProgress();
      navigate('today');
      toast({ key: 'erased', message: DATA_COPY.erased, tone: 'sage' });
    }
  };

  const eraseFailure = eraseResult && !eraseResult.ok
    ? eraseResult.error === 'partial'
      ? [DATA_COPY.erasePartial, ...eraseResult.failures.map((failure) => failure === 'storage' ? DATA_COPY.eraseStorage : failure === 'snapshots-blocked' ? DATA_COPY.eraseBlocked : DATA_COPY.eraseUnavailable)].join(' ')
      : eraseResult.error === 'read-only' ? DATA_COPY.readOnly : DATA_COPY.eraseChanged
    : null;

  return (
    <section class={s.group} aria-labelledby="you-data">
      <SectionHeader title={YOU.sections.data} id="you-data" />
      <div class={s.card}>
        <StatusRow />
        <ListRow leading="download" leadingTone="sage" title={DATA.save} chevron={false} onClick={() => void saveBackupNow()} />
        <ListRow leading="export" leadingTone="sage" title={DATA.copy} chevron={false} onClick={copyBackup} />
        <ListRow leading="import" leadingTone="sky" title={DATA.import} subtitle={inDemo ? DATA_COPY.inDemo : undefined} disabled={locked || busyReplacing} onClick={() => setImporting(true)} />
        {offer && (
          <ListRow
            leading="undo"
            leadingTone="sky"
            title={offer.kind === 'restore' ? DATA_COPY.undoRestore : DATA.undoImport}
            chevron={false}
            disabled={busyReplacing}
            onClick={() => void undo()}
          />
        )}
        <ListRow leading="calendar" leadingTone="lavender" title={DATA_COPY.snapshotsRow} onClick={() => setSnapshots(true)} />
        {damaged && <ListRow leading="download" leadingTone="peach" title={ERRORS.saveDamaged} chevron={false} onClick={() => void saveDamagedFile()} />}
        <ListRow leading="note" leadingTone="butter" title={DATA.csv} chevron={false} onClick={() => void csv()} />
        <ListRow
          leading="sprout"
          leadingTone="blush"
          title={inDemo ? DATA.leaveDemo : DATA.demo}
          subtitle={inDemo ? undefined : DATA_COPY.demoLine}
          chevron={false}
          disabled={locked || busyReplacing}
          onClick={() => {
            if (inDemo) exitDemo();
            else if (enterDemo()) navigate('today');
            else toast({ key: 'demo-waits', message: DATA_COPY.demoWaits, tone: 'butter' });
          }}
        />
      </div>
      <div class={s.card} style={{ marginTop: 'var(--s-3)' }}>
        <ListRow leading="trash" leadingTone="peach" title={DATA.startOver} destructive chevron={false} disabled={locked || busyReplacing || ownership.value === 'acquiring'} onClick={() => setResetStep(1)} />
        {erasePending.value && <ListRow title={DATA_COPY.eraseRetry} destructive chevron={false} disabled={busyErasing || readOnly.value === 'other-window' || readOnly.value === 'newer-version'} onClick={() => setResetStep(3)} />}
      </div>

      <ImportSheet open={importing} onClose={() => setImporting(false)} onImported={() => bump((n) => n + 1)} />
      <SnapshotsSheet open={snapshots} onClose={() => setSnapshots(false)} onRestored={() => bump((n) => n + 1)} />
      <CopyByHand text={byHand} onClose={() => setByHand(null)} />
      <ConfirmDialog
        open={resetStep === 1}
        title={DATA.startOver}
        message={<span ref={firstMessage}>
          {DATA.startOverConfirm}
          <Button variant="secondary" block onClick={() => void saveBackupNow()}>{DATA_COPY.saveFirst}</Button>
          {!inDemo && <Button variant="danger" block onClick={() => { eraseEpoch.current = saveEpoch.value; setEraseResult(null); setResetStep(3); }}>{DATA_COPY.erase}</Button>}
        </span>}
        confirmLabel={DATA.startOver}
        cancelLabel={DATA.keepEverything}
        tone="danger"
        onConfirm={() => {
          // Keep the first action's position: a quick second tap lands on Keep everything.
          setResetHeight(firstMessage.current?.parentElement?.parentElement?.getBoundingClientRect().height ?? 0);
          setResetStep(2);
        }}
        onCancel={() => setResetStep(0)}
      />
      <FinalStartOver open={resetStep === 2} minHeight={resetHeight} onConfirm={startOver} onCancel={() => setResetStep(0)} />
      <ConfirmDialog
        open={resetStep === 3}
        title={DATA_COPY.eraseTitle}
        message={<>{DATA_COPY.eraseConfirm}{eraseFailure && <span role="alert" style={{ display: 'block', marginTop: 'var(--s-3)' }}>{eraseFailure}</span>}</>}
        confirmLabel={erasePending.value ? DATA_COPY.eraseRetry : DATA_COPY.eraseButton}
        cancelLabel={erasePending.value ? ERRORS.sheetClose : DATA.keepEverything}
        tone="danger"
        busy={busyErasing}
        onConfirm={() => void erase()}
        onCancel={() => { if (!busyErasing) setResetStep(0); }}
      />
    </section>
  );
}

/**
 * "Import a backup" (VOICE §21): choose a backup file, paste a CK1 backup, or (in the installed
 * app) "Paste my plants" straight from the clipboard. The backup is described before anything
 * changes ("This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20."), then "Import"
 * replaces what's here (never a merge) and "Undo import" stands for 24 hours. When no undo copy
 * could be kept, she is asked once more ('no-undo'). Every note says only what the import answered
 * (`{ ok: true, undo }`, WP-A3): no Undo is offered when none was kept, and closing the sheet lets
 * an import that hasn't committed yet go.
 *
 * Import is bound to what was described (WP-A6, FS6): every new choice (a file, a paste, the
 * clipboard, typing, opening or closing) is a new selection. What was described before goes at once
 * and the sheet says it is reading; a read, clipboard answer or description from an earlier
 * selection is dropped when it comes in, and its reads are let go. The described text itself is the
 * candidate Import and the no-undo question import, and a new choice lets an import of the old one
 * go, as closing does.
 *
 * Shared by You › Data, the install gate and onboarding's first step.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { CHECKIN_TOASTS, DATA, ERRORS, INSTALL, fillLine } from '@/catalog/lines';
import { num } from '@/catalog/format';
import { dayOf } from './when';
import { applyImport, demoMode, previewImport, replacing, undoImport } from '@/state/store';
import type { ImportPreview, ReplaceError, ReplaceResult } from '@/state/api';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { TextArea } from '@/ui/TextField';
import { toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { DATA_COPY } from './copy';
import { readClipboard, readImportFile } from './files';
import s from './You.module.css';

/**
 * The words for an import, restore or Undo that changed nothing (VOICE §21), or null when there is
 * nothing to say: she let it go, or another one was under way (its button was busy).
 */
export function replaceErrorText(error: ReplaceError): string | null {
  switch (error) {
    case 'aborted':
    case 'busy':
      return null;
    case 'not-saved':
      return DATA_COPY.notReplaced;
    case 'superseded':
      return DATA_COPY.superseded;
    case 'demo-mode':
    case 'read-only':
      return DATA_COPY.readOnly;
    case 'unavailable':
    case 'damaged-copy':
      return DATA_COPY.copyUnreadable;
    case 'not-found':
      return DATA_COPY.copyGone;
    case 'newer-copy':
      return DATA_COPY.copyNewer;
    case 'expired':
      // The Undo is over, not its copy: that may still be under Daily copies.
      return DATA_COPY.undoGone;
    default:
      return importErrorText(error);
  }
}

/** The words for an import that can't go ahead (VOICE §18). */
export function importErrorText(error: string): string {
  switch (error) {
    case 'not-saved':
      return DATA_COPY.notReplaced;
    case 'superseded':
      return DATA_COPY.superseded;
    case 'made-by-newer-version':
      return ERRORS.newerBackup;
    case 'too-large':
      return ERRORS.tooLarge;
    case 'cannot-decompress-here':
      return DATA_COPY.cannotOpen;
    case 'demo-mode':
      return DATA_COPY.inDemo;
    case 'read-only':
      return DATA_COPY.readOnly;
    default:
      return ERRORS.notBackup;
  }
}


/** "This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20." */
export function previewLine(p: ImportPreview): string {
  const line = fillLine(DATA.preview, { habits: num(p.habits), waterings: num(p.checkins), pets: num(p.friends), date: p.savedAt ? dayOf(p.savedAt) : '' });
  return p.savedAt ? line : line.replace(/ Saved \.$/, '');
}

/**
 * Takes the last import or restore back, and says what happened (VOICE §21). It never rejects: if
 * the store's answer is a rejection after all, the copy couldn't be read, and nothing changed (data-d12).
 */
export function undoLastReplacement(kind: 'import' | 'restore', onUndone?: () => void): Promise<void> {
  return undoImport()
    .catch((): ReplaceResult => ({ ok: false, error: 'unavailable' }))
    .then((res) => {
      if (res.ok) {
        toast({ key: 'import-undone', message: kind === 'restore' ? DATA_COPY.undoneRestore : DATA.undone, tone: 'sage' });
        onUndone?.();
        return;
      }
      const text = replaceErrorText(res.error);
      if (text) toast({ key: 'import-undo-no', message: text, tone: 'butter' });
    });
}

/**
 * The note after an import, from what it answered: "Imported. You can undo this for 24 hours." with
 * "Undo import" when a copy was kept, else "Imported. There is no Undo import this time." with no
 * Undo (data-d11).
 */
export function toastImported(undo: { until: number } | null, onUndone?: () => void): void {
  if (!undo) {
    toast({ key: 'imported', message: DATA_COPY.importedNoUndo, tone: 'sage', duration: 8000 });
    return;
  }
  toast({
    key: 'imported',
    message: DATA.imported,
    tone: 'sage',
    duration: 8000,
    action: { label: DATA.undoImport, onAction: () => void undoLastReplacement('import', onUndone) },
  });
}

/** The note after a restore: "Back to the copy from Sep 20.", with "Undo" when a copy was kept. */
export function toastRestored(date: string, undo: { until: number } | null, onUndone?: () => void): void {
  toast({
    key: 'snapshot-restored',
    message: fillLine(DATA_COPY.restoredSnapshot, { date }),
    tone: 'sage',
    ...(undo ? { duration: 8000, action: { label: CHECKIN_TOASTS.undo, onAction: () => void undoLastReplacement('restore', onUndone) } } : {}),
  });
}

export interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** After a backup was imported (the sheet has closed), with the Undo it promises, if any. */
  onImported?: (res: Extract<ReplaceResult, { ok: true }>) => void;
  /**
   * "Paste my plants": the clipboard read that the tap opening the sheet started (iPhone Safari
   * only reads it inside a tap). Its text is described as soon as it arrives; if it can't be
   * read, the sheet's own "Paste my plants" button has the focus.
   */
  clip?: Promise<string | null> | null;
  /** The sheet's title (default "Import a backup"). */
  title?: string;
}

/**
 * What the sheet described, and so the one thing Import can import (WP-A6, FS6): the exact text that
 * was described, and the selection it came from. It never changes; a new choice makes a new one.
 */
interface Candidate {
  readonly gen: number;
  readonly text: string;
  readonly preview: ImportPreview;
}

export function ImportSheet({ open, onClose, onImported, clip, title = DATA.import }: ImportSheetProps) {
  const [text, setText] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The no-undo question, and the backup it is about. */
  const [askNoUndo, setAskNoUndo] = useState<Candidate | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /**
   * The selection generation (WP-A6): bumped by every file, paste, clipboard read, typed change,
   * open and close. A read, clipboard answer or description from an earlier one is dropped.
   */
  const sel = useRef(0);
  /** Lets the current selection's reads go (a file read, a payload expanding). */
  const reads = useRef<AbortController | null>(null);
  /** The import under way, let go when the sheet closes or goes, or another backup is chosen (FS5). */
  const importing = useRef<AbortController | null>(null);

  /**
   * A new choice: everything about the one before goes at once (what was described, its error, the
   * no-undo question, its reads, and an import of it that hasn't committed yet).
   */
  const select = (): { gen: number; signal: AbortSignal } => {
    const gen = ++sel.current;
    reads.current?.abort();
    const ctl = new AbortController();
    reads.current = ctl;
    if (importing.current) {
      importing.current.abort();
      importing.current = null;
      setBusy(false);
    }
    setCandidate(null);
    setAskNoUndo(null);
    setError(null);
    setReading(false);
    return { gen, signal: ctl.signal };
  };
  const current = (gen: number) => gen === sel.current;

  useEffect(() => {
    const { gen, signal } = select();
    setText('');
    if (open && clip) {
      setReading(true);
      void clip.then(
        (t) => takeClip(gen, signal, t),
        () => takeClip(gen, signal, null),
      );
    }
  }, [open]);

  useEffect(
    () => () => {
      sel.current++;
      reads.current?.abort();
      importing.current?.abort();
    },
    [],
  );

  /** Describes `value` for the selection `gen`, which it becomes the candidate of if still current. */
  const describe = async (gen: number, signal: AbortSignal, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setReading(false);
      return;
    }
    setReading(true);
    let res: Awaited<ReturnType<typeof previewImport>>;
    try {
      res = await previewImport(trimmed, { signal });
    } catch {
      res = { ok: false, error: 'not-a-backup' };
    }
    if (!current(gen)) return;
    setReading(false);
    if (res.ok) {
      setCandidate({ gen, text: trimmed, preview: res });
      announce(previewLine(res));
    } else {
      setError(importErrorText(res.error));
    }
  };

  /** A clipboard answer for the selection `gen`: described if it is still current and has text. */
  function takeClip(gen: number, signal: AbortSignal, value: string | null) {
    if (!current(gen)) return;
    if (value && value.trim()) {
      setText(value.trim());
      void describe(gen, signal, value);
    } else {
      setReading(false);
    }
  }

  /** Starts the read inside her tap. */
  const paste = () => {
    const { gen, signal } = select();
    setText('');
    setReading(true);
    void readClipboard().then((t) => takeClip(gen, signal, t));
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const { gen, signal } = select();
    // A chosen file's text is kept out of the text box: a backup file is long.
    setText('');
    setReading(true);
    // A file past the import bound is refused by its size, before it is read (P-persistence-06).
    const read = await readImportFile(file, { signal });
    if (!current(gen)) return;
    if (!read.ok || !read.text.trim()) {
      setReading(false);
      setError(!read.ok && read.error === 'too-large' ? ERRORS.tooLarge : ERRORS.notBackup);
      return;
    }
    await describe(gen, signal, read.text);
  };

  /** Imports exactly what `cand` described, and nothing else (WP-A6). */
  const doImport = async (cand: Candidate, withoutUndo = false) => {
    if (!current(cand.gen)) return;
    importing.current?.abort();
    const ctl = new AbortController();
    importing.current = ctl;
    setBusy(true);
    let res: ReplaceResult;
    try {
      res = await applyImport(cand.text, { withoutUndo, signal: ctl.signal });
    } catch {
      // The store answers with results; a rejection all the same committed nothing (data-d12).
      res = { ok: false, error: 'not-saved' };
    }
    if (importing.current === ctl) importing.current = null;
    // Let go meanwhile (closed, or another backup chosen): whatever it answered, it is over.
    if (!res.ok && (ctl.signal.aborted || !current(cand.gen))) return;
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'no-undo') {
        setAskNoUndo(cand);
        return;
      }
      setAskNoUndo(null);
      const text = replaceErrorText(res.error);
      if (text) setError(text);
      return;
    }
    // Committed: it says so, even if she had begun choosing another backup meanwhile.
    setAskNoUndo(null);
    onClose();
    toastImported(res.undo);
    onImported?.(res);
  };

  const inDemo = demoMode.value;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        size="md"
        footer={
          candidate ? (
            <div class={s.actions}>
              <Button size="lg" block loading={busy || replacing.value} onClick={() => void doImport(candidate)} data-autofocus>
                {DATA.importButton}
              </Button>
              <Button variant="secondary" size="lg" block onClick={onClose}>
                {DATA.keep}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div class={s.stack}>
          {inDemo && <p class={s.helper}>{DATA_COPY.inDemo}</p>}
          <div class={s.actions}>
            <Button variant="secondary" icon="upload" onClick={() => fileInput.current?.click()} disabled={inDemo}>
              {DATA_COPY.chooseFile}
            </Button>
            <Button variant="secondary" icon="import" onClick={paste} disabled={inDemo} data-autofocus={clip ? '' : undefined}>
              {INSTALL.paste}
            </Button>
            <input ref={fileInput} class={s.hiddenInput} type="file" accept=".json,.txt,application/json,text/plain" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e)} />
          </div>
          <TextArea
            label={DATA_COPY.pasteLabel}
            hint={DATA_COPY.pasteHelper}
            value={text}
            rows={3}
            maxRows={6}
            disabled={inDemo}
            spellcheck={false}
            autoCapitalize="off"
            autoComplete="off"
            onValue={(v) => {
              const { gen, signal } = select();
              setText(v);
              void describe(gen, signal, v);
            }}
          />
          {reading && <p class={s.helper}>{DATA_COPY.reading}</p>}
          {error && (
            <p class={s.error} role="alert">
              {error}
            </p>
          )}
          {candidate && (
            <div class={s.previewCard} role="status">
              <strong>{previewLine(candidate.preview)}</strong>
            </div>
          )}
        </div>
      </Sheet>
      <ConfirmDialog
        open={askNoUndo !== null}
        title={DATA_COPY.noUndoTitle}
        message={DATA_COPY.noUndo}
        confirmLabel={DATA_COPY.importAnyway}
        cancelLabel={DATA.keep}
        tone="danger"
        busy={busy}
        onConfirm={() => askNoUndo && void doImport(askNoUndo, true)}
        onCancel={() => setAskNoUndo(null)}
      />
    </>
  );
}

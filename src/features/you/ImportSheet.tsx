/**
 * "Import a backup" (VOICE §21): choose a backup file, paste a CK1 backup, or (in the installed
 * app) "Paste my plants" straight from the clipboard. The backup is described before anything
 * changes ("This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20."), then "Import"
 * replaces what's here (never a merge) and "Undo import" stands for 24 hours. When no undo copy
 * could be kept, she is asked once more ('no-undo').
 *
 * Shared by You › Data, the install gate and onboarding's first step.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { DATA, ERRORS, INSTALL, fillLine } from '@/catalog/lines';
import { num } from '@/catalog/format';
import { dayOf } from './when';
import { applyImport, demoMode, previewImport, undoImport } from '@/state/store';
import type { ImportPreview } from '@/state/api';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { TextArea } from '@/ui/TextField';
import { toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { DATA_COPY } from './copy';
import { readClipboard, readFileText } from './files';
import s from './You.module.css';

/** The words for an import that can't go ahead (VOICE §18). */
export function importErrorText(error: string): string {
  switch (error) {
    case 'made-by-newer-version':
      return ERRORS.newerBackup;
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

/** "Imported. You can undo this for 24 hours." with "Undo import" on the note. */
export function toastImported(onUndone?: () => void): void {
  toast({
    key: 'imported',
    message: DATA.imported,
    tone: 'sage',
    duration: 8000,
    action: {
      label: DATA.undoImport,
      onAction: () =>
        void undoImport().then((ok) => {
          if (ok) {
            toast({ key: 'import-undone', message: DATA.undone, tone: 'sage' });
            onUndone?.();
          }
        }),
    },
  });
}

export interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  /** After a backup was imported (the sheet has closed). */
  onImported?: () => void;
  /**
   * "Paste my plants": the clipboard read that the tap opening the sheet started (iPhone Safari
   * only reads it inside a tap). Its text is described as soon as it arrives; if it can't be
   * read, the sheet's own "Paste my plants" button has the focus.
   */
  clip?: Promise<string | null> | null;
  /** The sheet's title (default "Import a backup"). */
  title?: string;
}

export function ImportSheet({ open, onClose, onImported, clip, title = DATA.import }: ImportSheetProps) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askNoUndo, setAskNoUndo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!open) return;
    setText('');
    setPreview(null);
    setError(null);
    setBusy(false);
    if (clip) void clip.then(take);
  }, [open]);

  const describe = async (value: string) => {
    const mine = ++run.current;
    setError(null);
    setPreview(null);
    const trimmed = value.trim();
    if (!trimmed) return;
    const res = await previewImport(trimmed);
    if (mine !== run.current) return;
    if (res.ok) {
      setPreview(res);
      announce(previewLine(res));
    } else {
      setError(importErrorText(res.error));
    }
  };

  function take(text: string | null) {
    if (text && text.trim()) {
      pending.current = null;
      setText(text.trim());
      void describe(text);
    }
  }

  /** Starts the read inside her tap. */
  const paste = () => void readClipboard().then(take);

  /** A chosen file's text (kept out of the text box: a backup file is long). */
  const pending = useRef<string | null>(null);

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const body = await readFileText(file).catch(() => '');
    pending.current = body;
    setText('');
    if (!body.trim()) {
      setPreview(null);
      setError(ERRORS.notBackup);
      return;
    }
    void describe(body);
  };

  const source = () => pending.current ?? text;

  const doImport = async (withoutUndo = false) => {
    setBusy(true);
    const res = await applyImport(source().trim(), { withoutUndo });
    setBusy(false);
    if (!res.ok) {
      if (res.error === 'no-undo') {
        setAskNoUndo(true);
        return;
      }
      setError(importErrorText(res.error));
      return;
    }
    setAskNoUndo(false);
    pending.current = null;
    onClose();
    toastImported();
    onImported?.();
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
          preview ? (
            <div class={s.actions}>
              <Button size="lg" block loading={busy} onClick={() => void doImport()} data-autofocus>
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
              pending.current = null;
              setText(v);
              void describe(v);
            }}
          />
          {error && (
            <p class={s.error} role="alert">
              {error}
            </p>
          )}
          {preview && (
            <div class={s.previewCard} role="status">
              <strong>{previewLine(preview)}</strong>
            </div>
          )}
        </div>
      </Sheet>
      <ConfirmDialog
        open={askNoUndo}
        title={DATA_COPY.noUndoTitle}
        message={DATA_COPY.noUndo}
        confirmLabel={DATA_COPY.importAnyway}
        cancelLabel={DATA.keep}
        tone="danger"
        busy={busy}
        onConfirm={() => void doImport(true)}
        onCancel={() => setAskNoUndo(false)}
      />
    </>
  );
}

/**
 * "Add a note" (VOICE §5): a line about the day, kept as a Moment on the habit. Placeholder "A line
 * about today", button "Save note", and the note "Noted." once it is kept. An empty note removes
 * the one that was there. Closing it with a changed line (Esc, the scrim, Close, a pull down) asks
 * first, in the Habit Editor's words: "Keep editing" is the default, and Esc (WP-C2, DEC-E8).
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CHECKIN_TOASTS, DATA_COPY, EDITOR_COPY, NOTE_COPY as N, TODAY_LINES, fillLine } from '@/catalog/lines';
import { longDateLabel } from '@/catalog/formatCore';
import { limitNote, MAX_NOTE_LENGTH } from '@/domain/noteText';
import { readOnly, saveEpoch, setNote, state } from '@/state/store';
import type { DateKey } from '@/state/types';
import { Sheet } from '@/ui/Sheet';
import { TextArea } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { toast } from '@/ui/toast';
import s from './TodaySheets.module.css';

export interface NoteTarget {
  habitId: string;
  habitName: string;
  date: DateKey;
  note: string | null;
}

/** A note is a line, not a diary: kept to this many characters. */
export const NOTE_MAX = MAX_NOTE_LENGTH;
export const noteDateLabel = (date: DateKey): string => `${longDateLabel(date)}, ${date.slice(0, 4)}`;

export function NoteSheet({ target, onClose }: { target: NoteTarget | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeQuotes, setRemoveQuotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(saveEpoch.peek());
  useLayoutEffect(() => {
    if (target) setText(target.note ?? '');
    setLeaving(false);
    setRemoving(false);
    setRemoveQuotes(false);
    setError(null);
    epoch.current = saveEpoch.peek();
  }, [target?.habitId, target?.date]);

  // Changed from what the day holds: what Save would write differs from what is there.
  const dirty = target !== null && limitNote(text.trim()) !== (target.note ?? '').trim();
  const close = () => {
    if (dirty) setLeaving(true);
    else onClose();
  };

  const apply = (value: string, redact = false) => {
    if (!target) return;
    if (!setNote(target.habitId, target.date, value, { removeQuotes: redact, epoch: epoch.current })) {
      setRemoving(false);
      setError(epoch.current !== saveEpoch.peek() ? N.replaced : readOnly.value ? DATA_COPY.readOnly : N.refused);
      return;
    }
    if (value) toast({ key: `noted-${target.habitId}`, message: CHECKIN_TOASTS.noted, tone: 'sage' });
    setRemoving(false);
    onClose();
  };
  const askToRemove = () => {
    setRemoveQuotes(false);
    setRemoving(true);
  };
  const save = () => {
    if (!target) return;
    if (!text.trim() && target.note) askToRemove();
    else apply(limitNote(text.trim()));
  };
  const date = target ? noteDateLabel(target.date) : '';
  const title = target ? fillLine(N.title, { habit: target.habitName, date }) : '';
  const quoted = target && state.value.inbox.some((l) => l.kind === 'weekly' && l.quote?.habitId === target.habitId && l.quote.date === target.date);

  // The question is a sibling of the sheet, not inside it (as in the Habit Editor's host).
  return (
    <>
      <Sheet
        open={target !== null}
        onClose={close}
        title={title}
        detents={['content']}
        size="sm"
        initialFocus="textarea"
        footer={
          <div class={s.noteForm}>
            <Button block size="lg" onClick={save}>{TODAY_LINES.saveNote}</Button>
            {target?.note && <Button block variant="quiet" onClick={askToRemove}>{N.remove}</Button>}
          </div>
        }
      >
        <form
          class={s.noteForm}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <TextArea label={title} hideLabel value={text} onValue={(v) => setText(limitNote(v))} placeholder={N.placeholder} rows={3} maxRows={6} enterkeyhint="done" />
          {error && <p role="alert">{error}</p>}
        </form>
      </Sheet>
      <ConfirmDialog
        open={removing && target !== null}
        title={N.removeTitle}
        message={<>
          {target && fillLine(N.removeText, { habit: target.habitName, date })}
          {quoted && <label class={s.noteChoice}><input type="checkbox" checked={removeQuotes} onChange={(e) => setRemoveQuotes(e.currentTarget.checked)} />{N.removeQuotes}</label>}
          <span class={s.noteCopies}>{N.copies}</span>
        </>}
        tone="danger"
        confirmLabel={N.remove}
        cancelLabel={EDITOR_COPY.keepEditing}
        onCancel={() => setRemoving(false)}
        onConfirm={() => apply('', removeQuotes)}
      />
      <ConfirmDialog
        open={leaving && target !== null}
        title={EDITOR_COPY.leaveTitle}
        message={EDITOR_COPY.leaveEdit}
        tone="danger"
        confirmLabel={EDITOR_COPY.leave}
        cancelLabel={EDITOR_COPY.keepEditing}
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setLeaving(false);
          onClose();
        }}
      />
    </>
  );
}

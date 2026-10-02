/**
 * A dated note (VOICE §5), shared by Today, Moments and Calendar. Remove, or saving an emptied
 * kept note, asks first and offers reference-based Sunday Note redaction. Closing with changes
 * still asks in the Habit Editor's words (WP-C2). Drafts keep their save identity (WP-C6).
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

export function NoteSheet({ target, onClose, onFocusLost }: { target: NoteTarget | null; onClose: () => void; /** Return to the note's context if removal also removed the opener. */ onFocusLost?: () => void }) {
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeQuotes, setRemoveQuotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(saveEpoch.peek());
  const composing = useRef(false);
  useLayoutEffect(() => {
    if (target) setText(target.note ?? '');
    setLeaving(false);
    setRemoving(false);
    setRemoveQuotes(false);
    setError(null);
    composing.current = false;
    epoch.current = saveEpoch.peek();
  }, [target?.habitId, target?.date]);

  // Changed from what the day holds: what Save would write differs from what is there.
  const dirty = target !== null && limitNote(text.trim()) !== (target.note ?? '').trim();
  const close = () => {
    if (dirty) setLeaving(true);
    else onClose();
  };

  const apply = (value: string, redact = false) => {
    if (!target || composing.current) return;
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
  const returnFocus = () => {
    // A removal closes two layers. Either can finish first: the last one returns the context
    // only if its normal focus return had no surviving opener. Never move a user's new focus.
    if (!target && document.activeElement === document.body) onFocusLost?.();
  };

  // The question is a sibling of the sheet, not inside it (as in the Habit Editor's host).
  return (
    <>
      <Sheet
        open={target !== null}
        onClose={close}
        onClosed={returnFocus}
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
          <TextArea
            label={title}
            hideLabel
            value={text}
            onValue={setText}
            // Normalize the DOM too: a clipped keystroke can leave the state unchanged, so Preact
            // may not render again. Never rewrite the field while an IME is composing a grapheme.
            onInputCapture={(e) => {
              if (!composing.current && !(e as InputEvent).isComposing) e.currentTarget.value = limitNote(e.currentTarget.value);
            }}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(e) => {
              composing.current = false;
              e.currentTarget.value = limitNote(e.currentTarget.value);
              setText(e.currentTarget.value);
            }}
            placeholder={N.placeholder}
            rows={3}
            maxRows={6}
            enterkeyhint="done"
          />
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
        onClosed={returnFocus}
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
        onClosed={returnFocus}
        onConfirm={() => {
          setLeaving(false);
          onClose();
        }}
      />
    </>
  );
}

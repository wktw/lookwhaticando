/**
 * "Add a note" (VOICE §5): a line about the day, kept as a Moment on the habit. Placeholder "A line
 * about today", button "Save note", and the note "Noted." once it is kept. An empty note removes
 * the one that was there. Closing it with a changed line (Esc, the scrim, Close, a pull down) asks
 * first, in the Habit Editor's words: "Keep editing" is the default, and Esc (WP-C2, DEC-E8).
 */
import { useEffect, useState } from 'preact/hooks';
import { CHECKIN_TOASTS, EDITOR_COPY, TODAY_LINES, fillLine } from '@/catalog/lines';
import { setNote } from '@/state/store';
import type { DateKey } from '@/state/types';
import { Sheet } from '@/ui/Sheet';
import { TextArea } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { toast } from '@/ui/toast';
import { TODAY_COPY } from './copy';
import s from './TodaySheets.module.css';

export interface NoteTarget {
  habitId: string;
  habitName: string;
  date: DateKey;
  note: string | null;
}

/** A note is a line, not a diary: kept to this many characters. */
export const NOTE_MAX = 280;

export function NoteSheet({ target, onClose }: { target: NoteTarget | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (target) setText(target.note ?? '');
    setLeaving(false);
  }, [target?.habitId, target?.date]);

  // Changed from what the day holds: what Save would write differs from what is there.
  const dirty = target !== null && text.trim() !== (target.note ?? '').trim();
  const close = () => {
    if (dirty) setLeaving(true);
    else onClose();
  };

  const save = () => {
    if (!target) return;
    setNote(target.habitId, target.date, text.trim());
    if (text.trim()) toast({ key: `noted-${target.habitId}`, message: CHECKIN_TOASTS.noted, tone: 'sage' });
    onClose();
  };

  // The question is a sibling of the sheet, not inside it (as in the Habit Editor's host).
  return (
    <>
      <Sheet
        open={target !== null}
        onClose={close}
        title={target ? fillLine(TODAY_COPY.noteTitle, { habit: target.habitName }) : ''}
        detents={['content']}
        size="sm"
        initialFocus="textarea"
        footer={
          <Button block size="lg" onClick={save}>
            {TODAY_LINES.saveNote}
          </Button>
        }
      >
        <form
          class={s.noteForm}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <TextArea label={target ? fillLine(TODAY_COPY.noteTitle, { habit: target.habitName }) : ''} hideLabel value={text} onValue={setText} placeholder={TODAY_LINES.notePlaceholder} rows={3} maxRows={6} maxLength={NOTE_MAX} enterkeyhint="done" />
        </form>
      </Sheet>
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

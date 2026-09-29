/**
 * "Add a note" (VOICE §5): a line about the day, kept as a Moment on the habit. Placeholder "A line
 * about today", button "Save note", and the note "Noted." once it is kept. An empty note removes
 * the one that was there.
 */
import { useEffect, useState } from 'preact/hooks';
import { CHECKIN_TOASTS, TODAY_LINES, fillLine } from '@/catalog/lines';
import { setNote } from '@/state/store';
import type { DateKey } from '@/state/types';
import { Sheet } from '@/ui/Sheet';
import { TextArea } from '@/ui/TextField';
import { Button } from '@/ui/Button';
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
  useEffect(() => {
    if (target) setText(target.note ?? '');
  }, [target?.habitId, target?.date]);

  const save = () => {
    if (!target) return;
    setNote(target.habitId, target.date, text.trim());
    if (text.trim()) toast({ key: `noted-${target.habitId}`, message: CHECKIN_TOASTS.noted, tone: 'sage' });
    onClose();
  };

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
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
  );
}

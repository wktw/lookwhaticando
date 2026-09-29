/**
 * What arrives on the sill opens here (DESIGN §13, §14.1): the Sunday Note, the Herbarium page and the
 * moving-in anniversary (a simple reader; closing it files the letter on the memory shelf), and the
 * stories on a plant tag (opening one marks it read; "Why it matters" asks its question once).
 */
import { useEffect, useState } from 'preact/hooks';
import { NoteCard, Pressing } from '@/art/progress';
import { PROGRESS_LINES, STORIES, capitalise, fillLine, numberWord, plantPhrase } from '@/catalog/lines';
import { monthDayLabel } from '@/domain/dates';
import type { StoryId } from '@/state/types';
import { memoryShelfView, selectHabitDetail } from '@/state/selectors';
import { answerWhy, dismissLetter, readStory, state } from '@/state/store';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { TextArea } from '@/ui/TextField';
import { toast } from '@/ui/toast';
import { letterText } from './letterText';
import { TODAY_COPY } from './copy';
import s from './TodaySheets.module.css';

/** "Why it matters" is kept to this many characters (DESIGN §5.1). */
export const WHY_MAX = 140;

export function LetterSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const v = id ? memoryShelfView.value.items.find((x) => x.id === id) : undefined;
  const text = v ? letterText(state.value, v) : null;
  const close = () => {
    if (id) {
      dismissLetter(id);
      toast({ key: 'letter-filed', message: fillLine(TODAY_COPY.filed, { shelf: PROGRESS_LINES.memoryShelf }), tone: 'butter' });
    }
    onClose();
  };
  return (
    <Sheet
      open={!!v}
      onClose={close}
      title={text?.title ?? ''}
      detents={['content']}
      size="md"
      footer={
        <Button block size="lg" onClick={close}>
          {TODAY_COPY.putAway}
        </Button>
      }
    >
      {text && v && (
        <article class={s.letter}>
          <div class={s.letterArt} aria-hidden="true">
            <NoteCard kind={v.kind} size={72} {...(text.pressings ? { pressings: text.pressings.slice(0, 3) } : {})} />
          </div>
          <div class={s.letterBody}>
            {text.pressings && text.pressings.length > 0 && (
              <ul class={s.pressings}>
                {text.pressings.map((p) => (
                  <li key={p.habitId} class={s.pressing}>
                    <Pressing species={p.species} share={p.share} rests={p.rests} size={84} />
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {text.lines.map((l, i) => (
              <p key={i} class={l.small ? s.small : undefined}>
                {l.text}
              </p>
            ))}
          </div>
        </article>
      )}
    </Sheet>
  );
}

export interface StoryTarget {
  habitId: string;
  petId: string;
  story: StoryId;
}

export function StorySheet({ target, onClose }: { target: StoryTarget | null; onClose: () => void }) {
  const detail = target ? selectHabitDetail(target.habitId).value : null;
  const [why, setWhy] = useState('');
  const [asking] = useState(() => !!detail?.companion?.askWhy);
  useEffect(() => {
    if (target) readStory(target.habitId, target.story);
    setWhy('');
  }, [target?.habitId, target?.story]);

  const habit = detail?.habit;
  const c = detail?.companion;
  const name = target ? (state.value.pets[target.petId]?.name ?? '') : '';
  let body: string | null = null;
  if (target && habit && c) {
    const plant = plantPhrase(habit.name, habit.plant);
    const base = { name, habit: habit.name, plant, Plant: capitalise(plant), date: monthDayLabel(c.since), Count: numberWord(Math.max(1, c.waterings), true) };
    if (target.story === 'start') body = fillLine(STORIES.start, base);
    else if (target.story === 'lookAtUs') body = c.moment ? fillLine(STORIES.lookAtUs.withMoment, { ...base, momentDate: monthDayLabel(c.moment.date), moment: c.moment.text }) : fillLine(STORIES.lookAtUs.withoutMoment, base);
    else body = (c.askWhy || asking || !habit.why) ? fillLine(STORIES.why.ask, base) : fillLine(STORIES.why.kept, { why: habit.why });
  }
  // Asked once; while nothing is kept yet, the field stays (a "Not now" earlier doesn't close the story).
  // Closing the sheet any other way (Esc, a swipe, the backdrop) leaves the question waiting; only
  // "Not now" answers it.
  const askNow = target?.story === 'why' && !!c && (c.askWhy || !habit?.why);
  const answer = (text: string | null) => {
    if (target) answerWhy(target.habitId, text);
    onClose();
  };

  return (
    <Sheet
      open={!!target && !!body}
      onClose={onClose}
      title={target ? STORIES.titles[target.story] : ''}
      detents={['content']}
      size="sm"
      footer={
        askNow ? (
          <div class={s.actions}>
            <Button onClick={() => answer(why.trim() || null)}>{STORIES.why.keep}</Button>
            <Button variant="quiet" onClick={() => answer(null)}>
              {STORIES.why.notNow}
            </Button>
          </div>
        ) : (
          <Button block onClick={onClose}>
            {TODAY_COPY.close}
          </Button>
        )
      }
    >
      <article class={s.letter}>
        <div class={s.letterArt} aria-hidden="true">
          <NoteCard kind="story" size={64} />
        </div>
        <div class={s.letterBody}>
          <p>{body}</p>
        </div>
        {askNow && <TextArea label={STORIES.titles.why} hideLabel value={why} onValue={setWhy} placeholder={STORIES.why.placeholder} rows={2} maxLength={WHY_MAX} />}
      </article>
    </Sheet>
  );
}

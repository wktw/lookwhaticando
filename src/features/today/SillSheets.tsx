/**
 * The stories on a plant tag open here (DESIGN §14.1): opening one marks it read; "Why it matters"
 * asks its question once. The Sunday Note, the Herbarium page and the anniversary open in the ritual
 * reader (`openRitual`, src/features/rituals), which the shell mounts.
 */
import { useEffect, useState } from 'preact/hooks';
import { NoteCard } from '@/art/progress';
import { STORIES, capitalise, fillLine, numberWord, plantPhrase } from '@/catalog/lines';
import { monthDayLabel } from '@/domain/dates';
import type { StoryId } from '@/state/types';
import { selectHabitDetail } from '@/state/selectors';
import { answerWhy, readStory, state } from '@/state/store';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { TextArea } from '@/ui/TextField';
import { toast } from '@/ui/toast';
import { TODAY_COPY } from './copy';
import s from './TodaySheets.module.css';

/** "Why it matters" is kept to this many characters (DESIGN §5.1). */
export const WHY_MAX = 140;

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

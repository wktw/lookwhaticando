/**
 * Habit Detail's actions (DESIGN §9.2, VOICE.md §5, §12, §21): Edit · Pause "Back on…" · Bring it
 * back · Start tracking from… · Archive · Delete → "Keep the plant on the balcony shelf?" · Tune my
 * habits (the fresh-start chips for this habit, anytime). An archived habit offers to come back to
 * the sill. Every consequence is said before it happens; nothing is "Are you sure?".
 */
import { useState } from 'preact/hooks';
import { CHECKIN_TOASTS, DATA, SEASON_REVIEW, TODAY_LINES, fillLine } from '@/catalog/lines';
import { addDays, monthDayLabel } from '@/domain/dates';
import type { FreshStartChoice } from '@/domain/seasonReview';
import { earliestStartedOn } from '@/domain/habits';
import { tuneView, type HabitDetailVM } from '@/state/selectors';
import { archiveHabit, deleteHabit, pauseHabit, restoreHabit, resumeHabit, setStartedOn, today, tuneHabits } from '@/state/store';
import { openHabitEditor } from '@/features/habits/open';
import { SEASON_LABEL } from '@/features/rituals/words';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { haptic } from '@/fx/haptics';
import { cx } from '@/ui/cx';
import { DETAIL_UI as D } from '@/features/progress/copy';
import { DetailSection } from './Parts';
import s from './HabitDetail.module.css';

type Panel = null | 'pause' | 'start' | 'tune';
type Ask = null | 'archive' | 'delete';

/** "Archive Walk? The plant moves…" → the question as the title, the consequence as the message. */
function splitQuestion(line: string): [string, string] {
  const i = line.indexOf('? ');
  return i < 0 ? [line, ''] : [line.slice(0, i + 1), line.slice(i + 2)];
}

export function Actions({ vm, onGone }: { vm: HabitDetailVM; onGone: () => void }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const t = today.value;
  const [backOn, setBackOn] = useState(addDays(t, 7));
  const [open, setOpen] = useState(false);
  const [startFrom, setStartFrom] = useState(addDays(vm.habit.startedOn, -7));
  const h = vm.habit;
  const toggle = (p: Panel) => setPanel(panel === p ? null : p);

  if (vm.archived) {
    return (
      <DetailSection id="actions" title={D.sections.actions}>
        <div class={s.actions}>
          <Button
            icon="undo"
            onClick={() => {
              restoreHabit(h.id);
              haptic('success');
              toast({ message: fillLine(DATA.restored, { habit: h.name }) });
            }}
          >
            {D.actions.restore}
          </Button>
          <Button variant="quiet" icon="trash" onClick={() => setAsk('delete')}>
            {D.actions.delete}
          </Button>
        </div>
        <DeleteFlow ask={ask} setAsk={setAsk} vm={vm} onGone={onGone} archived />
      </DetailSection>
    );
  }

  const pause = () => {
    if (open) {
      pauseHabit(h.id, t);
      toast({ message: fillLine(CHECKIN_TOASTS.pausedOpen, { habit: h.name }) });
    } else {
      if (!backOn || backOn <= t) return;
      pauseHabit(h.id, t, addDays(backOn, -1));
      toast({ message: fillLine(CHECKIN_TOASTS.paused, { habit: h.name, date: monthDayLabel(backOn) }) });
    }
    haptic('light');
    setPanel(null);
  };

  return (
    <DetailSection id="actions" title={D.sections.actions}>
      <div class={s.actions}>
        <Button variant="secondary" icon="edit" onClick={() => openHabitEditor({ id: h.id })}>
          {D.actions.edit}
        </Button>
        {vm.pause.paused ? (
          <Button
            variant="secondary"
            icon="play"
            onClick={() => {
              resumeHabit(h.id);
              haptic('success');
              toast({ message: fillLine(CHECKIN_TOASTS.resumed, { habit: h.name }) });
            }}
          >
            {D.actions.bringBack}
          </Button>
        ) : (
          // The visible word is short so a long name isn't cut; the whole line is its accessible name.
          <Button variant="secondary" icon="pause" aria-expanded={panel === 'pause'} aria-label={fillLine(D.actions.pause, { habit: h.name })} onClick={() => toggle('pause')}>
            {D.actions.pauseShort}
          </Button>
        )}
        <Button variant="secondary" icon="calendar" aria-expanded={panel === 'start'} onClick={() => toggle('start')}>
          {D.actions.startFrom}
        </Button>
        {vm.tune && (
          <Button variant="secondary" icon="wand" aria-expanded={panel === 'tune'} onClick={() => toggle('tune')}>
            {D.actions.tune}
          </Button>
        )}
      </div>

      {panel === 'pause' && (
        <form
          class={s.panel}
          onSubmit={(e) => {
            e.preventDefault();
            pause();
          }}
        >
          <label class={s.field}>
            <span class={s.fieldLabel}>{D.actions.backOnLabel}</span>
            <input class={s.date} type="date" value={backOn} min={addDays(t, 1)} disabled={open} onInput={(e) => setBackOn((e.target as HTMLInputElement).value)} />
          </label>
          <label class={s.check}>
            <input type="checkbox" checked={open} onChange={(e) => setOpen((e.target as HTMLInputElement).checked)} />
            <span>{D.actions.pauseOpen}</span>
          </label>
          <div class={s.offerButtons}>
            <Button size="sm" type="submit" aria-label={fillLine(D.actions.pause, { habit: h.name })}>
              {D.actions.pauseShort}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setPanel(null)}>
              {D.actions.cancel}
            </Button>
          </div>
        </form>
      )}

      {panel === 'start' && (
        <form
          class={s.panel}
          onSubmit={(e) => {
            e.preventDefault();
            if (!startFrom || startFrom >= h.startedOn || startFrom < earliestStartedOn(t)) return;
            setStartedOn(h.id, startFrom);
            haptic('light');
            announce(fillLine(TODAY_LINES.startFrom, { date: monthDayLabel(startFrom) }));
            setPanel(null);
          }}
        >
          <label class={s.field}>
            <span class={s.fieldLabel}>{D.actions.startFromLabel}</span>
            <input class={s.date} type="date" value={startFrom} min={earliestStartedOn(t)} max={addDays(h.startedOn, -1)} onInput={(e) => setStartFrom((e.target as HTMLInputElement).value)} />
          </label>
          <p class={s.help}>{TODAY_LINES.historyNote}</p>
          <div class={s.offerButtons}>
            <Button size="sm" type="submit" disabled={!startFrom || startFrom >= h.startedOn || startFrom < earliestStartedOn(t)}>
              {fillLine(TODAY_LINES.startFrom, { date: startFrom ? monthDayLabel(startFrom) : '' })}
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setPanel(null)}>
              {D.actions.cancel}
            </Button>
          </div>
        </form>
      )}

      {panel === 'tune' && vm.tune && <Tune vm={vm} onDone={() => setPanel(null)} />}

      <div class={cx(s.actions, s.quietActions)}>
        <Button variant="quiet" icon="archive" onClick={() => setAsk('archive')}>
          {D.actions.archive}
        </Button>
        <Button variant="quiet" icon="trash" onClick={() => setAsk('delete')}>
          {D.actions.delete}
        </Button>
      </div>

      <ConfirmDialog
        open={ask === 'archive'}
        title={splitQuestion(fillLine(DATA.archive, { habit: h.name }))[0]}
        message={splitQuestion(fillLine(DATA.archive, { habit: h.name }))[1]}
        confirmLabel={D.actions.confirmArchive}
        cancelLabel={D.actions.cancel}
        onConfirm={() => {
          archiveHabit(h.id);
          haptic('light');
          setAsk(null);
        }}
        onCancel={() => setAsk(null)}
      />
      <DeleteFlow ask={ask} setAsk={setAsk} vm={vm} onGone={onGone} />
    </DetailSection>
  );
}

/**
 * Delete asks once. A habit on the sill goes straight to "Keep the plant on the balcony shelf?"
 * (keep it there, or delete everything); an archived habit's plant is already on the balcony, so it
 * gets the plain "Delete {habit}? The plant and its history go too."
 */
function DeleteFlow({ ask, setAsk, vm, onGone, archived = false }: { ask: Ask; setAsk: (a: Ask) => void; vm: HabitDetailVM; onGone: () => void; archived?: boolean }) {
  const h = vm.habit;
  const [q, msg] = splitQuestion(fillLine(DATA.delete, { habit: h.name }));
  const gone = (keepPlant: boolean) => {
    setAsk(null);
    onGone();
    deleteHabit(h.id, { keepPlant });
    haptic('light');
  };
  return (
    <>
      <ConfirmDialog
        open={archived && ask === 'delete'}
        title={q}
        message={msg}
        tone="danger"
        confirmLabel={D.actions.delete}
        cancelLabel={D.actions.cancel}
        onConfirm={() => gone(false)}
        onCancel={() => setAsk(null)}
      />
      <Sheet open={!archived && ask === 'delete'} onClose={() => setAsk(null)} title={DATA.keepPlant} hideTitle size="sm" role="alertdialog" showClose={false} initialFocus="[data-keep]">
        <div class={s.keep}>
          <p class={s.keepTitle} aria-hidden="true">
            {DATA.keepPlant}
          </p>
          <Button size="lg" block onClick={() => gone(true)} data-keep>
            {DATA.keepOnBalcony}
          </Button>
          <Button size="lg" block variant="danger" onClick={() => gone(false)}>
            {DATA.deleteEverything}
          </Button>
          <Button size="lg" block variant="quiet" onClick={() => setAsk(null)}>
            {D.actions.cancel}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** "Tune my habits" for this habit (§14.3): Keep going · Tinier · Grow · Rest till next season · Finish. */
function Tune({ vm, onDone }: { vm: HabitDetailVM; onDone: () => void }) {
  const opts = vm.tune!;
  const season = tuneView.value.season;
  const [choice, setChoice] = useState<FreshStartChoice>('keep');
  const C = SEASON_REVIEW.chips;
  const H = SEASON_REVIEW.chipHelp;
  const seasonWord = SEASON_LABEL[season.name].toLowerCase();
  const chips: { id: FreshStartChoice; label: string; help: string }[] = [
    { id: 'keep', label: C.keep, help: H.keep },
    ...(opts.tinier ? [{ id: 'tinier' as const, label: C.tinier, help: fillLine(H.tinier, { season: seasonWord }) }] : []),
    ...(opts.grow ? [{ id: 'grow' as const, label: C.grow, help: opts.grow.pays ? H.grow : H.grow.replace(/\. \+1 stamp$/, '.') }] : []),
    { id: 'rest', label: C.rest, help: fillLine(H.rest, { date: monthDayLabel(season.nextStart) }) },
    { id: 'finish', label: C.finish, help: H.finish },
  ];
  const current = chips.find((c) => c.id === choice)!;
  const onKey = (e: KeyboardEvent) => {
    const i = chips.findIndex((c) => c.id === choice);
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const j = (i + dir + chips.length) % chips.length;
    setChoice(chips[j]!.id);
    const group = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => group.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus());
  };
  return (
    <form
      class={s.panel}
      onSubmit={(e) => {
        e.preventDefault();
        if (choice !== 'keep') {
          const [out] = tuneHabits([{ habitId: vm.habit.id, choice }]);
          if (out?.ok) {
            haptic('success');
            announce(fillLine(SEASON_REVIEW.done, { season: seasonWord }));
          }
        }
        onDone();
      }}
    >
      <div class={s.chips} role="radiogroup" aria-label={D.actions.tune} onKeyDown={onKey}>
        {chips.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={c.id === choice} tabIndex={c.id === choice ? 0 : -1} class={cx(s.chip, c.id === choice && s.chipOn)} onClick={() => setChoice(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p class={s.help} aria-live="polite">
        {current.help}
      </p>
      <div class={s.offerButtons}>
        <Button size="sm" type="submit">
          {D.actions.tune}
        </Button>
        <Button size="sm" variant="quiet" onClick={onDone}>
          {D.actions.cancel}
        </Button>
      </div>
    </form>
  );
}

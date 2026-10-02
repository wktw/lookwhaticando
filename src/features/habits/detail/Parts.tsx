/**
 * Habit Detail's sections (DESIGN §9.2, §14): the plant tag and its looks, the time nudge, the
 * Garden Journal, the stat tiles, "Why it matters", Moments, the rung ladder, the graduation
 * offers, and the companion with its three stories.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { PetArt } from '@/art/pets/PetArt';
import { CoinIcon, Icon } from '@/art/icons';
import { COMPANION, EMPTY, LOOKS, NOTE_COPY, STORIES, fillLine } from '@/catalog/lines';
import { consistencyText, num, runText } from '@/catalog/format';
import { monthDayLabel } from '@/domain/dates';
import type { HabitDetailVM } from '@/state/selectors';
import { acceptGrowOffer, answerTimeNudge, declineOffer, answerWhy, readStory, setPlantLook, starNote, state, updateHabit } from '@/state/store';
import { Button } from '@/ui/Button';
import { TextField } from '@/ui/TextField';
import { toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { cx } from '@/ui/cx';
import { haptic } from '@/fx/haptics';
import { DETAIL_UI as D, journalLine, lookName, lookTag, nudgeWords, storyRemaining, storyText, wateringsText } from '@/features/progress/copy';
import { lookArtOf } from '@/features/progress/looks';
import { HeroPlant } from './HeroPlant';
import { NoteSheet, noteDateLabel, type NoteTarget } from '@/features/today/NoteSheet';
import s from './HabitDetail.module.css';

const anchorNameOf = (id: string) => state.value.habits.find((h) => h.id === id)?.name ?? null;

export function DetailSection({ id, title, children, class: cls, focusableTitle }: { id: string; title: string; children: ComponentChildren; class?: string; focusableTitle?: boolean }) {
  return (
    <section class={cx(s.section, cls)} aria-labelledby={`detail-${id}`} data-detail={id}>
      <h3 id={`detail-${id}`} class={s.sectionTitle} tabIndex={focusableTitle ? -1 : undefined}>
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The plant tag: its look in plain words, and the chooser              */
/* ------------------------------------------------------------------ */

export function PlantTagCard({ vm }: { vm: HabitDetailVM }) {
  const { looks } = vm;
  if (looks.looks.length === 0) return null;
  const tag = looks.tag;
  const options: { index: number | null; label: string }[] = [{ index: null, label: LOOKS.classic }, ...looks.looks.map((l, i) => ({ index: i, label: lookName(l) }))];
  const pick = (index: number | null) => {
    if (index === looks.shown) return;
    if (setPlantLook(vm.habit.id, index)) haptic('light');
  };
  const onKey = (e: KeyboardEvent) => {
    const i = Math.max(0, options.findIndex((o) => o.index === looks.shown));
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const j = (i + dir + options.length) % options.length;
    pick(options[j]!.index);
    const group = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => group.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus());
  };
  return (
    <DetailSection id="tag" title={D.sections.tag} class={s.tagSection}>
      <div class={s.tag}>
        <span class={s.tagHole} aria-hidden="true" />
        {tag && <p class={s.tagWhy}>{lookTag(tag, anchorNameOf)}</p>}
        <div class={s.looks} role="radiogroup" aria-label={D.looks.label} onKeyDown={onKey}>
          {options.map((o) => {
            const on = o.index === looks.shown;
            const art = o.index === null ? undefined : lookArtOf(state.value, vm.habit.id, looks.looks[o.index]!);
            return (
              <button key={o.label + String(o.index)} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} class={cx(s.look, on && s.lookOn)} onClick={() => pick(o.index)}>
                <span class={s.lookArt} aria-hidden="true">
                  <HeroPlant species={vm.plant.species} stage={Math.max(5, vm.plant.displayStage)} blooms={vm.plant.blooms} pot={vm.plant.pot} look={art} size={44} />
                </span>
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
        <p class={s.help}>{LOOKS.helper}</p>
      </div>
    </DetailSection>
  );
}

/** "You set Walk for mornings but usually water it after 6 pm. Move it to Evening?" (offered once). */
export function NudgeCard({ vm }: { vm: HabitDetailVM }) {
  if (!vm.timeNudge || vm.archived) return null;
  const w = nudgeWords(vm.habit.name, vm.timeNudge);
  return (
    <div class={s.offer} data-detail="nudge">
      <p class={s.offerText}>{w.ask}</p>
      <div class={s.offerButtons}>
        <Button size="sm" onClick={() => answerTimeNudge(vm.habit.id, true) && haptic('light')}>
          {w.move}
        </Button>
        <Button size="sm" variant="quiet" onClick={() => answerTimeNudge(vm.habit.id, false)}>
          {w.leave}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Garden Journal, stat tiles, why, moments                             */
/* ------------------------------------------------------------------ */

export function Journal({ vm }: { vm: HabitDetailVM }) {
  // The plant tag above already says why it looks the way it does.
  const tagShown = vm.looks.looks.length > 0 && !!vm.looks.tag;
  const lines = vm.journal
    .filter((e) => !(tagShown && e.kind === 'whyItLooks'))
    .map((e) => ({ e, text: journalLine(e, anchorNameOf) })).filter((x): x is { e: (typeof vm.journal)[number]; text: string } => !!x.text);
  if (lines.length === 0) return null;
  return (
    <DetailSection id="journal" title={D.sections.journal}>
      <ul class={s.journal}>
        {lines.map(({ e, text }) => (
          <li key={e.kind} class={e.inked ? s.ink : s.pencil} data-inked={e.inked}>
            {text}
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}

export function Stats({ vm }: { vm: HabitDetailVM }) {
  const st = vm.stats;
  const weekStart = state.value.settings.weekStart;
  // "Lately" needs a little history (a day-one "1 of the last 1 day" says nothing), and a run
  // shows from 3 in a row, as on the card (§9.1.1).
  const young = st.phrase?.kind === 'days' ? st.phrase.spanDays < 7 : st.phrase?.kind === 'weekdays' ? st.phrase.expected < 3 : false;
  const phrase = st.phrase && !young ? consistencyText(st.phrase, weekStart) : null;
  const tiles: { label: string; value: string; note?: string | null }[] = [];
  if (phrase) tiles.push({ label: D.stats.lately, value: phrase });
  const current = st.current && st.current.length >= 3 ? st.current : null;
  if (current) tiles.push({ label: D.stats.now, value: runText(current, 'long') });
  else if (st.newRhythm) tiles.push({ label: D.stats.now, value: D.stats.newRhythm });
  if (st.best && st.best.length >= 3 && (!current || st.best.unit !== current.unit || st.best.length > current.length)) tiles.push({ label: D.stats.longest, value: runText(st.best, 'long') });
  if (st.total.checkins > 0) tiles.push({ label: D.stats.waterings, value: wateringsText(st.total.checkins), note: st.total.tiny > 0 ? fillLine(D.stats.tiny, { count: num(st.total.tiny) }) : fillLine(D.stats.since, { date: monthDayLabel(vm.habit.startedOn) }) });
  if (tiles.length === 0) return null;
  return (
    <DetailSection id="stats" title={D.sections.stats}>
      <dl class={s.tiles}>
        {tiles.map((t) => (
          <div key={t.label} class={s.tile}>
            <dt>{t.label}</dt>
            <dd>
              <span class={s.tileValue}>{t.value}</span>
              {t.note && <span class={s.tileNote}>{t.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
}

export function Why({ vm }: { vm: HabitDetailVM }) {
  if (!vm.why) return null;
  return (
    <DetailSection id="why" title={D.sections.why}>
      <blockquote class={s.why}>{vm.why}</blockquote>
    </DetailSection>
  );
}

export function Moments({ vm }: { vm: HabitDetailVM }) {
  const [note, setNoteTarget] = useState<NoteTarget | null>(null);
  const logs = state.value.logs[vm.habit.id] ?? {};
  return (
    <DetailSection id="moments" title={D.sections.moments} focusableTitle>
      {vm.moments.length === 0 ? (
        <p class={s.quiet}>{EMPTY.moments}</p>
      ) : (
        <>
          <ul class={s.moments}>
            {vm.moments.map((m) => {
              const starred = logs[m.date]?.starred === true;
              return (
                <li key={m.date} class={s.moment}>
                  <div class={s.momentBody}>
                    <span class={s.momentDate}>{m.label}</span>
                    <q class={s.momentText}>{m.text}</q>
                    <Button
                      variant="quiet"
                      size="sm"
                      aria-label={fillLine(NOTE_COPY.editLabel, { habit: vm.habit.name, date: noteDateLabel(m.date) })}
                      onClick={() => setNoteTarget({ habitId: vm.habit.id, habitName: vm.habit.name, date: m.date, note: logs[m.date]?.note ?? null })}
                    >{NOTE_COPY.edit}</Button>
                  </div>
                  <button
                    type="button"
                    class={cx(s.star, starred && s.starOn)}
                    aria-pressed={starred}
                    aria-label={`${D.star}, ${m.label}`}
                    title={starred ? D.starred : D.star}
                    onClick={() => {
                      if (starNote(vm.habit.id, m.date, !starred)) haptic('tick');
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                      <path d="M12 3.6l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          <p class={s.help}>{D.quoteHelp}</p>
        </>
      )}
      <NoteSheet target={note} onClose={() => setNoteTarget(null)} onFocusLost={() => document.getElementById('detail-moments')?.focus({ preventScroll: true })} />
    </DetailSection>
  );
}


/* ------------------------------------------------------------------ */
/* The rung ladder                                                      */
/* ------------------------------------------------------------------ */

export function Ladder({ vm }: { vm: HabitDetailVM }) {
  const quiet = state.value.settings.quietRewards;
  const best = vm.stats.best;
  const longest = best && best.length >= 3 ? fillLine(D.stats.longestLine, { run: runText(best, 'long') }) : null;
  // The rungs are counted in occurrences, which is what a day-based run counts (daily: "21 days
  // in a row"; certain days: "12 in a row"). A habit counted in weeks or months would read against
  // its run ("10 weeks in a row" beside a lit 14), so until the logic can say a rung in the run's
  // own unit (NOTES request 8), those habits get the longest run in words and no ladder.
  const unit = best?.unit ?? vm.stats.current?.unit ?? 'days';
  const inDays = unit === 'days' || unit === 'times';
  const reached = vm.ladder.rungs.filter((r) => r.reached).length;
  if (!inDays) {
    if (!longest) return null;
    return (
      <DetailSection id="ladder" title={D.sections.ladder}>
        <p class={s.ladderLine}>{longest}</p>
      </DetailSection>
    );
  }
  if (reached === 0) return null;
  return (
    <DetailSection id="ladder" title={D.sections.ladder}>
      {longest && <p class={s.ladderLine}>{longest}</p>}
      <p class="sr-only">{fillLine(D.ladder.reached, { count: num(reached), total: num(vm.ladder.rungs.length) })}</p>
      <ol class={s.ladder} aria-hidden="true">
        {vm.ladder.rungs.map((r) => (
          <li key={r.tier} class={cx(s.rung, r.reached && s.rungOn)}>
            <span class={s.rungDot} />
            <span class={s.rungTier}>{r.tier}</span>
            {!quiet && (
              <span class={s.rungCoins}>
                <CoinIcon size={11} />
                {r.coins}
              </span>
            )}
          </li>
        ))}
      </ol>
    </DetailSection>
  );
}

/* ------------------------------------------------------------------ */
/* Graduation: "A bigger pot?" · "Make it tinier?"                      */
/* ------------------------------------------------------------------ */

export function Offer({ vm }: { vm: HabitDetailVM }) {
  const [closed, setClosed] = useState<string | null>(null);
  if (!vm.offer || vm.archived || closed === vm.offer) return null;
  const quiet = state.value.settings.quietRewards;
  const name = vm.habit.name;
  if (vm.offer === 'grow') {
    const patch = vm.tune?.grow?.patch;
    return (
      <div class={cx(s.offer, s.offerGrow)} data-detail="grow">
        <p class={s.offerTitle}>{D.grow.title}</p>
        <p class={s.offerText}>{fillLine(quiet ? D.grow.textQuiet : D.grow.text, { habit: name })}</p>
        <div class={s.offerButtons}>
          <Button
            size="md"
            disabled={!patch}
            onClick={() => {
              if (patch && acceptGrowOffer(vm.habit.id, patch)) {
                haptic('success');
                announce(D.grow.yes);
              }
            }}
          >
            {D.grow.yes}
          </Button>
          <Button size="md" variant="quiet" onClick={() => (declineOffer(vm.habit.id, 'grow'), setClosed('grow'))}>
            {D.grow.no}
          </Button>
        </div>
      </div>
    );
  }
  const patch = vm.tune?.tinier;
  return (
    <div class={s.offer} data-detail="tinier">
      <p class={s.offerTitle}>{D.tinier.title}</p>
      <p class={s.offerText}>{D.tinier.text}</p>
      <div class={s.offerButtons}>
        <Button
          size="md"
          disabled={!patch}
          onClick={() => {
            if (!patch) return;
            updateHabit(vm.habit.id, patch, 'today');
            haptic('light');
            toast({ message: fillLine(D.tinier.done, { habit: name }) });
            setClosed('tinier');
          }}
        >
          {D.tinier.yes}
        </Button>
        <Button size="md" variant="quiet" onClick={() => (declineOffer(vm.habit.id, 'tinier'), setClosed('tinier'))}>
          {D.tinier.no}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Keeping company: the companion and its three stories                 */
/* ------------------------------------------------------------------ */

export function Company({ vm }: { vm: HabitDetailVM }) {
  const c = vm.companion;
  const [whyText, setWhyText] = useState('');
  const [openStory, setOpenStory] = useState<string | null>(null);
  if (!c) return null;
  const pet = state.value.pets[c.petId];
  if (!pet) return null;
  const habit = vm.habit;
  return (
    <DetailSection id="company" title={D.sections.company}>
      <div class={s.company}>
        <PetArt petId={pet.id} outfit={pet.outfit} size={56} pose="sit" fit />
        <div>
          <p class={s.companyName}>{pet.name}</p>
          <p class={s.companyLine}>{fillLine(COMPANION.card.keeps, { habit: habit.name })}</p>
        </div>
      </div>
      <ol class={s.stories}>
        {c.stories.map((st) => {
          const title = STORIES.titles[st.id];
          const text = storyText({ story: st, name: pet.name, habit: habit.name, plant: habit.plant, since: c.since, waterings: c.waterings, moment: c.moment, why: vm.why });
          const asking = st.id === 'why' && c.askWhy;
          const expanded = openStory === st.id || asking;
          return (
            <li key={st.id} class={cx(s.story, st.unlocked ? s.storyOpen : s.storyWaiting)} data-story={st.id}>
              {st.unlocked ? (
                <button
                  type="button"
                  class={s.storyHead}
                  aria-expanded={expanded}
                  onClick={() => {
                    setOpenStory(expanded ? null : st.id);
                    if (!st.read) readStory(habit.id, st.id);
                  }}
                >
                  <span class={s.storyTitle}>{title}</span>
                  {!st.read && <span class={s.storyNew}>{D.story.new}</span>}
                  <Icon name="chevron-down" size={18} class={s.chev} />
                </button>
              ) : (
                <div class={s.storyHead}>
                  <span class={s.storyTitle}>{title}</span>
                </div>
              )}
              {!st.unlocked && <p class={s.pencil}>{st.remaining !== null ? storyRemaining(st.remaining) : D.story.waits}</p>}
              {expanded && text && <p class={s.storyText}>{text}</p>}
              {asking && (
                <form
                  class={s.whyForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (answerWhy(habit.id, whyText.trim() || null)) {
                      haptic('light');
                      if (whyText.trim()) toast({ message: fillLine(STORIES.why.kept, { why: whyText.trim() }) });
                    }
                  }}
                >
                  <TextField label={STORIES.titles.why} hideLabel placeholder={STORIES.why.placeholder} value={whyText} onValue={setWhyText} maxLength={140} />
                  <div class={s.offerButtons}>
                    <Button size="sm" type="submit" disabled={!whyText.trim()}>
                      {STORIES.why.keep}
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => answerWhy(habit.id, null)}>
                      {STORIES.why.notNow}
                    </Button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ol>
    </DetailSection>
  );
}

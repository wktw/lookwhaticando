/**
 * The ritual reader (DESIGN §13, VOICE.md §12): a Sunday Note, a Herbarium page, the moving-in
 * anniversary note or a filed season, opened from the sill or the memory shelf. Each is a sheet of
 * paper in the narrator's voice; a Herbarium page shows each habit's pressing, sized by how often it
 * was watered and labelled in small type, with rests as small flowers and never a percentage.
 * Opening a note marks it read; it stays on the memory shelf for good.
 */
import { useEffect } from 'preact/hooks';
import { NoteCard, Pressing } from '@/art/progress';
import { PlantArt } from '@/art/plants';
import { StampIcon } from '@/art/icons';
import { routineOf } from '@/domain/routines';
import { memoryShelfView, type RitualVM } from '@/state/selectors';
import { dismissLetter, state } from '@/state/store';
import type { SeasonRecord } from '@/state/types';
import { Sheet } from '@/ui/Sheet';
import { cx } from '@/ui/cx';
import { ritualLookup } from './lookup';
import { closeRitual, type RitualRequest } from './open';
import { anniversaryWords, herbariumWords, seasonWords, sundayNoteWords, type RitualLookup } from './words';
import s from './RitualReader.module.css';

/** The Sheet's title for each kind: the note's own first line. */
const SUNDAY_NOTE_TITLE = 'Sunday Note';

export function RitualReader({ request }: { request: RitualRequest | null }) {
  const shelf = memoryShelfView.value;
  const look = ritualLookup(state.value);
  const letter = request?.kind === 'letter' ? shelf.items.find((r) => r.id === request.id) ?? null : null;
  const season = request?.kind === 'season' ? shelf.seasons.find((r) => r.key === request.key) ?? null : null;
  const open = !!(letter || season);

  // Opening it reads it (the sill's note goes; the memory shelf keeps it).
  useEffect(() => {
    if (letter && !letter.read) dismissLetter(letter.id);
  }, [letter?.id]);

  const title = letter ? titleOf(letter, look) : season ? seasonWords(season, look).title : SUNDAY_NOTE_TITLE;
  return (
    <Sheet open={open} onClose={closeRitual} title={title} hideTitle size="md" detents={['large']} peek={letter ? peekOf(letter) : undefined} class={s.sheet}>
      {letter?.kind === 'sundayNote' && <SundayNote note={letter} look={look} />}
      {letter?.kind === 'herbarium' && <HerbariumPage page={letter} look={look} />}
      {letter?.kind === 'anniversary' && <Anniversary note={letter} look={look} />}
      {season && <Season record={season} look={look} />}
    </Sheet>
  );
}

function titleOf(r: RitualVM, look: RitualLookup): string {
  if (r.kind === 'sundayNote') return SUNDAY_NOTE_TITLE;
  if (r.kind === 'herbarium') return herbariumWords(r, look).title;
  const t = anniversaryWords(r, look);
  return t.slice(0, t.indexOf('.') + 1) || t;
}

/** The small card that peeks over the sheet: the note with the week's pencil sketch, or the page. */
function peekOf(r: RitualVM) {
  if (r.kind === 'sundayNote') {
    const icon = r.ps?.kind === 'companion' ? state.value.habits.find((h) => h.id === (r.ps as { habitId: string }).habitId)?.icon : undefined;
    return <NoteCard kind="sundayNote" sketch={icon ? routineOf(icon) : undefined} size={84} />;
  }
  if (r.kind === 'herbarium') return <NoteCard kind="herbarium" size={84} pressings={r.pressings.slice(0, 3).map((p) => ({ species: p.plant, share: Math.max(0.14, p.size / 7), rests: p.rests }))} />;
  return <NoteCard kind="anniversary" size={84} />;
}

function Stamps({ line }: { line: string | null }) {
  if (!line || state.value.settings.quietRewards) return null;
  return (
    <p class={s.stamps}>
      <StampIcon size={22} />
      <span>{line}</span>
    </p>
  );
}

function SundayNote({ note, look }: { note: Extract<RitualVM, { kind: 'sundayNote' }>; look: RitualLookup }) {
  const w = sundayNoteWords(note, look);
  return (
    <article class={cx(s.paper, s.note)} data-ritual="sundayNote">
      <h2 class={s.opener}>{w.opener}</h2>
      {w.body.map((line) => (
        <p key={line} class={s.line}>
          {line}
        </p>
      ))}
      {w.quote && <p class={cx(s.line, s.quote)}>{w.quote}</p>}
      {w.ps && <p class={cx(s.line, s.ps)}>{w.ps}</p>}
      <Stamps line={w.stamps} />
    </article>
  );
}

function HerbariumPage({ page, look }: { page: Extract<RitualVM, { kind: 'herbarium' }>; look: RitualLookup }) {
  const w = herbariumWords(page, look);
  return (
    <article class={cx(s.paper, s.page)} data-ritual="herbarium">
      <h2 class={s.pageTitle}>{w.title}</h2>
      <ul class={s.pressings}>
        {w.pressings.map((p) => (
          <li key={p.habitId} class={s.pressing}>
            <Pressing species={p.plant} share={p.share} rests={p.rests} size={Math.round(84 + 44 * p.share)} />
            <span class={s.pressLabel}>{p.label}</span>
          </li>
        ))}
      </ul>
      {(w.margin.length > 0 || w.restNote) && (
        <div class={s.margin}>
          {w.margin.map((m) => (
            <p key={m}>{m}</p>
          ))}
          {w.restNote && <p class={s.foot}>{w.restNote}</p>}
        </div>
      )}
      <Stamps line={w.stamps} />
    </article>
  );
}

function Anniversary({ note, look }: { note: Extract<RitualVM, { kind: 'anniversary' }>; look: RitualLookup }) {
  const text = anniversaryWords(note, look);
  const first = note.firstHabitId ? look.habit(note.firstHabitId) : null;
  return (
    <article class={cx(s.paper, s.note)} data-ritual="anniversary">
      {first && (
        <div class={s.firstPlant} aria-hidden="true">
          <PlantArt species={first.plant} stage={0} pot="terracotta" fit="icon" withPot size={72} animated={false} />
        </div>
      )}
      <p class={cx(s.line, s.big)}>{text}</p>
    </article>
  );
}

function Season({ record, look }: { record: SeasonRecord; look: RitualLookup }) {
  const w = seasonWords(record, look);
  return (
    <article class={cx(s.paper, s.note)} data-ritual="season">
      <h2 class={s.opener}>{w.title}</h2>
      <ul class={s.seasonPlants}>
        {w.plants.map((p) => {
          const h = state.value.habits.find((x) => x.id === p.habitId);
          return (
            <li key={p.habitId}>
              <span class={s.seasonArt} aria-hidden="true">
                <PlantArt species={p.plant} stage={p.stage} pot={h?.pot ?? 'terracotta'} fit="icon" withPot size={44} animated={false} />
              </span>
              <span>{p.line}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

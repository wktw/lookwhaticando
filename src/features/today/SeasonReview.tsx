/**
 * The Season Review card (DESIGN §14.3): never modal, skippable, 15 seconds at most. A time-lapse of
 * up to 8 plants through the season just ended (counts only, never a percentage), then a fresh-start
 * chip per habit: Keep going (preselected) · Tinier · Grow · Rest till next season · Finish, and the
 * one-tap "Keep everything". "Later" files it.
 */
import { useEffect, useState } from 'preact/hooks';
import { CardPlant } from '@/art/plants/CardPlant';
import { SEASON_REVIEW, STAGE_NAMES, capitalise, fillLine } from '@/catalog/lines';
import { num, plural } from '@/catalog/format';
import { monthDayLabel } from '@/domain/dates';
import type { FreshStartChoice, FreshStartInput } from '@/domain/seasonReview';
import { tuneView, type SeasonReviewVM, type FreshStartVM } from '@/state/selectors';
import { resolveSeasonReview } from '@/state/store';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { prefersReducedMotion } from '@/fx/motion';
import { SETTINGS_SAVE } from './copy';
import s from './SeasonReview.module.css';

/** The chips a habit can take (Tinier and Grow only when there is a smaller or bigger version). */
export function choicesFor(o: Pick<FreshStartVM, 'tinier' | 'grow'>): FreshStartChoice[] {
  return ['keep', ...(o.tinier ? (['tinier'] as const) : []), ...(o.grow ? (['grow'] as const) : []), 'rest', 'finish'];
}

/** A plant's line: "Walk · Cutting to Blooming · 71 waterings" (or one stage: "Walk · Leafy · 12 waterings"). */
export function seasonPlantLine(p: { habitName: string | null; fromStage: number; toStage: number; waterings: number }): string {
  const from = STAGE_NAMES[p.fromStage] ?? STAGE_NAMES[0];
  const to = STAGE_NAMES[p.toStage] ?? STAGE_NAMES[0];
  const forms = p.fromStage === p.toStage ? SEASON_REVIEW.plantSame : SEASON_REVIEW.plant;
  return fillLine(plural(p.waterings, forms), { habit: p.habitName ?? '', from, to, count: num(p.waterings) });
}

/** Grows a plant from the season's first stage to its last, one stage at a time (150 ms each). */
function useTimeLapse(from: number, to: number): number {
  const [stage, setStage] = useState(() => (prefersReducedMotion() ? to : from));
  useEffect(() => {
    if (prefersReducedMotion() || stage >= to) return;
    const t = setTimeout(() => setStage((x) => Math.min(to, x + 1)), stage === from ? 600 : 150);
    return () => clearTimeout(t);
  }, [stage, to]);
  return stage;
}

function SeasonPlant({ p }: { p: SeasonReviewVM['plants'][number] }) {
  const stage = useTimeLapse(p.fromStage, p.toStage);
  return (
    <li class={s.plant}>
      <CardPlant species={p.plant} stage={stage} pot="terracotta" size={56} {...(p.petId ? { residentPetId: p.petId } : {})} {...(p.icon ? { icon: p.icon } : {})} />
      <span class={s.caption}>{seasonPlantLine(p)}</span>
    </li>
  );
}

export function SeasonReviewCard({ review }: { review: SeasonReviewVM }) {
  const tune = tuneView.value;
  const [picked, setPicked] = useState<Record<string, FreshStartChoice>>({});
  const [open, setOpen] = useState<string | null>(null);
  const Season = capitalise(review.name);
  const next = review.next.name;
  const title = fillLine(SEASON_REVIEW.title, { Season });

  const finish = (choices: FreshStartInput[] | 'skip') => {
    const out = resolveSeasonReview(choices);
    if (out !== false && choices !== 'skip') toast({ key: 'season', message: fillLine(SEASON_REVIEW.done, { season: next }), tone: 'sage' });
  };
  const help = (c: FreshStartChoice) =>
    c === 'rest' ? fillLine(SEASON_REVIEW.chipHelp.rest, { date: monthDayLabel(tune.season.nextStart) }) : fillLine(SEASON_REVIEW.chipHelp[c], { season: next });

  return (
    <section class={s.card} aria-labelledby="season-title">
      <h2 id="season-title" class={s.title}>
        {title}
      </h2>
      {review.plants.length > 0 && (
        <ul class={s.plants} tabIndex={0} aria-label={title}>
          {review.plants.slice(0, 8).map((p) => (
            <SeasonPlant key={p.habitId} p={p} />
          ))}
        </ul>
      )}
      {tune.chips.length > 0 && (
        <>
          <p class={s.ask}>{fillLine(SEASON_REVIEW.ask, { Season: capitalise(next) })}</p>
          <ul class={s.habits}>
            {tune.chips.map((o) => {
              const choice = picked[o.habitId] ?? 'keep';
              return (
                <li key={o.habitId} class={s.habit}>
                  <button type="button" class={s.habitRow} aria-expanded={open === o.habitId} onClick={() => setOpen((x) => (x === o.habitId ? null : o.habitId))}>
                    <span class={s.habitName} id={`fresh-${o.habitId}`}>
                      {o.habitName}
                    </span>
                    <span class={cx(s.pill, choice !== 'keep' && s.pillChanged)}>{SEASON_REVIEW.chips[choice]}</span>
                  </button>
                  {open === o.habitId && (
                    <>
                      <div class={s.chips} role="radiogroup" aria-labelledby={`fresh-${o.habitId}`}>
                        {choicesFor(o).map((c, i, all) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={choice === c}
                            tabIndex={choice === c ? 0 : -1}
                            class={cx(s.chip, choice === c && s.on)}
                            onClick={() => setPicked((p) => ({ ...p, [o.habitId]: c }))}
                            onKeyDown={(e) => {
                              const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                              if (!d) return;
                              e.preventDefault();
                              const to = (i + d + all.length) % all.length;
                              setPicked((p) => ({ ...p, [o.habitId]: all[to]! }));
                              ((e.currentTarget as HTMLElement).parentElement?.children[to] as HTMLElement | undefined)?.focus();
                            }}
                          >
                            {SEASON_REVIEW.chips[c]}
                          </button>
                        ))}
                      </div>
                      <p class={s.help}>{help(choice)}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div class={s.actions}>
        {Object.values(picked).some((c) => c !== 'keep') ? (
          <Button onClick={() => finish(Object.entries(picked).map(([habitId, choice]) => ({ habitId, choice })))}>{SETTINGS_SAVE}</Button>
        ) : (
          <Button onClick={() => finish([])}>{SEASON_REVIEW.keepEverything}</Button>
        )}
        <Button variant="quiet" onClick={() => finish('skip')}>
          {SEASON_REVIEW.later}
        </Button>
      </div>
    </section>
  );
}

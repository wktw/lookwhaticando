/**
 * Season Review and "Tune my habits" (DESIGN §14.3): the Today card for the season just ended
 * (counts only, never a percentage) and the fresh-start chips, which "Tune my habits" offers
 * anytime from Habit Detail and You.
 */
import type { AppState, DateKey, Hemisphere, SeasonName, SeasonPlant } from '../types';
import { freshStartOptions, hemisphereOf, justThisSeasonEnd, nextSeasonStart, seasonAt, type FreshStartOptions } from '@/domain/seasonReview';
import { stageName, type StageName } from '@/domain/growth';
import { liveHabits, type ViewEnv } from './common';

export interface SeasonPlantVM extends SeasonPlant {
  habitName: string | null;
  icon: string | null;
  fromName: StageName;
  toName: StageName;
}

export interface FreshStartVM extends FreshStartOptions {
  habitName: string;
  icon: string;
}

export interface SeasonReviewVM {
  key: DateKey;
  /** The season just ended ("Summer, on the sill.") and its dates. */
  name: SeasonName;
  start: DateKey;
  end: DateKey;
  hemisphere: Hemisphere;
  /** The time-lapse: up to 8 plants, most watered first, with their companions. */
  plants: SeasonPlantVM[];
  waterings: number;
  /** The season starting ("Autumn starts today."). */
  next: { name: SeasonName; start: DateKey; end: DateKey };
  /** "Just this season" habits that retired with a ribbon at its end. */
  finished: string[];
}

function chipsFor(s: AppState, env: ViewEnv, h: Hemisphere): FreshStartVM[] {
  return liveHabits(s, env.today)
    .filter((habit) => habit.archivedOn === undefined)
    .map((habit) => ({ ...freshStartOptions(s, habit, env.today, h), habitName: habit.name, icon: habit.icon }));
}

/**
 * The pending Season Review card, or null (inside `todayVM`, so it stays light: the card's
 * fresh-start chips are `tuneVM().chips`, computed when the card opens).
 */
export function seasonReviewVM(s: AppState, env: ViewEnv): SeasonReviewVM | null {
  const r = s.seasons?.pending;
  if (!r) return null;
  const h = hemisphereOf(s, env.timeZone);
  const byId = new Map(s.habits.map((x) => [x.id, x]));
  const next = seasonAt(env.today, h);
  return {
    key: r.key,
    name: r.name,
    start: r.start,
    end: r.end,
    hemisphere: r.hemisphere,
    plants: r.plants.map((p) => ({
      ...p,
      habitName: byId.get(p.habitId)?.name ?? null,
      icon: byId.get(p.habitId)?.icon ?? null,
      fromName: stageName(p.fromStage),
      toName: stageName(p.toStage),
    })),
    waterings: r.waterings,
    next: { name: next.name, start: next.start, end: next.end },
    finished: s.habits.filter((x) => x.ribbon !== undefined && x.endsOn !== undefined && x.endsOn >= r.start && x.endsOn <= r.end).map((x) => x.id),
  };
}

export interface TuneVM {
  /** The season now, "Just this season"'s last day, and when "Rest till next season" ends. */
  season: { name: SeasonName; start: DateKey; end: DateKey; hemisphere: Hemisphere; justThisSeasonEnd: DateKey; nextStart: DateKey };
  chips: FreshStartVM[];
}

/** "Tune my habits" (anytime): the same chips as the review, for every live habit. */
export function tuneVM(s: AppState, env: ViewEnv): TuneVM {
  const h = hemisphereOf(s, env.timeZone);
  const cur = seasonAt(env.today, h);
  return {
    season: { name: cur.name, start: cur.start, end: cur.end, hemisphere: h, justThisSeasonEnd: justThisSeasonEnd(s, env.today, env.timeZone), nextStart: nextSeasonStart(env.today, h) },
    chips: chipsFor(s, env, h),
  };
}

/**
 * The habit list (DESIGN §9.1): grouped by time block with the current block first; earlier blocks
 * that are all watered fold ("Morning 3/3"); "Watered for the week", "This month", "Other days" and
 * "Resting" are folded rows. Grouping comes from a snapshot (./state.ts), so a tap never moves a
 * card. Every group header is a disclosure button inside an h2.
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Icon } from '@/art/icons';
import { CHECKIN_TOASTS, TODAY_LINES, fillLine } from '@/catalog/lines';
import { blockSummary, periodWord, restingRow } from '@/catalog/format';
import { monthDayLabel } from '@/domain/dates';
import type { TimeOfDay } from '@/state/types';
import type { HabitCardVM, PausedSummaryVM } from '@/state/selectors';
import { cx } from '@/ui/cx';
import type { GroupSnapshot } from './state';
import s from './HabitList.module.css';

export type LiveGroup = GroupSnapshot & { cards: HabitCardVM[]; done: number };

/** A group's header words: "Morning 2/3", "Watered for the week", "This month", "Other days". */
export function groupTitle(g: Pick<LiveGroup, 'key' | 'cards' | 'done'>): string {
  if (g.key.startsWith('block:')) return blockSummary({ id: g.key.slice(6) as TimeOfDay, done: g.done, total: g.cards.length });
  if (g.key === 'thisMonth') return TODAY_LINES.rows.thisMonth;
  if (g.key === 'notToday') return TODAY_LINES.rows.otherDays;
  const periods = new Set(g.cards.map((c) => (c.pace ? periodWord(c.pace.period) : 'week')));
  const only = periods.size === 1 ? [...periods][0]! : 'week';
  return only === 'week' ? TODAY_LINES.rows.doneForWeek : fillLine(TODAY_LINES.rows.doneForPeriod, { period: only });
}

export interface HabitListProps {
  groups: readonly LiveGroup[];
  paused: PausedSummaryVM | null;
  renderCard: (card: HabitCardVM) => ComponentChildren;
  onOpenHabit: (habitId: string) => void;
}

export function HabitList({ groups, paused, renderCard, onOpenHabit }: HabitListProps) {
  // Which groups she has opened or folded herself; otherwise the snapshot decides.
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
  const flip = (key: string) =>
    setFlipped((f) => {
      const next = new Set(f);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div class={s.list}>
      {groups.map((g) => {
        // A block that starts open stays open (its header is just its name); a folded row opens and folds.
        const open = !g.folded || flipped.has(g.key);
        const id = `group-${g.key.replace(':', '-')}`;
        const row = !g.key.startsWith('block:');
        return (
          <section key={g.key} class={cx(s.group, g.current && s.current, row && s.row)} aria-labelledby={`${id}-h`}>
            <h2 class={s.header} id={`${id}-h`}>
              {g.folded ? (
                <button type="button" class={cx(s.toggle, !open && s.folded)} aria-expanded={open} aria-controls={id} onClick={() => flip(g.key)}>
                  <span class={s.title}>{groupTitle(g)}</span>
                  {!open && <span class={s.names}>{g.cards.map((c) => c.name).join(' · ')}</span>}
                  <Icon name="chevron-down" size={18} class={s.chevron} />
                </button>
              ) : (
                <span class={s.label}>{groupTitle(g)}</span>
              )}
            </h2>
            <ul id={id} class={s.cards} hidden={!open}>
              {open &&
                g.cards.map((c) => (
                  <li key={c.id} class={s.item}>
                    {renderCard(c)}
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
      {paused && <PausedRow paused={paused} open={flipped.has('paused')} onFlip={() => flip('paused')} onOpenHabit={onOpenHabit} />}
    </div>
  );
}

/** "Resting: 2 habits · back Oct 6": folded; open, each paused habit and when it is back. */
function PausedRow({ paused, open, onFlip, onOpenHabit }: { paused: PausedSummaryVM; open: boolean; onFlip: () => void; onOpenHabit: (id: string) => void }) {
  return (
    <section class={cx(s.group, s.row)} aria-labelledby="group-paused-h">
      <h2 class={s.header} id="group-paused-h">
        <button type="button" class={cx(s.toggle, !open && s.folded)} aria-expanded={open} aria-controls="group-paused" onClick={onFlip}>
          <span class={s.title}>{restingRow(paused)}</span>
          {!open && <span class={s.names}>{paused.habits.map((h) => h.name).join(' · ')}</span>}
          <Icon name="chevron-down" size={18} class={s.chevron} />
        </button>
      </h2>
      <ul id="group-paused" class={s.paused} hidden={!open}>
        {open &&
          paused.habits.map((h) => (
            <li key={h.id}>
              <button type="button" class={s.pausedItem} onClick={() => onOpenHabit(h.id)}>
                <Icon name="rest" size={20} class={s.pausedIcon} />
                <span>{h.back ? fillLine(CHECKIN_TOASTS.paused, { habit: h.name, date: monthDayLabel(h.back) }) : fillLine(CHECKIN_TOASTS.pausedOpen, { habit: h.name })}</span>
                <Icon name="chevron-right" size={18} class={s.chevronRight} />
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}

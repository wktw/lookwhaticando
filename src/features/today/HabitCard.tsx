/**
 * The habit card, a nursery plant tag (DESIGN §9.1): the plant in its pot with its resident peeking
 * (≤ 20 px) and the habit's icon on a little stake · the name in Castoro · the anchor or "After Walk"
 * in Castoro italic · the status line (§9.1.1) · ⋯ (44×44) · the water-fill check ring. Pots watered
 * today have damp soil.
 *
 * The ring: a one-tap habit toggles; a count habit adds its step, and once full a tap opens the
 * inline stepper. A long press opens the number pad for a count habit, or logs the tiny version.
 */
import { memo } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CardPlant } from '@/art/plants/CardPlant';
import { CHECKIN_TOASTS, LOOKS, TODAY_LINES, fillLine } from '@/catalog/lines';
import { cardAriaLabel, forDayLabel, num, statusLine } from '@/catalog/format';
import type { WeekStart } from '@/domain/dates';
import type { DateKey } from '@/state/types';
import type { HabitCardVM } from '@/state/selectors';
import { CheckRing, type CheckRingState } from '@/ui/CheckRing';
import { IconButton } from '@/ui/IconButton';
import { Stepper } from '@/ui/Stepper';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { TODAY_COPY } from './copy';
import s from './HabitCard.module.css';

export interface HabitCardProps {
  card: HabitCardVM;
  /** The day the card logs to, and whether it is a past day ("Walk for Saturday"). */
  date: DateKey;
  past: boolean;
  weekStart: WeekStart;
  compact: boolean;
  /** Who sits in this pot (the companion, or whoever is nearest), peeking over the rim. */
  residentPetId: string | null;
  /** The inline stepper is open (a full count habit, tapped again). */
  adjusting: boolean;
  /** Draw the plant at once (the first cards on screen); the rest draw as they come near the view. */
  eager?: boolean;
  onRing: (card: HabitCardVM, ring: HTMLElement) => void;
  onHold: (card: HabitCardVM, ring: HTMLElement) => void;
  onMore: (card: HabitCardVM, button: HTMLElement) => void;
  onOpen: (card: HabitCardVM) => void;
  onCount: (card: HabitCardVM, count: number) => void;
  onAdjusted: () => void;
}

/** A long press is this long (DESIGN §5.2). */
export const HOLD_MS = 450;

/** The ring's state for a card: a moon, a sprout, a check, or water toward a count. */
export function ringStateOf(card: Pick<HabitCardVM, 'rested' | 'tiny' | 'done' | 'flexible' | 'target'>): CheckRingState | undefined {
  if (card.rested) return 'rest';
  if (card.tiny) return 'tiny';
  if (card.flexible || card.target <= 1) return card.done ? 'done' : 'empty';
  return undefined;
}

/** A unit for one step: "glasses" → "glass", "pages" → "page", "km" stays (VOICE §23: "Add 1 glass to Drink water"). */
export function unitFor(unit: string | null, n: number): string {
  if (!unit || n !== 1) return unit ?? '';
  if (/(ss|sh|ch|x)es$/i.test(unit)) return unit.slice(0, -2);
  if (/[^s]s$/i.test(unit)) return unit.slice(0, -1);
  return unit;
}

/** The ring's accessible name (VOICE §23): "Walk" · "Add 1 glass to Drink water" · "Walk for Saturday". */
export function ringLabel(card: Pick<HabitCardVM, 'name' | 'flexible' | 'target' | 'step' | 'unit' | 'count' | 'rested' | 'tiny'>, date: DateKey, past: boolean): string {
  const name = past ? forDayLabel(card.name, date) : card.name;
  const counting = !card.flexible && card.target > 1 && !card.rested && !card.tiny && card.count < card.target;
  if (!counting) return name;
  return fillLine(TODAY_LINES.addOne, { step: num(card.step), unit: unitFor(card.unit, card.step), habit: name }).replace(/ {2,}/g, ' ');
}

/** What the ring's description reads after its name: "5 of 8 glasses", or the status line. */
export function ringDescription(card: HabitCardVM, weekStart: WeekStart): string | undefined {
  if (!card.flexible && card.target > 1 && card.count > 0 && !card.tiny && !card.rested) {
    return fillLine(CHECKIN_TOASTS.progress, { count: num(card.count), target: num(card.target), unit: card.unit ?? '' }).trim();
  }
  return statusLine(card.subtitle, weekStart) ?? undefined;
}

/**
 * Cards re-render only when what they show changed: the view model builds fresh card objects on
 * every commit, so a watering elsewhere compares equal here and leaves this card alone.
 */
export function sameCard(a: HabitCardProps, b: HabitCardProps): boolean {
  for (const k of Object.keys(b) as (keyof HabitCardProps)[]) {
    if (k === 'card') continue;
    if (a[k] !== b[k]) return false;
  }
  return a.card === b.card || JSON.stringify(a.card) === JSON.stringify(b.card);
}

/**
 * Whether a card is near the view: a busy list draws the plants of the first cards at once and the
 * rest as they scroll near (the plant art is the heaviest thing on the card).
 */
function useNear(eager: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

export const HabitCard = memo(function HabitCard(props: HabitCardProps) {
  const { card, date, past, weekStart, compact, residentPetId, adjusting } = props;
  const ring = useRef<HTMLDivElement>(null);
  const [plantBox, near] = useNear(props.eager ?? true);
  const hold = useRef<{ timer: number; fired: boolean }>({ timer: 0, fired: false });
  const status = statusLine(card.subtitle, weekStart);
  const anchor = card.after ? fillLine(LOOKS.stacking.after, { anchor: card.after.name }) : card.anchor;
  const counting = !card.flexible && card.target > 1;
  const ringEl = () => ring.current?.querySelector('button') ?? ring.current!;

  const startHold = (e: PointerEvent) => {
    if (e.button !== 0) return;
    hold.current.fired = false;
    clearTimeout(hold.current.timer);
    hold.current.timer = window.setTimeout(() => {
      hold.current.fired = true;
      props.onHold(card, ringEl());
    }, HOLD_MS);
  };
  const endHold = () => clearTimeout(hold.current.timer);
  const onClick = () => {
    if (hold.current.fired) {
      hold.current.fired = false;
      return;
    }
    props.onRing(card, ringEl());
  };

  return (
    <article class={cx(s.card, compact && s.compact, card.damp && s.watered, card.rested && s.rested)} data-habit={card.id} aria-label={cardAriaLabel(card)}>
      <div class={s.body} onClick={() => props.onOpen(card)}>
        <div class={s.plant} aria-hidden="true" ref={plantBox}>
          {near && (
            <CardPlant
            species={card.plant.species}
            stage={card.plant.displayStage}
            progress={card.plant.progress}
            {...(card.plant.blooms !== undefined ? { blooms: card.plant.blooms } : {})}
            pot={card.plant.pot}
            damp={card.damp}
            {...(card.look ? { look: card.look } : {})}
            {...(card.plant.flourishes > 0 ? { flourishes: card.plant.flourishes } : {})}
            {...(residentPetId ? { residentPetId } : {})}
            icon={card.icon}
            tone={card.color}
            size={compact ? 44 : 60}
              pulse={card.waterings}
            />
          )}
        </div>
        <div class={s.text}>
          <h3 class={s.name}>{card.name}</h3>
          {anchor && !compact && <p class={s.anchor}>{anchor}</p>}
          {status && (
            <p class={cx(s.status, card.rested && s.statusRest)} aria-hidden="true">
              {status}
            </p>
          )}
        </div>
      </div>
      <div class={s.actions}>
        <IconButton icon="more" label={fillLine(TODAY_COPY.more, { habit: past ? forDayLabel(card.name, date) : card.name })} class={s.more} onClick={(e) => props.onMore(card, e.currentTarget as HTMLElement)} aria-haspopup="menu" />
        <div ref={ring} class={s.ring} onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onContextMenu={(e) => e.preventDefault()}>
          <CheckRing
            label={ringLabel(card, date, past)}
            description={ringDescription(card, weekStart)}
            state={ringStateOf(card)}
            {...(counting && !card.rested && !card.tiny ? { count: card.count, target: card.target } : {})}
            tone={card.color}
            size={compact ? 44 : 48}
            onClick={onClick}
          />
        </div>
      </div>
      {adjusting && counting && (
        <div class={s.adjust}>
          <Stepper value={card.count} onChange={(v) => props.onCount(card, v)} label={fillLine(TODAY_COPY.howMany, { habit: card.name })} min={0} max={100_000} step={card.step} unit={card.unit ?? undefined} />
          <Button variant="ghost" size="sm" onClick={props.onAdjusted}>
            {TODAY_COPY.pad.done}
          </Button>
        </div>
      )}
    </article>
  );
}, sameCard);

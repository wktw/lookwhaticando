/**
 * Step 2 (DESIGN §9.6, VOICE §16): "Pick up to 3." The eight starter chips, "More ideas" (every
 * other template) and "Make my own" (just a name). Each pick stands on the sill above as a cutting
 * in a glass. "Plant them" makes the habits (`completeOnboarding`).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { ONBOARDING, SETTINGS, fillLine } from '@/catalog/lines';
import type { HabitTemplate } from '@/catalog/types';
import { HabitIcon } from '@/art/habit-icons';
import { Icon } from '@/art/icons';
import { completeOnboarding } from '@/state/store';
import { announce } from '@/ui/announce';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { ONBOARDING_COPY } from '@/features/you/copy';
import { MORE_TEMPLATES, STARTER_TEMPLATES, addCustom, isFull, pickCount, removeCustom, togglePick, type Picks } from './flow';
import s from './Onboarding.module.css';

/** Plants the picks and finishes the save's onboarding; returns the new habit ids. */
export function plantPicks(name: string, picks: Picks): string[] {
  return completeOnboarding({ name, templateIds: picks.templateIds, customHabits: picks.custom });
}

function Chip({ t, on, full, onToggle }: { t: HabitTemplate; on: boolean; full: boolean; onToggle: () => void }) {
  const refused = full && !on;
  return (
    <button type="button" class={cx(s.chip, on && s.chipOn, refused && s.chipFull, toneClass(t.color as never))} aria-pressed={on} aria-disabled={refused || undefined} onClick={onToggle}>
      <span class={s.chipIcon} aria-hidden="true">
        <HabitIcon id={t.icon} size={24} tone={t.color as never} />
      </span>
      <span class={s.chipName}>{t.name}</span>
      {on && (
        <span class={s.chipCheck} aria-hidden="true">
          <Icon name="check" size={16} strokeWidth={2.4} />
        </span>
      )}
    </button>
  );
}

export function PickStep({ picks, onPicks, onPlant }: { picks: Picks; onPicks: (p: Picks) => void; onPlant: () => void }) {
  const [more, setMore] = useState(false);
  const [making, setMaking] = useState(false);
  const [draft, setDraft] = useState('');
  const ownInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (making) ownInput.current?.focus({ preventScroll: true });
  }, [making]);
  const full = isFull(picks);
  const n = pickCount(picks);

  const toggle = (id: string) => {
    const next = togglePick(picks, id);
    if (next === picks) {
      announce(ONBOARDING_COPY.pickFull);
      haptic('light');
      return;
    }
    const added = next.templateIds.length > picks.templateIds.length;
    if (added) {
      sfx.play('pop', { volume: 0.4 });
      haptic('tick');
    }
    onPicks(next);
  };

  const make = (e: Event) => {
    e.preventDefault();
    const next = addCustom(picks, draft);
    if (next === picks) return;
    sfx.play('pop', { volume: 0.4 });
    haptic('tick');
    onPicks(next);
    setDraft('');
    setMaking(false);
  };

  const chips = (list: readonly HabitTemplate[]) =>
    list.map((t) => <Chip key={t.id} t={t} on={picks.templateIds.includes(t.id)} full={full} onToggle={() => toggle(t.id)} />);

  return (
    <div class={s.step}>
      <h1 class={s.title}>{ONBOARDING.pick}</h1>
      <div class={s.chips} role="group" aria-label={ONBOARDING.pick}>
        {chips(STARTER_TEMPLATES)}
        {picks.custom.map((h) => (
          <button key={h.name} type="button" class={cx(s.chip, s.chipOn, toneClass(h.color))} aria-pressed="true" aria-label={fillLine(ONBOARDING_COPY.remove, { habit: h.name })} onClick={() => onPicks(removeCustom(picks, h.name))}>
            <span class={s.chipIcon} aria-hidden="true">
              <HabitIcon id={h.icon} size={24} tone={h.color} />
            </span>
            <span class={s.chipName}>{h.name}</span>
            <span class={s.chipCheck} aria-hidden="true">
              <Icon name="check" size={16} strokeWidth={2.4} />
            </span>
          </button>
        ))}
      </div>
      {more && (
        <div class={s.chips} role="group" aria-label={ONBOARDING.moreIdeas}>
          {chips(MORE_TEMPLATES)}
        </div>
      )}
      <div class={s.links}>
        <Button variant="quiet" size="sm" icon={more ? 'chevron-up' : 'chevron-down'} aria-expanded={more} onClick={() => setMore(!more)}>
          {more ? ONBOARDING_COPY.lessIdeas : ONBOARDING.moreIdeas}
        </Button>
        {!making && (
          <Button variant="quiet" size="sm" icon="plus" disabled={full} onClick={() => setMaking(true)}>
            {ONBOARDING.makeOwn}
          </Button>
        )}
      </div>
      {making && (
        <form class={s.makeOwn} onSubmit={make}>
          <label class="sr-only" for="onb-own">
            {ONBOARDING_COPY.makeOwnLabel}
          </label>
          <input
            id="onb-own"
            class={s.ownInput}
            value={draft}
            maxLength={60}
            placeholder={SETTINGS.editor.name}
            autoComplete="off"
            enterKeyHint="done"
            ref={ownInput}
            onInput={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setMaking(false);
              }
            }}
          />
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            {ONBOARDING_COPY.add}
          </Button>
        </form>
      )}
      <p class={s.note}>{full ? ONBOARDING_COPY.pickFull : ONBOARDING.more}</p>
      <div class={s.foot}>
        <Button size="lg" block disabled={n === 0} onClick={onPlant}>
          {n > 1 ? ONBOARDING_COPY.plantMany : ONBOARDING_COPY.plantOne}
        </Button>
      </div>
    </div>
  );
}

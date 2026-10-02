import { useEffect, useState } from 'preact/hooks';
import { LOOKS, COMPANION } from '@/catalog/lines';
import { PETAL_INKS } from '@/art/plants/looks';
import { readShape } from '@/domain/signature';
import type { BloomColour } from '@/state/types';
import type { HabitDetailVM } from '@/state/selectors';
import { confirmPlantLook, state, today } from '@/state/store';
import { Sheet } from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { announce } from '@/ui/announce';
import { haptic } from '@/fx/haptics';
import { cx } from '@/ui/cx';
import { HeroPlant } from './HeroPlant';
import s from './HabitDetail.module.css';

const COLOURS: readonly BloomColour[] = ['dawn', 'sunlit', 'twilight', 'wildflower'];

export function LookChoiceSheet({ vm, open, epoch, onClose, onConfirm, onClosed }: {
  vm: HabitDetailVM; open: boolean; epoch: number | null; onClose: () => void; onConfirm: () => void; onClosed: () => void;
}) {
  const [colour, setColour] = useState<BloomColour | null>(null);
  useEffect(() => { if (open) setColour(null); }, [open, epoch, vm.habit.id]);
  const shape = open ? readShape(state.value, vm.habit, today.value) : null;
  const partner = shape?.keptTogether ? state.value.habits.find((h) => h.id === shape.keptTogether!.habitId) : undefined;
  const key = (e: KeyboardEvent) => {
    const i = COLOURS.indexOf(colour ?? COLOURS[0]!);
    const direction = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!direction && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? COLOURS.length - 1 : (i + direction + COLOURS.length) % COLOURS.length;
    setColour(COLOURS[next]!);
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };
  return <Sheet open={open} onClose={onClose} onClosed={onClosed} title={LOOKS.choose} description={LOOKS.choiceHelp} size="sm" initialFocus='[role="radio"]'
    footer={<><Button disabled={!colour} onClick={() => {
      if (colour && epoch !== null && confirmPlantLook(vm.habit.id, colour, epoch)) { haptic('light'); announce(LOOKS.confirmed); onConfirm(); }
      else onClose();
    }}>{LOOKS.confirm}</Button><Button variant="quiet" onClick={onClose}>{COMPANION.reveal.notNow}</Button></>}>
    {!PETAL_INKS[vm.plant.species] && <p class={s.help}>{LOOKS.foliage}</p>}
    <div class={s.colourChoices} role="radiogroup" aria-label={LOOKS.choose} onKeyDown={key}>
      {COLOURS.map((c, i) => <button type="button" role="radio" aria-checked={colour === c} tabIndex={colour === c || (!colour && i === 0) ? 0 : -1}
        class={cx(s.look, colour === c && s.lookOn)} onClick={() => setColour(c)} key={c}>
        <span class={s.choiceArt} aria-hidden="true"><HeroPlant species={vm.plant.species} stage={Math.max(5, vm.plant.displayStage)}
          blooms={vm.plant.blooms} pot={vm.plant.pot} size={64} look={{ colour: c, shape: shape?.shape ?? 'classic', ...(partner ? { partnerColour: partner.color } : {}) }} /></span>
        <span>{LOOKS.colours[c]}</span>
      </button>)}
    </div>
  </Sheet>;
}

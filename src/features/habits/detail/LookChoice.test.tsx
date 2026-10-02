// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { Game } from '../../../../tests/unit/domain/game';
import { addDays } from '@/domain/dates';
import { state, saveEpoch, deleteHabit } from '@/state/store';
import { habitDetailVM } from '@/state/views/habit';
import { PlantTagCard } from './Parts';
import { button, click, installDom, key, mount, until, useState_, TODAY, NOW, UTC } from '@/features/progress/testing';

let view: ReturnType<typeof mount> | undefined;
beforeAll(installDom);
afterEach(() => { view?.unmount(); });
function setup(plant: 'begonia' | 'snakeplant' | 'pothos' | 'pilea' | 'catgrass' = 'begonia', months = 10) {
  const g = new Game({ start: '2024-01-01' });
  const id = g.addHabit({ plant, schedule: { kind: 'monthly', times: 1, every: 1 } });
  for (let i = 0; i < months; i++) { g.goTo(`2024-${String(i + 1).padStart(2, '0')}-01`, 7); g.checkIn(id); }
  useState_(g.state);
  function Harness() { return <PlantTagCard vm={habitDetailVM(state.value, { today: TODAY, now: NOW, local: UTC }, id)!} />; }
  view = mount(<Harness />);
  return id;
}

describe('the waiting plant tag and deliberate colour choice', () => {
  it('explains uncertainty before the tenth completed occurrence without promising that any next tap supplies a time', () => {
    setup('begonia', 9);
    expect(view!.root.textContent).toContain('There aren’t enough clear watering times');
    expect(view!.root.textContent).toContain('After 10 waterings that count towards your habit');
    expect(button('Choose a colour')).toBeNull();
  });

  it('requires a deliberate colour then confirmation, supports keyboard radios, and preserves Classic', async () => {
    const id = setup();
    await click(button('Choose a colour'), 'open the colour chooser');
    const sheet = await until(() => document.querySelector('[role="dialog"]'), 'colour dialog');
    expect(sheet.textContent).toContain('It won’t say anything about when you water');
    expect(button('Keep this colour')!.disabled).toBe(true);
    const first = sheet.querySelector<HTMLButtonElement>('[role="radio"]')!;
    first.focus();
    await key(first, 'ArrowRight');
    expect(sheet.querySelectorAll('[aria-checked="true"]')).toHaveLength(1);
    expect(state.value.plantLooks?.[id]?.confirmed).toBeUndefined();
    await click(button('Keep this colour'), 'confirm chosen colour');
    await until(() => state.value.plantLooks?.[id]?.confirmed?.shown, 'saved explicit choice');
    expect(view!.root.textContent).toContain('a colour you chose');
    const classic = [...view!.root.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((b) => b.textContent === 'Classic')!;
    await click(classic, 'Classic');
    expect(state.value.plantLooks![id]!.confirmed!.shown).toBe(false);
  });

  it.each(['pothos', 'pilea', 'catgrass'] as const)('discloses %s foliage limits before every colour is confirmed', async (species) => {
    setup(species);
    expect(view!.root.textContent).toContain('This plant has no petals to colour');
    await click(button('Choose a colour'), 'open chooser');
    const sheet = await until(() => document.querySelector('[role="dialog"]'), 'dialog');
    expect(sheet.querySelectorAll('[role="radio"]')).toHaveLength(4);
    for (const radio of sheet.querySelectorAll<HTMLButtonElement>('[role="radio"]')) {
      await click(radio, 'colour');
      expect(sheet.textContent).toContain('the leaves stay the same');
    }
    await click(button('Not now'), 'decline choice');
    expect(state.value.plantLooks).toBeUndefined();
  });

  it('a chooser left open across a replacement cannot colour a reused habit id', async () => {
    const id = setup();
    await click(button('Choose a colour'), 'open chooser');
    await click(await until(() => document.querySelector<HTMLButtonElement>('[role="dialog"] [role="radio"]'), 'colour'), 'colour');
    act(() => { saveEpoch.value++; state.value = structuredClone(state.value); });
    if (button('Keep this colour')) await click(button('Keep this colour'), 'stale confirmation');
    expect(state.value.plantLooks?.[id]?.confirmed).toBeUndefined();
  });

  it('explains Paired’s retained partner colour before confirmation and on the chosen tag', async () => {
    const g = new Game({ start: '2026-01-01' });
    const a = g.addHabit({ name: 'Walk', color: 'blush' });
    const id = g.addHabit({ name: 'Read', plant: 'begonia', anchorHabitId: a });
    const c = g.addHabit({ name: 'Stretch' });
    for (let i = 0; i < 50; i++) {
      g.goTo(addDays('2026-01-01', i), 7);
      g.checkIn(a); g.now += 30_000; g.checkIn(id); g.now += 30_000; g.checkIn(c);
    }
    useState_(g.state);
    function Harness() { return <PlantTagCard vm={habitDetailVM(state.value, { today: TODAY, now: NOW, local: UTC }, id)!} />; }
    view = mount(<Harness />);
    await click(button('Choose a colour'), 'open Paired chooser');
    const sheet = await until(() => document.querySelector('[role="dialog"]'), 'dialog');
    expect(sheet.textContent).toContain('Paired flowers keep the other habit’s colour');
    expect(sheet.querySelector('[data-flourish="bee"]')).not.toBeNull();
    await click(button('Twilight', sheet), 'Twilight');
    await click(button('Keep this colour'), 'confirm colour');
    expect(view!.root.textContent).toContain('Your choice stays on the tag, and the bee stays.');
    act(() => deleteHabit(a));
    expect(view!.root.textContent).not.toContain('Paired flowers keep the other habit’s colour');
    expect(view!.root.querySelector('[data-flourish="bee"]')).not.toBeNull();
  });
});

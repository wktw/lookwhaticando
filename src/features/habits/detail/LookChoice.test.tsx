// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { Game } from '../../../../tests/unit/domain/game';
import { state, saveEpoch } from '@/state/store';
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
    expect(view!.root.textContent).toContain('There aren’t enough clear check-in times');
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
    for (const radio of sheet.querySelectorAll<HTMLButtonElement>('[role="radio"]')) {
      await click(radio, 'colour');
      expect(sheet.textContent).toContain('its leaves keep their own colour');
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
});

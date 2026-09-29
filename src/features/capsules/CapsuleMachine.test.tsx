// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineId } from '@/catalog/types';
import { getMachine, itemsInMachine } from '@/catalog';
import type { PullOutcome } from '@/state/api';
import { pull, renamePet, state } from '@/state/store';
import { CapsuleMachine } from './CapsuleMachine';
import { RevealOverlay } from './RevealOverlay';
import type { RevealData } from './reveal';
import { button, buttonWithText, click, installDom, key, mount, pause, revealDialog, type, until } from './testing';

vi.mock('@/state/store', async (importOriginal) => {
  const store = await importOriginal<typeof import('@/state/store')>();
  return { ...store, pull: vi.fn(), renamePet: vi.fn() };
});

const kitty = getMachine('kitty');
const common = itemsInMachine('kitty').find((i) => i.rarity === 'common' && i.category !== 'pet')!;

/** A store-like pull: pays (coins or a ticket) and always finds a common item. */
function fakePull(id: MachineId, opts: { useTicket?: boolean } = {}): PullOutcome {
  const s = state.value;
  const wallet = { ...s.wallet };
  if (opts.useTicket) wallet.tickets -= 1;
  else wallet.coins -= getMachine(id).price;
  state.value = { ...s, wallet };
  return {
    ok: true,
    machineId: id,
    itemId: common.id,
    rarity: 'common',
    isNew: true,
    stardust: 0,
    fusedStars: 0,
    pity: { rareIn: 9, ultraIn: 39 },
    paidWith: opts.useTicket ? 'ticket' : 'coins',
    events: [],
  };
}

function setWallet(coins: number, tickets: number) {
  state.value = { ...state.value, wallet: { coins, stars: 5, stardust: 0, tickets }, settings: { ...state.value.settings, quickOpen: false } };
}

const crank = () => button('Turn the crank')!;
const insertButton = () => buttonWithText('Insert')!;

/** Pay, turn the crank by tapping it, and wait for the capsule to come out and open into the reveal. */
async function pullOnce(pay: 'Insert' | 'Use a ticket' = 'Insert') {
  await click(pay === 'Insert' ? insertButton() : button('Use a ticket'), pay);
  await until(() => crank().getAttribute('aria-disabled') === 'false', 'the crank to be ready');
  await click(crank(), 'crank');
  await until(revealDialog, 'the reveal');
}

async function openToCard() {
  await click(await until(() => button(/capsule/i), 'the capsule'), 'capsule');
  await until(() => document.activeElement?.tagName === 'H2', 'the card heading to take focus');
}

/** Open and close the capsule that's on its way, so the next test starts at an idle machine. */
async function finishReveal() {
  await until(revealDialog, 'the reveal');
  await openToCard();
  await click(button('Done'), 'Done');
  await until(() => !revealDialog(), 'the reveal to close');
}

let view: ReturnType<typeof mount> | null = null;

beforeAll(installDom);
beforeEach(() => {
  vi.mocked(pull).mockReset().mockImplementation(fakePull);
  setWallet(100, 0);
});
afterEach(() => {
  view?.unmount();
  view = null;
});

describe('the pull', () => {
  it('pays, turns, drops a capsule, reveals it, and hands focus back on close', async () => {
    view = mount(<CapsuleMachine machine={kitty} active />);
    await pullOnce();
    expect(pull).toHaveBeenCalledWith('kitty', {});
    expect(state.value.wallet.coins).toBe(75);

    await openToCard();
    expect(document.activeElement?.textContent).toBe(common.name);
    expect(button(/^Pull again/)?.getAttribute('aria-label')).toBe('Pull again for 25 coins');

    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    await until(() => document.activeElement === insertButton(), 'focus back on Insert');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('checks the wallet before the coin goes in, and says where to earn more', async () => {
    setWallet(10, 0);
    view = mount(<CapsuleMachine machine={kitty} active />);
    await click(insertButton(), 'Insert');
    const note = await until(() => document.querySelector('[role="note"]'), 'a friendly notice');
    expect(note.textContent).toMatch(/takes 25 coins/);
    expect(note.querySelector('a')?.getAttribute('href')).toBe('#/today');
    expect(crank().getAttribute('aria-disabled')).toBe('true');
    expect(pull).not.toHaveBeenCalled();
  });

  it('handles pull() saying no at the drop: the coin pops back out, nothing is revealed', async () => {
    vi.mocked(pull).mockImplementationOnce(() => ({ ok: false, error: 'not-enough-coins' }));
    view = mount(<CapsuleMachine machine={kitty} active />);
    await click(insertButton(), 'Insert');
    await until(() => crank().getAttribute('aria-disabled') === 'false', 'the crank to be ready');
    await click(crank(), 'crank');
    const note = await until(() => document.querySelector('[role="note"]'), 'a friendly notice');
    expect(note.textContent).toMatch(/Almost!/);
    expect(document.querySelector('[role="status"]')?.textContent).toMatch(/popped back out/);
    expect(insertButton()).toBeTruthy();
    expect(revealDialog()).toBeNull();
  });

  it('a crank tap before paying points at the slot', async () => {
    view = mount(<CapsuleMachine machine={kitty} active />);
    await click(crank(), 'crank');
    await until(() => /Pop a coin in first!/.test(document.querySelector('[role="status"]')?.textContent ?? ''), 'the nudge');
    expect(pull).not.toHaveBeenCalled();
  });

  it('Space turns the crank, but never under an open sheet or dialog', async () => {
    view = mount(<CapsuleMachine machine={kitty} active />);
    await click(insertButton(), 'Insert');
    await until(() => crank().getAttribute('aria-disabled') === 'false', 'the crank to be ready');
    (document.activeElement as HTMLElement | null)?.blur();

    const sheet = document.body.appendChild(Object.assign(document.createElement('div'), { role: 'dialog' }));
    sheet.setAttribute('aria-modal', 'true');
    await key(document.body, ' ');
    await pause(700);
    expect(pull).not.toHaveBeenCalled();

    sheet.remove();
    await key(document.body, ' ');
    await until(() => vi.mocked(pull).mock.calls.length === 1, 'the pull');
    await finishReveal();
  });

  it('keeps an unopened capsule for you if you leave mid-drop', async () => {
    view = mount(<CapsuleMachine machine={kitty} active />);
    await click(insertButton(), 'Insert');
    await until(() => crank().getAttribute('aria-disabled') === 'false', 'the crank to be ready');
    await click(crank(), 'crank');
    await until(() => vi.mocked(pull).mock.calls.length === 1, 'the pull');
    view.unmount();

    view = mount(<CapsuleMachine machine={kitty} active />);
    expect(revealDialog()).toBeTruthy();
    await finishReveal();
    view.unmount();

    view = mount(<CapsuleMachine machine={kitty} active />);
    expect(revealDialog()).toBeNull();
  });
});

describe('pull again says how it will be paid', () => {
  it('after a ticket pull with no tickets left, it offers the coin price (not a silent switch)', async () => {
    setWallet(100, 1);
    view = mount(<CapsuleMachine machine={kitty} active />);
    await pullOnce('Use a ticket');
    expect(pull).toHaveBeenLastCalledWith('kitty', { useTicket: true });
    await openToCard();
    await click(button('Pull again for 25 coins'), 'Pull again');
    await until(() => crank().getAttribute('aria-disabled') === 'false', 'the next turn');
    await click(crank(), 'crank');
    await until(() => vi.mocked(pull).mock.calls.length === 2, 'the second pull');
    expect(pull).toHaveBeenLastCalledWith('kitty', {});
    await finishReveal();
  });

  it('when coins run short but a ticket is left, it offers the ticket', async () => {
    setWallet(30, 1);
    view = mount(<CapsuleMachine machine={kitty} active />);
    await pullOnce();
    await openToCard();
    await click(button('Pull again with a ticket'), 'Pull again');
    await until(() => crank().getAttribute('aria-disabled') === 'false', 'the next turn');
    await click(crank(), 'crank');
    await until(() => vi.mocked(pull).mock.calls.length === 2, 'the second pull');
    expect(pull).toHaveBeenLastCalledWith('kitty', { useTicket: true });
    await finishReveal();
  });

  it('with no way to pay, there is no pull again', async () => {
    setWallet(25, 0);
    view = mount(<CapsuleMachine machine={kitty} active />);
    await pullOnce();
    await openToCard();
    expect(button(/^Pull again/)).toBeNull();
    await click(button('Done'), 'Done');
  });
});

describe('the reveal card', () => {
  const newPet: RevealData = {
    itemId: 'pet-cat-orange',
    rarity: 'common',
    isNew: true,
    stardust: 0,
    fusedStars: 0,
    shell: { color: '#FFC4D3', color2: '#BBDCF6' },
    via: 'pull',
  };

  it('introduces a new pet even without pet state, and names them', async () => {
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={() => {}} />);
    expect(document.querySelector('h2')?.textContent).toBe('Meet Marmalade!');
    expect(button('To the meadow')).toBeTruthy();
    await click(button('Name them'), 'Name them');
    await type(document.querySelector('input')!, 'Biscuit');
    await click(button('Save'), 'Save');
    expect(renamePet).toHaveBeenCalledWith('pet-cat-orange', 'Biscuit');
    expect(document.querySelector('h2')?.textContent).toBe('Meet Biscuit!');
  });

  it('Esc in the name field cancels naming, not the whole reveal', async () => {
    const onClose = vi.fn();
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={onClose} />);
    await click(button('Name them'), 'Name them');
    await key(document.querySelector('input')!, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('input')).toBeNull();
    expect(document.activeElement?.tagName).toBe('H2');
    await key(document.activeElement!, 'Escape');
    expect(onClose).toHaveBeenCalled();
  });
});

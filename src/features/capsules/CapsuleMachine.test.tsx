// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineId } from '@/catalog/types';
import { getMachine, itemsInMachine } from '@/catalog';
import type { PullOutcome } from '@/state/api';
import { finishReveal, ownership, pull, renamePet, state } from '@/state/store';
import { CapsuleMachine } from './CapsuleMachine';
import { Sheet } from '@/ui/Sheet';
import { RevealOverlay } from './RevealOverlay';
import type { RevealData } from './reveal';
import { button, buttonWithText, click, installDom, key, mount, pause, revealDialog, type, until } from './testing';

vi.mock('@/state/store', async (importOriginal) => {
  const store = await importOriginal<typeof import('@/state/store')>();
  return { ...store, pull: vi.fn(), renamePet: vi.fn(), finishReveal: vi.fn() };
});

const cats = getMachine('cats');
const common = itemsInMachine('cats').find((i) => i.rarity === 'common' && i.category !== 'pet')!;

/**
 * A store-like pull: pays (coins, a ticket, or nothing on the house), always finds a common item, and
 * commits it as the pending reveal before anything animates, as the store does (§7.1): that pending
 * reveal is what a cabinet resumes (WP-A8).
 */
function fakePull(id: MachineId, opts: { useTicket?: boolean; free?: boolean } = {}): PullOutcome {
  const s = state.value;
  const wallet = { ...s.wallet };
  if (opts.useTicket) wallet.tickets -= 1;
  else if (!opts.free) wallet.coins -= getMachine(id).price;
  state.value = { ...s, wallet, pendingReveal: { machineId: id, itemId: common.id, isNew: true, stardust: 0, fusedStars: 0, at: ++pulledAt } };
  return {
    ok: true,
    machineId: id,
    itemId: common.id,
    rarity: 'common',
    secret: false,
    dupStreak: 0,
    isNew: true,
    stardust: 0,
    fusedStars: 0,
    pity: { rareIn: 9, ultraIn: 39 },
    paidWith: opts.useTicket ? 'ticket' : opts.free ? 'free' : 'coins',
    events: [],
  };
}

let pulledAt = 0;

/** The store's finishReveal: clears the pending reveal (only the one expected, when one is named). */
function fakeFinishReveal(expected?: Parameters<typeof finishReveal>[0]): boolean {
  const p = state.value.pendingReveal;
  if (!p) return false;
  if (expected && (expected.itemId !== p.itemId || (expected.machineId !== undefined && expected.machineId !== p.machineId) || (expected.at !== undefined && expected.at !== p.at))) return false;
  state.value = { ...state.value, pendingReveal: undefined };
  return true;
}

function setWallet(coins: number, tickets: number) {
  state.value = {
    ...state.value,
    pendingReveal: undefined,
    wallet: { coins, stars: 5, stardust: 0, tickets },
    settings: { ...state.value.settings, quickOpen: false },
  };
}

const handle = () => document.querySelector<HTMLElement>('[role="slider"][aria-label="Turn the handle"]')!;
const insertButton = () => buttonWithText('Put a coin in')!;
/** The card's close: "Done", or "Not now" beside a new pet's "Find {name} a plant". */
const closeCard = () => button('Done') ?? button('Not now');
const handleReady = () => until(() => handle().getAttribute('aria-disabled') === 'false', 'the handle to be ready');

/** Pay, turn the handle by tapping it, and wait for the capsule to drop and come up into the reveal. */
async function pullOnce(pay: 'Put a coin in' | 'Use a ticket' = 'Put a coin in') {
  await click(pay === 'Put a coin in' ? insertButton() : buttonWithText('Use a ticket'), pay);
  await handleReady();
  await click(handle(), 'handle');
  await until(revealDialog, 'the reveal');
}

async function openToCard() {
  await click(await until(() => button(/^Open the capsule/), 'the capsule'), 'capsule');
  await until(() => document.activeElement?.tagName === 'H2', 'the card heading to take focus');
}

/** Open and close the capsule that's on its way, so the next test starts at an idle cabinet. */
async function finishOpenReveal() {
  await until(revealDialog, 'the reveal');
  await openToCard();
  await click(closeCard(), 'Done');
  await until(() => !revealDialog(), 'the reveal to close');
}

let view: ReturnType<typeof mount> | null = null;

beforeAll(installDom);
beforeEach(() => {
  vi.mocked(pull).mockReset().mockImplementation(fakePull);
  vi.mocked(finishReveal).mockReset().mockImplementation(fakeFinishReveal);
  vi.mocked(renamePet).mockReset();
  setWallet(100, 0);
});
afterEach(() => {
  view?.unmount();
  view = null;
  ownership.value = 'unsupported';
});

describe('the pull', () => {
  it('pays, turns, drops a capsule into the chute, reveals it, and hands focus back on close', async () => {
    view = mount(<CapsuleMachine machine={cats} active />);
    await pullOnce();
    expect(pull).toHaveBeenCalledWith('cats', {});
    expect(state.value.wallet.coins).toBe(75);

    await openToCard();
    expect(document.activeElement?.textContent).toBe(common.name);
    expect(button(/^Another capsule/)?.getAttribute('aria-label')).toBe('Another capsule for 25 coins');

    await key(document.activeElement!, 'Escape');
    await until(() => !revealDialog(), 'the reveal to close');
    expect(finishReveal).toHaveBeenCalled();
    await until(() => document.activeElement === insertButton(), 'focus back on "Put a coin in"');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('checks the wallet before the coin goes in, and says kindly where coins come from', async () => {
    setWallet(10, 0);
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    const note = await until(() => document.querySelector('[role="note"]'), 'a notice');
    expect(note.textContent).toMatch(/No\. 01 · Cats is 25 coins a capsule\. There are 10 in the jar\./);
    expect(note.textContent).not.toMatch(/!/);
    expect(note.querySelector('a')?.getAttribute('href')).toBe('#/today');
    expect(handle().getAttribute('aria-disabled')).toBe('true');
    expect(pull).not.toHaveBeenCalled();
  });

  it('handles pull() saying no at the ka-chunk: the coin comes back out, nothing is revealed', async () => {
    vi.mocked(pull).mockImplementationOnce(() => ({ ok: false, error: 'not-enough-coins' }));
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    await handleReady();
    await click(handle(), 'handle');
    const note = await until(() => document.querySelector('[role="note"]'), 'a notice');
    expect(note.textContent).toMatch(/is 25 coins a capsule/);
    expect(document.querySelector('[role="status"]')?.textContent).toMatch(/came back out/);
    expect(insertButton()).toBeTruthy();
    expect(revealDialog()).toBeNull();
  });

  it('while this window is still getting ready, the coin stays out and nothing is asked of the store (audit FS4)', async () => {
    ownership.value = 'acquiring';
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    const note = await until(() => document.querySelector('[role="note"]'), 'a notice');
    expect(note.textContent).toMatch(/^One moment: catkin is still getting ready in this window\. Nothing was spent\./);
    expect(handle().getAttribute('aria-disabled')).toBe('true');
    expect(pull).not.toHaveBeenCalled();
    expect(state.value.wallet.coins).toBe(100);
    // The note goes once the window is ready, and the same coin works.
    ownership.value = 'granted';
    await until(() => !document.querySelector('[role="note"]'), 'the notice to clear');
    await pullOnce();
    expect(pull).toHaveBeenCalledTimes(1);
    await finishOpenReveal();
  });

  it('a try of the handle before paying points at the slot', async () => {
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(handle(), 'handle');
    await until(() => /A coin goes in first\./.test(document.querySelector('[role="status"]')?.textContent ?? ''), 'the nudge');
    expect(pull).not.toHaveBeenCalled();
  });

  it('the handle is a slider: the arrow keys step it round, one ratchet click at a time', async () => {
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    await handleReady();
    const h = handle();
    expect(h.getAttribute('aria-valuenow')).toBe('0');
    await key(h, 'ArrowRight');
    expect(Number(h.getAttribute('aria-valuenow'))).toBe(10);
    expect(pull).not.toHaveBeenCalled();
    for (let i = 0; i < 9; i++) await key(h, 'ArrowRight');
    await until(() => vi.mocked(pull).mock.calls.length === 1, 'the pull after a full turn');
    await finishOpenReveal();
  });

  it('Space turns the handle, but never under an open sheet or dialog', async () => {
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    await handleReady();
    (document.activeElement as HTMLElement | null)?.blur();

    const sheet = document.body.appendChild(Object.assign(document.createElement('div'), { role: 'dialog' }));
    sheet.setAttribute('aria-modal', 'true');
    await key(document.body, ' ');
    await pause(700);
    expect(pull).not.toHaveBeenCalled();

    sheet.remove();
    await key(document.body, ' ');
    await until(() => vi.mocked(pull).mock.calls.length === 1, 'the pull');
    await finishOpenReveal();
  });

  it('keeps an unopened capsule for you if you leave mid-drop', async () => {
    view = mount(<CapsuleMachine machine={cats} active />);
    await click(insertButton(), 'Insert');
    await handleReady();
    await click(handle(), 'handle');
    await until(() => vi.mocked(pull).mock.calls.length === 1, 'the pull');
    view.unmount();

    view = mount(<CapsuleMachine machine={cats} active />);
    expect(revealDialog()).toBeTruthy();
    await finishOpenReveal();
    view.unmount();

    view = mount(<CapsuleMachine machine={cats} active />);
    expect(revealDialog()).toBeNull();
  });

  it('commit before animate: a pull the store saved before a reload opens again', async () => {
    state.value = {
      ...state.value,
      pendingReveal: { machineId: 'cats', itemId: common.id, isNew: true, stardust: 0, fusedStars: 0, at: 0 },
    };
    view = mount(<CapsuleMachine machine={cats} active />);
    expect(revealDialog()).toBeTruthy();
    expect(pull).not.toHaveBeenCalled();
    await finishOpenReveal();
    expect(finishReveal).toHaveBeenCalledTimes(1);
  });

  it('the first capsule is on the house, and offers no second pull', async () => {
    const closed = vi.fn();
    view = mount(<CapsuleMachine machine={cats} active free onRevealClosed={closed} />);
    await click(buttonWithText('Put a coin in'), 'Put a coin in');
    expect(buttonWithText('Put a coin in')).toBeNull();
    await handleReady();
    await click(handle(), 'handle');
    await until(revealDialog, 'the reveal');
    expect(pull).toHaveBeenCalledWith('cats', { free: true });
    expect(state.value.wallet.coins).toBe(100);
    await openToCard();
    expect(button(/^Another capsule/)).toBeNull();
    await click(closeCard(), 'Done');
    expect(closed).toHaveBeenCalled();
  });
});

describe('pull again says how it will be paid', () => {
  it('after a ticket pull with no tickets left, it offers the coin price (not a silent switch)', async () => {
    setWallet(100, 1);
    view = mount(<CapsuleMachine machine={cats} active />);
    await pullOnce('Use a ticket');
    expect(pull).toHaveBeenLastCalledWith('cats', { useTicket: true });
    await openToCard();
    await click(button('Another capsule for 25 coins'), 'Another capsule');
    await handleReady();
    await click(handle(), 'handle');
    await until(() => vi.mocked(pull).mock.calls.length === 2, 'the second pull');
    expect(pull).toHaveBeenLastCalledWith('cats', {});
    await finishOpenReveal();
  });

  it('when coins run short but a ticket is left, it offers the ticket', async () => {
    setWallet(30, 1);
    view = mount(<CapsuleMachine machine={cats} active />);
    await pullOnce();
    await openToCard();
    await click(button('Another capsule with a ticket'), 'Another capsule');
    await handleReady();
    await click(handle(), 'handle');
    await until(() => vi.mocked(pull).mock.calls.length === 2, 'the second pull');
    expect(pull).toHaveBeenLastCalledWith('cats', { useTicket: true });
    await finishOpenReveal();
  });

  it('with no way to pay, there is no pull again', async () => {
    setWallet(25, 0);
    view = mount(<CapsuleMachine machine={cats} active />);
    await pullOnce();
    await openToCard();
    expect(button(/^Another capsule/)).toBeNull();
    await click(closeCard(), 'Done');
  });
});

describe('twist to open', () => {
  const secret: RevealData = {
    itemId: 'pet-cat-mainecoon',
    rarity: 'ultra',
    secret: true,
    machineId: 'cats',
    isNew: true,
    stardust: 0,
    fusedStars: 0,
    shell: { color: '#F5CDD6', color2: '#D2E4F2' },
    via: 'pull',
  };
  const capsule = () => button(/^Open the capsule/)!;

  /** Drag round the capsule's centre (jsdom lays everything out at the origin), in 15° steps. */
  async function twist(el: HTMLElement, degrees: number) {
    const at = (deg: number) => ({ clientX: Math.cos((deg * Math.PI) / 180) * 80, clientY: Math.sin((deg * Math.PI) / 180) * 80, button: 0, bubbles: true });
    el.dispatchEvent(new MouseEvent('pointerdown', at(0)));
    for (let a = 15; a <= degrees; a += 15) await pause(0).then(() => el.dispatchEvent(new MouseEvent('pointermove', at(a))));
    el.dispatchEvent(new MouseEvent('pointerup', at(degrees)));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await pause(0);
  }

  it('a quarter-turn drag opens a capsule; the click after the drag is not a second tap', async () => {
    view = mount(<RevealOverlay data={{ ...secret, itemId: common.id, rarity: 'common', secret: false }} onClose={() => {}} />);
    await twist(capsule(), 45);
    expect(capsule()).toBeTruthy();
    await twist(capsule(), 105);
    await until(() => document.activeElement?.tagName === 'H2', 'the card');
  });

  it('the Secret takes three twists or taps, and says how many are left', async () => {
    view = mount(<RevealOverlay data={secret} onClose={() => {}} />);
    expect(capsule().getAttribute('aria-label')).toMatch(/Secret finish.*3 more times/);
    await click(capsule(), 'capsule');
    expect(capsule().getAttribute('aria-label')).toMatch(/2 more times/);
    await key(capsule(), 'ArrowRight');
    await key(capsule(), 'ArrowRight');
    await key(capsule(), 'ArrowRight');
    expect(capsule().getAttribute('aria-label')).not.toMatch(/more times/);
    await click(capsule(), 'capsule');
    await until(() => document.activeElement?.tagName === 'H2', 'the card');
    expect(document.body.textContent).toMatch(/No\. 01 · Cats, the secret one! A Maine Coon, with a tail as long as the rest put together/);
  });

  it('shows the figure as a silhouette through the clear half, except a Secret, which keeps its secret', async () => {
    view = mount(<RevealOverlay data={{ ...secret, itemId: common.id, rarity: 'common', secret: false }} onClose={() => {}} />);
    expect(capsule().querySelector('.cap-figure svg')).not.toBeNull();
    view.unmount();
    view = mount(<RevealOverlay data={secret} onClose={() => {}} />);
    expect(capsule().querySelector('.cap-figure')).toBeNull();
  });
});

describe('the reveal card', () => {
  const newPet: RevealData = {
    itemId: 'pet-cat-orange',
    rarity: 'common',
    secret: false,
    machineId: 'cats',
    isNew: true,
    stardust: 0,
    fusedStars: 0,
    shell: { color: '#F5CDD6', color2: '#D2E4F2' },
    via: 'pull',
  };

  it('reads "No. 01 · Cats", the name, and the tier with its print finish', async () => {
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={() => {}} />);
    const card = revealDialog()!;
    expect(card.textContent).toMatch(/No\. 01 · Cats/);
    expect(document.querySelector('h2')?.textContent).toBe('Orange Tabby');
    expect(card.textContent).toMatch(/Classic/);
    expect(card.textContent).toMatch(/matte paper/);
    expect(card.textContent).not.toMatch(/!/);
  });

  it('gives a new pet a name tag with a came-home date, and renames from five ideas', async () => {
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={() => {}} />);
    expect(revealDialog()!.textContent).toMatch(/Pudding\s*Came home: today/);
    await click(button('Rename'), 'Rename');
    const ideas = document.querySelectorAll('[aria-label="Name ideas"] button');
    expect(ideas).toHaveLength(6);
    await type(document.querySelector('input')!, 'Biscuit');
    await click(button('Save'), 'Save');
    expect(renamePet).toHaveBeenCalledWith('pet-cat-orange', 'Biscuit');
    expect(revealDialog()!.textContent).toMatch(/Biscuit\s*Came home: today/);
  });

  it('Esc in the name field puts it away, not the whole reveal', async () => {
    const onClose = vi.fn();
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={onClose} />);
    await click(button('Rename'), 'Rename');
    await key(document.querySelector('input')!, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('input')).toBeNull();
    expect(document.activeElement?.tagName).toBe('H2');
    await key(document.activeElement!, 'Escape');
    expect(onClose).toHaveBeenCalled();
  });

  it('"Find {name} a plant" hands the pet to onPlace; "Let {name} choose" to its own handler (no pronouns)', async () => {
    const onPlace = vi.fn();
    const onLetThemChoose = vi.fn();
    const onClose = vi.fn();
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={onClose} onPlace={onPlace} onLetThemChoose={onLetThemChoose} />);
    expect(revealDialog()!.textContent).not.toMatch(/\b(them|they|it)\b choose|Find them/);
    expect(button('Not now')).toBeTruthy();
    await click(button('Find Pudding a plant'), 'Find Pudding a plant');
    expect(onPlace).toHaveBeenCalledWith('pet-cat-orange');
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    view = mount(<RevealOverlay data={newPet} initialStage="card" onClose={onClose} onPlace={onPlace} onLetThemChoose={onLetThemChoose} />);
    await click(button('Let Pudding choose'), 'Let Pudding choose');
    expect(onLetThemChoose).toHaveBeenCalledWith('pet-cat-orange');
  });

  it('is a layer on the shared stack: a sheet opened over it takes Esc, and the reveal waits, inert', async () => {
    const onClose = vi.fn();
    const sheetClose = vi.fn();
    view = mount(
      <>
        <RevealOverlay data={newPet} initialStage="card" onClose={onClose} />
        <Sheet open title="Pudding’s card" onClose={sheetClose}>
          <p>Likes</p>
        </Sheet>
      </>,
    );
    await pause(20);
    expect(revealDialog()!.inert).toBe(true);
    await key(document.activeElement ?? document.body, 'Escape');
    expect(sheetClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a repeat goes onto the swap shelf', async () => {
    view = mount(<RevealOverlay data={{ ...newPet, isNew: false, stardust: 2, friendshipXp: 20 }} initialStage="card" onClose={() => {}} />);
    expect(revealDialog()!.textContent).toMatch(/An Orange Tabby, again\. Onto the swap shelf · \+2 swaps · Pudding came over to look\./);
    // The friendship it earns shows as dots on the Pet Card, never as a number.
    expect(revealDialog()!.textContent).not.toMatch(/friendship/i);
  });

  it('a repeat pet is already home: no "Find {name} a plant", Done leads, and a quiet visit', async () => {
    const onPlace = vi.fn();
    view = mount(<RevealOverlay data={{ ...newPet, isNew: false, stardust: 2, friendshipXp: 20 }} initialStage="card" onClose={() => {}} onPlace={onPlace} />);
    expect(buttonWithText('Find Pudding a plant')).toBeFalsy();
    expect(buttonWithText('Let Pudding choose')).toBeFalsy();
    expect(button('Done')).toBeTruthy();
    await click(button('Visit Pudding'), 'Visit Pudding');
    expect(onPlace).toHaveBeenCalledWith('pet-cat-orange');
  });

  it('a repeat decor already has its spot: no "Find it a place"', async () => {
    const decor = itemsInMachine('cats').find((i) => i.category === 'decor')!;
    view = mount(<RevealOverlay data={{ ...newPet, itemId: decor.id, rarity: decor.rarity, isNew: false, stardust: 2 }} initialStage="card" onClose={() => {}} />);
    expect(buttonWithText('Find it a place')).toBeFalsy();
    view.unmount();
    view = mount(<RevealOverlay data={{ ...newPet, itemId: decor.id, rarity: decor.rarity }} initialStage="card" onClose={() => {}} />);
    expect(buttonWithText('Find it a place')).toBeTruthy();
  });
});

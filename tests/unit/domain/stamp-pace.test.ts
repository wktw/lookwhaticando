/**
 * The stamp pace (DESIGN §6 "Stamp pace", M1 audit): at a steady pace (5 daily habits at about
 * 80%), stamps come at about 4–6 a week from the ladder, Sunday Notes, Herbarium pages and swaps,
 * plus the one-off pins; capsules (on coins, about one a day) stay the main way in, and even a
 * player who spends every stamp on the cheapest Special Order chooses well under half as many
 * things as she opens. The collect-N pins count only things from capsules, so ordering can't pay
 * for the next order.
 */
import { describe, expect, it } from 'vitest';
import { COLLECTIBLES } from '@/catalog/collectibles';
import { WISH_PRICE } from '@/catalog/machines';
import { addDays } from '@/domain/dates';
import * as gacha from '@/domain/gacha';
import { capsuleCollectiblesOwned, machineCollectiblesOwned } from '@/domain/collection';
import { Game } from './game';

describe('the stamp pace over 10 weeks of steady play (DESIGN §6)', () => {
  it('stamps ~4–6 a week besides pins; greedy Special Orders stay under half the capsules', () => {
    const g = new Game({ start: '2026-03-02', seed: 7 });
    const hs = ['Walk', 'Read', 'Stretch', 'Water', 'Journal'].map((name, i) => g.addHabit({ name, icon: ['walk', 'book', 'stretch', 'water', 'journal'][i]!, effort: i < 2 ? 'steady' : 'light' }));
    let capsules = 0;
    let orders = 0;
    const machines = ['cats', 'cows', 'dogs', 'pond', 'garden', 'pantry'] as const;
    for (let d = 0; d < 70; d++) {
      g.goTo(addDays('2026-03-02', d), 20);
      for (const h of hs) if (g.rng() < 0.8) g.checkIn(h);
      while (g.state.wallet.coins >= 25) {
        const m = machines[Math.floor(g.rng() * machines.length)]!;
        const r = g.run((tx) => {
          const o = gacha.pull(tx, m);
          gacha.finishReveal(tx);
          return o;
        });
        if (!r.ok) break;
        capsules++;
      }
      for (;;) {
        const s = g.state;
        const created = gacha.profileCreatedOn(s, g.local);
        const pick = COLLECTIBLES.find((c) => {
          const st = gacha.wishStatus(s, c.id, g.today, created);
          return st.ok && c.rarity === 'common' && st.price <= s.wallet.stars;
        });
        if (!pick) break;
        const r = g.run((tx) => {
          const o = gacha.wish(tx, pick.id);
          gacha.finishReveal(tx);
          return o;
        });
        if (!r.ok) break;
        orders++;
      }
    }
    const by: Record<string, number> = {};
    for (const e of g.events) if (e.type === 'stars' && e.amount > 0) by[e.reason] = (by[e.reason] ?? 0) + e.amount;
    const steady = (by.letter ?? 0) + (by.showup ?? 0) + (by.herbarium ?? 0) + (by.fusion ?? 0);
    const detail = JSON.stringify({ capsules, orders, ...by });
    expect(WISH_PRICE.common, 'a chosen Classic costs what a No. 07 Night capsule does').toBe(3);
    expect(steady / 10, detail).toBeGreaterThanOrEqual(4);
    expect(steady / 10, detail).toBeLessThanOrEqual(6);
    expect(orders / capsules, detail).toBeLessThan(0.5);
    // The collect-N pins counted only what came out of a capsule.
    expect(capsuleCollectiblesOwned(g.state.collection)).toBe(machineCollectiblesOwned(g.state.collection) - Object.values(g.state.collection).filter((o) => o.ordered).length);
  });

  it('a Special Order doesn’t count toward the collect-N pins; a later capsule copy does', () => {
    const g = new Game();
    g.setWallet({ stars: 50 });
    const id = COLLECTIBLES.find((c) => c.rarity === 'common' && c.category === 'decor' && c.source === 'cats')!.id;
    expect(g.run((tx) => gacha.wish(tx, id))).toMatchObject({ ok: true, stars: 3 });
    expect(g.state.collection[id]).toMatchObject({ count: 1, ordered: true });
    expect(capsuleCollectiblesOwned(g.state.collection)).toBe(0);
    expect(machineCollectiblesOwned(g.state.collection)).toBe(1);
    // A capsule later brings a copy of the same thing: now it did come out of a capsule.
    g.setWallet({ coins: 25 * 400 });
    for (let i = 0; i < 400 && g.state.collection[id]!.count < 2; i++) {
      expect(g.run((tx) => gacha.pull(tx, 'cats')).ok).toBe(true);
      g.run((tx) => gacha.finishReveal(tx));
    }
    expect(g.state.collection[id]!.count).toBe(2);
    expect(g.state.collection[id]!.ordered).toBeUndefined();
    expect(capsuleCollectiblesOwned(g.state.collection)).toBe(machineCollectiblesOwned(g.state.collection));
  });
});

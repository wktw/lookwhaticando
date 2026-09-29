import { describe, expect, it } from 'vitest';
import { BADGES } from '@/catalog/badges';
import { PETS } from '@/catalog/collectibles';
import type { AppState } from '@/state/types';
import { BADGE_RULES, badgesWithoutRules, evaluateBadges, isEarlyBird } from '@/domain/badges';
import { albumMembers } from '@/domain/collection';
import { ALBUMS } from '@/catalog/collectibles';
import * as gacha from '@/domain/gacha';
import { Game, UTC, at } from './game';

const own = (s: AppState, ids: string[]): AppState => ({ ...s, collection: { ...s.collection, ...Object.fromEntries(ids.map((id) => [id, { count: 1, firstAt: 0 }])) } });

describe('badge rules cover the catalog exactly', () => {
  it('every catalog badge has one rule and every rule a badge', () => {
    expect(badgesWithoutRules()).toEqual([]);
    expect(Object.keys(BADGE_RULES).sort()).toEqual(BADGES.map((b) => b.id).sort());
  });
});

describe('check-in badges (live wall-clock stamps only)', () => {
  it('First Sprout and the check-in counters', () => {
    const g = new Game();
    const ids = Array.from({ length: 10 }, (_, i) => g.addHabit({ name: `H${i}` }));
    g.checkIn(ids[0]!);
    expect(g.lastOf('badge').map((b) => b.badgeId)).toContain('first-checkin');
    for (const id of ids.slice(1)) g.checkIn(id);
    expect(g.state.badges['checkins-10']).toBeDefined();
  });

  it('Early bird: a live check-in from 4:00 (or the day start) until 7:00; never a backfill', () => {
    expect(isEarlyBird(at('2026-03-02', 6, 59), 180, UTC)).toBe(true);
    expect(isEarlyBird(at('2026-03-02', 7, 0), 180, UTC)).toBe(false);
    expect(isEarlyBird(at('2026-03-02', 3, 30), 180, UTC)).toBe(false);
    expect(isEarlyBird(at('2026-03-02', 5, 0), 360, UTC)).toBe(false); // the day starts at 6:00
    const g = new Game({ start: '2026-03-03', hour: 9 });
    const a = g.addHabit();
    g.now = at('2026-03-04', 6, 15);
    g.checkIn(a, '2026-03-03'); // a backfill at 6:15 carries no stamp
    expect(g.state.badges['early-bird']).toBeUndefined();
    g.checkIn(a); // live
    expect(g.state.badges['early-bird']).toBeDefined();
  });

  it('Wind-Down: three evening check-ins between 19:00 and 22:00', () => {
    const g = new Game({ start: '2026-03-02', hour: 19 });
    const ids = [g.addHabit(), g.addHabit({ name: 'B' }), g.addHabit({ name: 'C' }), g.addHabit({ name: 'D' })];
    g.now = at('2026-03-02', 22, 30);
    g.checkIn(ids[3]!); // too late: not a wind-down check-in
    g.now = at('2026-03-02', 19, 5);
    g.checkIn(ids[0]!);
    g.checkIn(ids[1]!);
    expect(g.state.badges['wind-down']).toBeUndefined();
    g.checkIn(ids[2]!);
    expect(g.state.badges['wind-down']).toBeDefined();
  });

  it('pays each badge’s stars exactly once', () => {
    const g = new Game();
    const a = g.addHabit();
    g.checkIn(a);
    g.undo(a);
    g.checkIn(a);
    expect(g.allOf('badge').filter((b) => b.badgeId === 'first-checkin')).toHaveLength(1);
  });
});

describe('collection pins and Field Guide pages', () => {
  it('collect-N counts series collectibles (Moonlit included, starters and exclusives not)', () => {
    const g = new Game();
    g.state = own(g.state, ['plant-pothos', 'pot-cream', 'wear-laurel-sprig', 'decor-window-seat']);
    g.run((tx) => evaluateBadges(tx));
    expect(g.state.badges['collect-10']).toBeUndefined();
    g.state = own(g.state, PETS.filter((p) => p.source === 'cows').slice(0, 8).map((p) => p.id)); // 8 cows
    g.state = own(g.state, ['moonlit:pet-cow-holstein']);
    g.run((tx) => evaluateBadges(tx));
    expect(g.state.badges['collect-10']).toBeUndefined(); // 9
    g.state = own(g.state, ['wear-cowbell']);
    g.run((tx) => evaluateBadges(tx));
    expect(g.state.badges['collect-10']).toBeDefined();
  });

  it('completing a page grants its reward from ALBUMS[].reward; the first pays through the pin, later ones 5 stamps each', () => {
    const g = new Game();
    const cats = ALBUMS.find((a) => a.id === 'cats')!;
    const cows = ALBUMS.find((a) => a.id === 'cows')!;
    expect([cats.reward, cows.reward]).toEqual(['decor-reading-chair', 'decor-pasture-fence']);
    g.state = own(g.state, albumMembers(cats).map((p) => p.id));
    g.run((tx) => evaluateBadges(tx));
    expect(g.lastOf('album')).toEqual([{ type: 'album', albumId: 'cats', stars: 0, exclusive: cats.reward }]);
    expect(g.state.badges['album-complete']).toBeDefined();
    expect(g.state.collection[cats.reward]?.count).toBe(1);
    const stars = g.state.wallet.stars;
    g.state = own(g.state, albumMembers(cows).map((p) => p.id));
    g.run((tx) => evaluateBadges(tx));
    expect(g.lastOf('album')).toEqual([{ type: 'album', albumId: 'cows', stars: 5, exclusive: cows.reward }]);
    expect(g.state.wallet.stars).toBeGreaterThanOrEqual(stars + 5);
    g.run((tx) => evaluateBadges(tx));
    expect(g.allOf('album')).toHaveLength(2);
  });

  it('first rare / first ultra come from pulls', () => {
    const g = new Game();
    g.setWallet({ coins: 100 });
    g.state = { ...g.state, lifetime: { ...g.state.lifetime, pulls: 1 }, pity: { cats: { sinceRare: 0, sinceUltra: 39, dupStreak: 0, pulls: 39 } } };
    g.run((tx) => {
      gacha.pull(tx, 'cats');
      gacha.finishReveal(tx);
    });
    expect(g.state.badges['first-rare']).toBeDefined();
    expect(g.state.badges['first-ultra']).toBeDefined();
  });
});

describe('the clock guard pauses badges too', () => {
  it('awards nothing while rewards are paused', () => {
    const g = new Game({ start: '2026-03-10' });
    const a = g.addHabit();
    g.now = at('2026-03-07', 12);
    g.checkIn(a);
    expect(g.state.badges['first-checkin']).toBeUndefined();
  });
});

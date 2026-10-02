import { expect, it, vi } from 'vitest';
import { MACHINES } from '@/catalog/machines';
import { COLLECTIBLES } from '@/catalog/collectibles';
import { itemChances } from '@/domain/gacha';

const order = vi.hoisted(() => ({ reversed: false }));
vi.mock('@/domain/collection', async () => {
  const actual = await vi.importActual<typeof import('@/domain/collection')>('@/domain/collection');
  return {
    ...actual,
    machineLineup: (...args: Parameters<typeof actual.machineLineup>) => {
      const lineup = actual.machineLineup(...args);
      return order.reversed ? [...lineup].reverse() : lineup;
    },
    eligibleMoonlitIds: (...args: Parameters<typeof actual.eligibleMoonlitIds>) => {
      const ids = actual.eligibleMoonlitIds(...args);
      return order.reversed ? [...ids].reverse() : ids;
    },
  };
});

it('WP-D4: probabilities ignore candidate enumeration order within actual machine pools', () => {
  const owned = Object.fromEntries(COLLECTIBLES.filter((_, i) => i % 2).map((item) => [item.id, { count: 1, firstAt: 0 }]));
  for (const machine of MACHINES) {
    order.reversed = false;
    const forward = itemChances(machine.id, owned);
    order.reversed = true;
    const backward = itemChances(machine.id, owned);
    expect(backward.size).toBe(forward.size);
    for (const [id, chance] of forward) expect(backward.get(id), `${machine.id}/${id}`).toBeCloseTo(chance, 14);
  }
});

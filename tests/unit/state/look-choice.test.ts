import { afterEach, describe, expect, it } from 'vitest';
import * as store from '@/state/store';
import { encodeEnvelope, SAVE_KEY } from '@/state/persist';
import { Game } from '../domain/game';
import { deferredLocks, fakeBrowser, fakeLocks } from './fixtures';

const fixture = () => {
  const g = new Game({ start: '2024-01-01' });
  const id = g.addHabit({ schedule: { kind: 'monthly', times: 1, every: 1 } });
  for (let i = 1; i <= 10; i++) { g.goTo(`2024-${String(i).padStart(2, '0')}-01`, 7); g.checkIn(id); }
  return { g, id };
};
afterEach(() => store.configureStore({ locks: null }));

describe('explicit colour choices belong to the owning save', () => {
  it('writes the confirmed choice through export/import, and refuses the old chooser epoch on the same habit id', async () => {
    const { g, id } = fixture();
    const b = fakeBrowser();
    b.storage.setItem(SAVE_KEY, encodeEnvelope(g.state, 1, g.now, 'test'));
    store.hydrate();
    const oldEpoch = store.saveEpoch.value;
    const backup = store.exportData();
    expect(await store.applyImport(backup)).toMatchObject({ ok: true });
    expect(store.confirmPlantLook(id, 'dawn', oldEpoch)).toBe(false);
    expect(store.confirmPlantLook(id, 'dawn', store.saveEpoch.value)).toBe(true);
    const explicit = store.exportData();
    expect(await store.applyImport(explicit)).toMatchObject({ ok: true });
    expect(store.state.value.plantLooks![id]!.confirmed).toMatchObject({ colour: 'dawn', shown: true });
    expect(store.setPlantLook(id, null, oldEpoch)).toBe(false);
    expect(store.state.value.plantLooks![id]!.confirmed!.shown).toBe(true);
    expect(store.setPlantLook(id, null, store.saveEpoch.value)).toBe(true);
    expect(store.state.value.plantLooks![id]!.confirmed!.shown).toBe(false);
  });

  it.each(['acquiring', 'follower', 'newer'] as const)('cannot confirm or choose a look while %s', async (mode) => {
    const { g, id } = fixture();
    const locks = mode === 'acquiring' ? deferredLocks() : mode === 'follower' ? fakeLocks({ byOther: true }) : null;
    const b = fakeBrowser({ locks });
    const saved = mode === 'newer' ? { ...g.state, version: g.state.version + 1 } : g.state;
    const envelope = JSON.parse(encodeEnvelope(saved, 1, g.now, 'test'));
    if (mode === 'newer') envelope.v++;
    b.storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    store.hydrate();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const before = store.state.value;
    const disk = b.storage.getItem(SAVE_KEY);
    expect(store.confirmPlantLook(id, 'dawn', store.saveEpoch.value)).toBe(false);
    expect(store.setPlantLook(id, null, store.saveEpoch.value)).toBe(false);
    expect(store.state.value).toBe(before);
    b.advance(1000);
    expect(b.storage.getItem(SAVE_KEY)).toBe(disk);
  });
});

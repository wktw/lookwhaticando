import { expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { memorySnapshotStore, snapshotMeta, type SnapshotStore } from '@/state/snapshots';
import { controlledSnapshots } from './controlled';

it('reserves each snapshot gate at invocation when two inner writes settle in reverse order', async () => {
  const inner = memorySnapshotStore({ durable: true });
  let finishFirst!: () => void;
  const firstPending = new Promise<void>((resolve) => { finishFirst = resolve; });
  const adapter: SnapshotStore = { ...inner, async put(record) {
    if (record.id === 'first') await firstPending;
    await inner.put(record);
  } };
  const ctl = controlledSnapshots(adapter);
  const state = createInitialState(0);
  const record = (id: string) => ({ ...snapshotMeta(state, 'daily', id, '2026-09-29', 0, 'test'), state });
  const first = ctl.hold('put', 'after');
  const second = ctl.hold('put', 'after');
  let firstReached = false, secondReached = false;
  void first.reached.then(() => { firstReached = true; });
  void second.reached.then(() => { secondReached = true; });
  const pendingFirst = ctl.store.put(record('first'));
  const pendingSecond = ctl.store.put(record('second'));
  try {
    for (let turn = 0; turn < 8; turn++) await Promise.resolve();
    expect(secondReached, 'the second invocation owns the second gate').toBe(true);
    expect(firstReached, 'the unresolved first invocation still owns its first gate').toBe(false);
    expect((await inner.list()).map((s) => s.id)).toEqual(['second']);
    second.release();
    await pendingSecond;
    finishFirst();
    await first.reached;
    expect(firstReached).toBe(true);
  } finally {
    finishFirst(); first.release(); second.release();
    await Promise.all([pendingFirst, pendingSecond]);
  }
});

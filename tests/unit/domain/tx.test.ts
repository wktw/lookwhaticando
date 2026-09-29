import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { seal, transact, Tx } from '@/domain/tx';
import { mulberry32 } from '@/domain/rng';
import { UTC, deepFreeze } from './game';

const env = { now: Date.UTC(2026, 2, 2, 9), today: '2026-03-02', local: UTC, rng: mulberry32(1) };

describe('copy-on-write transactions (reducers never mutate their input)', () => {
  it('writes through accessors leave a deep-frozen input untouched', () => {
    const base = deepFreeze(createInitialState(env.now));
    const out = transact(base, env, (tx) => {
      tx.section('wallet').coins = 10;
      tx.ledger('once')['x'] = true;
      tx.logs('h1')['2026-03-02'] = { kind: 'log', count: 1 };
      tx.set('lastBackupAt', 5);
      return { ok: true };
    });
    expect(base.wallet.coins).toBe(0);
    expect(out.state.wallet.coins).toBe(10);
    expect(out.state.ledger.once).toEqual({ x: true });
    expect(out.state.logs).toEqual({ h1: { '2026-03-02': { kind: 'log', count: 1 } } });
    expect(out.ok).toBe(true);
  });

  it('untouched sections keep their identity (cheap equality, cheap saves)', () => {
    const base = deepFreeze(createInitialState(env.now));
    const out = transact(base, env, (tx) => {
      tx.section('wallet').coins = 1;
      return {};
    });
    expect(out.state).not.toBe(base);
    expect(out.state.wallet).not.toBe(base.wallet);
    expect(out.state.ledger).toBe(base.ledger);
    expect(out.state.collection).toBe(base.collection);
    expect(out.state.settings).toBe(base.settings);
  });

  it('a no-op transaction returns the very same state object', () => {
    const base = createInitialState(env.now);
    expect(transact(base, env, () => ({})).state).toBe(base);
  });

  it('a sealed object is copied before the transaction writes to it again', () => {
    const tx = new Tx(createInitialState(env.now), env);
    const logs = tx.logs('h1');
    logs['2026-03-01'] = { kind: 'log', count: 1 };
    seal(logs);
    const again = tx.logs('h1');
    expect(again).not.toBe(logs);
    again['2026-03-02'] = { kind: 'log', count: 1 };
    expect(Object.keys(logs)).toEqual(['2026-03-01']);
    expect(Object.keys(tx.s.logs.h1!)).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('set(undefined) removes an optional field', () => {
    const base = { ...createInitialState(env.now), lastBackupAt: 3 };
    const out = transact(base, env, (tx) => {
      tx.set('lastBackupAt', undefined);
      return {};
    });
    expect('lastBackupAt' in out.state).toBe(false);
  });
});

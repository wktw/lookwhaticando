/** WP-G2: the scale fixture includes the full journal; compaction must never shorten it. */
import { describe, expect, it, vi } from 'vitest';
import { bigSave, TODAY } from './bigsave';
import { compactSave } from '@/domain/rollover';
import { transact } from '@/domain/tx';
import { mulberry32 } from '@/domain/rng';
import { validateState } from '@/state/validate';
import { encodeEnvelope } from '@/state/persist';
import { canStartFrom, setStartedOn } from '@/domain/habits';
import { UTC, at } from '../domain/game';

vi.setConfig({ testTimeout: 60_000 });
const env = { today: TODAY, now: at(TODAY, 21), local: UTC, rng: mulberry32(1) };
const notes = (s: ReturnType<typeof bigSave>) => Object.values(s.logs).flatMap((logs) => Object.values(logs).flatMap((log) => log.note ? [log.note] : []));

describe('a full daily journal', () => {
  it.each([5, 10])('%s years × 12 habits retain every 280-character daily note', (years) => {
    const options: Parameters<typeof bigSave>[0] & { notes: 'daily' } = { years, habits: 12, notes: 'daily' };
    const s = bigSave(options);
    const before = notes(s);
    expect(s.habits).toHaveLength(12);
    expect(before).toHaveLength(years * 365 * 12);
    expect(before.every((note) => note.length === 280)).toBe(true);
    expect(new Set(before).size).toBe(before.length);
    expect(before.reduce((sum, note) => sum + note.length, 0)).toBe(years * 365 * 12 * 280);
    expect(s.inbox.filter((letter) => letter.kind === 'weekly')).toHaveLength(years * 52);
    expect(s.inbox.filter((letter) => letter.kind === 'monthly')).toHaveLength(years * 12);
    const compacted = transact(s, env, (tx) => { compactSave(tx); return {}; }).state;
    expect(validateState(compacted)).toMatchObject({ ok: true });
    expect(notes(compacted)).toEqual(before);
    expect(encodeEnvelope(compacted, 1, env.now, 'scale-test').length).toBeGreaterThan(years * 365 * 12 * 280);
  });

  it('keeps the existing sparse fixture and its size budget separate', () => {
    const sparse = bigSave({ years: 5, habits: 12 });
    expect(notes(sparse).length).toBeLessThan(1000);
    expect(notes(sparse).every((note) => note.length < 100)).toBe(true);
  });

  it('refuses an unreasonable backdate before any lifetime walk or state mutation', () => {
    const s = bigSave({ years: 5, habits: 12 });
    const h = s.habits[0]!;
    expect(canStartFrom(h, '1000-01-01', TODAY)).toBe(false);
    const r = transact(s, env, (tx) => ({ changed: setStartedOn(tx, h.id, '1000-01-01') }));
    expect(r.changed).toBe(false);
    expect(r.state).toBe(s);
  });
});

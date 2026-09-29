import { afterEach, describe, expect, it } from 'vitest';
import { buildDemo } from '@/state/demo';
import {
  BACKUP_FORMAT,
  base64UrlDecode,
  base64UrlEncode,
  decodePayload,
  describeBackup,
  deviceLabel,
  encodePayload,
  makeBackup,
  parseBackupText,
} from '@/state/handoff';
import { encodeEnvelope } from '@/state/persist';
import { mulberry32 } from '@/domain/rng';
import { UTC, at } from '../domain/game';

const now = at('2026-09-29', 21);
const demo = buildDemo({ today: '2026-09-29', now, local: UTC, days: 40 });

describe('base64url', () => {
  it('matches RFC 4648 §5 vectors (no padding)', () => {
    const enc = (s: string) => base64UrlEncode(new TextEncoder().encode(s));
    expect(['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar'].map(enc)).toEqual(['', 'Zg', 'Zm8', 'Zm9v', 'Zm9vYg', 'Zm9vYmE', 'Zm9vYmFy']);
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff, 0xbf]))).toBe('-_-_');
  });

  it('round-trips random bytes of every length', () => {
    const rng = mulberry32(3);
    for (let n = 0; n < 70; n++) {
      const bytes = Uint8Array.from({ length: n }, () => Math.floor(rng() * 256));
      expect(base64UrlDecode(base64UrlEncode(bytes))).toEqual(bytes);
    }
    expect(base64UrlDecode('Zm9v+/8=')).toEqual(new Uint8Array([102, 111, 111, 251, 255]));
    expect(() => base64UrlDecode('Zm9v!')).toThrow();
  });
});

describe('CK1 handoff payload (DESIGN §13.8)', () => {
  const json = JSON.stringify(makeBackup(demo, { now, appVersion: 'test', device: 'iPhone · Safari' }));

  it("'CK1:' + base64url(gzip(json)) round-trips and is much smaller than the plain fallback", async () => {
    const mm1 = await encodePayload(json);
    const mm0 = await encodePayload(json, { compress: false });
    expect(mm1.startsWith('CK1:')).toBe(true);
    expect(mm0.startsWith('CK0:')).toBe(true);
    expect(mm1.length).toBeLessThan(mm0.length / 3);
    expect(await decodePayload(mm1)).toEqual({ ok: true, json });
    expect(await decodePayload(mm0)).toEqual({ ok: true, json });
    expect(await decodePayload(`  ${mm1}\n`)).toEqual({ ok: true, json });
  });

  describe('without CompressionStream', () => {
    const saved = { c: globalThis.CompressionStream, d: globalThis.DecompressionStream };
    afterEach(() => {
      globalThis.CompressionStream = saved.c;
      globalThis.DecompressionStream = saved.d;
    });

    it("falls back to 'CK0:' gracefully, and explains an CK1 it cannot open", async () => {
      const mm1 = await encodePayload(json);
      (globalThis as Record<string, unknown>).CompressionStream = undefined;
      (globalThis as Record<string, unknown>).DecompressionStream = undefined;
      const mm0 = await encodePayload(json);
      expect(mm0.startsWith('CK0:')).toBe(true);
      expect(await decodePayload(mm0)).toEqual({ ok: true, json });
      expect(await decodePayload(mm1)).toEqual({ ok: false, error: 'cannot-decompress-here' });
    });
  });

  it('reports damaged payloads', async () => {
    const mm1 = await encodePayload(json);
    expect(await decodePayload(mm1.slice(0, 200))).toEqual({ ok: false, error: 'damaged-payload' });
    expect(await decodePayload('CK0:!!!')).toEqual({ ok: false, error: 'damaged-payload' });
    expect(await decodePayload('hello')).toEqual({ ok: false, error: 'not-a-payload' });
  });
});

describe('parsing an import', () => {
  it('accepts a backup file, an CK1/CK0 payload, a raw save envelope or a bare state', async () => {
    const backup = JSON.stringify(makeBackup(demo, { now, appVersion: 'test', device: 'Mac · Safari' }));
    const inputs = [backup, await encodePayload(backup), await encodePayload(backup, { compress: false }), encodeEnvelope(demo, 3, now, 'test'), JSON.stringify(demo)];
    for (const text of inputs) {
      const p = await parseBackupText(text);
      expect(p.ok).toBe(true);
      if (p.ok) expect(p.state).toEqual(demo);
    }
    const p = await parseBackupText(backup);
    expect(p.ok && describeBackup(p)).toEqual({
      ok: true,
      habits: demo.habits.length,
      checkins: expect.any(Number),
      friends: Object.keys(demo.pets).length,
      savedAt: now,
      device: 'Mac · Safari',
    });
    expect(JSON.parse(backup).format).toBe(BACKUP_FORMAT);
  });

  it('refuses garbage, newer versions and damaged states (with details)', async () => {
    expect(await parseBackupText('not json')).toEqual({ ok: false, error: 'not-a-backup' });
    expect(await parseBackupText('{"hello":1}')).toEqual({ ok: false, error: 'not-a-backup' });
    const newer = JSON.stringify(makeBackup({ ...demo, version: 99 }, { now, appVersion: 'x', device: 'y' }));
    expect(await parseBackupText(newer)).toEqual({ ok: false, error: 'made-by-newer-version' });
    const damaged = JSON.stringify(makeBackup({ ...demo, wallet: { ...demo.wallet, coins: -3 } }, { now, appVersion: 'x', device: 'y' }));
    const d = await parseBackupText(damaged);
    expect(d).toMatchObject({ ok: false, error: 'damaged-backup' });
    expect(!d.ok && d.details?.[0]).toContain('wallet.coins');
  });

  it('labels devices from the user agent', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Windows PC · Edge');
    expect(deviceLabel('')).toBe('Unknown device');
  });
});

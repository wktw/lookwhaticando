import { describe, expect, it } from 'vitest';
import { decodeState, type DecodeSource } from '@/state/decode';
import { lookArtOf } from '@/state/views/plantPresentation';
import { createInitialState } from '@/state/defaults';
import { MAX_TEXT } from '@/state/validate';

const sources: DecodeSource[] = ['main', 'backup-copy', 'import', 'snapshot', 'undo', 'current'];
const valid = { colour: 'twilight', shape: 'paired', on: '2026-09-29', shown: true, partnerId: 'deleted-partner' };
function candidate(confirmed: unknown = valid) {
  const state = createInitialState(Date.UTC(2026, 8, 29));
  return { ...state, plantLooks: { gone: { looks: [], shown: null, chosen: true, reads: {}, confirmed } } };
}

describe('independent D6 decoder and precedence review', () => {
  it('keeps optional confirmation through every decoder source and preserves old states without it', () => {
    for (const source of sources) {
      const absent = candidate(undefined);
      delete absent.plantLooks.gone.confirmed;
      expect(decodeState(absent, source).kind, source).toBe('ok');
      const input = candidate();
      const copy = structuredClone(input);
      const decoded = decodeState(input, source);
      expect(decoded.kind, source).toBe('ok');
      expect(input).toEqual(copy);
      if (decoded.kind === 'ok') {
        expect(decoded.state.plantLooks!.gone!.confirmed).toEqual(valid);
        expect(lookArtOf(decoded.state, 'gone')).toEqual({ colour: 'twilight', shape: 'paired' });
      }
    }
  });

  it.each([
    null, [], 'dawn', true, 7, {},
    { ...valid, colour: undefined }, { ...valid, shape: undefined }, { ...valid, on: undefined }, { ...valid, shown: undefined },
    { ...valid, on: '2026-02-30' }, { ...valid, on: '0000-01-01' }, { ...valid, on: '9999-12-31' },
    { ...valid, partnerId: '' }, { ...valid, partnerId: 'constructor' }, { ...valid, partnerId: '__proto__' },
    { ...valid, partnerId: 'x'.repeat(MAX_TEXT + 1) }, { ...valid, partnerId: {} },
  ])('rejects malformed confirmation through import, without throwing or changing bytes (%#)', (confirmed) => {
    const input = candidate(confirmed);
    const copy = structuredClone(input);
    expect(decodeState(input, 'import').kind).toBe('corrupt');
    expect(input).toEqual(copy);
  });
});

import { describe, expect, it } from 'vitest';
import { formatHash, isTabId, parseHash, tabForDigit, TAB_IDS } from '@/app/routes';

describe('hash routing', () => {
  it('parses every tab, with or without the leading slash', () => {
    for (const tab of TAB_IDS) {
      expect(parseHash(`#/${tab}`)).toEqual({ tab, rest: [] });
      expect(parseHash(`#${tab}`)).toEqual({ tab, rest: [] });
    }
  });

  it('defaults to Today for empty, unknown or malformed hashes', () => {
    for (const h of ['', '#', '#/', '#/nope', '#/%E0%A4%A', 'garbage']) expect(parseHash(h).tab).toBe('today');
  });

  it('keeps extra segments, decodes them, ignores query strings and case', () => {
    expect(parseHash('#/Meadow/pet-cat-calico/wardrobe?x=1')).toEqual({ tab: 'meadow', rest: ['pet-cat-calico', 'wardrobe'] });
    expect(parseHash('#/you/My%20Habit')).toEqual({ tab: 'you', rest: ['My Habit'] });
  });

  it('round-trips through formatHash', () => {
    expect(formatHash('progress')).toBe('#/progress');
    expect(formatHash('meadow', ['a b', 'c/d'])).toBe('#/meadow/a%20b/c%2Fd');
    const parsed = parseHash(formatHash('capsules', ['kitty']));
    expect(parsed).toEqual({ tab: 'capsules', rest: ['kitty'] });
  });

  it('maps digit shortcuts 1–5 to tabs in order', () => {
    expect(TAB_IDS.map((_, i) => tabForDigit(String(i + 1)))).toEqual([...TAB_IDS]);
    for (const k of ['0', '6', 'n', '', '1.5']) expect(tabForDigit(k)).toBeNull();
  });

  it('recognizes tab ids', () => {
    expect(isTabId('today')).toBe(true);
    expect(isTabId('settings')).toBe(false);
  });
});

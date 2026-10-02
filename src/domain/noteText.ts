/** Notes share one grapheme cap between the editor and the reducer (WP-C6). */
export const MAX_NOTE_LENGTH = 280;
// A composed grapheme may itself be arbitrarily long. Never exceed the save decoder's MAX_TEXT.
const MAX_NOTE_UNITS = 10_000;
let segmenter: Intl.Segmenter | undefined;

/** Leaves complete user-perceived characters, including accents and joined emoji. */
export function limitNote(text: string): string {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let out = '';
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (count === MAX_NOTE_LENGTH || out.length + segment.length > MAX_NOTE_UNITS) break;
    out += segment;
    count++;
  }
  return out;
}

/**
 * The voice lint's core rules (DESIGN §12, docs/VOICE.md), shared by tests/unit/voice.test.ts (every
 * string under src, VOICE.md, the caption matrix) and the view-model tests that word formatter
 * output (tests/unit/state/m1-views.test.ts).
 */
import { SECRET_REVEAL } from '@/catalog/lines';

/* ------------------------------------------------------------------------ */
/* The rules                                                                 */
/* ------------------------------------------------------------------------ */

interface Rule {
  why: string;
  pattern: RegExp;
}

export const A = `['’]`; // either apostrophe

/** Words and patterns catkin never uses in copy (DESIGN §12, VOICE.md §2 and §3), with the reason shown on failure. */
const RULES: readonly Rule[] = [
  {
    why: 'pun',
    pattern:
      /\b(purr?-?fect\w*|paw-?(some|sitive|sible|fect|esome)|moo-?(tivat\w*|vellous|ving)|udderly|amoo?sing|meow-?(velous|gical|ntastic)|hoppy|hare-?raising|fur-?(ever|tastic|bulous)|bee-?utiful|un-?be-?leaf-?able|leaf-?tastic|grow-?tastic|plant-?astic|toad-?ally|ribbit-?ing|quack(ers|-?tastic)|bear-?y|un-bear-?able|unbear-able|cat-?titude|claw-?some|purr-?sonal|hiss-?tory|holy cow|cow-?abunga|leaf it|aloe-?(ha|vely)|thyme (flies|for)|sow (proud|much|excited))\b/i,
  },
  { why: '"yay" and friends', pattern: /\b(y+a+y+|woo+(hoo+)?|yippee|hooray)\b/i },
  { why: '"bestie"', pattern: /\b(best(ie|y)s?|bff)\b/i },
  {
    why: 'baby talk',
    pattern:
      /\b(smol|floof\w*|wittle|widdle|itty[- ]bitty|teeny|sweetie|cutie|fur ?bab(y|ies)|heckin|doggo|pupper|kitty|birb|nom( nom)?|yummy|delish|boop\w*|blep|mlem|sploot|snoot|tumm(y|ies)|toe ?beans|snuggl\w*|chonk\w*|zoomies|all gone)\b/i,
  },
  { why: 'stretched words', pattern: /\b\w*([a-z])\1\1\w*\b/i },
  { why: '"cozy"', pattern: /\bco[sz](y|ier|iest|ily|iness)\b/i },
  {
    why: 'pep talk',
    pattern: new RegExp(
      `\\b(you(${A}ve| have)? got this|keep(s|ing)? it up|kept it up|keep up the|great job|good job|well done|nice work|proud of you|go you|way to go|good for you|you did it|crush(ing|ed)? it|killing it|you can do (it|this)|nailed it|amazing|awesome|believe in yourself|look at you go|don${A}?t give up|stay strong|superstar|you${A}re (doing (great|amazing|so well)|on a roll)|ready to grow)\\b`,
      'i',
    ),
  },
  {
    why: 'platitude',
    pattern:
      /\b(at your own pace|one (day|step|nap) at a time|progress,? not perfection|every (little )?(step|bit) counts|baby steps|small steps|tiny steps|start small|small wins|little by little|rest is productive|self-?care matters|be (kind|gentle) (to|with) yourself|you deserve|journey|you are enough|self-?love|your future self|growth mindset)\b/i,
  },
  {
    why: 'a count of what is undone',
    pattern: new RegExp(
      `\\b(\\d+\\s+(more\\s+)?(habits?\\s+|plants?\\s+|pots?\\s+)?(left|to go|remaining)|only \\d+ (more|left)|more by (mon|tue|wed|thu|fri|sat|sun)|almost (there|done)|nearly there|so close|still to (do|water)|not (yet )?(done|watered|finished|completed)(?! after all)|incomplete|unfinished|undone|you haven${A}?t|don${A}?t forget|last chance|(?<!no |n${A}t )hurry)\\b|\\b0 (in|on|of)\\b`,
      'i',
    ),
  },
  {
    why: 'a mention of a gap',
    pattern: new RegExp(
      `\\b(welcome back|been (a (long )?while|ages|too long|(a )?long time|some time)|long time no see|where (have|were|did) you|haven${A}?t seen you|while you were (away|gone|out)|since (you|your) (last|were)|days? (away|off the app)|gap|absen(ce|t)|comeback|back up after|you${A}re back|have you back|see you again|you in a while|been \\d+ (days?|weeks?|months?)|\\d+ days? since)\\b`,
      'i',
    ),
  },
  { why: 'a comparison to a better past', pattern: /\b((fewer|less|lower|worse) than|down from|dropped (to|from|by|below)|slipp(ed|ing)|not as (many|much|often|good)|used to (be|do|water|check)|finally got it right)\b/i },
  {
    why: 'missed / failed / lost / broken / behind',
    pattern: new RegExp(
      `\\b(miss(ed|es|ing)?|fail(ed|s|ing|ure|ures)?|los(e|es|ing|t)|broken?|break(s|ing)? (the|your|a) (streak|chain|run)|(fall(en|ing|s)?|fell|get(ting)?|got|are|is|you${A}re|running|still|left|way)\\s+behind\\b(?!\\s+(the|a|an|one|two|every|each|some|\\{))|behind (on|with|schedule|pace|by)|catch(es|ing)? up)\\b`,
      'i',
    ),
  },
  { why: 'a streak of 0', pattern: /\b(0\s*(-|\s)?(days?|in a row|weeks?|months?)|zero)\b/i },
  { why: '"streak" (say "in a row")', pattern: /\bstreaks?\b/i },
  { why: '"badge" (say "pin")', pattern: /\bbadges?\b/i },
  { why: '"rewards" (say the thing: "+5", "a ticket")', pattern: /(?<!Quiet )\brewards?\b/i },
  { why: 'stars or stardust as currency (say stamps or swaps)', pattern: /(\b\d[\d,]*\s*(stars?|stardust)\b|\bstardust\b|\b(earn(s|ed)?|spend|spent|costs?|paid in|pay|takes)\s+(\d+\s+)?stars?\b|\bstars? (come|came|comes) from\b)/i },
  { why: 'the old world (Mochi Meadow, the Wishing Well)', pattern: /\b(mochi|wishing well|meadow)\b/i },
  {
    why: 'an old word (VOICE.md §3 has the plain one)',
    pattern: /\b(congratulations|oops|uh oh|level(led|ed)? up|unlock(ed|s|ing)?|achievements?|crank(s|ed|ing)?|machines?|wish(es|ing)?|(weekly|monthly|sunday|your) letters?|check(ed|s)?[- ]in)\b/i,
  },
  { why: 'an old tier name (say Classic, Special, Super rare)', pattern: /\b(Common|Uncommon|Ultra rare)\b/ },
  { why: 'a pet by pronoun (say the name: "Find {name} a plant", VOICE §1)', pattern: /\b(find|let|give|bring) (them|him|her) (a|an|the|choose|pick)\b/i },
];

export const GENDERED = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
export const PET_PRONOUN = /\b(he|she|him|her|his|hers|himself|herself|they|them|their|theirs|themselves|themself|its|itself)\b/i;
export const THEY_THEM = /\b(they|them|their|theirs|themselves|themself)\b/i;
export const FIRST_PERSON = new RegExp(`(\\bI\\b|\\bI${A}(m|ll|ve|d)\\b|\\b(me|my|mine|myself|we|us|our|ours)\\b)`, 'i');
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const EMOJI_ALLOWED = new Set(['©', '®', '™']);
/**
 * Decorative symbols the Mochi era used as chrome: the Miscellaneous Symbols and Dingbats blocks
 * (sparkles, stars, hearts, flowers, moons) and the star operator. The check mark ✓ is chrome
 * catkin uses ("Tiny version ✓"), so it stays.
 */
const DINGBATS = /[\u2600-\u26FF\u2700-\u27BF\u22C6](?<!\u2713)/u;
/** Numbers are numerals mid-sentence ("4 evenings"); spelled out only to open one, or in a note's P.S. */
const SPELLED_COUNT = /(?<!(?:[.?!:]\s|^|-))\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(times|evenings|mornings|afternoons|days|capsules|coins|stamps|swaps|waterings)\b/i;

const SECRET_SHAPE = new RegExp(`^${SECRET_REVEAL.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '.+?')}$`);

/** Everything wrong with one piece of copy (empty when it's fine). */
export function lint(text: string, opts: { prose?: boolean; pronouns?: RegExp | null } = {}): string[] {
  const out: string[] = [];
  const prose = opts.prose ?? true;
  for (const ch of text.match(new RegExp(EMOJI.source, 'gu')) ?? []) if (!EMOJI_ALLOWED.has(ch)) out.push(`emoji ${JSON.stringify(ch)}`);
  const dingbat = DINGBATS.exec(text);
  if (dingbat) out.push(`a decorative symbol ${JSON.stringify(dingbat[0])}`);
  if (!prose) return out;
  if (/[A-Za-z]'[A-Za-z-]/.test(text)) out.push('a straight apostrophe (use ’)');
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs > 0 && !(bangs === 1 && SECRET_SHAPE.test(text))) out.push('an exclamation mark (only the Secret reveal gets one)');
  for (const rule of RULES) {
    const m = rule.pattern.exec(text);
    if (m) out.push(`${rule.why}: "${m[0]}"`);
  }
  const spelled = SPELLED_COUNT.exec(text);
  if (spelled && !/P\.S\.[^.]*$/.test(text.slice(0, spelled.index))) out.push(`a count spelled out mid-sentence: "${spelled[0]}"`);
  const pronouns = opts.pronouns === undefined ? GENDERED : opts.pronouns;
  const p = pronouns?.exec(text);
  if (p) out.push(`a pronoun: "${p[0]}"`);
  return out;
}


/**
 * The voice lint (DESIGN §12, docs/VOICE.md). Fails the build on words catkin never uses, on
 * exclamation marks (one is allowed, in the Secret reveal), on emoji and decorative symbols, on
 * pet pronouns and on "stars" or "stardust" as currency. It reads:
 * - every string literal and JSX text under VOICE_SCAN_DIRS (parsed with the TypeScript compiler,
 *   so comments, types, imports and developer errors are skipped);
 * - every "double-quoted" line in docs/VOICE.md (banned examples there sit in `backticks`);
 * - the caption matrix and templates in src/catalog/lines.ts, with the stricter pet rules.
 * It also checks the matrix itself: coverage, species filters and the no-repeat rule.
 *
 * A developer-only string can opt out with a `// voice-ignore` comment on its line.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { BADGES } from '@/catalog/badges';
import { PERSONALITIES, NAME_SUGGESTIONS, TREAT_TAG_HINTS } from '@/catalog/personalities';
import { TEMPLATES } from '@/catalog/templates';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { PETS, SECRET_IDS } from '@/catalog/collectibles';
import { PLANTS } from '@/catalog/collectibles';
import { RARITIES, SPECIES, type Personality, type Species } from '@/catalog/types';
import {
  ARCHETYPES,
  ARCHETYPE_BY_ICON,
  BLOOM_LINES,
  CAPTIONS,
  CHECKIN_ASIDES,
  CONTEXT_SLOTS,
  FRIENDSHIP_LEVELS,
  KNOWN_FOR,
  LINE_CONTEXTS,
  RECENT_WINDOW,
  REVEAL_LINES,
  SECRET_LINES,
  SECRET_REVEAL,
  SHARED_CAPTIONS,
  STAGE_EVENTS,
  STAGE_LINES,
  fillLine,
  fitsSpecies,
  greetingPeriod,
  lineText,
  linesFor,
  numberWord,
  pickFrom,
  pickLine,
  plantPhrase,
  withArticle,
  type Line,
  type LineContext,
} from '@/catalog/lines';

/** Where the lint looks for UI strings. The lead extends this to the UI at integration. */
export const VOICE_SCAN_DIRS: readonly string[] = ['src/catalog'];

/**
 * Known exceptions, as `file#propertyKey`. machines.ts keeps a seasonal `emoji` field that is not
 * ours to change (NOTES-voice.md asks for it to be emptied); remove the entry once it is.
 */
const KNOWN_EXCEPTIONS: ReadonlySet<string> = new Set(['src/catalog/machines.ts#emoji']);

const VOICE_MD = 'docs/VOICE.md';

/* ------------------------------------------------------------------------ */
/* The rules                                                                 */
/* ------------------------------------------------------------------------ */

interface Rule {
  why: string;
  pattern: RegExp;
}

const A = `['’]`; // either apostrophe

/** Words and patterns catkin never uses in copy (DESIGN §12), with the reason shown on failure. */
const RULES: readonly Rule[] = [
  {
    why: 'pun',
    pattern:
      /\b(purr?-?fect\w*|paw-?(some|sitive|sible|fect|esome)|moo-?(tivat\w*|vellous|ving)|udderly|amoo?sing|meow-?(velous|gical|ntastic)|hoppy|hare-?raising|fur-?(ever|tastic|bulous)|bee-?utiful|un-?be-?leaf-?able|leaf-?tastic|grow-?tastic|plant-?astic|toad-?ally|ribbit-?ing|quack(ers|-?tastic)|bear-?y|unbearable|cat-?titude|claw-?some|purr-?sonal|hiss-?tory|holy cow|cow-?abunga|leaf it|aloe|thyme|sow (proud|much|excited))\b/i,
  },
  { why: '"yay" and friends', pattern: /\b(y+a+y+|woo+(hoo+)?|yippee|hooray)\b/i },
  { why: '"bestie"', pattern: /\b(best(ie|y)s?|bff)\b/i },
  { why: 'baby talk', pattern: /\b(smol|floof\w*|wittle|widdle|itty[- ]bitty|teeny|sweetie|cutie|fur ?bab(y|ies)|heckin|doggo|pupper|kitty|birb|nom( nom)?|yummy|delish|boop\w*|blep|mlem|sploot|snoot)\b/i },
  { why: 'stretched words', pattern: /\b\w*([a-z])\1\1\w*\b/i },
  { why: '"cozy"', pattern: /\bco[sz](y|ier|iest|ily|iness)\b/i },
  {
    why: 'pep talk',
    pattern: new RegExp(
      `\\b(you(${A}ve| have)? got this|keep it up|keep up the|great job|good job|well done|proud of you|go you|crush(ing|ed)? it|killing it|you can do (it|this)|nailed it|amazing|awesome|believe in yourself|look at you go|don${A}?t give up|stay strong|superstar|you${A}re doing (great|amazing|so well))\\b`,
      'i',
    ),
  },
  {
    why: 'platitude',
    pattern: /\b(at your own pace|one (day|step) at a time|progress,? not perfection|every (little )?(step|bit) counts|baby steps|small steps|tiny steps|be (kind|gentle) (to|with) yourself|you deserve|journey|you are enough|self-?love|your future self|growth mindset)\b/i,
  },
  {
    why: 'a count of what is undone',
    pattern: new RegExp(
      `\\b(\\d+\\s+(more\\s+)?(habits?\\s+|plants?\\s+|pots?\\s+)?(left|to go|remaining)|still to (do|water)|not (yet )?(done|watered|finished|completed)|incomplete|unfinished|undone|you haven${A}?t|don${A}?t forget|last chance|hurry)\\b`,
      'i',
    ),
  },
  {
    why: 'a mention of a gap',
    pattern: new RegExp(
      `\\b(welcome back|been (a (long )?while|ages|too long|(a )?long time|some time)|long time no see|where (have|were|did) you|haven${A}?t seen you|while you were (away|gone|out)|since (you|your) (last|were)|days? (away|off the app)|gap|absen(ce|t)|comeback|back up after)\\b`,
      'i',
    ),
  },
  { why: 'a comparison to a better past', pattern: /\b((fewer|less|lower|worse) than|down from|dropped (to|from|by|below)|slipp(ed|ing)|not as (many|much|often|good)|used to (be|do|water|check))\b/i },
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
  { why: 'stars or stardust as currency (say stamps or swaps)', pattern: /(\b\d[\d,]*\s*(stars?|stardust)\b|\bstardust\b|\b(earn(s|ed)?|spend|spent|costs?|paid in|pay|takes)\s+(\d+\s+)?stars?\b|\bstars? (come|came|comes) from\b)/i },
  { why: 'the old world (Mochi Meadow, the Wishing Well)', pattern: /\b(mochi|wishing well)\b/i },
];

const GENDERED = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
const PET_PRONOUN = /\b(he|she|him|her|his|hers|himself|herself|they|them|their|theirs|themselves|themself|its|itself)\b/i;
const THEY_THEM = /\b(they|them|their|theirs|themselves|themself)\b/i;
const FIRST_PERSON = new RegExp(`(\\bI\\b|\\bI${A}(m|ll|ve|d)\\b|\\b(me|my|mine|myself|we|us|our|ours)\\b)`, 'i');
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const EMOJI_ALLOWED = new Set(['©', '®', '™']);
/** Decorative symbols the Mochi era used as chrome: sparkles, stars, hearts, flowers. */
const DINGBATS = /[\u2726\u2727\u2605\u2606\u2661\u2665\u273F\u2740\u2728\u2764]/u;

const SECRET_SHAPE = new RegExp(`^${SECRET_REVEAL.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{\w+\\?\}/g, '.+?')}$`);

/** Everything wrong with one piece of copy (empty when it's fine). */
function lint(text: string, opts: { prose?: boolean; pronouns?: RegExp | null } = {}): string[] {
  const out: string[] = [];
  const prose = opts.prose ?? true;
  for (const ch of text.match(new RegExp(EMOJI.source, 'gu')) ?? []) if (!EMOJI_ALLOWED.has(ch)) out.push(`emoji ${JSON.stringify(ch)}`);
  if (DINGBATS.test(text)) out.push('a decorative symbol');
  if (!prose) return out;
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs > 0 && !(bangs === 1 && SECRET_SHAPE.test(text))) out.push('an exclamation mark (only the Secret reveal gets one)');
  for (const rule of RULES) {
    const m = rule.pattern.exec(text);
    if (m) out.push(`${rule.why}: "${m[0]}"`);
  }
  const pronouns = opts.pronouns === undefined ? GENDERED : opts.pronouns;
  const p = pronouns?.exec(text);
  if (p) out.push(`a pronoun: "${p[0]}"`);
  return out;
}

/** Ids, keys and hex colours are data, not copy: only emoji checks apply to them. */
function isProse(s: string): boolean {
  if (!/[A-Za-z]/.test(s) || /^#[0-9a-f]{3,8}$/i.test(s)) return false;
  return /\s/.test(s) || /^[A-Z]/.test(s) || /[’'!?.,]/.test(s);
}

/* ------------------------------------------------------------------------ */
/* Scanners                                                                  */
/* ------------------------------------------------------------------------ */

interface Found {
  where: string;
  text: string;
  key?: string;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

/** Every user-visible string in a TS/TSX file: literals, template text and JSX text. */
function stringsIn(file: string): Found[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = relative(process.cwd(), file).split('\\').join('/');
  const out: Found[] = [];
  const push = (node: ts.Node, text: string, key?: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    if (lines[line]?.includes('voice-ignore')) return;
    if (text.trim()) out.push({ where: `${rel}:${line + 1}`, text, key });
  };
  const visit = (node: ts.Node, key?: string): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node) || ts.isThrowStatement(node)) return;
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return;
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /Error$/.test(node.expression.text)) return;
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (/^console\./.test(callee) || node.expression.kind === ts.SyntaxKind.ImportKeyword) return;
    }
    if (ts.isElementAccessExpression(node)) return visit(node.expression, key);
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : undefined;
      return visit(node.initializer, name ?? key);
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return push(node, node.text, key);
    if (ts.isTemplateExpression(node)) {
      push(node, node.head.text + node.templateSpans.map((s) => `1${s.literal.text}`).join(''), key);
      for (const span of node.templateSpans) visit(span.expression, key);
      return;
    }
    if (ts.isJsxText(node)) return push(node, node.text.trim(), key);
    ts.forEachChild(node, (child) => visit(child, key));
  };
  visit(sf);
  return out.filter((f) => !KNOWN_EXCEPTIONS.has(`${rel}#${f.key}`));
}

/**
 * The copy in VOICE.md: every "double-quoted" string outside code. A quote may wrap onto the next
 * line of a paragraph, but never across a table cell or a blank line.
 */
function voiceMdLines(): string[] {
  const md = readFileSync(VOICE_MD, 'utf8')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  return [...md.matchAll(/"([^"]+)"/g)].map((m) => {
    const text = m[1]!;
    if (/\n\s*\n|\|/.test(text) || text.length > 400) throw new Error(`Unbalanced quotes in ${VOICE_MD} near: ${text.slice(0, 80)}`);
    return text.replace(/\s*\n\s*/g, ' ');
  });
}

function report(found: { where: string; text: string; problems: string[] }[]): string {
  return found.map((f) => `${f.where}  ${JSON.stringify(f.text)}\n    ${f.problems.join('; ')}`).join('\n');
}

/* ------------------------------------------------------------------------ */
/* Pet lines, gathered from lines.ts and the catalog                         */
/* ------------------------------------------------------------------------ */

const PERSONALITY_IDS = PERSONALITIES.map((p) => p.id);

/** Every line about a pet, with the species it can be shown to. */
function petLines(): { where: string; text: string; species: readonly Species[] }[] {
  const out: { where: string; text: string; species: readonly Species[] }[] = [];
  const add = (where: string, line: Line) => out.push({ where, text: lineText(line), species: typeof line === 'string' ? SPECIES : line.species });
  for (const p of PERSONALITY_IDS) for (const c of LINE_CONTEXTS) CAPTIONS[p][c].forEach((l) => add(`CAPTIONS.${p}.${c}`, l));
  for (const c of LINE_CONTEXTS) SHARED_CAPTIONS[c].forEach((l) => add(`SHARED_CAPTIONS.${c}`, l));
  CHECKIN_ASIDES.awake.forEach((l) => add('CHECKIN_ASIDES.awake', l));
  CHECKIN_ASIDES.asleep.forEach((l) => add('CHECKIN_ASIDES.asleep', l));
  for (const lvl of FRIENDSHIP_LEVELS) lvl.lines.forEach((l) => add(`FRIENDSHIP_LEVELS.${lvl.level}`, l));
  for (const a of ARCHETYPES) [...KNOWN_FOR[a].starting, ...KNOWN_FOR[a].settled].forEach((l) => add(`KNOWN_FOR.${a}`, l));
  for (const [id, line] of Object.entries(SECRET_LINES)) {
    const pet = PETS.find((p) => p.id === id);
    add(`SECRET_LINES.${id}`, pet ? { text: line, species: [pet.species] } : line);
  }
  for (const p of PERSONALITIES) add(`PERSONALITIES.${p.id}.blurb`, p.blurb);
  for (const [tag, hint] of Object.entries(TREAT_TAG_HINTS)) add(`TREAT_TAG_HINTS.${tag}`, hint);
  return out;
}

const MAMMALS: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster'];

/**
 * Body parts and behaviours that only some species have. A line shown to a species must not
 * mention anything that species lacks: no paws for frogs or ducks, no wings for cows.
 */
const ANATOMY: readonly [RegExp, readonly Species[]][] = [
  [/\bpaws?\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\btails?\b/i, ['cat', 'cow', 'dog', 'bunny', 'duck']],
  [/\bwhiskers?\b/i, ['cat', 'dog', 'bunny', 'hamster']],
  [/\bfur(ry)?\b/i, MAMMALS],
  [/\bpurr/i, ['cat']],
  [/\bears?\b/i, MAMMALS],
  [/\bnoses?\b|\bsniff/i, MAMMALS],
  [/\bsnout|\bmuzzle/i, ['cow', 'dog', 'bear']],
  [/\byawn/i, MAMMALS],
  [/\blick/i, MAMMALS],
  [/\bcurl(s|ed|ing)? up\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\bgroom|\b(morning|face) wash\b|\bwash(es|ed|ing) (the |a )?(face|paws?|ears?)\b/i, ['cat', 'bunny', 'hamster']],
  [/\bchew/i, MAMMALS],
  [/\bnibbl/i, ['cat', 'cow', 'bunny', 'hamster', 'duck']],
  [/\bclaws?\b|\bscratch/i, ['cat', 'dog', 'bear', 'hamster', 'bunny']],
  [/\bknead/i, ['cat']],
  [/\bpounc/i, ['cat', 'dog']],
  [/\bloaf/i, ['cat', 'cow']],
  [/\bflop/i, MAMMALS],
  [/\broll(s|ed|ing)? over\b|\bbelly up\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\bslow[- ]blink/i, ['cat']],
  [/\bwag/i, ['dog']],
  [/\bwings?\b|\bfeathers?\b(?! duster)|\bbeak\b|\bwaddl|\bdabbl|\bpreen|\bwebbed/i, ['duck']],
  [/\bhoo(f|ves)\b|\bhorns?\b|\bcud\b|\bnose-lick/i, ['cow']],
  [/\bthroat\b|\bcroak/i, ['frog']],
  [/\b(stuff|fill|pack)\w* (both |one |the )?cheeks?\b|\bcheeks? (full|pouch)/i, ['hamster']],
  [/\bcheeks?\b/i, MAMMALS],
  [/\bmane\b/i, ['bunny']],
  [/\bbark(s|ed|ing)?\b|\bwoof/i, ['dog']],
  [/\bquack|\bwek\b/i, ['duck']],
  [/\bmoos?\b/i, ['cow']],
  [/\bfluff/i, [...MAMMALS, 'duck']],
];

function anatomyProblems(text: string, species: readonly Species[]): string[] {
  const out: string[] = [];
  for (const [pattern, allowed] of ANATOMY) {
    const m = pattern.exec(text);
    if (!m) continue;
    const wrong = species.filter((s) => !allowed.includes(s));
    if (wrong.length) out.push(`"${m[0]}" doesn't suit ${wrong.join(', ')}`);
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* The lint                                                                  */
/* ------------------------------------------------------------------------ */

describe('voice lint (DESIGN §12)', () => {
  it('every UI string under VOICE_SCAN_DIRS follows the voice', () => {
    const files = VOICE_SCAN_DIRS.flatMap((d) => sourceFiles(d));
    expect(files.length).toBeGreaterThan(0);
    const bad = files
      .flatMap((f) => stringsIn(f))
      .map((f) => ({ ...f, problems: lint(f.text, { prose: isProse(f.text) }) }))
      .filter((f) => f.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('every quoted line in docs/VOICE.md follows the voice', () => {
    const quoted = voiceMdLines();
    expect(quoted.length).toBeGreaterThan(300);
    const pronouns = new RegExp(`${GENDERED.source}|${THEY_THEM.source}`, 'i');
    const bad = quoted.map((text) => ({ where: VOICE_MD, text, problems: lint(text, { pronouns }) })).filter((f) => f.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('pet lines give the animals no pronouns and no voice of their own', () => {
    const bad = petLines()
      .map((l) => ({
        ...l,
        problems: [...lint(l.text, { pronouns: PET_PRONOUN }), ...(FIRST_PERSON.test(l.text) ? ['first person: the animals never speak'] : [])],
      }))
      .filter((l) => l.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('the Secret reveal holds the only exclamation mark', () => {
    expect((SECRET_REVEAL.match(/!/g) ?? []).length).toBe(1);
    expect(lint(SECRET_REVEAL)).toEqual([]);
    expect(lint('Your plant is in flower!')).not.toEqual([]);
    expect(lint('No. 02 · Cows, the secret one! A Highland, about the size of your thumb.')).toEqual([]);
    expect(lint('No. 02 · Cows, the secret one!! A Highland.')).not.toEqual([]);
  });

  it('catches the things it is for', () => {
    const caught = [
      'Purrfect!',
      'Yay, all done',
      'Hi bestie',
      'So cozy in here',
      'You got this',
      'Grow at your own pace',
      '3 habits left today',
      'Welcome back',
      'It’s been a while',
      'Fewer than last week',
      'You missed a day',
      'Streak lost',
      '0 days in a row',
      '+2 stars',
      '12 stardust',
      'Walk 🌱',
      'Rare ✨',
      'Pudding wags her tail',
      'New badge',
      'smol bean',
      'You’re falling behind on Walk',
      'You’re behind.',
      'It’s been a long time',
      'Down from 80%',
    ];
    for (const text of caught) expect(lint(text), text).not.toEqual([]);
    const fine = ['Walk, watered. +5 · Pudding opened one eye.', 'A ribbon, tied just behind one ear.', 'Night coats and lamps, paid in stamps.', 'Navy flannel with small yellow stars.', '26 of the last 30 days', '12 in a row', '{name} is behind the biggest pot for now.', '{name} dropped the act.'];
    for (const text of fine) expect(lint(text), text).toEqual([]);
  });

  it('pins have no emoji, sentence-case names and plain descriptions', () => {
    const proper = new Set(['Field', 'Guide', 'Evergreen', 'Blooming', 'Rare', 'Super', 'Secret']);
    for (const b of BADGES) {
      expect(b.emoji, b.id).toBe('');
      const [first, ...rest] = b.name.split(' ');
      expect(first![0], b.id).toMatch(/[A-Z]/);
      for (const w of rest) expect(w[0] === w[0]!.toLowerCase() || proper.has(w), `${b.id}: ${w}`).toBe(true);
      expect(b.description, b.id).toMatch(/^[A-Z].*\.$/);
    }
    expect(new Set(BADGES.map((b) => b.name)).size).toBe(BADGES.length);
  });

  it('habit templates read well in "{name}, watered."', () => {
    for (const t of TEMPLATES) {
      expect(t.name.length, t.id).toBeLessThanOrEqual(24);
      expect(t.name, t.id).toMatch(/^[A-Z][^A-Z]*$/);
      if (t.tiny) expect(t.tiny.label, t.id).toMatch(/^[A-Z][^0-9]*$/);
    }
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
  });

  it('personalities carry no emoji, and names stay plain', () => {
    for (const p of PERSONALITIES) expect(p.emoji, p.id).toBe('');
    for (const names of Object.values(NAME_SUGGESTIONS)) for (const n of names) expect(n).toMatch(/^[A-Z][a-z]+$/);
  });
});

/* ------------------------------------------------------------------------ */
/* The caption matrix                                                        */
/* ------------------------------------------------------------------------ */

describe('caption matrix (src/catalog/lines.ts)', () => {
  const personalities = PERSONALITY_IDS as readonly Personality[];

  it('covers 10 personalities × every context with at least 4 lines for every species', () => {
    expect(personalities).toHaveLength(10);
    for (const p of personalities) {
      for (const c of LINE_CONTEXTS) {
        const neutral = CAPTIONS[p][c].filter((l) => typeof l === 'string');
        expect(neutral.length, `${p}.${c}`).toBeGreaterThanOrEqual(4);
        // Enough for the no-repeat rule to hold for every species.
        for (const s of SPECIES) expect(linesFor(c, p, s).length, `${p}.${c}.${s}`).toBeGreaterThan(RECENT_WINDOW);
      }
    }
  });

  it('every caption leads with the pet’s name, is one short sentence and uses only its context’s slots', () => {
    const check = (c: LineContext, line: Line, where: string) => {
      const text = lineText(line);
      expect(text.startsWith('{name}'), where + ': ' + text).toBe(true);
      expect(text.length, text).toBeLessThanOrEqual(90);
      expect(text, text).toMatch(/[.]$/);
      expect(text, text).not.toMatch(/ {2}/);
      for (const [, slot] of text.matchAll(/\{(\w+)\}/g)) expect(CONTEXT_SLOTS[c], `${where}: {${slot}} in ${text}`).toContain(slot);
    };
    for (const p of personalities) for (const c of LINE_CONTEXTS) CAPTIONS[p][c].forEach((l) => check(c, l, `${p}.${c}`));
    for (const c of LINE_CONTEXTS) SHARED_CAPTIONS[c].forEach((l) => check(c, l, `shared.${c}`));
  });

  it('never repeats a line within a context’s pool', () => {
    for (const p of personalities) {
      for (const c of LINE_CONTEXTS) {
        const texts = [...CAPTIONS[p][c], ...SHARED_CAPTIONS[c]].map(lineText);
        expect(new Set(texts).size, `${p}.${c}`).toBe(texts.length);
      }
    }
  });

  it('pickLine never repeats any of the last 5 lines in a context', () => {
    for (const p of personalities) {
      for (const c of LINE_CONTEXTS) {
        for (const s of SPECIES) {
          const recent: string[] = [];
          for (let i = 0; i < 40; i++) {
            const line = pickLine(c, p, s, i * 7919 + 13, recent);
            expect(recent.slice(-RECENT_WINDOW), `${p}.${c}.${s} #${i}`).not.toContain(line);
            recent.push(line);
          }
          expect(new Set(recent).size, `${p}.${c}.${s} variety`).toBeGreaterThan(RECENT_WINDOW);
        }
      }
    }
  });

  it('pickLine accepts Math.random() seeds and is deterministic for a seed', () => {
    const recent: string[] = [];
    for (let i = 0; i < 30; i++) {
      const line = pickLine('tap', 'sunny', 'cow', Math.random(), recent);
      expect(recent.slice(-RECENT_WINDOW)).not.toContain(line);
      recent.push(line);
    }
    expect(pickLine('night', 'sleepy', 'cat', 42)).toBe(pickLine('night', 'sleepy', 'cat', 42));
  });

  it('pickLine respects species filters', () => {
    const byText = new Map<string, Line>();
    for (const p of personalities) for (const c of LINE_CONTEXTS) for (const l of [...CAPTIONS[p][c], ...SHARED_CAPTIONS[c]]) byText.set(lineText(l), l);
    for (const p of personalities) {
      for (const c of LINE_CONTEXTS) {
        for (const s of SPECIES) {
          for (const text of linesFor(c, p, s)) expect(fitsSpecies(byText.get(text)!, s), `${text} for a ${s}`).toBe(true);
          for (let i = 0; i < 25; i++) expect(fitsSpecies(byText.get(pickLine(c, p, s, i))!, s)).toBe(true);
        }
      }
    }
  });

  it('lines for events that can happen at night never put the pet in the sun', () => {
    const anyHour: LineContext[] = ['checkin', 'restDay', 'perfectDay', 'welcomeHome', 'fed', 'fedFavourite', 'newWear', 'newArrival'];
    const daylight = /\b(in|into|from|across) the (sun|sunbeam|beam)\b|\b(afternoon|first) light\b|\bmorning sun\b/i;
    for (const p of personalities) for (const c of anyHour) for (const l of [...CAPTIONS[p][c], ...SHARED_CAPTIONS[c]]) expect(lineText(l), `${p}.${c}`).not.toMatch(daylight);
  });

  it('gives each species its true behaviour', () => {
    const tells: Record<Species, RegExp> = {
      cat: /slow blink|slow-blink/,
      cow: /cud/,
      frog: /throat/,
      bunny: /nose/,
      hamster: /cheek/,
      dog: /wag/,
      duck: /wing/,
      bear: /sat up|sits up|sitting up/,
    };
    for (const s of SPECIES) {
      const own = SHARED_CAPTIONS.tap.filter((l) => typeof l !== 'string' && l.species.length === 1 && l.species[0] === s).map(lineText);
      expect(own.some((t) => tells[s].test(t)), s).toBe(true);
    }
  });

  it('no line mentions anatomy or behaviour the species doesn’t have', () => {
    const bad = petLines()
      .map((l) => ({ ...l, problems: anatomyProblems(l.text, l.species) }))
      .filter((l) => l.problems.length > 0);
    for (const p of PERSONALITIES) for (const line of p.lines) expect(anatomyProblems(line, SPECIES), line).toEqual([]);
    const flavor = PETS.map((p) => ({ where: p.id, text: p.flavor, problems: anatomyProblems(p.flavor, [p.species]) })).filter((f) => f.problems.length > 0);
    expect([...bad, ...flavor], report([...bad, ...flavor])).toEqual([]);
  });
});

describe('the other templates in lines.ts', () => {
  it('check-in asides suit every species, awake and asleep', () => {
    for (const s of SPECIES) {
      const awake = CHECKIN_ASIDES.awake.filter((l) => fitsSpecies(l, s));
      const asleep = CHECKIN_ASIDES.asleep.filter((l) => fitsSpecies(l, s));
      expect(awake.length, s).toBeGreaterThan(RECENT_WINDOW);
      expect(asleep.length, s).toBeGreaterThanOrEqual(3);
      for (const l of [...awake, ...asleep]) expect(lineText(l).length, lineText(l)).toBeLessThanOrEqual(48);
    }
    const recent: string[] = [];
    for (let i = 0; i < 20; i++) {
      const line = pickFrom(CHECKIN_ASIDES.awake, 'frog', i, recent);
      expect(recent.slice(-RECENT_WINDOW)).not.toContain(line);
      expect(line).not.toMatch(/wag|wing|nose|ear|cheek|cud/);
      recent.push(line);
    }
  });

  it('plants have a line for each of the 8 stages and a bloom for every species', () => {
    expect(STAGE_LINES).toHaveLength(8);
    expect(STAGE_EVENTS).toHaveLength(8);
    for (const line of STAGE_LINES) expect(line).toContain('{habit}');
    for (const p of PLANTS) expect(BLOOM_LINES[p.plant], p.plant).toContain('{habit}');
  });

  it('reveals cover every tier, and every series Secret has its line', () => {
    for (const r of RARITIES) expect(REVEAL_LINES[r].length, r).toBeGreaterThan(0);
    for (const id of SECRET_IDS) expect(SECRET_LINES[id], id).toMatch(/^[a-z].*\.$/);
    expect(Object.keys(SECRET_LINES).sort()).toEqual([...SECRET_IDS].sort());
  });

  it('friendship has 15 plainly named levels, each with a line for every species', () => {
    expect(FRIENDSHIP_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    for (const lvl of FRIENDSHIP_LEVELS) {
      expect(lvl.name, `${lvl.level}`).toMatch(/^[A-Z][^A-Z]*$/);
      for (const s of SPECIES) expect(lvl.lines.some((l) => fitsSpecies(l, s)), `level ${lvl.level} for a ${s}`).toBe(true);
    }
  });

  it('every habit icon maps to one of the 14 routine archetypes, each with a Known-for line for every species', () => {
    expect(ARCHETYPES).toHaveLength(14);
    for (const icon of HABIT_ICONS) expect(ARCHETYPES, icon.id).toContain(ARCHETYPE_BY_ICON[icon.id]);
    for (const a of ARCHETYPES) {
      for (const s of SPECIES) {
        expect(KNOWN_FOR[a].starting.some((l) => fitsSpecies(l, s)), `${a} starting, ${s}`).toBe(true);
        expect(KNOWN_FOR[a].settled.some((l) => fitsSpecies(l, s)), `${a} settled, ${s}`).toBe(true);
      }
      for (const l of [...KNOWN_FOR[a].starting, ...KNOWN_FOR[a].settled]) expect(lineText(l), a).toMatch(/^[A-Z][^{}]*\.$/);
    }
  });

  it('fills slots, and drops the comma before an empty one', () => {
    expect(fillLine('{habit}, watered. +{coins}', { habit: 'Walk', coins: 5 })).toBe('Walk, watered. +5');
    expect(fillLine('Good morning, {userName}.', { userName: '' })).toBe('Good morning.');
    expect(fillLine('{name} is asleep in {plant}.', { name: 'Pudding', plant: plantPhrase('Read') })).toBe('Pudding is asleep in the Read plant.');
  });

  it('spells out a count that starts a sentence, and uses the right article', () => {
    expect(numberWord(19, true)).toBe('Nineteen');
    expect(numberWord(3)).toBe('three');
    expect(numberWord(42)).toBe('forty-two');
    expect(numberWord(1204)).toBe('1,204');
    expect(withArticle('Belted Galloway', true)).toBe('A Belted Galloway');
    expect(withArticle('Orange Tabby')).toBe('an Orange Tabby');
    expect(withArticle('Blueberries')).toBe('Blueberries');
    expect(withArticle('Barley Tea')).toBe('Barley Tea');
    expect(withArticle('Golden Pothos')).toBe('a Golden Pothos');
    expect(withArticle('The Window Seat')).toBe('The Window Seat');
  });

  it('greets by the time of day', () => {
    expect([5, 8, 14, 19, 23, 2].map(greetingPeriod)).toEqual(['early', 'morning', 'afternoon', 'evening', 'late', 'late']);
  });
});

describe('docs/VOICE.md', () => {
  it('covers every moment in the brief', () => {
    const md = readFileSync(VOICE_MD, 'utf8');
    const sections = [
      'Principles', 'Never', 'Substitutions', 'Currency', 'Check-in', 'Perfect day', 'Welcome home', 'Plant stages', 'Pins',
      'Friendship', 'Treats', 'Capsules', 'Special Order', 'Memories rule', 'Places', 'Harvest', 'Sunday Note', 'Herbarium',
      'Season Review', 'Birthday', 'Keeping Company', 'Blooms Like You', 'Garden Journal', 'Onboarding', 'Empty states',
      'Errors', 'Install', 'Reminders', 'Data', 'Settings', 'Greetings', 'status line',
    ];
    for (const s of sections) expect(md, s).toMatch(new RegExp(`^#{2,4} .*${s}`, 'mi'));
  });
});

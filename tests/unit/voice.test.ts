/**
 * The voice lint (DESIGN §12, docs/VOICE.md). Fails the build on words catkin never uses, on
 * exclamation marks (one is allowed, in the Secret reveal), on emoji and decorative symbols, on
 * straight apostrophes, on pet pronouns and on "stars" or "stardust" as currency. It reads:
 * - every string literal and JSX text under VOICE_SCAN_DIRS (parsed with the TypeScript compiler,
 *   so comments, types, imports and developer errors are skipped);
 * - every "double-quoted" line in docs/VOICE.md (banned examples there sit in `backticks`);
 * - the caption matrix and templates in src/catalog/lines.ts, with the stricter pet rules, and the
 *   catalog's pet flavor text.
 * It also checks the matrix itself: coverage, species filters, the no-repeat rule, slot grammar
 * with plural and drink treats, and lines that would be false (a sunset at 9 pm, a friend on a
 * sill with one pet, a pot round a cutting).
 *
 * A developer-only string can opt out with a `// voice-ignore` comment on its line.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { FIRST_PERSON, GENDERED, PET_PRONOUN, THEY_THEM, lint } from './voiceLint';
import { BADGES } from '@/catalog/badges';
import { PERSONALITIES, NAME_SUGGESTIONS, TREAT_TAG_HINTS } from '@/catalog/personalities';
import { TEMPLATES } from '@/catalog/templates';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { COLLECTIBLES, PETS, PLANTS, SECRET_IDS } from '@/catalog/collectibles';
import { RARITIES, SPECIES, type Personality, type Species } from '@/catalog/types';
import {
  ARCHETYPES,
  ARCHETYPE_BY_ICON,
  BLOOM_EVENTS,
  BLOOM_LINES,
  CAPTIONS,
  CHECKIN_ASIDES,
  CONTEXT_SLOTS,
  DUPLICATE_LINES,
  EXCLUSIVE_LINES,
  FRIENDSHIP_LEVELS,
  GARDEN_JOURNAL,
  GREETINGS,
  HERBARIUM,
  KNOWN_FOR,
  KNOWN_FOR_BY_ICON,
  LINE_CONTEXTS,
  RECENT_WINDOW,
  REVEAL_LINES,
  SECRET_LINES,
  SECRET_REVEAL,
  SHARED_CAPTIONS,
  STAGE_EVENTS,
  STAGE_FORECAST,
  STAGE_LINES,
  SUNDAY_NOTE,
  WATERINGS_MIN,
  capitalise,
  fillLine,
  fits,
  fitsSpecies,
  greetingPeriod,
  knownFor,
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

/**
 * Where the lint looks for UI strings: all of src (tests, `.d.ts` and developer errors are
 * skipped; see stringsIn). Data that only looks like words (CSS, colours, ids, dotted keys,
 * camelCase labels) is held to the emoji rules only; see isProse.
 */
export const VOICE_SCAN_DIRS: readonly string[] = ['src'];

/**
 * Copy that breaks a rule today, waiting on its owner. Each entry is `file → exact string`. The
 * lint skips these; the "known exceptions are still real" test fails once a string is fixed or
 * moved, so delete its entry in the same change. Empty since M1: keep it that way, and give any
 * new entry a reason and an owner.
 */
const KNOWN_TEXT_EXCEPTIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map();

const VOICE_MD = 'docs/VOICE.md';


/** CSS functions: a value like `var(--ink, #3B3236)` or `color-mix(in srgb, …)` is styling, not copy. */
const CSS_VALUE = /^(var|color-mix|calc|min|max|clamp|rgba?|hsla?|oklch|url|(repeating-)?(linear|radial|conic)-gradient|cubic-bezier|steps|translate(3d|[XYZ])?|rotate|scale|matrix)\(/i;

/** A CSS selector: `.cls`, `#id`, `.a:hover`, `.a > .b` (never a sentence fragment like `. Open the lineup.`). */
const CSS_SELECTOR = /^[.#][A-Za-z_-][\w-]*(?=$|[\s:[{,>.#+~()])(?!.*(?:[!?]|[.,]\s+[A-Za-z]))/;

/**
 * Ids, keys, CSS and colours are data, not copy: only the emoji checks apply to them. Data is:
 * a hex colour; a hash route (`#/today`); a CSS value, selector or block (`var(`, `color-mix(`,
 * `.cls`, `#id`, `{ …; }`); a dotted key (`wallet.stardust`); anything with a camelCase word
 * (`addDays offset`), since copy never has one (`iPhone` and `macOS` are not camelCase by this rule).
 * Copy slots (`{userName}`, `{Plant}`) are read as plain words first, so a slotted line is copy.
 */
export function isProse(s: string): boolean {
  const t = s.trim();
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^#\//.test(t)) return false;
  if (CSS_VALUE.test(t) || CSS_SELECTOR.test(t)) return false;
  const bare = t.replace(/\{\w+\}/g, 'X');
  if (bare.includes('{') && bare.includes(';')) return false;
  if (/^[a-z][\w-]*(\.[\w-]+)+$/i.test(t)) return false;
  if (/\b[a-z]{2,}[A-Z][a-z]/.test(bare)) return false;
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(t) && /\d/.test(t)) return false; // SVG path data
  return /\s/.test(t) || /^[A-Z]/.test(t) || /[’'!?.,]/.test(t);
}

/* ------------------------------------------------------------------------ */
/* Scanners                                                                  */
/* ------------------------------------------------------------------------ */

interface Found {
  where: string;
  text: string;
  key?: string;
}

/** Generated tables (shade crescents, pet crescents): numbers and path data, no copy. */
const GENERATED = /\.gen\.tsx?$|\/crescents\/data\.ts$/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts') && !GENERATED.test(path.split('\\').join('/'))) out.push(path);
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
  return out;
}

let uiCache: Found[] | null = null;
/** Every string under VOICE_SCAN_DIRS, parsed once per run. */
function uiStrings(): Found[] {
  if (!uiCache) {
    const files = VOICE_SCAN_DIRS.flatMap((d) => sourceFiles(d));
    if (!files.length) throw new Error(`No sources under ${VOICE_SCAN_DIRS.join(', ')}`);
    uiCache = files.flatMap((f) => stringsIn(f));
  }
  return uiCache;
}

/** Whether a found string is on a known-exception list. */
function isKnownException(f: Found): boolean {
  const file = f.where.replace(/:\d+$/, '');
  return !!KNOWN_TEXT_EXCEPTIONS.get(file)?.has(f.text);
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
const speciesOf = (line: Line): readonly Species[] => (typeof line === 'string' ? SPECIES : (line.species ?? SPECIES));

/** Every line about a pet, with the species it can be shown to. */
function petLines(): { where: string; text: string; species: readonly Species[] }[] {
  const out: { where: string; text: string; species: readonly Species[] }[] = [];
  const add = (where: string, line: Line) => out.push({ where, text: lineText(line), species: speciesOf(line) });
  for (const p of PERSONALITY_IDS) for (const c of LINE_CONTEXTS) CAPTIONS[p][c].forEach((l) => add(`CAPTIONS.${p}.${c}`, l));
  for (const c of LINE_CONTEXTS) SHARED_CAPTIONS[c].forEach((l) => add(`SHARED_CAPTIONS.${c}`, l));
  CHECKIN_ASIDES.awake.forEach((l) => add('CHECKIN_ASIDES.awake', l));
  CHECKIN_ASIDES.asleep.forEach((l) => add('CHECKIN_ASIDES.asleep', l));
  for (const lvl of FRIENDSHIP_LEVELS) {
    lvl.lines.forEach((l) => add(`FRIENDSHIP_LEVELS.${lvl.level}`, l));
    if (lvl.solo) add(`FRIENDSHIP_LEVELS.${lvl.level}.solo`, lvl.solo);
  }
  for (const a of ARCHETYPES) [...KNOWN_FOR[a].starting, ...KNOWN_FOR[a].settled].forEach((l) => add(`KNOWN_FOR.${a}`, l));
  for (const [icon, k] of Object.entries(KNOWN_FOR_BY_ICON)) [...k.starting, ...k.settled].forEach((l) => add(`KNOWN_FOR_BY_ICON.${icon}`, l));
  for (const [id, line] of Object.entries(SECRET_LINES)) {
    const pet = PETS.find((p) => p.id === id);
    add(`SECRET_LINES.${id}`, pet ? { text: line, species: [pet.species] } : line);
  }
  for (const p of PERSONALITIES) add(`PERSONALITIES.${p.id}.blurb`, p.blurb);
  for (const [tag, hint] of Object.entries(TREAT_TAG_HINTS)) add(`TREAT_TAG_HINTS.${tag}`, hint);
  return out;
}

/** Every caption in the matrix, own, tap and shared, with where it lives and its context. */
function allCaptions(): { where: string; context: LineContext; line: Line; text: string }[] {
  const out: { where: string; context: LineContext; line: Line; text: string }[] = [];
  for (const p of PERSONALITY_IDS) for (const c of LINE_CONTEXTS) for (const l of CAPTIONS[p][c]) out.push({ where: `${p}.${c}`, context: c, line: l, text: lineText(l) });
  for (const c of LINE_CONTEXTS) for (const l of SHARED_CAPTIONS[c]) out.push({ where: `shared.${c}`, context: c, line: l, text: lineText(l) });
  return out;
}

const MAMMALS: readonly Species[] = ['cat', 'cow', 'dog', 'bunny', 'bear', 'hamster'];

/**
 * Body parts and behaviours that only some species have. A line shown to a species must not
 * mention anything that species lacks: no paws for frogs or ducks, no wings for cows, no hands or
 * speech for anyone.
 */
const ANATOMY: readonly [RegExp, readonly Species[]][] = [
  [/\bpaws?\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\bhands?\b/i, []],
  [/\bto say hello\b|\bsays hello\b/i, []],
  [/\btails?\b/i, ['cat', 'cow', 'dog', 'bunny', 'duck']],
  [/\bwhiskers?\b/i, ['cat', 'dog', 'bunny', 'hamster']],
  [/\bfur(ry)?\b/i, MAMMALS],
  [/\bpurr/i, ['cat']],
  [/\bears?\b/i, MAMMALS],
  [/\bnoses?\b|\bsniff/i, MAMMALS],
  [/\bsnout|\bmuzzle/i, ['cow', 'dog', 'bear']],
  [/\byawn/i, MAMMALS],
  [/\blick/i, MAMMALS],
  [/\bsigh(s|ed|ing)?\b/i, MAMMALS],
  [/\bcurl(s|ed|ing)? up\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\bgroom|\b(morning|face) wash\b|\bwash(es|ed|ing) (the |a |one )?(whole )?(face|paws?|ears?|front paw)\b/i, ['cat', 'bunny', 'hamster']],
  [/\bchew/i, MAMMALS],
  [/\bnibbl/i, ['cat', 'cow', 'bunny', 'hamster', 'duck']],
  [/\bclaws?\b|\bscratch/i, ['cat', 'dog', 'bear', 'hamster', 'bunny']],
  [/\bknead/i, ['cat']],
  [/\bchatter/i, ['cat']],
  [/\bpounc/i, ['cat', 'dog']],
  [/\bloaf/i, ['cat', 'cow']],
  [/\bflop/i, MAMMALS],
  [/\bfront half first\b/i, ['cat', 'dog', 'bunny', 'hamster']],
  [/\bplay[- ]bow|\bhead tilt/i, ['dog']],
  [/\bbinky/i, ['bunny']],
  [/\broll(s|ed|ing)? over\b|\bbelly up\b/i, ['cat', 'dog', 'bunny', 'bear', 'hamster']],
  [/\bslow[- ]blink/i, ['cat']],
  [/\bwag/i, ['dog']],
  [/\bwings?\b|\bfeathers?\b(?! duster)|\bbeak\b|\bbill\b|\bwaddl|\bdabbl|\bpreen|\bwebbed/i, ['duck']],
  [/\bhoo(f|ves)\b|\bhorns?\b|\bcud\b|\bnose-lick/i, ['cow']],
  [/\bthroat\b|\bcroak/i, ['frog']],
  [/\b(stuff|fill|pack)\w* (both |one |the )?cheeks?\b|\bcheeks? (full|pouch|going)|\bpouch/i, ['hamster']],
  [/\bcheeks?\b/i, MAMMALS],
  [/\bbedding\b/i, ['hamster']],
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

/** "them" and "they" can mean the spots or the ears there, so flavor text is held to he/she/its. */
const FLAVOR_PRONOUNS = /\b(he|she|him|her|his|hers|himself|herself|its|itself)\b/i;

/** What's wrong with a pet's catalog flavor text: pronouns, anatomy it lacks, a voice of its own. */
function flavorProblems(p: { flavor: string; species: Species }): string[] {
  return [...lint(p.flavor, { pronouns: FLAVOR_PRONOUNS }), ...anatomyProblems(p.flavor, [p.species]), ...(FIRST_PERSON.test(p.flavor) ? ['first person'] : [])];
}

/* ------------------------------------------------------------------------ */
/* The lint                                                                  */
/* ------------------------------------------------------------------------ */

describe('voice lint (DESIGN §12)', () => {
  it('every UI string under VOICE_SCAN_DIRS follows the voice', () => {
    const bad = uiStrings()
      .filter((f) => !isKnownException(f))
      .map((f) => ({ ...f, problems: lint(f.text, { prose: isProse(f.text) }) }))
      .filter((f) => f.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('known exceptions are still real (delete an entry once its string is fixed)', () => {
    const found = uiStrings();
    const stale: string[] = [];
    for (const [file, texts] of KNOWN_TEXT_EXCEPTIONS) {
      for (const text of texts) {
        const hits = found.filter((f) => f.where.startsWith(`${file}:`) && f.text === text);
        if (!hits.length) stale.push(`${file}  ${JSON.stringify(text)}: no longer in the file`);
        else if (hits.every((f) => lint(f.text, { prose: isProse(f.text) }).length === 0)) stale.push(`${file}  ${JSON.stringify(text)}: passes now`);
      }
    }
    expect(stale, `Stale voice-lint exceptions; delete them from tests/unit/voice.test.ts:\n${stale.join('\n')}`).toEqual([]);
  });

  it('skips a line marked // voice-ignore, and developer errors, but reads the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'voice-'));
    try {
      const file = join(dir, 'Sample.tsx');
      writeFileSync(
        file,
        [
          "const url = `?only=capsules&machine=cows`; // voice-ignore",
          "export const Hint = () => <p title=\"Put a coin in\">Water</p>;",
          "export const Skip = () => <p>Turn the machine{/* voice-ignore */}</p>;",
          "export const Bad = () => <p>Yay, all done!</p>;",
          "if (!url) throw new Error('Unlocked the machine!');",
          "console.warn('Oops, wishing well');",
        ].join('\n'),
      );
      const texts = stringsIn(file).map((f) => f.text);
      expect(texts).toEqual(['Put a coin in', 'Water', 'Yay, all done!']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('tells copy from data', () => {
    for (const data of [
      'var(--lavender-300, #DDD4F1)',
      'color-mix(in srgb, var(--card, #FFFDF9) 92%, transparent)',
      '.fxui-panels { display: flex; gap: 16px; }',
      '#FAF6EF',
      '#/today',
      'wallet.stardust',
      'addDays offset',
      '.a:hover',
      '.cabinet > .glass',
      'translate(12px, 4px) rotate(3deg)',
    ])
      expect(isProse(data), data).toBe(false);
    for (const copy of [
      'Walk, watered.',
      'Put a coin in',
      'Keep catkin on your iPhone',
      'Works on macOS and iPadOS too',
      'Water',
      '4 more waterings to Blooming',
      // slotted lines and fragments after an interpolation are copy
      'Happy birthday, {userName}.',
      '{Plant} {stageEvent} on {weekday}.',
      '. Open the lineup.',
      'Morning, {userName}; the lamp’s still on.',
    ])
      expect(isProse(copy), copy).toBe(true);
    expect(lint('var(--lavender-300, #DDD4F1)', { prose: isProse('var(--lavender-300, #DDD4F1)') })).toEqual([]);
    // the data rules must not hide copy from the lint
    for (const text of ['Great job, {userName}!', '. Keep up the streak!', "Morning, {userName}. Don't break your streak!", '{name} missed a day; {Plant} {stageEvent}.'])
      expect(lint(text, { prose: isProse(text) }), text).not.toEqual([]);
  });

  it('every quoted line in docs/VOICE.md follows the voice', () => {
    const quoted = voiceMdLines();
    expect(quoted.length).toBeGreaterThan(300);
    const pronouns = new RegExp(`${GENDERED.source}|${THEY_THEM.source}`, 'i');
    const bad = quoted.map((text) => ({ where: VOICE_MD, text, problems: lint(text, { pronouns }) })).filter((f) => f.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('pet lines, including the catalog’s flavor text, give the animals no pronouns and no voice of their own', () => {
    const bad = petLines()
      .map((l) => ({
        ...l,
        problems: [...lint(l.text, { pronouns: PET_PRONOUN }), ...(FIRST_PERSON.test(l.text) ? ['first person: the animals never speak'] : [])],
      }))
      .filter((l) => l.problems.length > 0);
    expect(bad, report(bad)).toEqual([]);
  });

  it('pet flavor text in the catalog gives no pet a pronoun, a hand or a hello', () => {
    const bad = PETS.map((p) => ({ where: `flavor ${p.id}`, text: p.flavor, problems: flavorProblems(p) }))
      .filter((f) => f.problems.length > 0);
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
      'Purrfect!', 'Yay, all done', 'Hi bestie', 'So cozy in here', 'You got this', 'Grow at your own pace', '3 habits left today',
      'Welcome back', 'It’s been a while', 'Fewer than last week', 'You missed a day', 'Streak lost', '0 days in a row', '+2 stars',
      '12 stardust', 'Walk 🌱', 'Rare ✨', 'Pudding wags her tail', 'New badge', 'smol bean', 'You’re falling behind on Walk',
      'You’re behind.', 'It’s been a long time', 'Down from 80%',
      // gaps
      'You’re back.', 'It’s been 5 days.', 'Good to see you again.', 'Haven’t seen you in a while.',
      // straight apostrophes, before a letter or a hyphen
      'Robin\'s Nest', 'Jack-o\'-lantern',
      // undone
      '2 of 3 this week · 1 more by Sun', 'Almost there', 'There are 0 in the jar.', 'Only 2 more',
      // pep talk and platitudes
      'Nice work.', 'You did it.', 'Way to go.', 'Rest is productive.', 'Self-care matters.', 'Start small.', 'Kept it up 12 days', 'Ready to grow?',
      // baby talk
      'Toe beans', 'Tummy rubs', 'Snuggle up', 'The blueberries are all gone.',
      // old words
      'Congratulations', 'Oops', 'Level up', 'Unlock', 'Achievement unlocked', 'Common', 'Turn the crank', 'Make a wish',
      'The Meadow', 'Your weekly letter', 'Check in', 'Fixes history, no rewards.',
      // a pet by pronoun
      'Find them a plant', 'Let them choose',
      // decoration, apostrophes, numbers
      'Night ☾', 'Rare ✩', 'Pins ⋆', 'Garden ❁', "Today's off", 'Pudding turned round four times.',
    ];
    for (const text of caught) expect(lint(text), text).not.toEqual([]);
    const fine = [
      'Walk, watered. +5 · Pudding opened one eye.', 'A ribbon, tied just behind one ear.', 'Night coats and lamps, paid in stamps.',
      'Navy flannel with small yellow stars.', '26 of the last 30 days', '12 in a row', '{name} is behind the biggest pot for now.',
      '{name} dropped flat on the sill.', '{name} is warm, and hasn’t moved in a while.', 'Tiny version ✓', 'Quiet rewards',
      '4 more waterings to Blooming.', 'Rooting · 2 more to pot up', 'P.S. Juniper slept on the book four evenings.',
      'Three stamps, enclosed.', 'Week of Sep 22. Nineteen waterings.', 'An Aloe plant', 'Water the thyme', 'Self care', 'Lamplight',
    ];
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
      expect(b.description, b.id).not.toMatch(/\d:00/);
    }
    expect(new Set(BADGES.map((b) => b.name)).size).toBe(BADGES.length);
  });

  it('habit templates read well in "{name}, watered." and as {plant}', () => {
    for (const t of TEMPLATES) {
      expect(t.name.length, t.id).toBeLessThanOrEqual(24);
      expect(t.name, t.id).toMatch(/^[A-Z][^A-Z]*$/);
      if (t.tiny) expect(t.tiny.label, t.id).toMatch(/^[A-Z][^0-9]*$/);
      const phrase = plantPhrase(t.name, t.plant);
      expect(phrase, t.id).not.toMatch(/\bthe the\b|\d/i);
      expect(phrase.split(' ').length, `${t.id}: ${phrase}`).toBeLessThanOrEqual(4);
    }
    expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
  });

  it('personalities carry no emoji, and names stay plain and unshared', () => {
    for (const p of PERSONALITIES) expect(p.emoji, p.id).toBe('');
    const all = Object.values(NAME_SUGGESTIONS).flat();
    for (const n of all) expect(n).toMatch(/^[A-Z][a-z]+$/);
    expect(new Set(all).size, 'a name suggested for two species').toBe(all.length);
  });
});

/* ------------------------------------------------------------------------ */
/* The caption matrix                                                        */
/* ------------------------------------------------------------------------ */

describe('caption matrix (src/catalog/lines.ts)', () => {
  const personalities = PERSONALITY_IDS as readonly Personality[];
  const SITUATIONS = [{}, { stage: 7, level: 15 }] as const;

  it('covers 10 personalities × every context with at least 4 lines, and enough for every species at the start', () => {
    expect(personalities).toHaveLength(10);
    for (const p of personalities) {
      for (const c of LINE_CONTEXTS) {
        const plain = CAPTIONS[p][c].filter((l) => typeof l === 'string');
        expect(plain.length, `${p}.${c}`).toBeGreaterThanOrEqual(4);
        // Enough for the no-repeat rule to hold for every species, even for a cutting at level 1.
        for (const s of SPECIES) expect(linesFor(c, p, s).length, `${p}.${c}.${s}`).toBeGreaterThan(RECENT_WINDOW);
      }
    }
  });

  it('every caption leads with the pet’s name, is short, ends with a full stop and uses only its context’s slots', () => {
    const bad: string[] = [];
    for (const { where, context, text } of allCaptions()) {
      if (!text.startsWith('{name}')) bad.push(`${where}: doesn't lead with {name}: ${text}`);
      if (text.length > 90) bad.push(`${where}: over 90 characters: ${text}`);
      if (!/[.]$/.test(text) || / {2}/.test(text)) bad.push(`${where}: punctuation: ${text}`);
      for (const [, slot] of text.matchAll(/\{(\w+)\}/g)) if (!CONTEXT_SLOTS[context].includes(slot!)) bad.push(`${where}: {${slot}} in ${text}`);
    }
    expect(bad).toEqual([]);
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
    const bad: string[] = [];
    for (const situation of SITUATIONS) {
      for (const p of personalities) {
        for (const c of LINE_CONTEXTS) {
          for (const s of SPECIES) {
            const recent: string[] = [];
            for (let i = 0; i < 40; i++) {
              const line = pickLine(c, p, s, i * 7919 + 13, recent, situation);
              if (recent.slice(-RECENT_WINDOW).includes(line)) bad.push(`${p}.${c}.${s} #${i}`);
              recent.push(line);
            }
            if (new Set(recent).size <= RECENT_WINDOW) bad.push(`${p}.${c}.${s}: too little variety`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  }, 30_000);

  it('pickLine accepts Math.random() seeds and is deterministic for a seed', () => {
    const recent: string[] = [];
    for (let i = 0; i < 30; i++) {
      const line = pickLine('tap', 'sunny', 'cow', Math.random(), recent);
      expect(recent.slice(-RECENT_WINDOW)).not.toContain(line);
      recent.push(line);
    }
    expect(pickLine('night', 'sleepy', 'cat', 42)).toBe(pickLine('night', 'sleepy', 'cat', 42));
  });

  it('pickLine respects species filters, plant stage and friendship level', () => {
    const byText = new Map<string, Line>();
    for (const { line, text } of allCaptions()) byText.set(text, line);
    const bad: string[] = [];
    for (const situation of [{}, { stage: 2 }, { level: 3 }, { stage: 7, level: 15 }]) {
      for (const p of personalities) {
        for (const c of LINE_CONTEXTS) {
          for (const s of SPECIES) {
            for (const text of linesFor(c, p, s, situation)) if (!fits(byText.get(text)!, s, situation)) bad.push(`${text} for a ${s} in ${JSON.stringify(situation)}`);
            for (let i = 0; i < 25; i++) {
              const text = pickLine(c, p, s, i, [], situation);
              if (!fits(byText.get(text)!, s, situation)) bad.push(`picked ${text} for a ${s}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
    // The gated lines do turn up once they're true.
    expect(linesFor('resident', 'sleepy', 'cat')).not.toContain('{name} is asleep against the side of {plant}’s pot.');
    expect(linesFor('resident', 'sleepy', 'cat', { stage: 2 })).toContain('{name} is asleep against the side of {plant}’s pot.');
    expect(linesFor('tap', 'sunny', 'cat')).not.toContain('{name} gave you a slow blink.');
    expect(linesFor('tap', 'sunny', 'cat', { level: 3 })).toContain('{name} gave you a slow blink.');
  }, 30_000);

  it('a pot, soil, rim or saucer round {plant} needs the plant to be potted', () => {
    const vessel = /\{plant\}’s (pot|saucer|rim)|\b(soil|rim|saucer)\b[^.]*\{plant\}|\{plant\}[^.]*\b(soil|rim|saucer)\b|\bshade of \{plant\}/;
    const bad = allCaptions().filter(({ line, text }) => vessel.test(text) && (typeof line === 'string' || (line.minStage ?? 0) < 2)).map((c) => `${c.where}: ${c.text}`);
    expect(bad).toEqual([]);
  });

  it('lines for events that can happen at night never put the pet in the sun', () => {
    const anyHour: LineContext[] = ['checkin', 'restDay', 'perfectDay', 'welcomeHome', 'fed', 'fedFavourite', 'newWear', 'resident', 'newArrival'];
    const daylight = /\b(sun(beam|ny|light|shine)?|bask\w*|beam)\b|\b(afternoon|first|morning) (light|sun)\b|\bshade\b/i;
    const bad = allCaptions().filter((c) => anyHour.includes(c.context) && daylight.test(c.text)).map((c) => `${c.where}: ${c.text}`);
    expect(bad).toEqual([]);
  });

  it('the evening is lamplight: no sunsets after 8 pm', () => {
    const sunset = /\bsun(set|beam|light|shine|ny)?\b(?! was)|\bdusk\b|\bsky go(es)?\b|\blast of the (sun|light)\b|\bgo(es)? down behind\b/i;
    const bad = allCaptions().filter((c) => c.context === 'evening' && sunset.test(c.text)).map((c) => `${c.where}: ${c.text}`);
    expect(bad).toEqual([]);
  });

  it('no caption assumes a second pet: every pet is alone on the sill at first', () => {
    const company = /\b(friends?|the others|everyone|everybody|someone|each other|nap pile)\b/i;
    const bad = allCaptions().filter((c) => company.test(c.text)).map((c) => `${c.where}: ${c.text}`);
    expect(bad).toEqual([]);
    const lvl8 = FRIENDSHIP_LEVELS.find((l) => l.level === 8)!;
    expect(lvl8.solo).toBeTruthy();
    expect(lvl8.solo).not.toContain('{friend}');
  });

  it('welcome home reads like any ordinary day, with no hint of time away', () => {
    const reunion = /\b(as ever|like always|as usual|than usual|who it was|glad|finally|at last|all this time|waiting for you|inspect you|with (a lot of|great) feeling)\b/i;
    const bad = allCaptions().filter((c) => c.context === 'welcomeHome' && reunion.test(c.text)).map((c) => `${c.where}: ${c.text}`);
    expect(bad).toEqual([]);
  });

  it('the narrator reports and lets the animal be funny: few explained jokes, few "very"s', () => {
    const texts = allCaptions().map((c) => c.text);
    const explained = texts.filter((t) => /, which (says|is|means|seems|never|will|takes)\b/.test(t));
    expect(explained, explained.join('\n')).toHaveLength(2); // the two cow lines, which teach something true about cows
    expect(texts.filter((t) => /\bas if (it were|you’d)\b/.test(t))).toEqual([]);
    // A trailing wry tag (", pointedly.") is at most 1 line in 8, so it never becomes the rhythm.
    expect(texts.filter((t) => /, [a-z]+\.$/.test(t)).length / texts.length).toBeLessThan(1 / 8);
    for (const p of PERSONALITIES) {
      const own = [...p.lines, ...LINE_CONTEXTS.flatMap((c) => CAPTIONS[p.id][c].map(lineText))];
      expect(own.filter((t) => /\bvery\b/.test(t)).length, p.id).toBeLessThanOrEqual(2);
    }
  });

  it('treat and wear slots survive plural and drink items', () => {
    const lines = allCaptions().filter((c) => c.context === 'fed' || c.context === 'fedFavourite' || c.context === 'newWear');
    const bad: string[] = [];
    const PROTECTED = new Set(['{name} hasn’t noticed it yet.']);
    for (const { where, text } of lines) {
      if (/\{(treat|wear)\}\s+(is|was|has|looks|seems)\b/.test(text)) bad.push(`${where}: a verb after the slot: ${text}`);
      if (/\{(treat|wear)\}[^.]*\b(it|its|another|them)\b/.test(text)) bad.push(`${where}: a pronoun for the item: ${text}`);
      if (!/\{(treat|wear)\}/.test(text) && /\b(it|them)\b/.test(text) && !PROTECTED.has(text)) bad.push(`${where}: "it" with no item: ${text}`);
      if (/\bcarr(y|ies|ied) the \{treat\}|\bpacked\b|\btook the \{treat\} (behind|over|to)\b/.test(text)) bad.push(`${where}: carries a drink: ${text}`);
      for (const item of ['blueberries', 'barley tea', 'earmuffs']) {
        const filled = fillLine(text, { name: 'Pudding', treat: item, wear: item });
        if (new RegExp(`\\b${item} (is|was)\\b`).test(filled)) bad.push(`${where}: ${filled}`);
      }
    }
    for (const text of voiceMdLines().filter((t) => t.includes('{treat}'))) {
      if (/\{treat\}\s+(is|was|has)\b/.test(text)) bad.push(`VOICE.md: ${text}`);
    }
    expect(bad).toEqual([]);
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
      const own = SHARED_CAPTIONS.tap.filter((l) => typeof l !== 'string' && l.species?.length === 1 && l.species[0] === s).map(lineText);
      expect(own.some((t) => tells[s].test(t)), s).toBe(true);
    }
  });

  it('no line mentions anatomy or behaviour the species doesn’t have', () => {
    const bad = petLines()
      .map((l) => ({ ...l, problems: anatomyProblems(l.text, l.species) }))
      .filter((l) => l.problems.length > 0);
    for (const p of PERSONALITIES) for (const line of p.lines) expect(anatomyProblems(line, SPECIES), line).toEqual([]);
    expect(bad, report(bad)).toEqual([]);
  });
});

describe('the other templates in lines.ts', () => {
  it('check-in asides suit every species, awake and asleep, at level 1 and by day', () => {
    for (const s of SPECIES) {
      const awake = CHECKIN_ASIDES.awake.filter((l) => fits(l, s));
      const asleep = CHECKIN_ASIDES.asleep.filter((l) => fits(l, s));
      expect(awake.length, s).toBeGreaterThan(RECENT_WINDOW);
      expect(asleep.length, s).toBeGreaterThanOrEqual(3);
      for (const l of [...CHECKIN_ASIDES.awake, ...CHECKIN_ASIDES.asleep]) expect(lineText(l).length, lineText(l)).toBeLessThanOrEqual(48);
    }
    const recent: string[] = [];
    for (let i = 0; i < 20; i++) {
      const line = pickFrom(CHECKIN_ASIDES.awake, 'frog', i, recent);
      expect(recent.slice(-RECENT_WINDOW)).not.toContain(line);
      expect(line).not.toMatch(/wag|wing|nose|ear|cheek|cud|looked up/);
      recent.push(line);
    }
    expect(CHECKIN_ASIDES.asleep.filter((l) => fits(l, 'hamster')).map(lineText)).not.toContain('{name} is up anyway. Hamsters keep late hours.');
    expect(CHECKIN_ASIDES.asleep.filter((l) => fits(l, 'hamster', { night: true })).map(lineText)).toContain('{name} is up anyway. Hamsters keep late hours.');
  });

  it('plants have a line for each of the 8 stages and a bloom for every species', () => {
    expect(STAGE_LINES).toHaveLength(8);
    expect(STAGE_EVENTS).toHaveLength(8);
    for (const line of STAGE_LINES) expect(line).toMatch(/\{[Pp]lant\}/);
    for (const p of PLANTS) {
      expect(BLOOM_LINES[p.plant], p.plant).toContain('{Plant}');
      expect(BLOOM_EVENTS[p.plant], p.plant).toMatch(/^[a-z]/);
    }
    expect(STAGE_FORECAST.other).not.toMatch(/date|around/);
  });

  it('reveals cover every tier, and every series Secret has its line', () => {
    for (const r of RARITIES) expect(REVEAL_LINES[r].length, r).toBeGreaterThan(0);
    for (const id of SECRET_IDS) expect(SECRET_LINES[id], id).toMatch(/^[a-z].*\.$/);
    expect(Object.keys(SECRET_LINES).sort()).toEqual([...SECRET_IDS].sort());
  });

  it('every keepsake you earn has its line', () => {
    for (const c of COLLECTIBLES.filter((c) => c.source === 'exclusive')) expect(EXCLUSIVE_LINES[c.id], c.id).toBeTruthy();
    expect(EXCLUSIVE_LINES.fallback).toContain('{A}');
    expect(DUPLICATE_LINES.pet).not.toMatch(/friendship|\+\d+ ?xp/i);
  });

  it('friendship has 15 plainly named levels, each with a line for every species', () => {
    expect(FRIENDSHIP_LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    for (const lvl of FRIENDSHIP_LEVELS) {
      expect(lvl.name, `${lvl.level}`).toMatch(/^[A-Z][^A-Z]*$/);
      for (const s of SPECIES) expect(lvl.lines.some((l) => fitsSpecies(l, s)), `level ${lvl.level} for a ${s}`).toBe(true);
      for (const l of lvl.lines) expect(lineText(l), `${lvl.level}`).not.toMatch(/\bscreen\b|\bkin\b|\band you\b/i);
    }
    expect(new Set(FRIENDSHIP_LEVELS.map((l) => l.name)).size).toBe(15);
  });

  it('every habit icon has Known-for lines for every species', () => {
    expect(ARCHETYPES).toHaveLength(14);
    for (const icon of HABIT_ICONS) {
      expect(ARCHETYPES, icon.id).toContain(ARCHETYPE_BY_ICON[icon.id]);
      const k = knownFor(icon.id);
      for (const s of SPECIES) {
        expect(k.starting.some((l) => fitsSpecies(l, s)), `${icon.id} starting, ${s}`).toBe(true);
        expect(k.settled.some((l) => fitsSpecies(l, s)), `${icon.id} settled, ${s}`).toBe(true);
      }
      for (const l of [...k.starting, ...k.settled]) expect(lineText(l), icon.id).toMatch(/^[A-Z][^{}]*\.$/);
    }
    expect(knownFor('paw').settled.map(lineText).join(' ')).not.toMatch(/bathroom/);
  });

  it('counts agree with their nouns: every "{count} things" has a singular', () => {
    const bad: string[] = [];
    const walk = (value: unknown, path: string, key: string) => {
      if (typeof value === 'string') {
        if (/\{count\} [a-z]+s\b/.test(value) && key !== 'other' && key !== 'toStamps') bad.push(`${path}: ${value}`);
        if (key === 'one' && /\b1 [a-z]+s\b/.test(value)) bad.push(`${path}: ${value}`);
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, Array.isArray(value) ? key : k);
      }
    };
    for (const [name, value] of Object.entries({ SUNDAY_NOTE, HERBARIUM, GARDEN_JOURNAL, STAGE_FORECAST, DUPLICATE_LINES })) walk(value, name, name);
    expect(bad).toEqual([]);
    expect(WATERINGS_MIN).toBeGreaterThanOrEqual(5);
  });

  it('fills slots, and drops the comma before an empty one', () => {
    expect(fillLine('{habit}, watered. +{coins}', { habit: 'Walk', coins: 5 })).toBe('Walk, watered. +5');
    expect(fillLine(GREETINGS.morning[0], { userName: '' })).toBe('Morning.');
    expect(fillLine('{name} is asleep in {plant}.', { name: 'Pudding', plant: plantPhrase('Read', 'pothos') })).toBe('Pudding is asleep in the Read plant.');
    expect(fillLine(STAGE_LINES[2]!, { Plant: capitalise(plantPhrase('The real plants', 'pothos')) })).toBe('The pothos is potted up.');
  });

  it('names the plant so it reads as a label', () => {
    expect(plantPhrase('Read', 'pothos')).toBe('the Read plant');
    expect(plantPhrase('Drink water', 'pothos')).toBe('the Drink water plant');
    expect(plantPhrase('The real plants', 'pothos')).toBe('the pothos');
    expect(plantPhrase('Tidy for 10 minutes', 'snakeplant')).toBe('the snake plant');
    expect(plantPhrase('In bed by 11', 'snakeplant')).toBe('the snake plant');
    expect(plantPhrase('Look over the budget', 'pilea')).toBe('the money plant');
  });

  it('spells out a count that starts a sentence, and uses the right article for every catalog name', () => {
    expect(numberWord(19, true)).toBe('Nineteen');
    expect(numberWord(3)).toBe('three');
    expect(numberWord(42)).toBe('forty-two');
    expect(numberWord(1204)).toBe('1,204');
    expect(withArticle('Belted Galloway', true)).toBe('A Belted Galloway');
    expect(withArticle('Orange Tabby')).toBe('an Orange Tabby');
    expect(withArticle('Blueberries')).toBe('Blueberries');
    expect(withArticle('Earmuffs')).toBe('Earmuffs');
    expect(withArticle('Barley Tea')).toBe('Barley Tea');
    expect(withArticle('Golden Pothos')).toBe('a Golden Pothos');
    expect(withArticle('Christmas Cactus')).toBe('a Christmas Cactus');
    expect(withArticle('Cavalier King Charles')).toBe('a Cavalier King Charles');
    expect(withArticle('The Window Seat')).toBe('The Window Seat');
    // A catalog name ending in s must be sorted into plural or singular on purpose, not guessed.
    const PLURAL = ['Blueberries', 'Fish Crackers', 'Salmon Flakes', 'Sunflower Seeds', 'Stepping Stones', 'Stacked Pots', 'Starry Pajamas', 'Earmuffs', 'Heart Sunglasses', 'Warm Oats'];
    const SINGULAR = ['Golden Pothos', 'Christmas Cactus', 'Cavalier King Charles'];
    for (const c of COLLECTIBLES) {
      const out = withArticle(c.name);
      expect(out === c.name || out === `a ${c.name}` || out === `an ${c.name}`, c.name).toBe(true);
      if (!/[^s]s$/.test(c.name)) continue;
      expect(PLURAL.includes(c.name) || SINGULAR.includes(c.name), `${c.name}: plural or singular?`).toBe(true);
      expect(out, c.name).toBe(PLURAL.includes(c.name) ? c.name : `a ${c.name}`);
    }
  });

  it('greets by the time of day, and never says "Evening" after 10 pm', () => {
    expect([5, 8, 14, 19, 23, 2].map(greetingPeriod)).toEqual(['early', 'morning', 'afternoon', 'evening', 'late', 'late']);
    for (const g of GREETINGS.late) expect(g).not.toMatch(/evening/i);
    for (const g of Object.values(GREETINGS).flat()) expect(g).not.toMatch(/^Good /);
  });
});

describe('docs/VOICE.md', () => {
  it('covers every moment in the brief', () => {
    const md = readFileSync(VOICE_MD, 'utf8');
    const sections = [
      'Principles', 'Never', 'Substitutions', 'Currency', 'Check-in', 'Perfect day', 'Welcome home', 'Plant stages', 'Pins',
      'Keepsakes you earn', 'Friendship', 'Found thing', 'Treats', 'Capsules', 'Special Order', 'Memories rule', 'Places', 'Harvest',
      'Sunday Note', 'Herbarium', 'Season Review', 'Birthday', 'Keeping Company', 'Blooms Like You', 'Garden Journal', 'Onboarding',
      'Empty states', 'Errors', 'Install', 'Reminders', 'Data', 'Settings', 'Greetings', 'status line', 'Progress',
    ];
    for (const s of sections) expect(md, s).toMatch(new RegExp(`^#{2,4} .*${s}`, 'mi'));
  });
});

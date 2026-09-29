# voice: notes for the lead

## What's here

- `docs/VOICE.md`: the copy deck. Principles, the banned list, substitutions, currency names, and final
  copy for every moment in the brief, plus Progress (§6), keepsakes you earn (§8) and the found thing
  (§9). Every "double-quoted" string in it is linted.
- `src/catalog/lines.ts`: the caption matrix and templates, data plus a few pure helpers.
  - `CAPTIONS`: 10 personalities × 15 contexts, at least 4 own lines each, plus `SHARED_CAPTIONS` per context
    with species-true lines. The `tap` row is `PersonalityDef.lines` (single source).
  - A `Line` is a string or `{ text, species?, minStage?, minLevel?, night? }`. `minStage: 2` marks lines that
    need a pot (a new plant is a cutting in a glass); `minLevel` holds back a behaviour until the friendship
    level that announces it (looking up at the water is level 2, a cat's slow blink at you is level 3,
    following the sunbeam is level 5); `night` is for 23:00–06:00 only.
  - `pickLine(context, personality, species, seed, recent, situation?)` never returns one of the last 5 in
    `recent`, and only returns lines that are true for `situation = { stage, level, night }`. Leave it out
    and only lines true at the start (a cutting, level 1, daytime) are used. Pools are memoised.
    `pickFrom(lines, species, seed, recent, situation?)` is the same rule for any list; `fits()` is the test.
  - `plantPhrase(habitName, plantSpecies)` fills {plant}: "the Read plant", or the plant's own name when
    the habit's name wouldn't read as a label ("the snake plant" for Tidy for 10 minutes, "the pothos" for
    The real plants). `capitalise()` makes {Plant}. `withArticle` uses an explicit plural list.
  - New exports: `BLOOM_EVENTS`, `EXCLUSIVE_LINES`, `FOUND_LINE`, `MEMORY_LINE`, `KNOWN_FOR_BY_ICON` +
    `knownFor(icon)`, `SUNDAY_ROUTINES_BY_ICON`, `WATERINGS_MIN`, `PLANT_COMMON_NAMES`, `fits`, `capitalise`.
    Level 8 in `FRIENDSHIP_LEVELS` has a `solo` line for a pet with no friend yet. `DUPLICATE_LINES` now
    takes {A} ("A Holstein, again.") instead of {item}. `newWear` captions take a {wear} slot.
- `src/catalog/badges.ts`: "Welcome home" → "Key under the mat"; "before 7 am"; First harvest says how it
  happens (watering, not picking).
- `src/catalog/templates.ts`: "Hobby time" → "Hobby"; the avoid-habit comment says "Held off 12 days".
- `src/catalog/personalities.ts`: Dramatic, Sassy, Shy, Gentle and Dreamy blurbs and tap lines rewritten as
  observed behaviour; name suggestions de-duplicated across species, with fewer snack names.
- `tests/unit/voice.test.ts`: the lint and the matrix checks (36 tests).

## The lint, and extending it

`VOICE_SCAN_DIRS` (top of `tests/unit/voice.test.ts`) is `['src/catalog']`. It parses each .ts/.tsx with the
TypeScript compiler and reads string literals, template text and JSX text. It skips comments, types,
imports, `throw`/`new Error(...)`/`console.*`, object keys and id-like strings. A developer-only string can
opt out with a `// voice-ignore` comment on its line.

This pass added, from what the critics caught: gap phrases ("You're back", "been 5 days"), undone counts
("1 more by Sun", "almost there", "0 in the jar"), more pep talk and platitudes ("nice work", "kept it
up", "start small", "rest is productive"), baby talk ("tummy", "toe beans", "all gone"), the old words from
VOICE.md §3 (congratulations, oops, level up, unlock, achievement, crank, machine, wish, weekly letter,
check in, rewards except "Quiet rewards", Common/Uncommon/Ultra rare), every dingbat in the Miscellaneous
Symbols and Dingbats blocks except ✓, straight apostrophes, counts spelled out mid-sentence (P.S. lines
allowed), and narrower puns (a plant called Aloe or a habit "Water the thyme" passes). Pet flavor text in
the catalog is now checked for pronouns, hands and hellos. The anatomy table gained hands, "say hello",
sighs (mammals only), the front-first stretch, play bows, head tilts, binkies, chattering, bills and
bedding.

Matrix checks added: slot grammar with plural and drink treats and plural wearables; no pot, soil, rim or
saucer round {plant} without `minStage`; no sun, basking or shade in any-hour contexts (now including
`resident`); no sunset in `evening`; no second pet assumed; no reunion hints in `welcomeHome`; at most the
two cow lines explain a joke after ", which", no "as if it were", at most 2 "very" per personality and
under 1 line in 8 ending on a wry tag; `{count} things` always has a singular; every exclusive keepsake has
a line; every habit icon has Known-for lines; `plantPhrase` over every template; `withArticle` over every
catalog name, with names ending in s sorted by hand. The two slow pickLine tests now collect failures and
assert once, with a 30 s timeout (about 0.3 s each now, was 2–6 s and timing out in the full suite).

## Requests (files outside my ownership)

1. **Two fx tests assert the old pin name and will fail after merge.** Renaming "Fifty & Flourishing" is in
   the brief, so these need updating:
   - `tests/unit/fx/celebrationPlan.test.ts:65` expects `'Fifty & Flourishing badge'`.
   - `tests/unit/fx/host.test.tsx:88` expects the banner text to contain `'Fifty & Flourishing badge'`.

   With the VOICE.md pin copy, `celebrationPlan.ts` would say eyebrow "A new pin", title the pin's name
   (the fallback `'A new badge!'` loses the "!"), and the also-line `${name}, a new pin`, so the expectations
   become `'Fifty waterings, a new pin'`.
2. **`src/fx/celebrationPlan.ts` copy** should come from lines.ts: `STAGE_LINES` (with {Plant}) and
   `BLOOM_LINES` in place of `STAGE_PHRASE`, `EXCLUSIVE_LINES` for the `exclusive` event, rung and ladder
   toasts from VOICE.md §5, `MILESTONE_LINES` deleted, and `formatTally` saying stamps and swaps.
3. **Callers of `pickLine`/`pickFrom`** should pass `{ stage, level, night }`: the habit plant's stage for
   `checkin` and `resident`, the pet's level always, `night` for the asides. Context precedence: `night`
   always wins; `rainy` replaces tap, morning, afternoon and evening. Use `knownFor(icon)` rather than
   indexing `KNOWN_FOR`, and level 8's `solo` line when the pet has no friend yet.
4. **`src/catalog/machines.ts`: set the five `seasonal.emoji` values to `''`**, and stop rendering them in
   `src/features/capsules/MachineInfo.tsx:33` and `WishingWell.tsx:161`. Then delete the one entry in
   `KNOWN_EXCEPTIONS` in `tests/unit/voice.test.ts`.
5. **`src/catalog/collectibles.ts` flavor and names**, then delete `KNOWN_TEXT_EXCEPTIONS` and
   `KNOWN_FLAVOR_EXCEPTIONS` in the test:
   - `pet-frog-peeper`: "A tiny frog with an X on its back. Loud for its size." gives the pet "its" →
     "A tiny frog with an X on the back. Loud, for the size."
   - `pet-frog-golden`: "Waves a hand to say hello." gives a frog a hand and a greeting, and repeats the
     Secret line → "Golden yellow with dark spots. Found in one valley in Panama."
   - `pet-cow-highland`: drop "About the size of your thumb." (DESIGN §12's Secret line says it just
     above) → "Shaggy apricot fringe and wide horns."
   - `pet-dog-samoyed`: the Secret line opens "white all over" too → "Smiling the way Samoyeds do."
   - Curly apostrophes in "sou’wester", "Jack-o’-lantern" and "Robin’s Nest".
6. **`src/features/capsules/copy.ts`**: use the catalog's tier names, `REVEAL_LINES`, `SECRET_REVEAL` and
   `DUPLICATE_LINES`, and VOICE.md §10's notices, including the zero variants (never "There are 0 in the
   jar").
7. **DESIGN.md**, to match the deck:
   - §12 Secret row: "No. 02 · Cows, the secret one! A Highland, …" (the rule allows the one "!"; the row
     shows a full stop). §12 Sunday Note row: "The Read plant showed a first bud on Thursday".
   - §9.1.1: "2 of 3 this week" with nothing after it (drop "1 more by Sun"), "Watered for the week ✓",
     "Held off 12 days". §9.1: collapsed "Not today" row → "Other days"; greeting "Afternoon, Sam".
   - §9.2: the forecast is "4 more check-ins to Blooming" with no "around Oct 14" (the date slides later when
     she rests).
   - §9.6 step 2: "More can go on the sill anytime." in place of "Start small. You can add more anytime.";
     step 5 "Find {name} a plant". §7.2 step 7: "Find {name} a place" / "Let {name} choose". §14.1: "Find
     {name} a plant". §8.2: L7 "naps at the front of the sill, nearest you" and L8 "naps next to a best
     friend" (no pronoun, and no "screen").
8. **Pins UI**: keep "Key under the mat" hidden until it's earned; an outline only a lapse can fill reads as
   a "you left" badge.
9. **Sunday Note**: quote only a note she has starred (the new setting "Quote my notes in the Sunday Note" in
   VOICE.md §22), skip the count sentence under `WATERINGS_MIN`, and use `stageUpCompanion` only at Potted
   or later on a Friday or earlier.
10. **Art**: the hamster `night` caption and aside say the hamster is awake (hamsters are nocturnal, and the
    panel loved the line), so the hamster's night pose should be awake, not asleep.
11. **Small asks**: render {habit} and {plant} in Castoro inside captions so a long habit name reads as a
    label; export `lines` from `src/catalog/index.ts`; and tell me what the `stars` reasons `bloom` and
    `gift` pay for, so they get copy.
12. **Dialect**: the catalog is British (colour, favourite, ladybird, draught, biscuit) and DESIGN is
    American (favorite, apartment), with American dates. Pick one for the audience and apply it to all three.

## The edit pass: what I declined, and why

- **Renaming "The real plants" to "Houseplants"** (critics 1 and 3): the panel protected it. The grammar
  problems it caused ("the The real plants plant", "The real plants was watered") are fixed by
  `plantPhrase` and by "{habit}, watered every day." instead.
- **"Breathes slowly with you, or seems to."** (critic 3, must): the panel protected it, and it describes
  breathing beside her, not meditating.
- **Sassy's "would like the lamp a little to the left", "left exactly half … as a statement", "lets you
  water {plant}", "sitting in the spot you were aiming for"; Sleepy's "is up, technically."; the cow's
  "which means settled"** (critic 3, must/should): all panel-protected. The rest of Sassy was rewritten.
- **Sassy → "Particular"** (critic 3): DESIGN §8.2 names the personality Sassy. The blurb and lines changed.
- **The hamster's "awake, actually" and "Hamsters keep late hours"** (critic 1): panel-protected. The aside is
  now night-only (it was wrong at a daytime nap), and request 10 fixes the art instead.
- **Dropping the Secret "!"** (critic 1): DESIGN §12 allows it; I kept it and asked for the table to match.
- **The Highland Secret line** (critic 1: repeats the flavor): it is DESIGN §12's own line, so the flavor
  should change (request 5). The Samoyed and Golden Frog lines are panel-protected, same fix.
- **Narrowing the substitution to allow "done for the week"** (critics 1 and 3, could): the panel's should,
  "Watered for the week", won.
- **Pin name "A ticket on the sill"** (critic 3) and **"Make it bigger?"** (critic 3): the panel's "Key under
  the mat" and "A bigger pot?" won.
- **A {vessel} slot** (critic 1) and **a `needsCompany` flag** (panel): I used `minStage` gating for pots,
  and rewrote the company lines, which needs no caller flag.
- **Renaming level 2 to "Comes to watch"** (panel): DESIGN §8.2 says L2 looks up when you water, so the
  level keeps its name and the looking-up lines are held back to level 2 instead.
- **Bond level names**: critic 3's must (no family words, no "Kin") set the names; the panel's behavioural
  lines were blended in, and the Memory note moved to its own line (Memories come by friendship, not level).
- **"Stage-up companion" as invented** (critic 3, could): it is DESIGN §12's own Sunday Note, so it stays,
  gated as critic 1 asked.

## Notes

- **Night-safe events.** The event contexts (checkin, perfectDay, welcomeHome, fed, resident…) can fire at
  any hour, so none of their lines puts a pet in the sun, basking or in shade. `evening` is lamplight.
- **Species truth is tested**, including the catalog's pet flavor text (two lines wait on request 5).
- **Pronouns.** Pet lines ban he/she/they/its and first person; UI strings ban gendered pronouns; VOICE.md bans
  gendered pronouns and they/them. "It" stays legal for plants, objects and the weather.
- **Numbers.** Numerals everywhere, spelled out only to open a sentence in a note, in a note's P.S. ("four
  evenings"), in engraved pin names, and at the start of tiny labels. The deck's example dates are all 2025.
- **One exclamation mark.** `SECRET_REVEAL` is "{series}, the secret one! {A}, {secretLine}".
- **Test results at commit:** `tsc` clean. `vitest run tests/unit` (run twice): 267 tests, 261 pass; the 6
  failures are the 4 known art-coverage gaps and the 2 fx pin-name assertions in request 1. catalog, voice
  (36) and contrast all pass. `vitest run src`: the same 5 art failures as before, none new.

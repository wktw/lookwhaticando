# voice: notes for the lead

## What's here

- `docs/VOICE.md`: the copy deck. Principles, the banned list, substitutions, currency names, and final
  copy for every moment in the brief (sections 5 to 22). Every "double-quoted" string in it is linted.
- `src/catalog/lines.ts`: the caption matrix and templates, data plus a few pure helpers.
  - `CAPTIONS`: 10 personalities × 15 contexts, at least 4 own lines each, plus `SHARED_CAPTIONS` per context
    with species-true lines (cud-chew, throat puff, slow blink, nose twitch, cheek-stuffing, tail wag, wing
    stretch, sitting up). The `tap` row is `PersonalityDef.lines` (single source).
  - `pickLine(context, personality, species, seed, recent)`: never returns one of the last 5 in `recent` (the
    caller keeps a small ring of the templates it got back, per context); honours species filters; own lines
    weigh 2×. `pickFrom(lines, species, seed, recent)` is the same rule for any list. `fillLine` fills slots
    (an empty slot also drops its ", "). Also `numberWord`, `withArticle`, `plantPhrase`, `greetingPeriod`.
  - `CHECKIN_TOASTS`, `ASIDE_CHANCE` (0.25), `CHECKIN_ASIDES` (awake/asleep), `STAGE_LINES` (index = stage
    0–7), `STAGE_EVENTS`, `STAGE_FORECAST`, `BLOOM_LINES` (per plant species), `FLOURISH_LINES`,
    `HARVEST_LINES`, `REVEAL_LINES` (per rarity), `SECRET_REVEAL` + `SECRET_LINES` (one per series Secret),
    `DUPLICATE_LINES`, `FRIENDSHIP_LEVELS` (1–15, plain names + lines), `ARCHETYPES` + `ARCHETYPE_BY_ICON` +
    `KNOWN_FOR`, `SUNDAY_NOTE`, `SUNDAY_ROUTINES`, `FOUND_THINGS`, `HERBARIUM`, `GARDEN_JOURNAL`, `GREETINGS`.
- `src/catalog/badges.ts`: every pin renamed ("First watering", "Fifty waterings", "Foil edge", "Brass name
  tag", "Under the lamp"…), plain how-it's-earned descriptions, `emoji: ''` everywhere. Ids, stars and colours
  untouched.
- `src/catalog/templates.ts`: names and tiny labels only ("Go for a walk" → "Walk", "Water the plants" → "The
  real plants" so the toast reads "The real plants, watered.", "Tidy for 10 min" → "Tidy for 10 minutes",
  "Practice a hobby" → "Hobby time", "Review budget" → "Look over the budget", "4 glasses" → "Four glasses",
  "10 squats" → "Ten squats", "Send a sweet text" → "Send a text", "Just moisturizer" → "Just moisturiser").
  Ids and schedules untouched.
- `src/catalog/personalities.ts`: tap lines rewritten species-neutral (no sniffing, pouncing or slow blinks
  for everyone), sharper blurbs, `TREAT_TAG_HINTS` as observations ("Always interested in your cup"; the old
  "Has a sweet tooth" suited nothing with a beak, and "fresh green things" was wrong for carrots), and two
  name swaps ("Meadow" → "Heather" for cows, "Lily" and "Pond" → "Gherkin" and "Reed" for frogs).
- `tests/unit/voice.test.ts`: the lint and the matrix checks (26 tests).

## The lint, and extending it

`VOICE_SCAN_DIRS` (top of `tests/unit/voice.test.ts`) is `['src/catalog']`. It parses each .ts/.tsx with the
TypeScript compiler and reads string literals, template text and JSX text. It skips comments, types,
imports, `throw`/`new Error(...)`/`console.*`, object keys and id-like strings (`pet-cat-orange`, `#EFB4C1`).
A developer-only string can opt out with a `// voice-ignore` comment on its line.

A dry run with `['src/features', 'src/fx', 'src/app', 'src/ui']` flags 89 strings in 17 files today, nearly
all Mochi-era (a string can break more than one rule): emoji (30), "Wishing Well"/"meadow"/"Mochi" (25),
exclamation marks (23), "stars"/"stardust" as currency (12), ✦/✨ dingbats (8), "badge" (5), plus a few pep
talks, platitudes and "missed". By file: `src/fx/celebrationPlan.ts` 22, `src/app/InstallGuide.tsx` 13,
`src/features/capsules/copy.ts` 12, `WishingWell.tsx`, `RevealCard.tsx` and `src/app/installArt.tsx` 7 each,
`OddsSheet.tsx` 6, and 1 or 2 in ten others. VOICE.md has the replacement for each (sections 9, 17 and 18
cover capsules, errors and install).

## Requests (files outside my ownership)

1. **Two fx tests assert the old pin name and will fail after merge.** Renaming "Fifty & Flourishing" is in
   the brief, so these need updating:
   - `tests/unit/fx/celebrationPlan.test.ts:65` expects `'Fifty & Flourishing badge'`.
   - `tests/unit/fx/host.test.tsx:88` expects the banner text to contain `'Fifty & Flourishing badge'`.

   With the VOICE.md pin copy, `celebrationPlan.ts` would say eyebrow "A new pin", title the pin's name
   (the fallback `'A new badge!'` loses the "!"), and the also-line `${name}, a new pin`, so the expectations
   become `'Fifty waterings, a new pin'`.
2. **`src/fx/celebrationPlan.ts` copy** should come from lines.ts: `STAGE_LINES` in place of `STAGE_PHRASE`
   (which carries emoji), rung and ladder toasts from VOICE.md §5, `MILESTONE_LINES` ("Look at you go!", "Your
   future self says thank you.", "Tiny steps, big bloom.") deleted, and `formatTally` saying stamps and swaps
   ("+1 stamp · +4 swaps") in place of stars, stardust and ✦.
3. **`src/catalog/machines.ts`: set the five `seasonal.emoji` values to `''`**, and stop rendering them in
   `src/features/capsules/MachineInfo.tsx:33` and `WishingWell.tsx:161`. Then delete the one entry in
   `KNOWN_EXCEPTIONS` in `tests/unit/voice.test.ts`. `RevealCard.tsx:122` renders `personality.emoji`,
   which is `''`, so the span can go.
4. **`src/features/capsules/copy.ts`**: `RARITY_LABEL`/`RARITY_REVEAL` say Common/Uncommon/"Rare ✨"/"Secret!";
   the catalog's `RARITY_LABEL` (Classic, Special, Rare, Super rare) is the one to use, with `SECRET_REVEAL` for
   the Secret. `pullErrorNotice`, `wishErrorText`, `nudgeText` and `pityHint` should take VOICE.md §9's
   notices.
5. **`src/catalog/index.ts`** (optional): add `export * from './lines';`. No name clashes with the other
   catalog exports; until then, import from `@/catalog/lines`.
6. **DESIGN.md**: §9.6 step 5 says "Name them … Find them a plant", which gives the pet a pronoun. VOICE.md uses
   "Find {name} a plant". §14.1 names 7 of the 14 routine archetypes; lines.ts defines all 14 (read, learn,
   walk, mat, water, sleep, mind, create, tidy, cook, care, plan, connect, garden) with an icon map, if you
   want to adopt the list there.

## Notes

- **Night-safe events.** Idle contexts follow the clock (`tap`/`morning`/`afternoon` in daylight, `evening`
  under the lamp, `night` asleep). The event contexts (checkin, perfectDay, welcomeHome, fed…) can fire at any
  hour, so none of their lines puts a pet "in the sun"; a test guards it. A tap after the lamp comes on should
  use `evening` or `night`, not `tap`.
- **Species truth is tested.** An anatomy table in the lint (paws, tails, ears, noses, wings, cud, throat,
  cheek-stuffing, fur, licks, yawns…) checks every pet line against the species it can be shown to, including
  the catalog's pet flavor text (all of it passes).
- **Pronouns.** Pet lines ban he/she/they/its and first person; UI strings ban gendered pronouns; VOICE.md bans
  gendered pronouns and they/them. "It" stays legal for plants, objects and the weather ("where it is").
- **Numbers.** Numerals everywhere, spelled out only to open a sentence in a note ({Count} slots, via
  `numberWord`), in engraved pin names, and at the start of tiny labels.
- **Spelling** is British to match the catalog's flavor text (colour, favourite, savoury); dates stay "Sep 22"
  as in DESIGN.
- **Treat slot.** Captions say "had" or "finished" the {treat}, never "ate", because three treats are drinks.
- **One exclamation mark.** `SECRET_REVEAL` is "{series}, the secret one! {A}, {secretLine}". The lint allows a
  single "!" only in strings of that shape, in code and in VOICE.md.
- **Test results at commit:** `tsc` clean. `vitest run tests/unit`: 257 tests, 251 pass; the 6 failures are the
  4 known art-coverage gaps and the 2 fx pin-name assertions in request 1. catalog, voice (26) and contrast
  (112) all pass. `vitest run src`: the same 5 art failures as before this change, none new.

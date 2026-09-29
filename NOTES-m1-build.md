# M1 build: notes for the lead

Branch `m1/build`. It covers the build findings of the M1 triage. The requests below touch files this branch does not own.

## After merging

- Run `npm install`. There is a new dev dependency, `@axe-core/playwright` 4.13.0 (with `axe-core`, about 3 MB and no other
  dependencies). `package-lock.json` is updated.
- `npm run check` now runs `typecheck` (app + e2e), `test`, `build`, `size`, `build:single` and `e2e:preview`, and CI
  does the same. The e2e run needs Chromium: the container has it at `/opt/pw-browsers`, and CI installs it.
- **Voice lint: stale-exception test.** `tests/unit/voice.test.ts` now scans all of `src`. The ui and logic copy it
  catches today is listed in `KNOWN_TEXT_EXCEPTIONS`, with `TODO(m1 ui)` and `TODO(m1 logic)` markers. The test "known
  exceptions are still real" fails as soon as one of those strings is fixed, and it names the entry. When you merge the
  ui and logic branches, delete the entries it lists.

## Requests

1. **src/fx (ui/fx owner): load CelebrationArt on demand.** Blocking, because it is the first-paint budget.
   `git apply NOTES-m1-build.lazy-celebration-art.patch` makes these changes:
   - Adds `src/fx/celebrationArtLoader.tsx`, which exports `loadCelebrationArt()` (cached), `preloadCelebrationArtWhenIdle()`,
     `celebrationArtWithin(ms)` and `<LazyCelebrationArt>`.
   - `celebrations.tsx`, `CelebrationBanner.tsx` and `EpicMoment.tsx` render `LazyCelebrationArt` in place of
     `CelebrationArt`.
   - The host warms the chunk when the page is idle after mount. On a cold start it waits up to 400 ms for the art
     before it shows a note or banner. If the host unmounts during that wait, it releases the batch's payout.
   - `tests/unit/fx/host.test.tsx` warms the art in `beforeAll`, and there is a new
     `tests/unit/fx/celebrationArtLoader.test.tsx`.
   - It also sets `KNOWN_OVERAGE = null` in `scripts/size-budget.mjs`, so the 150 KB gate is strict from then on.

   Measured on this branch, the first-paint JavaScript is 301 KB gzipped without the patch and 94.8 KB with it. The
   entry, pet-crescents and art-shade chunks all leave the modulepreload set. Tests pass with the patch applied: tests/unit/fx
   62/62, tests/unit/fx plus tests/unit/build 71/71, and tsc 0. Until the patch lands, the gate allows up to 320 KB. After it lands, the gate fails if
   `KNOWN_OVERAGE` has not been removed.
2. **src/styles/fonts.css and tokens.css (ui): metric-matched fallbacks.** The preloads are already in the build. To stop
   the swap from moving the layout, add fallback faces that are sized to match. I measured these in Chromium against
   Liberation Serif and Liberation Sans, which are metric-compatible with Times New Roman and Arial. The text was a
   catkin copy sample:
   ```css
   @font-face { font-family: 'Castoro Fallback'; src: local('Times New Roman'), local('Liberation Serif'), local('Times');
     size-adjust: 110.05%; ascent-override: 69.06%; descent-override: 22.72%; line-gap-override: 29.99%; }
   @font-face { font-family: 'Nunito Fallback'; src: local('Arial'), local('Liberation Sans'), local('Helvetica');
     size-adjust: 100.57%; ascent-override: 100.43%; descent-override: 34.8%; line-gap-override: 0%; }
   ```
   Then put them straight after the web fonts in the stacks: `--font-display: 'Castoro', 'Castoro Fallback', …` and
   `--font-body: 'Nunito', 'Nunito Fallback', …`. Castoro's own metrics are UPM 1000, typo ascent 755, descent −245,
   line gap 330 (USE_TYPO_METRICS). For bold Nunito against Arial Bold the size-adjust would be 97.7%. One face per
   family is enough.
3. **src/art/scene/decor/shade.gen.ts and tools/build-shade.mjs (art): slim the table.** Make three changes:
   - Write the per-row staleness hashes to `shade.hash.gen.ts`, and import that file only from `decor.test.ts`.
   - Omit rows that hold only a hash (84 of them).
   - Emit the table as `JSON.parse('…')`, the way `pets/crescents/data.ts` does.

   This saves about 9 KB raw and 4 KB gzipped, and it parses faster. The table already has its own `art-shade` chunk
   (`manualChunks` in vite.config.ts), so it caches separately from the code.
4. **scripts/generate-icons.mjs (icons): own the 192 px maskable icon.** Add
   `{ file: 'public/icons/icon-maskable-192.png', size: 192, shape: 'maskable' }` to `ICONS`. For now
   `scripts/manifest-assets.mjs` renders it from the same `AppIconArt shape="maskable"`. Once the icon changes (DESIGN §1
   puts a calf in it), both sizes should come from one script. Remove the maskable step from manifest-assets.mjs then.
5. **Manifest screenshots, after the screens land.** `npm run manifest-assets` renders the install-sheet screenshots from
   the live app, with a fresh save and a fixed 4:30 pm light. The narrow one is Capsules and the wide one is the Shelf,
   because Today, Progress and You are still stubs. When Today is built, change `SCREENSHOTS[0].route` to `today`,
   re-run the script, and update the labels in `MANIFEST.screenshots` in vite.config.ts.
6. **Optional (ui): the file:// ribbon.** It lives in `src/main.tsx` (`TestCopyRibbon`, `role="note"`, `data-test-copy`).
   On file://, `--safe-top` grows by 28 px so that the shell, sheets, toasts and overlays clear the ribbon. If the ui
   owner would rather keep it in App.tsx with a CSS module and the copy in `SHELL_COPY`, move it and keep the
   `data-test-copy` hook, because `e2e/single-file.spec.ts` asserts on it.
7. **DESIGN §11.1 file:// build:** the build now also drops the launch-screen links, inlines the apple-touch-icon and
   copies no `public/` folder. The "First boot offers Import a backup" line is still to be built (ui/screens).

## Contracts for the screen builders

- Each screen renders exactly one visible `h1` inside `<main>`. The e2e specs wait for `main h1` on every route and
  check the theme, console errors, axe (WCAG 2.2 AA plus best practice) and 320 px reflow.
- When onboarding starts gating the first boot, update `openRoute` in `e2e/support.ts` so it starts from a finished
  onboarding.
- First-paint budget: 150 KB of JavaScript, gzipped (`npm run size`, which counts the entry plus its static imports).
  Import screens, art libraries and celebration art lazily. Nothing on the shell path may statically import `@/art/*`
  galleries, `CollectibleArt`, `PetArt` or `CelebrationArt`.
- Any fixed UI at the top of the screen must pad by `var(--safe-top)`. On file:// this includes the ribbon.
- The voice lint reads every string under `src`. Put `// voice-ignore` on a line only for developer-facing strings.

# Wave 2 · You, onboarding and the shell states (branch w2/you)

## What is here

- `src/features/you/`: the You screen (DESIGN §9.5). Profile card (name, since, counts) with the
  name and birthday fields · Habits (edit, "Arrange" with drag / arrow keys / up-down buttons,
  archived with "Bring it back", "Add a habit") · Your days · Look and sound · Today and capsules
  · Accessibility (reduce motion, keyboard shortcuts) · Watering time (.ics) · Your data (status,
  last backup + nudge, Save a backup, Copy backup, Import with preview and 24 h Undo, daily
  copies, CSV, the demo, Start over behind two confirmations) · On your Home Screen (InstallGuide,
  "Move my plants into the app" / "Paste my plants") · About (principles, How it works, Credits,
  Check for updates, Reload app, version + build, 7 taps → Diagnostics at `#/you/diagnostics`).
- `src/features/onboarding/`: all six steps (DESIGN §9.6), lazy-loaded by the shell; steps 4–5
  in their own chunk (`CapsuleSteps.tsx`) fetched while she is on the sill. Steps 3–5 survive a
  reload (`catkin:onboarding`, cleared by Start over with the rest of `catkin:*`).
- `src/app/App.tsx`: the onboarding branch (full screen, no tabs), the shell banners (other
  window + Use here, newer save, save not written, clock behind) and the demo pill; it also
  answers `ck:new-habit` (N) by opening the Habit Editor.
- `src/app/InstallGuide.tsx`: `InstallGate` gains `onPaste` ("Paste my plants") and `onStay`
  ("Keep it in this tab").
- `src/app/pwa.ts`: `updateReady`, `checkForUpdates()`, `reloadApp()`, `holdUpdates`,
  `updatesSupported()`; checks on resume after 30 min; a waiting version applies on the next
  hide → show unless a sheet, a reveal or onboarding is open (once per page, never a loop).
- `public/cal/*.ics` (84 files) from `scripts/generate-cal.mjs`: the static watering-time files
  for installed iPhone apps. A unit test fails if they drift from `wateringTimeIcs()`.

## Requests for the lead

1. **e2e harness (blocking for every screen's specs).**
   - `playwright.config.ts` projects only match `routes|layout|single-file`. Add projects for the
     screen specs, e.g. four projects (phone/desktop × light/dark) with
     `testMatch: /(you|onboarding|today|progress|shelf|capsules)\.spec\.ts$/`. I ran mine with a
     local copy of the config that adds exactly that (not committed).
   - Onboarding now gates the first boot, so `openRoute` in `e2e/support.ts` must start from a
     finished onboarding (NOTES-open item 9). Note the phone projects use `devices['iPhone 13']`,
     an iPhone Safari user agent, so they meet the install gate first. The smallest patch:
     ```ts
     export async function openRoute(page: Page, tab: TabId, base = './'): Promise<void> {
       const url = `${base}#/${tab}`;
       if (page.url() === 'about:blank') {
         await page.goto(url);
         const stay = page.getByRole('button', { name: 'Keep it in this tab' });
         const skip = page.getByRole('button', { name: 'Skip' });
         await expect(stay.or(skip).or(page.getByRole('navigation', { name: 'Main' }).first())).toBeVisible();
         if (await stay.isVisible()) await stay.click();
         while (await skip.isVisible()) await skip.click();              // sill → pick → (nothing planted) → cabinets
         await page.getByRole('button', { name: 'Not yet, I’ll earn it' }).first().click();
         await page.evaluate((t) => (location.hash = `#/${t}`), tab);
       } else await page.evaluate((t) => (location.hash = `#/${t}`), tab);
       await expect(page.locator('main h1')).toBeVisible();
       await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
     }
     ```
     (single-file.spec.ts needs the same before it walks the routes.)
2. **First-paint size.** The entry grew from 119.9 to 140.9 KB gzip (budget 150). Not from my
   modules: `store.ts` is in the entry, and Rollup keeps every store export a lazy screen uses in
   the store's chunk. Once You calls `enterDemo`/`resetAll`, `wateringTimeFile`/`exportCsv` and
   `completeOnboarding`, `state/demo.ts` (buildDemo), `domain/profile.ts` and `catalog/templates.ts`
   stop being tree-shaken. Suggest `store.ts` loads the demo lazily (`const { buildDemo } = await
   import('./demo')` inside `enterDemo`/`resetAll`, which can become async) and moves the .ics/CSV
   helpers behind a dynamic import too. I kept `lines.ts` out of the shell path myself
   (`src/features/you/shellCopy.ts`, pinned to lines.ts by a test).
3. **Clock-behind notice.** It is a shell banner now (every tab). The M1 contract map also lists
   `clockBehind` under Today's banners: Today should not show it a second time.
4. **FirstPick** (`src/features/capsules/FirstPick.tsx`) has an `h2` title, so onboarding couldn't
   use it and keep one `h1`; onboarding composes `CabinetArt` + `CapsuleMachine` itself. If the
   capsules owner wants one component, give FirstPick a heading-level prop.
5. **A celebration banner sits over the capsule reveal** in onboarding (the First watering /
   First capsule pins arrive while the cabinet and reveal are up). `pushLayer(..., { moment: true })`
   makes new banners wait, but one already showing stays on top of the reveal. For fx/capsules.
6. **`__BUILD__`.** About shows "Version 1.0.0" and the build kind (Home Screen app / In the
   browser / Single file / Development). A build id (git sha, date) would need a `define` in
   vite.config.ts.
7. **Copy for the deck (VOICE.md).** New strings, all in `src/features/you/copy.ts` (plus
   `InstallGuide.tsx`'s "Keep it in this tab"): the section names ("Profile", "Your days", "Look
   and sound", "Today and capsules", "Accessibility", "Your data", "On your Home Screen",
   "About"), "On this sill since {date}", "Arrange" / "Done", "Bring it back", "Resting",
   "Keyboard shortcuts" + "1–5 switch tabs, N plants a habit.", "Daily copies" and the snapshot
   kinds, "Choose a file", "Or paste a backup here", the no-undo confirmation, "Start over now?"
   / "Everything here goes. The daily copies stay on this device.", "The demo" (pill), the demo
   line, "Waterings saved.", the About principles / How it works / Credits paragraphs,
   "Diagnostics" and its lead, onboarding's "Next", "Plant it" / "Plant them", "Fewer ideas",
   "That’s 3. More can go on the sill anytime.", "On to Today", "Keep it in this tab".
8. **The Habit Editor, Habit Detail and Pet Card hosts are still stubs.** You › Habits opens the
   editor (`openHabitEditor({ id })`) and "Add a habit" opens it empty; nothing appears until the
   editor lands.
9. **`reorderHabits` and habit stacking.** A follower sorts after its anchor on Today, so an
   arrangement that splits them won't show there. Worth one line in the editor's "After…" field,
   or a guard in the domain.

## Known gaps

- Static .ics files carry no habit names ("Morning plants."): they are shared files. The download
  path (everywhere else) names the habits.
- The install gate shows once per visit; after "Just peek", leaving the demo goes to step 1.
- Diagnostics' audio line reports support, not the live AudioContext state (not exported).

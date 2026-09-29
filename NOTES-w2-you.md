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
  `updatesSupported()`; checks on resume after 30 min; a waiting version applies when the app is
  next hidden (never in front of her) unless a sheet, a reveal or onboarding is open (once per
  page, never a loop). The You name field commits on hide.
- `public/cal/*.ics` (84 files) from `scripts/generate-cal.mjs`: the static watering-time files
  for installed iPhone apps. A unit test fails if they drift from `wateringTimeIcs()`.

## Requests for the lead

1. **One ready patch: the e2e harness and the calendar files under the service worker.** Apply
   with `git apply` from the repo root (paths are repo-relative). It
   - adds the four screen projects (`screens-{phone,desktop}-{light,dark}`, matching
     `(you|onboarding|today|progress|shelf|capsules).spec.ts`) and, on the preview target, a
     `pwa-screens` project for tests tagged `@pwa`;
   - makes `openRoute` in `e2e/support.ts` start from a finished onboarding (the phone projects
     are an iPhone Safari UA, so they meet the install gate first; NOTES-open item 9);
   - in `vite.config.ts`, keeps `cal/*.ics` out of the navigation fallback
     (`navigateFallbackDenylist`) and precaches them (`ics` in `PRECACHE_GLOB`, 84 files, about
     35 KB). Without it, "Add to calendar" in the installed iPhone app is a navigation that the
     service worker answers with index.html (catkin opens again), and offline there is no file.
   Verified here: with the harness part applied, `npx playwright test` (dev) ran **87 passed, 12
   skipped, 0 failed** (the shared 31 plus You and onboarding on all four screen projects).
   Without it, 24 of the shared 31 fail at `openRoute`. The `@pwa` test in `e2e/you.spec.ts`
   **fails on the current config** ("not a download: catkin") and **passes with the vite part**
   (`E2E_TARGET=preview`, after `npm run build`). A unit test that pins the precache list may need
   `ics` added.
```diff
diff --git a/e2e/support.ts b/e2e/support.ts
index e2d1624..d3238cd 100644
--- a/e2e/support.ts
+++ b/e2e/support.ts
@@ -27,8 +27,16 @@ export function watchErrors(page: Page): string[] {
  */
 export async function openRoute(page: Page, tab: TabId, base = './'): Promise<void> {
   const url = `${base}#/${tab}`;
-  if (page.url() === 'about:blank') await page.goto(url);
-  else await page.evaluate((t) => (location.hash = `#/${t}`), tab);
+  if (page.url() === 'about:blank') {
+    // A first boot is onboarding now (and, in an iPhone Safari tab, the install gate first).
+    await page.goto(url);
+    const stay = page.getByRole('button', { name: 'Keep it in this tab' });
+    const skip = page.getByRole('button', { name: 'Skip' });
+    await expect(stay.or(skip).or(page.getByRole('navigation', { name: 'Main' }).first())).toBeVisible();
+    if (await stay.isVisible()) await stay.click();
+    while (await skip.isVisible()) await skip.click(); // sill → pick (nothing planted) → cabinets → Today
+    await page.evaluate((t) => (location.hash = `#/${t}`), tab);
+  } else await page.evaluate((t) => (location.hash = `#/${t}`), tab);
   await expect(page.locator('main h1')).toBeVisible();
   await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
 }
diff --git a/playwright.config.ts b/playwright.config.ts
index 9de38ff..39aff3c 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -27,6 +27,7 @@ const BASE_URL = `http://127.0.0.1:${PORT}/`;
 const phone = { ...devices['iPhone 13'], browserName: 'chromium' as const, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
 const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } };
 const routes = /routes\.spec\.ts$/;
+const screens = /(you|onboarding|today|progress|shelf|capsules)\.spec\.ts$/;
 
 const projects: Project[] = [
   { name: 'phone-light', testMatch: routes, use: { ...phone, colorScheme: 'light' } },
@@ -35,8 +36,17 @@ const projects: Project[] = [
   { name: 'desktop-dark', testMatch: routes, use: { ...desktop, colorScheme: 'dark' } },
   { name: 'phone-320', testMatch: /layout\.spec\.ts$/, use: { ...phone, viewport: { width: 320, height: 640 } } },
   { name: 'single-file', testMatch: /single-file\.spec\.ts$/, use: { ...phone } },
+  // The screens' own journeys (wave 2), phone and desktop, light and dark.
+  { name: 'screens-phone-light', testMatch: screens, use: { ...phone, colorScheme: 'light' } },
+  { name: 'screens-phone-dark', testMatch: screens, use: { ...phone, colorScheme: 'dark' } },
+  { name: 'screens-desktop-light', testMatch: screens, use: { ...desktop, colorScheme: 'light' } },
+  { name: 'screens-desktop-dark', testMatch: screens, use: { ...desktop, colorScheme: 'dark' } },
 ];
-if (TARGET === 'preview') projects.push({ name: 'pwa', testMatch: /pwa\.spec\.ts$/, use: { ...desktop, serviceWorkers: 'allow' } });
+if (TARGET === 'preview') {
+  projects.push({ name: 'pwa', testMatch: /pwa\.spec\.ts$/, use: { ...desktop, serviceWorkers: 'allow' } });
+  // Screen tests that need the service worker, tagged @pwa (You's static calendar files).
+  projects.push({ name: 'pwa-screens', testMatch: screens, grep: /@pwa/, use: { ...desktop, serviceWorkers: 'allow' } });
+}
 
 export default defineConfig({
   testDir: 'e2e',
diff --git a/vite.config.ts b/vite.config.ts
index 84ce585..6f1fcef 100644
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -71,7 +71,7 @@ export const MANIFEST: Partial<ManifestOptions> = {
  * runtime). public/ is not listed in `includeAssets`, which would bypass these ignores, and the
  * plugin's own manifest and manifest-icon entries are left off, since the glob already has them.
  */
-export const PRECACHE_GLOB: readonly string[] = ['**/*.{js,css,html,woff2,png,svg}'];
+export const PRECACHE_GLOB: readonly string[] = ['**/*.{js,css,html,woff2,png,svg,ics}'];
 export const PRECACHE_IGNORE: readonly string[] = ['splash/**', 'screenshots/**', 'assets/nunito-latin-ext-*.woff2'];
 
 /** The two big generated art tables get chunks of their own, so they cache apart from the code. */
@@ -152,6 +152,7 @@ export default defineConfig(({ mode }) => {
           globPatterns: [...PRECACHE_GLOB],
           globIgnores: [...PRECACHE_IGNORE],
           navigateFallback: 'index.html',
+          navigateFallbackDenylist: [/\/cal\/[^/]+\.ics$/],
           cleanupOutdatedCaches: true,
           runtimeCaching: [
             {
```
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
5. **Holding celebrations (fx / ui kit).** Onboarding now holds banners and notes from the first
   watering to the end, so the pins arrive on Today (`useHoldCelebrations` in Onboarding.tsx). The
   only hook for that is a *moment* layer (`pushLayer(id, { moment: true })`), which also makes
   `#app` inert and locks the scroll; onboarding gives both back at once and re-applies inert only
   while a sheet or the reveal is above it. Please add a plain `holdMoments(): () => void` to
   `src/ui/sheetStack.ts` (adds to `moments` and notifies, nothing else) and I'll switch to it.
   Two notes: the held queue lives in memory, so a reload during steps 3–5 drops the waiting pins'
   celebrations (the pins themselves are kept); and the banner, once on Today, is still outside
   every landmark (axe `region`): `CelebrationBanner`'s anchor needs `role="region"` and a label.
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
   "That’s 3. More can go on the sill anytime.", "On to Today", "Keep it in this tab" (now in
   `shellCopy.ts`). Review round 1 changed or added: About's principles (now 3: "Growth only
   adds. A resting plant keeps every leaf." · "With Quiet rewards on, catkin is just the
   tracker." · "The odds are printed on every cabinet."), How it works ("Watering it counts the
   day", "Pets keep habits company. Each pet moves into a plant and is there on the sill at every
   watering. The friendship grows with the habit.", and "Sound and haptics": "Both are extras.
   Everything works without them."), "Kept on this device: 7 daily and 4 weekly." (the daily
   copies sheet, so it doesn't repeat its title), "This window can’t change the save right now."
   under You's h1 in a read-only window, "Tap a plant, and {name} moves in." (step 5), "Step {n}
   of {count}" (screen readers), "Bring it back: {habit}", "Edit" (habit rows), "This device"
   (Diagnostics' h2), and the kit's "Close" on the clock note.
8. **The Habit Editor, Habit Detail and Pet Card hosts are still stubs.** You › Habits opens the
   editor (`openHabitEditor({ id })`) and "Add a habit" opens it empty; nothing appears until the
   editor lands.
9. **`reorderHabits` and habit stacking.** A follower sorts after its anchor on Today, so an
   arrangement that splits them won't show there. Worth one line in the editor's "After…" field,
   or a guard in the domain.

10. **Backups marked only when they happen.** `exportData()` and `exportPayload()` mark
    `lastBackupAt` before the share sheet opens, so a cancelled share (or a copy that falls back to
    the copy-by-hand sheet) still shows "Last backup: today" and hides the nudge. Please export a
    non-marking `backupJson()` / `backupPayload()` and a `markBackup()` action; You will mark only
    on 'shared', 'downloaded' or a successful copy.
11. **Import preview counts.** `describeBackup` counts archived habits too ("This backup has 13
    habits") while You's profile says 10. Counting live habits (or "10 habits, 3 archived") would
    match.
12. **Ownership.** `src/app/App.module.css` (outside my list) holds the onboarding main, the
    shell banners, the demo pill and the quiet clock note (`.bannerQuiet`). Please approve or move.
    Also a shell bug for every screen: `.main`'s desktop padding is
    `max(32px, calc((100% - var(--content-max)) / 2))`, and a padding percentage is of the
    *shell's* width, so at 1280 each side gets 280 px and the column is 472 px, not 720. The fix is
    `calc((100vw - var(--sidebar-w) - var(--content-max)) / 2)`. You sizes itself from the window
    (so it is right either way); other screens may be living in the narrow column.
13. **First-paint size (re request 2).** Now 141.0 KB gzip. Calling the store through
    `import('@/state/store')` from You would not help: the store is in the entry either way, and a
    namespace import keeps every export. The fix stays in store.ts (a lazy `demo.ts`).
14. **iPhone checks.** Copy backup and "Move my plants into the app" now start the clipboard write
    inside the tap (a ClipboardItem whose text arrives later), and "Paste my plants" starts its
    read in the tap that opens the sheet. Headless Chromium allows every path, so please try both
    on a real iPhone (Safari tab → Home Screen app).

## Known gaps

- Static .ics files carry no habit names ("Morning plants."): they are shared files. The download
  path (everywhere else) names the habits.
- The install gate shows once per visit; after "Just peek", leaving the demo goes to step 1.
- Onboarding's steps 1 and 3 keep the main button at the bottom of a tall phone (thumb reach), so
  a gap remains between the content and the button; the sill band has a fixed height, so it can't
  take that room.
- Diagnostics' audio line reports support, not the live AudioContext state (not exported).

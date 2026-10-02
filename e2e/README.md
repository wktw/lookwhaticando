# e2e

Playwright. Existing route/screen projects use Chromium with reduced motion; the focused matrix also runs actual WebKit, ordinary-motion Chromium and Chromium forced colours. Config: `playwright.config.ts`.

- `npm run e2e`: against the Vite dev server (no build needed; the single-file spec skips itself locally
  when `dist-single/catkin.html` is missing).
- `npm run e2e:preview`: against `vite preview` of `dist/` (run `npm run build` and `npm run build:single`
  first). This is what `npm run check` and CI run, and it adds the service-worker spec.

| Spec | Project(s) | Guards |
| --- | --- | --- |
| `routes.spec.ts` | phone/desktop × light/dark | each route renders its `main h1`, the theme, no page or console errors, axe (WCAG 2.2 AA + best practice) clean; the nav reaches every route |
| `layout.spec.ts` | phone-320 | no horizontal scroll at 320 px |
| `single-file.spec.ts` | single-file | `catkin.html` opens from file://, shows the Test copy ribbon, renders every route, requests nothing outside itself |
| `pwa.spec.ts` | pwa (preview only) | the service worker takes over, precaches no launch screens or screenshots, opens offline; every manifest image exists |
| `windows.spec.ts` | two-windows, webkit-phone, chromium-motion | two pages in one context share the save and Web Locks: the second opens read-only, takes the save with Use here and starts over; the first follows it to a fresh start with the "started over in another window" note, takes the save back and writes nothing old (WP-A2/A9) |

| `lifecycle.spec.ts` | webkit-phone, chromium-motion | keyboard import → reload → Undo; real-origin outage with a service-worker reload; held and cold-page worker updates; recovery chunk failure/retry; count pad visibility events; cancelled drag; capsule keyboard turn and route handoff; toast Undo and soil; licences; loading h1; desktop scrollbars; 320 px and landscape |
| `lifecycle.spec.ts` tagged `@colors` / `@layout` | chromium-forced-colors | keyboard controls, sheets, capsules and narrow/landscape layouts with forced colours |
| `quiet.spec.ts` | screen projects, webkit-phone, chromium-motion | quiet check-in, Undo, note, detail, history correction and reload; pending reveal preservation; transient live-region leaks |

Matrix saves are seeded once through `page.evaluate`, so reloads read what the app actually saved. The offline matrix test owns and closes a private production origin, verifies it is unreachable, then reloads through the real service worker. This avoids Playwright WebKit's known offline-emulation defect ([#42775](https://github.com/microsoft/playwright/issues/42775)); the original Chromium PWA test still uses `context.setOffline`. Updates use a second URL of the production worker to create a genuine waiting version. Chunk recovery uses a private server returning a real HTTP 503, then restores that file before retrying.

The 61-second background and update checks explicitly dispatch visibility events: headless engines keep pages visible, so these tests do not claim physical iPhone suspension, process termination, keyboard, VoiceOver, sharing, haptics or installed-PWA coverage. Those remain device checks. The three production-worker cases and the server-side chunk-failure case skip against the development server and run in the preview gate. A WebKit incognito browser context is covered; Safari's private-mode user interface and storage-pressure eviction remain unverified.

Screens must keep exactly one visible `h1` inside `<main>`. When onboarding starts gating the first boot,
teach `openRoute` in `support.ts` to start from a finished onboarding.

The browsers come from `PLAYWRIGHT_BROWSERS_PATH` (the container sets `/opt/pw-browsers`); CI runs
`npx playwright install --with-deps chromium webkit`. Playwright 1.57 or later is required for the WebKit reload fix ([#37766](https://github.com/microsoft/playwright/issues/37766)). Each checkout gets its own port, so worktrees can run in parallel.

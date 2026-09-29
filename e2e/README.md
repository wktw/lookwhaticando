# e2e

Playwright, Chromium only, reduced motion. Config: `playwright.config.ts`.

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

Screens must keep exactly one visible `h1` inside `<main>`. When onboarding starts gating the first boot,
teach `openRoute` in `support.ts` to start from a finished onboarding.

The browsers come from `PLAYWRIGHT_BROWSERS_PATH` (the container sets `/opt/pw-browsers`); CI runs
`npx playwright install --with-deps chromium`. Each checkout gets its own port, so worktrees can run in parallel.

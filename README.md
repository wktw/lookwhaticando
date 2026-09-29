# catkin

**Look after the little things.**

catkin is a habit tracker for iPhone and Mac. Every habit is a houseplant, grown from a cutting in a glass of water.
Keeping the habit waters it, and over weeks it roots, gets potted up, leafs out and blooms. The plants turn your windowsill
into a home, and small, real animals come to live there: cats, cows, dogs, rabbits, frogs, ducklings, bear cubs and
hamsters. They arrive in capsules bought with the coins your habits earn.

Nothing wilts. A quiet day costs nothing, and coming back is noticed kindly. Progress is counted as showing up over
time (“26 of the last 30 days”), never as a run that starts over. Hide every game element and it is still a
complete habit tracker. The game is there so that opening the tracker is something to look forward to.

## Try it

### On a Windows PC (no install)

1. Open the latest **CI & Deploy** run under the repository’s **Actions** tab.
2. Download the artifact **catkin-single-file** and unzip it.
3. Double-click **catkin.html**. It opens in your browser and runs completely offline. Everything is saved in that
   browser on that PC.

Or run it from source (Node 22+):

```bash
npm install
npm run dev          # open the printed URL; --host also serves it to phones on the same Wi-Fi
```

### On iPhone

1. Open the hosted app in **Safari** (see *Hosting* below).
2. Tap **Share**, then **Add to Home Screen**. catkin then opens full-screen, works offline and keeps its own data.
3. Open it from the Home Screen, not from the Safari tab. iOS keeps a Safari tab’s data separate from the installed
   app, so catkin asks you to install first.

### On a Mac

- **Safari**: open the hosted app, then choose **File › Add to Dock**.
- **Chrome or Edge**: open the hosted app, then click the **Install** icon in the address bar.

### Hosting

CI builds and deploys the app to GitHub Pages from the default branch. Turn Pages on once under **Settings › Pages ›
Source: GitHub Actions**, and the app is then served at `https://<owner>.github.io/<repo>/`. You can also run the
**CI & Deploy** workflow by hand from any branch to deploy it.

## Your data

Everything stays on your device. There are no accounts, servers or analytics. **You › Data** exports a backup file
(`catkin-backup`) and imports one, with an undo. To move from a Safari tab into the installed app, use the copy code
shown there (it starts with `CK1:`).

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Dev server, including `gallery.html` (every piece of art and UI in every state) |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Unit and component tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run build` | The installable PWA → `dist/` |
| `npm run build:single` | One self-contained file → `dist-single/catkin.html` |
| `npm run icons` | Regenerates app icons and iOS launch screens from the real art |

Built with Preact, TypeScript, @preact/signals, Vite and vite-plugin-pwa. All art is drawn in code as SVG.

## Documents

- [`docs/DESIGN.md`](docs/DESIGN.md): the design bible (brand, principles, habits, economy, capsules, screens,
  visual system, voice, rituals).
- [`docs/VOICE.md`](docs/VOICE.md): the copy deck.
- [`docs/AUDITS.md`](docs/AUDITS.md): the adversarial audits run at each milestone, and what they changed.
- [`docs/ORIGINAL_CONCEPT.md`](docs/ORIGINAL_CONCEPT.md): the concept this grew from.

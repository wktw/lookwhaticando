/**
 * The app shell's words, in the catkin voice (DESIGN §12): plain, kind, specific, sentence case.
 * No exclamation marks, no emoji, no "cozy". tests/unit/fx/copy.test.ts lints these too.
 */

export const SHELL_COPY = {
  appName: 'catkin',
  tagline: 'Look after the little things.',
  brandLabel: 'catkin, go to Today',
  skip: 'Skip to content',
  wallet: 'Wallet',
  swapsHint: 'Swaps: every 10 become a stamp',
} as const;

/** Loading a screen, and the rare times it can't. */
export const SCREEN_COPY = {
  loading: 'One moment',
  loadErrorTitle: 'This page didn’t load',
  loadErrorText: 'It needs a connection the first time it opens. Try again in a moment.',
  retry: 'Try again',
  crashTitle: 'Something here didn’t open properly',
  crashText: 'Your plants and everything you logged are safe.',
} as const;

/** Service worker notes. */
export const UPDATE_COPY = {
  ready: 'A new version of catkin is ready.',
  refresh: 'Refresh',
  offline: 'catkin works offline now.',
} as const;

export const INSTALL_COPY = {
  gateTitle: 'Keep catkin on your Home Screen',
  gateText: 'It opens full-screen, works offline, and your plants are kept safe on this phone.',
  gateTextMac: 'It opens in its own window, works offline, and your plants are kept safe on this Mac.',
  gatePeek: 'Just peek',
  sheetDescription: 'Full-screen, offline, and one tap away.',
  cardTitleDock: 'catkin in your Dock',
  cardTitleHome: 'catkin on your Home Screen',
  cardInstalled: 'Installed. It’s on your Home Screen or in your Dock.',
  cardPitch: 'Full-screen, offline, one tap away.',
  installed: 'Installed',
  install: 'Install',
  showMe: 'Show me how',
  gotIt: 'Got it',
  doneTitle: 'All set',
  doneText: 'catkin is installed. It’s on your Home Screen or in your Dock.',
  installedToast: 'catkin is installed.',
} as const;

/**
 * The You screen's and onboarding's own words: only what VOICE.md and lines.ts don't already
 * say (section names, a few button labels, the About pages). Everything else comes from
 * `@/catalog/lines` (SETTINGS, DATA, REMINDERS, INSTALL, ERRORS, EMPTY, ONBOARDING…). Each group
 * is listed in NOTES-w2-you.md for the copy deck.
 */
import { fillLine } from '@/catalog/lines';

export const YOU = {
  title: 'You',
  sinceLine: 'On this sill since {date}',
  sections: {
    profile: 'Profile',
    habits: 'Habits',
    days: 'Your days',
    look: 'Look and sound',
    today: 'Today and capsules',
    access: 'Accessibility',
    data: 'Your data',
    install: 'On your Home Screen',
    about: 'About',
  },
} as const;

export const HABITS_COPY = {
  arrange: 'Arrange',
  done: 'Done',
  archived: 'Archived',
  bringBack: 'Bring it back',
  bringBackLabel: 'Bring {habit} back',
  edit: 'Edit {habit}',
  move: 'Move {habit}',
  moveUp: 'Move {habit} up',
  moveDown: 'Move {habit} down',
  moveHint: 'Drag, or use the arrow keys.',
  moved: '{habit}, {pos} of {count}.',
  resting: 'Resting',
} as const;

export const PREFS_COPY = {
  weekdays: { 1: 'Monday', 0: 'Sunday' },
  shortcuts: { label: 'Keyboard shortcuts', helper: '1–5 switch tabs, N plants a habit.' },
  birthdayMonth: 'Month',
  birthdayDay: 'Day',
  notSet: 'Not set',
  off: 'Off',
} as const;

export const DATA_COPY = {
  snapshotsRow: 'Daily copies',
  snapshotKinds: { daily: 'Daily copy', weekly: 'Weekly copy', 'pre-import': 'Before an import' },
  snapshotLine: '{habits} habits · {waterings} waterings',
  restoredSnapshot: 'Back to the copy from {date}.',
  chooseFile: 'Choose a file',
  pasteLabel: 'Or paste a backup here',
  pasteHelper: 'A backup starts with CK1, or it is a catkin backup file.',
  noUndoTitle: 'Import without an undo?',
  noUndo: 'catkin couldn’t keep a copy of what’s here, so there is no Undo import this time.',
  importAnyway: 'Import anyway',
  cannotOpen: 'This browser can’t open that backup. Try the backup file instead.',
  readOnly: 'This window can’t change the save right now.',
  inDemo: 'Leave the demo to import a backup. The demo keeps its own plants.',
  startOverAgainTitle: 'Start over now?',
  startOverAgain: 'Everything here goes. The daily copies stay on this device.',
  demoLine: 'A made-up sill with a few months of watering. Your own plants stay as they are.',
  demoPill: 'The demo',
  copyTitle: 'Your backup',
  copyHelper: 'Select it all, copy it, and keep it somewhere safe.',
  csvSaved: 'Waterings saved.',
  fileBuild: 'Saved in this browser, for this file',
} as const;

export const ABOUT_COPY = {
  principlesTitle: 'What catkin keeps to',
  principles: [
    'Growth only adds. Nothing wilts, droops or goes brown.',
    'Rest is part of the routine. Rest days and pauses count as rest.',
    'Coming back is noticed kindly.',
    'With Quiet rewards on, catkin is just the tracker.',
    'The odds are printed on every cabinet.',
    'Sound and haptics are extra. Everything works without them.',
  ],
  how: [
    { title: 'Your habits are plants', text: 'Each habit starts as a cutting in a glass of water. Watering it is how you mark it done, and the plant grows as you keep the habit: roots, a pot, leaves, buds, flowers.' },
    { title: 'Showing up, over time', text: 'Progress reads as days you showed up, like 26 of the last 30. Rest days and paused habits count as rest.' },
    { title: 'Coins and capsules', text: 'Watering drops brass coins in the jar. The capsule cabinets take them, and each capsule holds a small animal, something to wear, a treat or a bit of decor.' },
    { title: 'Pets and plants', text: 'A pet can keep a habit company and live in its plant. It waters with you on the sill, and its friendship grows as the habit does.' },
    { title: 'Kept on this device', text: 'Your plants live in this browser or on your Home Screen. There is no account. Save a backup now and then.' },
  ],
  credits: [
    { title: 'Drawn in code', text: 'Every plant, pot, pet and cabinet is drawn by hand as code, lit by one window.' },
    { title: 'Type', text: 'Castoro by Tiffany Wardle and Nunito by Vernon Adams, both under the SIL Open Font License.' },
    { title: 'Made with', text: 'Preact, Vite and Workbox.' },
  ],
  build: { pwa: 'Home Screen app', tab: 'In the browser', single: 'Single file', dev: 'Development' },
  updatesSingle: 'This copy updates when you download a new catkin.html.',
  updatesOther: 'Updates arrive with the hosted app.',
  checking: 'Checking',
  diagnosticsIn: 'Diagnostics in {n} taps',
} as const;

export const DIAG_COPY = {
  title: 'Diagnostics',
  back: 'You',
  lead: 'What this device says about catkin. Copy the report to share it.',
  copied: 'Report copied.',
  measure: 'Measure frame timing',
  checkClock: 'Check the clock',
} as const;

export const ONBOARDING_COPY = {
  next: 'Next',
  plantOne: 'Plant it',
  plantMany: 'Plant them',
  makeOwnLabel: 'Your own habit',
  add: 'Add',
  lessIdeas: 'Fewer ideas',
  pickFull: 'That’s 3. More can go on the sill anytime.',
  remove: 'Take {habit} off the sill',
  toToday: 'On to Today',
  choose: 'Who comes home first? Choose a cabinet',
  notice: 'Name',
  nameIdeas: 'Name ideas',
  anotherName: 'Another name',
} as const;

export const SHELL_BANNERS = {
  leaveDemo: 'Leave the demo',
  dismiss: 'Dismiss',
} as const;

/** "{habit}, 2 of 5." */
export const movedLine = (habit: string, pos: number, count: number) => fillLine(HABITS_COPY.moved, { habit, pos, count });

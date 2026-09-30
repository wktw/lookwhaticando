/**
 * The few VOICE lines the app shell shows before any screen has loaded: its banners (VOICE §18),
 * the demo pill (§21) and the update note (§19). They are copies, because lines.ts is far too big
 * for the first paint; tests/unit/you/shellCopy.test.ts pins each one to its source in lines.ts.
 */
export const SHELL_LINES = {
  /** ERRORS.otherWindow, split at its " · " into the note and its button. */
  otherWindow: 'catkin is open in another window · Use here',
  useHere: 'Use here',
  newerSave: 'This save is from a newer catkin, so it opens read-only here. Update to make changes.',
  save: 'That change didn’t save yet. catkin is trying again, and your last backup is safe.',
  volatile: 'This browser isn’t keeping catkin’s save right now. Save a backup before you close it.',
  clock: 'The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again.',
  leaveDemo: 'Leave the demo',
  /** INSTALL.updateReady: "A new version is ready · Reload". */
  updateReady: 'A new version is ready · Reload',
  /** The kit's close label (Sheet), for putting the clock note away. */
  close: 'Close',
  /** The install gate's way on without installing (VOICE §24). */
  gateStay: 'Keep it in this tab',
  /** The demo pill's label (You › Data's DATA_COPY.demoPill). */
  demoPill: 'The demo',
} as const;

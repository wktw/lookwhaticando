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
  /** ERRORS.startedOver: another window started over, and this one followed. */
  startedOver: 'catkin was started over in another window, so it starts fresh here too. The daily copies stay on this device.',
  save: 'That change didn’t save yet. catkin is trying again, and your last backup is safe.',
  volatile: 'This browser isn’t keeping catkin’s save right now. Save a backup before you close it.',
  clock: 'The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again.',
  /** ERRORS.recovered / corrupt: a save that couldn't be read (WP-A7). DEC-V: pending owner approval. */
  recovered: 'catkin couldn’t read the latest save on this device, so it opened the one before it.',
  corrupt: 'catkin couldn’t read the save on this device. The file is kept just as it was.',
  /** A full disk took the room the damaged file was kept in: it is only in this window now (the WP-A7 review). DEC-V: pending owner approval. */
  damagedUnkept: 'catkin needed the room to save your changes, so the damaged file isn’t kept on this device any more. Save it now to keep it.',
  /** The notes' buttons: ERRORS.saveDamaged, ERRORS.tryAgain, DATA.save, DATA_COPY.snapshotsRow, DATA.import. */
  saveDamaged: 'Save the damaged file',
  tryAgain: 'Try again',
  saveBackup: 'Save a backup',
  dailyCopies: 'Daily copies',
  importBackup: 'Import a backup',
  /** ERRORS.stillNotSaved: a Try again that still didn't save. */
  stillNotSaved: 'Still not saved. catkin keeps trying.',
  /** INSTALL.reloadUnsaved / reloadAnyway: Reload while a change isn't written yet (P-persistence-01). */
  reloadUnsaved: 'Your latest changes aren’t saved yet. Reloading now would clear anything that isn’t saved.',
  reloadAnyway: 'Reload anyway',
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

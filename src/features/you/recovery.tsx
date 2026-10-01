/**
 * The ways out of a save that isn't in a good state (WP-A7, VOICE §18 and §21), shared by the
 * shell's notes and You › Data: "Save a backup", "Save the damaged file", and the Daily copies and
 * Import sheets, which the shell opens right where she is (onboarding included, where there are no
 * tabs). The shell loads this module only when a note needs it, so it stays off the first paint.
 */
import { DATA, DATA_COPY, ERRORS, fillLine } from '@/catalog/lines';
import { backupJson, damagedSave, markBackup, markDamagedSaved, saveEpoch, today } from '@/state/store';
import { navigate } from '@/app/router';
import { onboardingActive, saveProgress } from '@/features/onboarding/progress';
import { toast } from '@/ui/toast';
import { saveFile } from './files';
import { ImportSheet } from './ImportSheet';
import { SnapshotsSheet } from './SnapshotsSheet';

/** "catkin-backup-2025-09-29.json" */
export const backupFileName = (day: string) => fillLine(DATA.file, { date: day });

/** "catkin-damaged-save-2025-09-29.txt" */
export const damagedFileName = (day: string) => fillLine(DATA_COPY.damagedFile, { date: day });

/**
 * "Save a backup": the share sheet on a phone, else a download, of the user's own save (a newer
 * catkin's save is its own bytes, WP-A4). Marked as backed up only once it is really saved, and
 * only if the save it was made from is still the one shown: a share sheet can stay open while
 * another save comes in, and that one was never backed up (INV-7, the WP-A7 review).
 */
export async function saveBackupNow(): Promise<void> {
  const json = backupJson();
  const epoch = saveEpoch.peek();
  const outcome = await saveFile(backupFileName(today.value), json);
  if (outcome === 'cancelled') return;
  if (saveEpoch.peek() === epoch) markBackup();
  toast({ key: 'backup', message: outcome === 'downloaded-instead' ? ERRORS.share : DATA.saved, tone: 'sage' });
}

/** "Save the damaged file": the text this catkin couldn't read, byte for byte (the `:corrupt` copy). */
export async function saveDamagedFile(): Promise<void> {
  const raw = damagedSave();
  if (raw === null) return;
  const outcome = await saveFile(damagedFileName(today.value), raw, 'text/plain');
  if (outcome === 'cancelled') return;
  markDamagedSaved(raw);
  toast({ key: 'damaged-file', message: outcome === 'downloaded-instead' ? ERRORS.share : DATA_COPY.damagedSaved, tone: 'sage' });
}

export type RecoverySheet = 'snapshots' | 'import';

/**
 * The Daily copies and Import sheets, opened from a shell note. Once a copy or a backup is in,
 * onboarding (if it was showing, for the fresh start) is over: its late-step progress belonged to
 * the save that was just replaced.
 */
export function RecoverySheets({ open, onClose }: { open: RecoverySheet | null; onClose: () => void }) {
  const replaced = () => {
    if (!onboardingActive.peek()) return;
    saveProgress(null);
    navigate('today');
  };
  return (
    <>
      <SnapshotsSheet open={open === 'snapshots'} onClose={onClose} onRestored={replaced} />
      <ImportSheet open={open === 'import'} onClose={onClose} onImported={replaced} />
    </>
  );
}

/**
 * Whether this window may change the save. While another window owns it ("catkin is open in
 * another window · Use here") or it came from a newer catkin, the store ignores every change, so
 * You shows its controls disabled instead of letting a switch flip and quietly not save.
 * (A full disk still takes changes: the store keeps trying.)
 */
import { erasePending, readOnly } from '@/state/store';

export const saveLocked = (): boolean => erasePending.value || readOnly.value === 'other-window' || readOnly.value === 'newer-version';

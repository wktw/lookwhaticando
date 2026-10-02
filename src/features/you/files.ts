/** File and clipboard operations are supplied by the configured platform. */
import { getPlatform } from '@/platform/capabilities';
import type * as WebFiles from '@/platform/web/files';
export type { SaveOutcome } from '@/platform/web/files';

export const downloadText: typeof WebFiles.downloadText = (...args) => getPlatform().files.downloadText(...args);
export const canShareFiles: typeof WebFiles.canShareFiles = (...args) => getPlatform().files.canShareFiles(...args);
export const saveFile: typeof WebFiles.saveFile = (name, text, type) => getPlatform().files.saveFile(name, text, type);
export const copyText: typeof WebFiles.copyText = (...args) => getPlatform().files.copyText(...args);
export const copyLater: typeof WebFiles.copyLater = (...args) => getPlatform().files.copyLater(...args);
export const readClipboard: typeof WebFiles.readClipboard = (...args) => getPlatform().files.readClipboard(...args);
export const readFileText: typeof WebFiles.readFileText = (...args) => getPlatform().files.readFileText(...args);
export const readImportFile: typeof WebFiles.readImportFile = (file, opts = {}) => {
  const files = getPlatform().files;
  return files.readImportFile(file, { ...opts, maxBytes: Math.min(opts.maxBytes ?? files.maxImportBytes, files.maxImportBytes) });
};

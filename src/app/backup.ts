import { isTauri } from '@tauri-apps/api/core';

import { makeBackup, parseBackup } from '../storage/backup';
import { getStorage } from './storage';

const FILTERS = [{ name: 'KeyEd', extensions: ['json'] }];

/** `keyed-2026-11-12.json`, by the local date. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `keyed-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Saves everything to a JSON file the user chooses (task 6.5). In a plain
 * browser the file is downloaded. Returns false when the user cancels.
 */
export async function exportBackup(): Promise<boolean> {
  const json = JSON.stringify(makeBackup(await getStorage().exportData(), Date.now()));
  const name = backupFileName();
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({ defaultPath: name, filters: FILTERS });
    if (path === null) return false;
    // The dialog lets the fs plugin write this one path only.
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, json);
    return true;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Asks for a backup file in the desktop app and returns its text, or null when
 * the user cancels. The plain browser uses a file input instead.
 */
export async function pickBackupFile(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const path = await open({ multiple: false, directory: false, filters: FILTERS });
  if (path === null) return null;
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  return readTextFile(path);
}

/** Starts the app again from storage, so every screen shows the new data. */
function restart(): void {
  window.location.reload();
}

/**
 * Replaces all data with a backup. Throws `BackupError` for a file that is not
 * a backup; nothing is changed then.
 */
export async function importBackup(json: string): Promise<void> {
  const backup = parseBackup(json);
  // A user who imports data does not need the first-run wizard.
  await getStorage().importData({ ...backup, settings: { ...backup.settings, onboarded: true } });
  restart();
}

/** Deletes all learning progress; settings stay. */
export async function resetAllProgress(): Promise<void> {
  await getStorage().resetProgress();
  restart();
}

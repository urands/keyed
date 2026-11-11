import { isTauri } from '@tauri-apps/api/core';
import { create } from 'zustand';

import { createMemoryStorage, type Persistence } from '../storage/memory';
import { createSqliteStorage } from '../storage/sqlite';
import type { Storage } from '../storage/types';

/** Must match `DATABASE` in src-tauri/src/lib.rs, where the migrations are registered. */
const DATABASE = 'sqlite:keyed.db';
/** Where the plain-browser version keeps its data. */
const BROWSER_KEY = 'keyed.data';

interface StorageStatus {
  /** Opening or writing the database failed: progress may not be saved. */
  failed: boolean;
  markFailed: () => void;
}

export const useStorageStatus = create<StorageStatus>()((set) => ({
  failed: false,
  markFailed: () => {
    set({ failed: true });
  },
}));

// Tests and the first render before `openStorage` use memory.
let current: Storage = createMemoryStorage();

export function getStorage(): Storage {
  return current;
}

const browserPersistence: Persistence = {
  load: () => localStorage.getItem(BROWSER_KEY),
  save: (data) => {
    localStorage.setItem(BROWSER_KEY, data);
  },
};

/**
 * Opens SQLite in the desktop app, or a localStorage copy when the interface
 * runs in a plain browser (`pnpm dev`). If the database cannot be opened, the
 * app still works, keeps data in memory and shows a warning.
 */
export async function openStorage(): Promise<Storage> {
  try {
    if (isTauri()) {
      const { default: Database } = await import('@tauri-apps/plugin-sql');
      const db = await Database.load(DATABASE);
      current = createSqliteStorage({
        execute: (sql, values) => db.execute(sql, values),
        select: <Row>(sql: string, values?: unknown[]) => db.select<Row[]>(sql, values),
      });
    } else {
      current = createMemoryStorage(browserPersistence);
    }
  } catch (error) {
    console.error('Could not open the database; progress will not be saved.', error);
    useStorageStatus.getState().markFailed();
    current = createMemoryStorage();
  }
  return current;
}

/** Runs a write without waiting for it; a failure shows the warning instead of being lost. */
export function saveInBackground(task: Promise<unknown>): void {
  task.catch((error: unknown) => {
    console.error('Saving failed.', error);
    useStorageStatus.getState().markFailed();
  });
}

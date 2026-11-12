import { isTauri } from '@tauri-apps/api/core';
import { create } from 'zustand';

import { useSettings } from './settings';

/** The one network request of the app (docs/product.md, "Принципы"). */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'installing'
  | 'error'
  /** Not the desktop app: nothing to update. */
  | 'unsupported';

interface UpdateState {
  status: UpdateStatus;
  /** The new version, when one is available. */
  version: string | null;
  /** Release notes of the new version. */
  notes: string;
  /** Download progress, 0–1, while installing. */
  progress: number;
  /** The update dialog is shown; closing it keeps the update for "About". */
  dialog: boolean;
  /** Checks GitHub Releases. A manual check reports errors; an automatic one stays quiet. */
  check: (manual: boolean) => Promise<void>;
  /** Downloads and installs the update, then restarts the app. */
  install: () => Promise<void>;
  closeDialog: () => void;
}

type Update = Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>>;

let pending: Update = null;

export const useUpdates = create<UpdateState>()((set, get) => ({
  status: isTauri() ? 'idle' : 'unsupported',
  version: null,
  notes: '',
  progress: 0,
  dialog: false,

  check: async (manual) => {
    const { status } = get();
    if (status === 'unsupported' || status === 'checking' || status === 'installing') return;
    set({ status: 'checking' });
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      pending = await check();
      if (pending) {
        set({
          status: 'available',
          version: pending.version,
          notes: pending.body ?? '',
          dialog: true,
        });
      } else {
        set({ status: 'upToDate' });
      }
    } catch (error) {
      console.error('Could not check for updates.', error);
      // Without a network an automatic check just tries again next launch.
      set({ status: manual ? 'error' : 'idle' });
    }
  },

  install: async () => {
    if (!pending) return;
    set({ status: 'installing', progress: 0 });
    try {
      let total = 0;
      let received = 0;
      await pending.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? 0;
        if (event.event === 'Progress') {
          received += event.data.chunkLength;
          if (total > 0) set({ progress: Math.min(1, received / total) });
        }
      });
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (error) {
      console.error('Could not install the update.', error);
      set({ status: 'error', dialog: false });
    }
  },

  closeDialog: () => {
    set({ dialog: false });
  },
}));

/** Delay before the automatic check, so it never slows down the start. */
const STARTUP_DELAY_MS = 5_000;

/** Checks for an update once after startup, if the user allows it. */
export function startUpdateCheck(): void {
  if (!isTauri() || !useSettings.getState().autoUpdate) return;
  window.setTimeout(() => {
    void useUpdates.getState().check(false);
  }, STARTUP_DELAY_MS);
}

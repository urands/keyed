import { isTauri } from '@tauri-apps/api/core';

/** Opens a web page in the system browser, not inside the app window. */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const LINKS = {
  repository: 'https://github.com/urands/keyed',
  releases: 'https://github.com/urands/keyed/releases',
  website: 'https://urands.github.io/keyed/',
} as const;

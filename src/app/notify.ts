import { isTauri } from '@tauri-apps/api/core';

/**
 * System notifications: the Tauri plugin in the desktop app, the browser API
 * in a plain browser. Asks for permission once; false when it is refused.
 */
export async function requestNotifications(): Promise<boolean> {
  try {
    if (isTauri()) {
      const plugin = await import('@tauri-apps/plugin-notification');
      if (await plugin.isPermissionGranted()) return true;
      return (await plugin.requestPermission()) === 'granted';
    }
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch (error) {
    console.error('Notifications are not available.', error);
    return false;
  }
}

export async function notify(title: string, body: string): Promise<void> {
  if (!(await requestNotifications())) return;
  if (isTauri()) {
    const plugin = await import('@tauri-apps/plugin-notification');
    plugin.sendNotification({ title, body });
  } else {
    new Notification(title, { body });
  }
}

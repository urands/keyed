import '@fontsource-variable/jetbrains-mono/wght.css';
import '../ui/theme/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { usePractice } from './practice';
import { restoreSettings, useSettings } from './settings';
import { startSettingsSync } from './settings-sync';
import { openStorage } from './storage';

/** Loads saved data before the first render, so the theme and progress do not flicker. */
async function boot() {
  const storage = await openStorage();
  restoreSettings(await storage.loadSettings());
  const { layout } = useSettings.getState();
  usePractice.getState().restore(layout, await storage.loadProgress(layout));
  startSettingsSync();

  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root is missing from index.html');
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();

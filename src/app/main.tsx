import '@fontsource-variable/jetbrains-mono/wght.css';
import '../ui/theme/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { practiceLayout, usePractice } from './practice';
import { restoreSettings } from './settings';
import { startSettingsSync } from './settings-sync';
import { openStorage } from './storage';

/** Loads saved data before the first render, so the theme and progress do not flicker. */
async function boot() {
  const storage = await openStorage();
  const [settings, progress] = await Promise.all([
    storage.loadSettings(),
    storage.loadProgress(practiceLayout.id),
  ]);
  restoreSettings(settings);
  usePractice.getState().restore(progress);
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

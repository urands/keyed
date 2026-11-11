import '@fontsource-variable/jetbrains-mono/wght.css';
import '../ui/theme/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { PRACTICE_LAYOUTS } from './layouts';
import { useMotivation } from './motivation';
import { currentLayoutFacts, usePractice } from './practice';
import { startReminders } from './reminders';
import { restoreSettings, useSettings } from './settings';
import { startSettingsSync } from './settings-sync';
import { openStorage } from './storage';

/** Loads saved data before the first render, so the theme and progress do not flicker. */
async function boot() {
  const storage = await openStorage();
  restoreSettings(await storage.loadSettings());

  // Every layout is loaded: achievements look at the progress of all of them.
  const { layout } = useSettings.getState();
  const practice = usePractice.getState();
  for (const layoutId of PRACTICE_LAYOUTS) {
    const saved = await storage.loadProgress(layoutId);
    if (layoutId === layout) practice.restore(layoutId, saved);
    else practice.preload(layoutId, saved);
  }

  const [days, history, achievements] = await Promise.all([
    storage.loadDays(),
    storage.listHistory(),
    storage.loadAchievements(),
  ]);
  useMotivation.getState().restore({ days, history, achievements });
  useMotivation.getState().awardSilently(currentLayoutFacts());

  startSettingsSync();
  startReminders();

  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root is missing from index.html');
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();

import '@fontsource-variable/jetbrains-mono/wght.css';
import '../ui/theme/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { startSettingsSync } from './settings-sync';

startSettingsSync();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import '@testing-library/jest-dom/vitest';
// Components translate their text, so every test needs i18next set up.
import '../src/i18n';

import { afterEach, beforeEach } from 'vitest';

// Browser-only setup; storage tests run under plain Node.
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  const { useSettings } = await import('../src/app/settings');

  // Screens are tested past the first-run wizard; its own tests turn it back on.
  beforeEach(() => {
    useSettings.setState({ onboarded: true });
  });

  // jsdom has no matchMedia; report a light system theme.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  afterEach(() => {
    cleanup();
  });
}

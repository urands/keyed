import '@testing-library/jest-dom/vitest';
// Components translate their text, so every test needs i18next set up.
import '../src/i18n';

import { afterEach } from 'vitest';

// Browser-only setup; storage tests run under plain Node.
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');

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

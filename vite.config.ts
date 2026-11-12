import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // The app version for "About": tauri.conf.json takes it from package.json too.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },

  // Keep Rust compiler errors visible when running `tauri dev`.
  clearScreen: false,
  server: {
    // Tauri expects the dev server on a fixed port (see src-tauri/tauri.conf.json).
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    // The CSP forbids data: URLs, so fonts and images stay separate files.
    assetsInlineLimit: 0,
  },

  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});

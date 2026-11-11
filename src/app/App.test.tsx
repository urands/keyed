import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { routes } from './routes';
import { restoreSettings, useSettings } from './settings';
import { startSettingsSync } from './settings-sync';
import { getStorage } from './storage';

function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

describe('app skeleton', () => {
  let stopSync: () => void;

  beforeEach(() => {
    localStorage.clear();
    useSettings.setState({ language: 'en', theme: 'system' });
    stopSync = startSettingsSync();
  });

  afterEach(() => {
    stopSync();
  });

  it('welcomes a new learner on the home screen', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Learn to touch type' })).toBeVisible();
  });

  it('redirects unknown routes to the home screen', () => {
    renderApp('/no-such-screen');
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
  });

  it('switches the interface language', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('radio', { name: 'Русский' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Научитесь печатать вслепую' }),
    ).toBeVisible();
    expect(screen.getByRole('group', { name: 'Тема' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ru');
  });

  it('switches the theme', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('remembers the choice between launches', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    await waitFor(async () => {
      expect(await getStorage().loadSettings()).toMatchObject({ theme: 'dark', language: 'en' });
    });
  });

  it('restores saved settings and ignores outdated values', () => {
    restoreSettings({ theme: 'dark', language: 'klingon' });
    expect(useSettings.getState()).toMatchObject({ theme: 'dark', language: 'en' });
  });
});

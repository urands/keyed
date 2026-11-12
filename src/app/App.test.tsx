import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    useSettings.setState({ language: 'en', theme: 'system', speedUnit: 'auto', strictMode: false });
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
    renderApp('/settings');

    await user.click(screen.getByRole('radio', { name: 'Русский' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Тема' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ru');
  });

  it('switches the theme', async () => {
    const user = userEvent.setup();
    renderApp('/settings');
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('remembers the choice between launches', async () => {
    const user = userEvent.setup();
    renderApp('/settings');

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    await waitFor(async () => {
      expect(await getStorage().loadSettings()).toMatchObject({ theme: 'dark', language: 'en' });
    });
  });

  it('saves quick changes one after another, so the last value stays', async () => {
    useSettings.setState({ keyboardType: 'ansi', onboarded: true });
    const storage = getStorage();
    const save = storage.saveSettings.bind(storage);
    let calls = 0;
    // The first write is slow: without a queue it would land after the second.
    const spy = vi.spyOn(storage, 'saveSettings').mockImplementation(async (values) => {
      calls += 1;
      if (calls === 1) await new Promise((resolve) => setTimeout(resolve, 30));
      await save(values);
    });
    useSettings.getState().update({ onboarded: false, keyboardType: 'iso' });
    useSettings.getState().update({ onboarded: true });

    await waitFor(async () => {
      expect(await storage.loadSettings()).toMatchObject({ onboarded: true, keyboardType: 'iso' });
    });
    expect(spy.mock.calls.map(([values]) => values.onboarded)).toEqual([false, true]);
    spy.mockRestore();
  });

  it('restores saved settings and ignores outdated values', () => {
    restoreSettings({
      theme: 'dark',
      language: 'klingon',
      speedUnit: 'furlongs',
      strictMode: true,
    });
    expect(useSettings.getState()).toMatchObject({
      theme: 'dark',
      language: 'en',
      speedUnit: 'auto',
      strictMode: true,
    });
  });

  it('restores the settings of phase 6 and rejects values out of range', () => {
    restoreSettings({
      targetCpm: 250,
      lessonLength: 200,
      keyboardType: 'iso',
      textSize: 'large',
      showHands: false,
      onboarded: true,
    });
    expect(useSettings.getState()).toMatchObject({
      targetCpm: 250,
      lessonLength: 200,
      keyboardType: 'iso',
      textSize: 'large',
      showHands: false,
      onboarded: true,
    });
    restoreSettings({ targetCpm: 1000, lessonLength: 7, keyboardType: 'jis', textSize: 'huge' });
    expect(useSettings.getState()).toMatchObject({
      targetCpm: 250,
      lessonLength: 200,
      keyboardType: 'iso',
      textSize: 'large',
    });
  });

  it('turns on less motion from the settings', async () => {
    const user = userEvent.setup();
    useSettings.setState({ reduceMotion: false });
    renderApp('/settings');
    expect(document.documentElement.dataset.motion).toBeUndefined();

    await user.click(screen.getByRole('checkbox', { name: 'Less motion' }));
    expect(document.documentElement.dataset.motion).toBe('reduce');
    await user.click(screen.getByRole('checkbox', { name: 'Less motion' }));
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('picks the layout by interface language when none was saved', () => {
    restoreSettings({ language: 'ru' });
    expect(useSettings.getState().layout).toBe('ru-jcuken');
    restoreSettings({ language: 'en', layout: 'ru-jcuken' });
    expect(useSettings.getState().layout).toBe('ru-jcuken');
  });
});

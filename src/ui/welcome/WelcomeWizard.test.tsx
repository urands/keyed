import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { kitFor } from '../../app/layouts';
import { usePractice } from '../../app/practice';
import { routes } from '../../app/routes';
import { useSettings } from '../../app/settings';
import { getStorage, openStorage } from '../../app/storage';
import { stageKeys } from '../../engine/progress/course';
import i18n from '../../i18n';

const EN = 'en-us-qwerty';

function renderApp() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  return { ...render(<RouterProvider router={router} />), router };
}

beforeEach(async () => {
  localStorage.clear();
  await openStorage();
  await i18n.changeLanguage('en');
  useSettings.setState({
    onboarded: false,
    language: 'en',
    layout: EN,
    keyboardType: 'ansi',
    dailyGoal: 10,
    targetCpm: 175,
    showHands: true,
  });
  usePractice.setState({ cache: {} });
  usePractice.getState().restore(EN, { keyStats: {}, opened: {} });
});

describe('first-run wizard', () => {
  it('replaces the app until it is done', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Welcome to KeyEd' })).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('Step 1 of 7')).toBeVisible();
  });

  it('goes through every step with Enter and applies the choices', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('radio', { name: 'Russian (ЙЦУКЕН)' }));
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('radio', { name: /ISO/ }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'How do you type now?' })).toBeVisible();
    await user.keyboard('{Enter}');

    // The hand check waits for the home keys: А and О on ЙЦУКЕН, under F and J.
    expect(screen.getByText('Now press А and О without looking at the keyboard.')).toBeVisible();
    await user.keyboard('[KeyF][KeyJ]');
    expect(screen.getByText('Great, your hands are in place.')).toBeVisible();
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('radio', { name: '15 min' }));
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Remind you to practise?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Start learning/ }));

    const settings = useSettings.getState();
    expect(settings).toMatchObject({
      onboarded: true,
      layout: 'ru-jcuken',
      keyboardType: 'iso',
      dailyGoal: 15,
      remindersEnabled: false,
    });
    expect(usePractice.getState().layoutId).toBe('ru-jcuken');
    expect(router.state.location.pathname).toBe('/practice');
    expect(await screen.findByRole('heading', { name: 'New keys: А, О' })).toBeVisible();
    // Seven steps of key presses: slow machines need more than the default 5 s.
  }, 20_000);

  it('goes back a step', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Welcome to KeyEd' })).toBeVisible();
  });

  it('switches the interface language at once', async () => {
    const user = userEvent.setup();
    renderApp();
    // The settings sync (tested in App.test.tsx) applies it to i18next.
    await user.click(screen.getByRole('radio', { name: 'Русский' }));
    expect(useSettings.getState().language).toBe('ru');
  });

  it('opens every letter for a learner who types blind', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.keyboard('{Enter}{Enter}{Enter}');
    await user.click(screen.getByRole('radio', { name: /I touch type/ }));
    await user.keyboard('{Enter}{Enter}{Enter}{Enter}');

    expect(useSettings.getState()).toMatchObject({ targetCpm: 250, showHands: false });
    const { letters } = kitFor(EN, { yoLetter: false });
    expect(usePractice.getState().progress.open).toEqual(stageKeys(letters));
    expect(usePractice.getState().introduce).toEqual([]);
    expect((await getStorage().loadProgress(EN)).opened.letters).toBe(letters.order.length);
  });
});

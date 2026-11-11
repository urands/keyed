import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePractice } from '../../app/practice';
import { routes } from '../../app/routes';
import { useSettings } from '../../app/settings';
import { getStorage, openStorage } from '../../app/storage';
import type { KeyStat } from '../../engine/stats/keyStats';
import i18n from '../../i18n';

const mastered: KeyStat = { hits: 40, misses: 0, timeEma: 200, accEma: 1, bestConfidence: 1 };
const EN = 'en-us-qwerty';
const learning: KeyStat = { hits: 12, misses: 3, timeEma: 520, accEma: 0.8, bestConfidence: 0 };

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}

beforeEach(async () => {
  localStorage.clear();
  await openStorage(); // a fresh, empty storage for each test
  await i18n.changeLanguage('en');
  useSettings.setState({ layout: EN, speedUnit: 'auto', inputMode: 'emulate', strictMode: false });
  usePractice.setState({ cache: {} });
  usePractice.getState().restore(EN, { keyStats: {}, opened: {} });
});

describe('new key card', () => {
  it('introduces the start keys before the first lesson', async () => {
    const user = userEvent.setup();
    renderAt('/practice');

    expect(screen.getByRole('heading', { name: 'New keys: F, J' })).toBeVisible();
    expect(screen.getByText(/Left index finger, home position/)).toBeVisible();

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('heading', { name: /New keys/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Start typing/)).toBeVisible();
  });

  it('describes where the finger moves for a key off the home row', () => {
    usePractice.setState({ introduce: ['e'] });
    renderAt('/practice');
    expect(screen.getByRole('heading', { name: 'New key: E' })).toBeVisible();
    expect(screen.getByText('Left middle finger, up from D')).toBeVisible();
  });
});

describe('home screen', () => {
  it('says which keys to practise before the next key opens', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: learning }, opened: {} });
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Continue' })).toBeVisible();
    expect(screen.getByText('D, K opens when you master J.')).toBeVisible();
  });

  it('marks mastered keys on the keyboard map', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: learning }, opened: {} });
    const { container } = renderAt('/');
    expect(container.querySelector('[data-code="KeyF"]')).toHaveAttribute('data-mastered');
    expect(container.querySelector('[data-code="KeyJ"]')).not.toHaveAttribute('data-mastered');
    expect(container.querySelector('[data-code="KeyD"]')).toHaveAttribute('data-next');
  });
});

describe('statistics screen', () => {
  it('invites to practise when there are no lessons', async () => {
    renderAt('/stats');
    expect(await screen.findByText('Finish a lesson to see your statistics.')).toBeVisible();
  });

  it('shows summary, charts and key confidence after lessons', async () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: learning }, opened: {} });
    for (const [i, cpm] of [150, 180, 210].entries()) {
      await getStorage().saveLesson(
        {
          layoutId: EN,
          stage: 'letters',
          startedAt: 1_800_000_000_000 + i * 60_000,
          durationMs: 40_000,
          length: 120,
          errors: 3,
          cpm,
          accuracy: 0.975,
          samples: [],
        },
        {},
        0,
      );
    }
    const { container } = renderAt('/stats');

    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeVisible();
    expect(screen.getByText('Lessons').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Best speed').nextElementSibling).toHaveTextContent('42 WPM');
    expect(screen.getByRole('group', { name: 'Speed by lesson, WPM' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Accuracy by lesson' })).toBeInTheDocument();
    expect(container.querySelector('[data-code="KeyF"]')).toHaveAttribute('data-step', '5');
    // J: speed 343/520 × accuracy 0.8/0.95 ≈ 0.56 → the 40–59% step.
    expect(container.querySelector('[data-code="KeyJ"]')).toHaveAttribute('data-step', '3');
  });
});

describe('layout switch', () => {
  it('switches the course on every screen and keeps statistics apart', async () => {
    const user = userEvent.setup();
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: learning }, opened: {} });
    renderAt('/');
    expect(screen.getByText('D, K opens when you master J.')).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'RU' }));

    // A new learner of the Russian layout sees the welcome screen with А and О.
    expect(await screen.findByText(/two keys under your index fingers: А and О/)).toBeVisible();
    expect(useSettings.getState().layout).toBe('ru-jcuken');

    await user.click(screen.getByRole('radio', { name: 'EN' }));
    expect(await screen.findByText('D, K opens when you master J.')).toBeVisible();
  });
});

describe('settings screen', () => {
  it('opens with Ctrl+, and changes the speed unit', async () => {
    const user = userEvent.setup();
    usePractice.getState().dismissIntro();
    const { router } = renderAt('/practice');
    await user.keyboard('{Control>},{/Control}');
    expect(router.state.location.pathname).toBe('/settings');

    await user.click(screen.getByRole('radio', { name: 'Characters/min' }));
    expect(useSettings.getState().speedUnit).toBe('cpm');

    await router.navigate('/practice');
    expect(await screen.findByText('Speed')).toBeVisible();
    expect(screen.getByText('Speed').nextElementSibling).toHaveTextContent('cpm');
  });

  it('turns on strict mode and the system layout input', async () => {
    const user = userEvent.setup();
    renderAt('/settings');

    await user.click(screen.getByRole('checkbox', { name: 'Strict mode' }));
    expect(useSettings.getState().strictMode).toBe(true);

    await user.click(screen.getByRole('radio', { name: 'System layout' }));
    expect(useSettings.getState().inputMode).toBe('system');
    expect(screen.getByText(/Switch it to the lesson's layout before typing/)).toBeVisible();
  });
});

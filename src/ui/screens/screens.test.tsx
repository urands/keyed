import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useMotivation } from '../../app/motivation';
import { usePractice } from '../../app/practice';
import { routes } from '../../app/routes';
import { useSettings } from '../../app/settings';
import { getStorage, openStorage } from '../../app/storage';
import { localDate } from '../../engine/motivation/dates';
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

describe('course screen', () => {
  const allLetters = Object.fromEntries(
    [...'abcdefghijklmnopqrstuvwxyz'].map((key) => [key, mastered]),
  );

  it('shows the stages with their status', () => {
    usePractice.getState().restore(EN, { keyStats: allLetters, opened: { letters: 22 } });
    const { container } = renderAt('/course');
    expect(screen.getByRole('heading', { name: 'Course' })).toBeVisible();
    const statuses = [...container.querySelectorAll('[data-stage-status]')].map((item) =>
      item.getAttribute('data-stage-status'),
    );
    expect(statuses).toEqual(['done', 'current', 'locked', 'locked', 'locked']);
    expect(screen.getByText('Keys mastered: 26 of 26')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Practise ⇧F/ })).toBeVisible();
  });

  it('trains a chosen key and goes back to the course from practice', async () => {
    const user = userEvent.setup();
    usePractice.getState().restore(EN, { keyStats: allLetters, opened: { letters: 22 } });
    const { router } = renderAt('/course');

    await user.click(screen.getByRole('button', { name: /^Practise Q/ }));
    expect(router.state.location.pathname).toBe('/practice');
    expect(usePractice.getState().training).toBe('q');
    expect(screen.getByText('Practising Q')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Back to the course' }));
    expect(usePractice.getState().training).toBeNull();
  });
});

describe('Shift with the other hand', () => {
  it('highlights the right Shift for a capital of the left hand', () => {
    const allLetters = Object.fromEntries(
      [...'abcdefghijklmnopqrstuvwxyz'].map((key) => [key, mastered]),
    );
    usePractice.getState().restore(EN, { keyStats: allLetters, opened: { letters: 22 } });
    // The capitals stage starts with its card.
    expect(usePractice.getState().introduce).toEqual(['F', 'J']);
    usePractice.getState().dismissIntro();
    usePractice.getState().startLesson('F');
    const { container } = renderAt('/practice');
    expect(container.querySelector('[data-code="KeyF"]')).toHaveAttribute('data-next');
    expect(container.querySelector('[data-code="ShiftRight"]')).toHaveAttribute('data-next');
    expect(container.querySelector('[data-code="ShiftLeft"]')).not.toHaveAttribute('data-next');
    expect(screen.getByText('Right Shift')).toBeVisible();
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
    useMotivation.getState().restore({
      days: await getStorage().loadDays(),
      history: await getStorage().listHistory(),
      achievements: {},
    });
    const { container } = renderAt('/stats');

    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeVisible();
    expect(screen.getByText('Lessons').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('Typing time').nextElementSibling).toHaveTextContent('2 min');
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

describe('motivation on screens', () => {
  it('shows the daily goal and the streak on the home screen', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: learning }, opened: {} });
    const now = new Date();
    /** The local date `offset` days ago. */
    const local = (offset: number) =>
      localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12).getTime());
    useMotivation.getState().restore({
      days: [
        { date: local(2), activeMs: 600_000, lessons: 3, chars: 1800, goalMet: true },
        { date: local(1), activeMs: 700_000, lessons: 3, chars: 1800, goalMet: true },
        { date: local(0), activeMs: 360_000, lessons: 2, chars: 1200, goalMet: false },
      ],
      history: [],
      achievements: {},
    });
    renderAt('/');

    expect(screen.getByRole('img', { name: 'Today: 6 of 10 minutes' })).toBeInTheDocument();
    expect(screen.getByText('Streak: 2 days')).toBeVisible();
    expect(screen.getByText(/0 freezes/)).toBeVisible();
  });

  it('shows the lesson outcome and a plaque for a new achievement', async () => {
    const user = userEvent.setup();
    usePractice.getState().dismissIntro();
    usePractice.getState().startLesson('fj jf');
    renderAt('/practice');

    await user.keyboard('fj jf');

    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeVisible();
    expect(screen.getByText('New achievements')).toBeVisible();
    expect(screen.getByText('Achievement unlocked')).toBeVisible();
    expect(screen.getAllByText('First step').length).toBeGreaterThan(0);
  });

  it('lists every achievement with its progress', () => {
    useMotivation.getState().restore({
      days: [],
      history: [],
      achievements: { 'first-step': { level: 1, unlockedAt: Date.now() } },
    });
    const { container } = renderAt('/achievements');

    expect(screen.getByRole('heading', { name: 'Achievements' })).toBeVisible();
    expect(container.querySelectorAll('[data-achievement]')).toHaveLength(11);
    expect(container.querySelector('[data-achievement="first-step"]')).toHaveAttribute(
      'data-level',
      '1',
    );
    expect(container.querySelector('[data-achievement="speed"]')).toHaveTextContent('0 of 100');
    // A new learner has F and J open: 2 of 26 letters, 7.7% rounded down.
    expect(container.querySelector('[data-achievement="halfway"]')).toHaveTextContent('7% of 50%');
    expect(container.querySelector('[data-achievement="flawless"]')).toHaveTextContent(
      'Not earned yet',
    );
  });

  it('changes the daily goal in the settings', async () => {
    const user = userEvent.setup();
    renderAt('/settings');
    await user.click(screen.getByRole('radio', { name: '15 min' }));
    expect(useSettings.getState().dailyGoal).toBe(15);
  });
});

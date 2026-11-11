import { localDate, type LocalDate } from '../engine/motivation/dates';
import { dayGoalMet } from '../engine/motivation/daily';
import i18n from '../i18n';
import { useMotivation } from './motivation';
import { notify } from './notify';
import { dailyGoalMs, useSettings } from './settings';

const CHECK_EVERY_MS = 30_000;

/** Minutes since midnight of "HH:MM". */
function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Decides whether to remind now: reminders are on, the reminder time has come,
 * today's goal is not met, and today's reminder was not sent yet.
 */
export function shouldRemind(
  now: Date,
  settings: { remindersEnabled: boolean; reminderTime: string },
  todayGoalMet: boolean,
  sentOn: LocalDate | null,
): boolean {
  if (!settings.remindersEnabled || todayGoalMet) return false;
  if (sentOn === localDate(now.getTime())) return false;
  return now.getHours() * 60 + now.getMinutes() >= minutesOf(settings.reminderTime);
}

/**
 * Reminds about the daily goal with a system notification (task 4.9). The app
 * must be running for this, for example minimised. Returns a stop function.
 */
export function startReminders(): () => void {
  let sentOn: LocalDate | null = null;

  const check = () => {
    const now = new Date();
    const today = localDate(now.getTime());
    const settings = useSettings.getState();
    const goalMs = dailyGoalMs(settings.dailyGoal);
    const day = useMotivation.getState().days[today];
    const activeMs = day?.activeMs ?? 0;
    const met = day ? dayGoalMet(day, goalMs, today) : false;
    if (!shouldRemind(now, settings, met, sentOn)) return;

    sentOn = today;
    const left = Math.max(1, Math.ceil((goalMs - activeMs) / 60_000));
    void notify(i18n.t('reminder.title'), i18n.t('reminder.body', { count: left }));
  };

  const timer = window.setInterval(check, CHECK_EVERY_MS);
  return () => {
    window.clearInterval(timer);
  };
}

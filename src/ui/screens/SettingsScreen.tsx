import { isTauri } from '@tauri-apps/api/core';
import { Download, ExternalLink, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { exportBackup, importBackup, pickBackupFile, resetAllProgress } from '../../app/backup';
import { LINKS, openExternal } from '../../app/links';
import { requestNotifications } from '../../app/notify';
import {
  DAILY_GOALS,
  INPUT_MODES,
  LESSON_LENGTHS,
  SPEED_UNIT_PREFERENCES,
  TARGET_CPM,
  TEXT_SIZES,
  useSettings,
  type DailyGoal,
  type LessonLength,
} from '../../app/settings';
import { useUpdates } from '../../app/updates';
import { GEOMETRY_IDS } from '../../engine/layout/geometry';
import { LANGUAGES } from '../../i18n';
import { BackupError, parseBackup } from '../../storage/backup';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { LayoutSwitch } from '../components/LayoutSwitch';
import { LogoMark } from '../components/Logo';
import { SegmentedControl } from '../components/SegmentedControl';
import { playErrorSound, playKeySound } from '../sound';
import { THEME_PREFERENCES } from '../theme/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="kd-card flex flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div>
        <div className="font-medium">{label}</div>
        {hint && <p className="max-w-xl text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** A setting that is on or off: a native checkbox drawn as a switch. */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const hintId = useId();
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && (
          <span id={hintId} className="block max-w-xl text-sm text-ink-muted">
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-2 ring-1 ring-line transition-colors before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-ink-muted before:transition-transform checked:bg-accent checked:ring-accent checked:before:translate-x-5 checked:before:bg-on-accent"
      />
    </label>
  );
}

type DataDialog = 'import' | 'reset' | null;

/** Data: export, import and reset (task 6.5). */
function DataSection() {
  const { t } = useTranslation();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [dialog, setDialog] = useState<DataDialog>(null);
  const [busy, setBusy] = useState(false);
  // The plain browser has no file dialog: a hidden file input reads the file.
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingImport = useRef<string | null>(null);

  const fail = (error: unknown) => {
    console.error('Data operation failed.', error);
    const reason = error instanceof BackupError ? error.reason : 'failed';
    setMessage({ text: t(`settings.data.error.${reason}`), error: true });
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  // A file that is not an export is refused before the confirmation.
  const askImport = (json: string) => {
    parseBackup(json);
    pendingImport.current = json;
    setDialog('import');
  };

  return (
    <Section title={t('settings.section.data')}>
      <Row label={t('settings.data.export')} hint={t('settings.data.exportHint')}>
        <Button
          disabled={busy}
          onClick={() => {
            void run(async () => {
              if (await exportBackup())
                setMessage({ text: t('settings.data.exported'), error: false });
            });
          }}
        >
          <Download aria-hidden="true" size={18} />
          {t('settings.data.export')}
        </Button>
      </Row>
      <Row label={t('settings.data.import')} hint={t('settings.data.importHint')}>
        <Button
          disabled={busy}
          onClick={() => {
            if (!isTauri()) {
              fileInput.current?.click();
              return;
            }
            void run(async () => {
              const json = await pickBackupFile();
              if (json !== null) askImport(json);
            });
          }}
        >
          <Upload aria-hidden="true" size={18} />
          {t('settings.data.import')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run(async () => askImport(await file.text()));
          }}
        />
      </Row>
      <Row label={t('settings.data.reset')} hint={t('settings.data.resetHint')}>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            setDialog('reset');
          }}
        >
          <RotateCcw aria-hidden="true" size={18} />
          {t('settings.data.reset')}
        </Button>
      </Row>
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={message.error ? 'text-error' : 'text-ok'}
        >
          {message.text}
        </p>
      )}

      {dialog !== null && (
        <Dialog
          title={t(dialog === 'import' ? 'settings.data.importTitle' : 'settings.data.resetTitle')}
          onClose={() => {
            setDialog(null);
          }}
          actions={
            <>
              <Button
                data-autofocus
                onClick={() => {
                  setDialog(null);
                }}
              >
                {t('settings.data.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const json = pendingImport.current;
                  setDialog(null);
                  void run(() =>
                    dialog === 'import' && json !== null ? importBackup(json) : resetAllProgress(),
                  );
                }}
              >
                {t(
                  dialog === 'import' ? 'settings.data.importButton' : 'settings.data.resetButton',
                )}
              </Button>
            </>
          }
        >
          <p className="text-ink-muted">
            {t(dialog === 'import' ? 'settings.data.importConfirm' : 'settings.data.resetConfirm')}
          </p>
        </Dialog>
      )}
    </Section>
  );
}

function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        void openExternal(href);
      }}
      className="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink aria-hidden="true" size={15} />
    </a>
  );
}

/** About: version, updates, licenses and sources (task 6.10). */
function AboutSection() {
  const { t } = useTranslation();
  const autoUpdate = useSettings((s) => s.autoUpdate);
  const update = useSettings((s) => s.update);
  const { status, version, check, install } = useUpdates();

  const statusText: Partial<Record<typeof status, string>> = {
    checking: t('settings.about.checking'),
    upToDate: t('settings.about.upToDate'),
    available: t('settings.about.available', { version }),
    error: t('settings.about.error'),
    unsupported: t('settings.about.unsupported'),
  };

  return (
    <Section title={t('settings.section.about')}>
      <div className="flex items-center gap-4">
        <LogoMark className="h-14 w-14" />
        <div>
          <p className="text-xl font-semibold">{t('app.name')}</p>
          <p className="text-ink-muted">
            {t('settings.about.version', { version: __APP_VERSION__ })}
          </p>
        </div>
      </div>
      <p className="max-w-xl">{t('settings.about.description')}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={status === 'checking' || status === 'installing' || status === 'unsupported'}
          onClick={() => {
            void check(true);
          }}
        >
          <RefreshCw aria-hidden="true" size={18} />
          {t('settings.about.check')}
        </Button>
        {status === 'available' && (
          <Button
            variant="primary"
            onClick={() => {
              void install();
            }}
          >
            {t('settings.about.install')}
          </Button>
        )}
        <span role="status" className={status === 'error' ? 'text-error' : 'text-ink-muted'}>
          {statusText[status] ?? ''}
        </span>
      </div>
      <Toggle
        label={t('settings.autoUpdate.label')}
        hint={t('settings.autoUpdate.hint')}
        checked={autoUpdate}
        onChange={(checked) => {
          update({ autoUpdate: checked });
        }}
      />

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">{t('settings.about.credits')}</h3>
        <p className="max-w-2xl text-sm text-ink-muted">{t('settings.about.codeLicense')}</p>
        <ul className="flex max-w-2xl list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
          <li>{t('settings.about.words')}</li>
          <li>{t('settings.about.blocklist')}</li>
          <li>{t('settings.about.fonts')}</li>
          <li>{t('settings.about.icons')}</li>
          <li>{t('settings.about.libraries')}</li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-6">
        <ExternalButton href={LINKS.repository}>{t('settings.about.repository')}</ExternalButton>
        <ExternalButton href={LINKS.website}>{t('settings.about.website')}</ExternalButton>
      </div>
    </Section>
  );
}

/** Settings (docs/screens.md, section 9; task 6.2). */
export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [denied, setDenied] = useState(false);
  const wpm = Math.round(settings.targetCpm / 5);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold">{t('settings.title')}</h1>

      <Section title={t('settings.section.learning')}>
        <Row label={t('layout.label')} hint={t('settings.layoutHint')}>
          <LayoutSwitch name="settings-layout" />
        </Row>
        <Row label={t('settings.targetSpeed.label')} hint={t('settings.targetSpeed.hint')}>
          <label className="flex flex-wrap items-center gap-4">
            <input
              type="range"
              aria-label={t('settings.targetSpeed.label')}
              min={TARGET_CPM.min}
              max={TARGET_CPM.max}
              step={TARGET_CPM.step}
              value={settings.targetCpm}
              onChange={(event) => {
                settings.update({ targetCpm: Number(event.target.value) });
              }}
              className="w-64 accent-accent"
            />
            <span className="font-medium tabular-nums">
              {t('settings.targetSpeed.value', { cpm: settings.targetCpm, wpm })}
            </span>
          </label>
        </Row>
        <Row label={t('settings.lessonLength.label')} hint={t('settings.lessonLength.hint')}>
          <SegmentedControl
            name="lesson-length"
            legend={t('settings.lessonLength.label')}
            value={String(settings.lessonLength)}
            options={LESSON_LENGTHS.map((value) => ({
              value: String(value),
              label: String(value),
            }))}
            onChange={(value) => {
              settings.update({ lessonLength: Number(value) as LessonLength });
            }}
          />
        </Row>
        <Toggle
          label={t('settings.strict.label')}
          hint={t('settings.strict.hint')}
          checked={settings.strictMode}
          onChange={(strictMode) => {
            settings.update({ strictMode });
          }}
        />
        <Toggle
          label={t('settings.yo.label')}
          hint={t('settings.yo.hint')}
          checked={settings.yoLetter}
          onChange={(yoLetter) => {
            settings.update({ yoLetter });
          }}
        />
      </Section>

      <Section title={t('settings.section.practice')}>
        <Toggle
          label={t('settings.showKeyboard.label')}
          checked={settings.showKeyboard}
          onChange={(showKeyboard) => {
            settings.update({ showKeyboard });
          }}
        />
        <Toggle
          label={t('settings.showHands.label')}
          checked={settings.showHands}
          onChange={(showHands) => {
            settings.update({ showHands });
          }}
        />
        <Row label={t('settings.textSize.label')}>
          <SegmentedControl
            name="text-size"
            legend={t('settings.textSize.label')}
            value={settings.textSize}
            options={TEXT_SIZES.map((value) => ({
              value,
              label: t(`settings.textSize.${value}`),
            }))}
            onChange={(textSize) => {
              settings.update({ textSize });
            }}
          />
        </Row>
        <Row label={t('settings.speedUnit.label')} hint={t('settings.speedUnit.hint')}>
          <SegmentedControl
            name="speed-unit"
            legend={t('settings.speedUnit.label')}
            value={settings.speedUnit}
            options={SPEED_UNIT_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.speedUnit.${value}`),
            }))}
            onChange={(speedUnit) => {
              settings.update({ speedUnit });
            }}
          />
        </Row>
      </Section>

      <Section title={t('settings.section.keyboard')}>
        <Row label={t('settings.keyboardType.label')} hint={t('settings.keyboardType.hint')}>
          <SegmentedControl
            name="keyboard-type"
            legend={t('settings.keyboardType.label')}
            value={settings.keyboardType}
            options={GEOMETRY_IDS.map((value) => ({
              value,
              label: t(`settings.keyboardType.${value}`),
            }))}
            onChange={(keyboardType) => {
              settings.update({ keyboardType });
            }}
          />
        </Row>
        <Row
          label={t('settings.inputMode.label')}
          hint={t(`settings.inputMode.${settings.inputMode}Hint`)}
        >
          <SegmentedControl
            name="input-mode"
            legend={t('settings.inputMode.label')}
            value={settings.inputMode}
            options={INPUT_MODES.map((value) => ({
              value,
              label: t(`settings.inputMode.${value}`),
            }))}
            onChange={(inputMode) => {
              settings.update({ inputMode });
            }}
          />
        </Row>
      </Section>

      <Section title={t('settings.section.motivation')}>
        <Row label={t('settings.goal.label')} hint={t('settings.goal.hint')}>
          <SegmentedControl
            name="daily-goal"
            legend={t('settings.goal.label')}
            value={String(settings.dailyGoal)}
            options={DAILY_GOALS.map((value) => ({
              value: String(value),
              label: t('goal.minutes', { count: value }),
            }))}
            onChange={(value) => {
              settings.update({ dailyGoal: Number(value) as DailyGoal });
            }}
          />
        </Row>
        <Toggle
          label={t('settings.reminders.label')}
          hint={t('settings.reminders.hint')}
          checked={settings.remindersEnabled}
          onChange={(enabled) => {
            settings.update({ remindersEnabled: enabled });
            setDenied(false);
            if (enabled) {
              void requestNotifications().then((granted) => {
                if (!granted) {
                  settings.update({ remindersEnabled: false });
                  setDenied(true);
                }
              });
            }
          }}
        />
        <label className="flex items-center gap-3 text-sm">
          {t('settings.reminders.time')}
          <input
            type="time"
            value={settings.reminderTime}
            disabled={!settings.remindersEnabled}
            onChange={(event) => {
              if (event.target.value) settings.update({ reminderTime: event.target.value });
            }}
            className="rounded-lg border border-line bg-surface-2 px-2 py-1 disabled:opacity-50"
          />
        </label>
        {denied && (
          <p role="alert" className="text-sm text-error">
            {t('settings.reminders.denied')}
          </p>
        )}
      </Section>

      <Section title={t('settings.section.appearance')}>
        <Row label={t('settings.theme.label')}>
          <SegmentedControl
            name="theme"
            legend={t('settings.theme.label')}
            value={settings.theme}
            options={THEME_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.theme.${value}`),
            }))}
            onChange={settings.setTheme}
          />
        </Row>
        <Row label={t('settings.language.label')}>
          <SegmentedControl
            name="language"
            legend={t('settings.language.label')}
            value={settings.language}
            options={LANGUAGES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            onChange={settings.setLanguage}
          />
        </Row>
        <Toggle
          label={t('settings.reduceMotion.label')}
          hint={t('settings.reduceMotion.hint')}
          checked={settings.reduceMotion}
          onChange={(reduceMotion) => {
            settings.update({ reduceMotion });
          }}
        />
      </Section>

      <Section title={t('settings.section.sound')}>
        <Toggle
          label={t('settings.sound.keys')}
          checked={settings.soundKeys}
          onChange={(soundKeys) => {
            settings.update({ soundKeys });
            if (soundKeys) playKeySound(settings.soundVolume);
          }}
        />
        <Toggle
          label={t('settings.sound.errors')}
          checked={settings.soundErrors}
          onChange={(soundErrors) => {
            settings.update({ soundErrors });
            if (soundErrors) playErrorSound(settings.soundVolume);
          }}
        />
        <label className="flex flex-wrap items-center gap-3">
          {t('settings.sound.volume')}
          <input
            type="range"
            aria-label={t('settings.sound.volume')}
            min={0}
            max={100}
            step={5}
            value={settings.soundVolume}
            disabled={!settings.soundKeys && !settings.soundErrors}
            onChange={(event) => {
              settings.update({ soundVolume: Number(event.target.value) });
            }}
            onPointerUp={() => {
              playKeySound(settings.soundVolume);
            }}
            className="w-48 accent-accent disabled:opacity-50"
          />
          <span className="text-sm text-ink-muted tabular-nums">{settings.soundVolume}%</span>
        </label>
      </Section>

      <DataSection />
      <AboutSection />
    </div>
  );
}

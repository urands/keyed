import { useTranslation } from 'react-i18next';

import { usePractice } from '../../app/practice';
import { useUpdates } from '../../app/updates';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';

/** "An update is available" (docs/screens.md, section 10). Never shown during a lesson. */
export function UpdateDialog() {
  const { t } = useTranslation();
  const { dialog, status, version, notes, progress, install, closeDialog } = useUpdates();
  const typing = usePractice((s) => s.lesson.status === 'running' || s.lesson.status === 'paused');
  if (!dialog || version === null || typing) return null;
  const installing = status === 'installing';

  return (
    <Dialog
      title={t('updates.available', { version })}
      onClose={installing ? () => undefined : closeDialog}
      actions={
        <>
          <Button onClick={closeDialog} disabled={installing}>
            {t('updates.later')}
          </Button>
          <Button
            variant="primary"
            data-autofocus
            disabled={installing}
            onClick={() => {
              void install();
            }}
          >
            {installing
              ? t('updates.installing', { percent: Math.round(progress * 100) })
              : t('updates.install')}
          </Button>
        </>
      }
    >
      <p className="text-ink-muted">{t('updates.description')}</p>
      {notes.trim() !== '' && (
        <div className="max-h-48 overflow-y-auto rounded-xl bg-surface-2 px-4 py-3 text-sm whitespace-pre-line">
          {notes}
        </div>
      )}
    </Dialog>
  );
}

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClass } from '../components/buttonClass';

/** Placeholder for the home screen (docs/screens.md, section 2; task 2.14). */
export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-3xl font-semibold">{t('home.title')}</h1>
      <p className="text-lg text-ink-muted">{t('home.intro')}</p>
      {/* Home row of both layouts, set in the lesson font. */}
      <p
        aria-hidden="true"
        className="rounded-lg border border-line bg-surface px-6 py-4 font-mono text-2xl"
      >
        asdf jkl; · фыва олдж
      </p>
      <Link to="/practice" className={`${buttonClass('primary')} px-6 py-3 text-lg`}>
        {t('home.start')}
      </Link>
      <p className="text-sm text-ink-muted">{t('home.stub')}</p>
    </section>
  );
}

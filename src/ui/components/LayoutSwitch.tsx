import { useTranslation } from 'react-i18next';

import { PRACTICE_LAYOUTS } from '../../app/layouts';
import { usePractice } from '../../app/practice';
import { SegmentedControl } from './SegmentedControl';

interface LayoutSwitchProps {
  /** Short labels (EN / RU) for the header, full names elsewhere. */
  short?: boolean;
  /** Radio group name; must be unique on the page. */
  name?: string;
  vertical?: boolean;
}

/** Switches the layout being learned; each layout keeps its own progress. */
export function LayoutSwitch({
  short = false,
  name = 'layout',
  vertical = false,
}: LayoutSwitchProps) {
  const { t } = useTranslation();
  const layoutId = usePractice((s) => s.layoutId);
  const switchLayout = usePractice((s) => s.switchLayout);

  return (
    <SegmentedControl
      name={name}
      legend={t('layout.label')}
      vertical={vertical}
      value={layoutId}
      options={PRACTICE_LAYOUTS.map((value) => ({
        value,
        label: t(short ? `layout.short.${value}` : `layout.name.${value}`),
      }))}
      onChange={(value) => {
        void switchLayout(value);
      }}
    />
  );
}

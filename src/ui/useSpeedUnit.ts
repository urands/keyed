import { useLayoutKit } from '../app/practice';
import { useSettings } from '../app/settings';
import { defaultSpeedUnit, type SpeedUnit } from './format';

/** The speed unit to show: the user's choice, or by default the one for the layout's language. */
export function useSpeedUnit(): SpeedUnit {
  const preference = useSettings((s) => s.speedUnit);
  const { layout } = useLayoutKit();
  return preference === 'auto' ? defaultSpeedUnit(layout.language) : preference;
}

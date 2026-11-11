import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Geometry } from '../../engine/layout/geometry';
import type { KeyCode, Layout } from '../../engine/layout/layout';
import { percentFloor } from '../format';
import { useKeyLabel } from '../practice/useKeyLabel';
import { HEAT_CLASS, heatStep } from './heat';

export interface HeatKey {
  code: KeyCode;
  confidence: number;
  mastered: boolean;
  /** Tooltip text, such as "E: 64%, 120 correct, 4 errors". */
  detail: string;
}

interface KeyHeatmapProps {
  layout: Layout;
  geometry: Geometry;
  /** Open keys of the course with their confidence. */
  keys: readonly HeatKey[];
  /** Keys of the course that are not open yet. */
  closedCodes: ReadonlySet<KeyCode>;
}

/**
 * Key confidence on the keyboard (task 2.15): darker means closer to the target.
 * Each open key shows its details on hover and keyboard focus; the same values
 * are in the table next to the chart.
 */
export function KeyHeatmap({ layout, geometry, keys, closedCodes }: KeyHeatmapProps) {
  const { t } = useTranslation();
  const label = useKeyLabel(layout);
  const byCode = new Map(keys.map((key) => [key.code, key]));
  const [active, setActive] = useState<HeatKey | null>(null);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="kd-keyboard relative flex w-max flex-col"
        role="group"
        aria-label={t('stats.keys')}
      >
        {geometry.rows.map((row, r) => (
          <div key={r} className="flex">
            {row.map(({ code, width, gap }) => {
              const heat = byCode.get(code);
              const closed = closedCodes.has(code);
              const look = heat
                ? HEAT_CLASS[heatStep(heat.confidence)]
                : closed
                  ? 'border border-dashed border-line bg-surface text-ink-muted'
                  : 'bg-surface text-ink-muted opacity-40';
              return (
                <div
                  key={code}
                  className="h-(--u) p-[3px]"
                  style={{
                    width: `calc(var(--u) * ${width})`,
                    marginLeft: gap > 0 ? `calc(var(--u) * ${gap})` : undefined,
                  }}
                >
                  <div
                    data-code={code}
                    data-step={heat ? heatStep(heat.confidence) + 1 : undefined}
                    tabIndex={heat ? 0 : undefined}
                    aria-label={heat?.detail}
                    aria-hidden={heat ? undefined : true}
                    onPointerEnter={() => {
                      if (heat) setActive(heat);
                    }}
                    onPointerLeave={() => {
                      setActive(null);
                    }}
                    onFocus={() => {
                      if (heat) setActive(heat);
                    }}
                    onBlur={() => {
                      setActive(null);
                    }}
                    className={`relative flex h-full items-center justify-center rounded-md text-sm font-medium outline-accent select-none hover:outline-2 focus-visible:outline-2 ${look}`}
                  >
                    {label(code)}
                    {heat?.mastered && (
                      <span className="absolute top-0.5 right-1 text-[0.6rem] leading-none font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p role="status" className="h-6 text-sm">
        {active ? active.detail : t('stats.heatHint')}
      </p>

      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-sm border border-dashed border-line" />
          {t('stats.notOpen')}
        </li>
        {HEAT_CLASS.map((className, step) => (
          <li key={className} className="flex items-center gap-1.5">
            <span className={`h-3.5 w-3.5 rounded-sm ${className}`} />
            {`${percentFloor(step / HEAT_CLASS.length)}–${step === HEAT_CLASS.length - 1 ? 100 : percentFloor((step + 1) / HEAT_CLASS.length) - 1}%`}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="font-bold">✓</span>
          {t('stats.mastered')}
        </li>
      </ul>
    </div>
  );
}

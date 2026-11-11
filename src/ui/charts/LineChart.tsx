import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { linearScale, niceTicks } from './scale';
import { useWidth } from './useWidth';

export interface LinePoint {
  /** Position along the x-axis, such as the lesson number. */
  x: number;
  y: number;
}

interface LineChartProps {
  /** Accessible name; the visible title is outside the chart. */
  label: string;
  points: readonly LinePoint[];
  yDomain: readonly [number, number];
  formatY: (value: number) => string;
  /** Tooltip heading for a point, such as "Lesson 12 · 3 Nov". */
  describe: (index: number) => string;
  /** A horizontal reference line, such as the target speed. */
  reference?: { value: number; label: string };
  height?: number;
}

const MARGIN = { top: 14, right: 64, bottom: 28, left: 44 };

/**
 * A single-series line chart (docs: dataviz skill): 2px line, hairline grid,
 * the last value labelled at the end, and a crosshair with a tooltip on hover
 * and on keyboard focus (arrow keys move it). One series, so no legend: the
 * title outside the chart names it.
 */
export function LineChart({
  label,
  points,
  yDomain,
  formatY,
  describe,
  reference,
  height = 200,
}: LineChartProps) {
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();

  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  const xDomain: [number, number] =
    first.x === last.x ? [first.x - 0.5, last.x + 0.5] : [first.x, last.x];
  const x = linearScale(xDomain, [MARGIN.left, width - MARGIN.right]);
  const y = linearScale(yDomain, [height - MARGIN.bottom, MARGIN.top]);
  const yTicks = niceTicks(yDomain[0], yDomain[1], 4);
  const xTicks = niceTicks(xDomain[0], xDomain[1], Math.max(2, Math.floor(width / 110))).filter(
    (tick) => Number.isInteger(tick) && tick >= first.x && tick <= last.x,
  );
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x)},${y(p.y)}`).join('');

  const nearest = (pixelX: number) => {
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.x) - pixelX) < Math.abs(x((points[best] ?? p).x) - pixelX)) best = i;
    });
    return best;
  };

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearest(event.clientX - rect.left + MARGIN.left));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const current = active ?? points.length - 1;
    setActive(Math.max(0, Math.min(points.length - 1, current + step)));
  };

  const activePoint = active === null ? undefined : points[active];
  const tooltipLeft = activePoint ? x(activePoint.x) : 0;

  return (
    <div
      ref={box}
      role="group"
      aria-label={label}
      aria-describedby={activePoint ? tooltipId : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => {
        setActive((current) => current ?? points.length - 1);
      }}
      onBlur={() => {
        setActive(null);
      }}
      className="relative w-full rounded-md outline-accent focus-visible:outline-2"
    >
      <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-grid"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-muted text-xs tabular-nums"
            >
              {formatY(tick)}
            </text>
          </g>
        ))}
        <line
          x1={MARGIN.left}
          x2={width - MARGIN.right}
          y1={height - MARGIN.bottom}
          y2={height - MARGIN.bottom}
          className="stroke-line"
          strokeWidth={1}
        />
        {xTicks.map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={height - MARGIN.bottom + 18}
            textAnchor="middle"
            className="fill-ink-muted text-xs tabular-nums"
          >
            {tick}
          </text>
        ))}

        {reference && reference.value >= yDomain[0] && reference.value <= yDomain[1] && (
          <g>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              className="stroke-ink-muted"
              strokeWidth={1}
            />
            <text
              x={width - MARGIN.right + 6}
              y={y(reference.value)}
              dy="0.32em"
              className="fill-ink-muted text-xs"
            >
              {reference.label}
            </text>
          </g>
        )}

        {points.length > 1 && (
          <path
            d={path}
            fill="none"
            className="stroke-series-1"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* The last value, labelled at the end of the line. */}
        <circle
          cx={x(last.x)}
          cy={y(last.y)}
          r={4}
          className="fill-series-1 stroke-surface"
          strokeWidth={2}
        />
        <text
          x={x(last.x) + 8}
          y={y(last.y)}
          dy="0.32em"
          className="fill-ink text-xs font-semibold tabular-nums"
        >
          {formatY(last.y)}
        </text>

        {activePoint && (
          <g>
            <line
              x1={tooltipLeft}
              x2={tooltipLeft}
              y1={MARGIN.top}
              y2={height - MARGIN.bottom}
              className="stroke-ink-muted"
              strokeWidth={1}
            />
            <circle
              cx={tooltipLeft}
              cy={y(activePoint.y)}
              r={5}
              className="fill-series-1 stroke-surface"
              strokeWidth={2}
            />
          </g>
        )}

        {/* The whole plot is the hover target: the crosshair finds the nearest lesson. */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={Math.max(0, width - MARGIN.left - MARGIN.right)}
          height={height - MARGIN.top - MARGIN.bottom}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            setActive(null);
          }}
        />
      </svg>

      {activePoint && active !== null && (
        <div
          id={tooltipId}
          role="status"
          className="pointer-events-none absolute top-0 z-10 rounded-md border border-line bg-surface px-3 py-2 text-left shadow-md"
          style={{
            left: tooltipLeft,
            transform: `translateX(${tooltipLeft > width / 2 ? 'calc(-100% - 12px)' : '12px'})`,
          }}
        >
          <div className="text-base font-semibold whitespace-nowrap">{formatY(activePoint.y)}</div>
          <div className="text-xs whitespace-nowrap text-ink-muted">{describe(active)}</div>
        </div>
      )}
    </div>
  );
}

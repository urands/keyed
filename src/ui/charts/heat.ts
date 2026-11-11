/** Five steps of one blue ramp, light to dark (validated, see tokens.css). Full class names for Tailwind. */
export const HEAT_CLASS = [
  'bg-heat-1 text-heat-ink-1',
  'bg-heat-2 text-heat-ink-2',
  'bg-heat-3 text-heat-ink-3',
  'bg-heat-4 text-heat-ink-4',
  'bg-heat-5 text-heat-ink-5',
] as const;

/** Confidence 0–1 → step 0–4: 0–19%, 20–39%, …, 80–100%. */
export function heatStep(confidence: number): number {
  return Math.max(0, Math.min(HEAT_CLASS.length - 1, Math.floor(confidence * HEAT_CLASS.length)));
}

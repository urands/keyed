/** A calendar day in local time, "YYYY-MM-DD". Strings of this form sort by date. */
export type LocalDate = string;

const pad = (value: number) => String(value).padStart(2, '0');

function parse(date: LocalDate): [number, number, number] {
  const [year = NaN, month = NaN, day = NaN] = date.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`Bad date "${date}"`);
  }
  return [year, month, day];
}

/** The local calendar day of a moment, ms since 1970. */
export function localDate(ms: number): LocalDate {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Calendar arithmetic without time zones, so daylight saving changes cannot skip a day. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = parse(date);
  const t = new Date(Date.UTC(year, month - 1, day + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const [y1, m1, d1] = parse(from);
  const [y2, m2, d2] = parse(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Day of the week, Monday = 0 … Sunday = 6. */
export function weekday(date: LocalDate): number {
  const [year, month, day] = parse(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

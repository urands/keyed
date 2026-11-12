import { LAYOUT_IDS, type LayoutId } from '../engine/layout/layout';
import type { UnlockedAchievement } from '../engine/motivation/achievements';
import type { DayRecord } from '../engine/motivation/daily';
import type { KeySample, KeyStat } from '../engine/stats/keyStats';
import { isArray, isOneOf, isRecord } from '../engine/validate';
import type { LayoutProgress, LessonRecord, StoredData } from './types';

const FORMAT = 'keyed-backup';
const VERSION = 1;

/**
 * The export file (task 6.5): one JSON document with everything the app keeps.
 * Lessons carry their keystrokes, so key statistics can be rebuilt from them.
 */
export interface Backup extends StoredData {
  format: typeof FORMAT;
  version: typeof VERSION;
  /** Ms since 1970. */
  exportedAt: number;
}

export function makeBackup(data: StoredData, exportedAt: number): Backup {
  return { format: FORMAT, version: VERSION, exportedAt, ...data };
}

/** What is wrong with a file that cannot be imported. */
export class BackupError extends Error {
  readonly reason: 'notBackup' | 'newerVersion' | 'damaged';

  constructor(reason: BackupError['reason'], detail: string) {
    super(detail);
    this.name = 'BackupError';
    this.reason = reason;
  }
}

function damaged(detail: string): never {
  throw new BackupError('damaged', detail);
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isCount = (value: unknown): value is number =>
  isNumber(value) && Number.isInteger(value) && value >= 0;
const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || isNumber(value);

function parseSample(value: unknown, where: string): KeySample {
  if (!isRecord(value) || typeof value.char !== 'string' || !isNumberOrNull(value.time)) {
    damaged(`${where}: bad keystroke`);
  }
  const { typos } = value;
  if (!isArray(typos) || !typos.every((typo) => typeof typo === 'string')) {
    damaged(`${where}: bad mistakes of a keystroke`);
  }
  return { char: value.char, time: value.time, typos };
}

function parseLesson(value: unknown, index: number): LessonRecord {
  const where = `lesson ${index + 1}`;
  if (!isRecord(value)) damaged(`${where}: expected an object`);
  const { layoutId, stage, startedAt, durationMs, length, errors, cpm, accuracy, samples } = value;
  if (!isOneOf(LAYOUT_IDS, layoutId)) damaged(`${where}: unknown layout`);
  if (typeof stage !== 'string') damaged(`${where}: no stage`);
  if (![startedAt, durationMs, cpm, accuracy].every(isNumber)) damaged(`${where}: bad numbers`);
  if (!isCount(length) || !isCount(errors)) damaged(`${where}: bad length or errors`);
  if (!isArray(samples)) damaged(`${where}: no keystrokes`);
  return {
    layoutId,
    stage,
    startedAt: startedAt as number,
    durationMs: durationMs as number,
    length,
    errors,
    cpm: cpm as number,
    accuracy: accuracy as number,
    samples: samples.map((sample) => parseSample(sample, where)),
  };
}

function parseKeyStat(value: unknown, where: string): KeyStat {
  if (
    !isRecord(value) ||
    !isCount(value.hits) ||
    !isCount(value.misses) ||
    !isNumberOrNull(value.timeEma) ||
    !isNumberOrNull(value.accEma) ||
    !isNumber(value.bestConfidence)
  ) {
    damaged(`${where}: bad key statistics`);
  }
  return {
    hits: value.hits,
    misses: value.misses,
    timeEma: value.timeEma,
    accEma: value.accEma,
    bestConfidence: value.bestConfidence,
  };
}

function parseProgress(value: unknown): Partial<Record<LayoutId, LayoutProgress>> {
  if (!isRecord(value)) damaged('progress: expected an object');
  const progress: Partial<Record<LayoutId, LayoutProgress>> = {};
  for (const [layoutId, entry] of Object.entries(value)) {
    if (!isOneOf(LAYOUT_IDS, layoutId)) damaged(`progress: unknown layout "${layoutId}"`);
    if (!isRecord(entry) || !isRecord(entry.keyStats) || !isRecord(entry.opened)) {
      damaged(`progress of ${layoutId}: expected key statistics and opened groups`);
    }
    const keyStats: Record<string, KeyStat> = {};
    for (const [key, stat] of Object.entries(entry.keyStats)) {
      keyStats[key] = parseKeyStat(stat, `${layoutId} "${key}"`);
    }
    const opened: Record<string, number> = {};
    for (const [stage, count] of Object.entries(entry.opened)) {
      if (!isCount(count)) damaged(`progress of ${layoutId}: bad opened groups of "${stage}"`);
      opened[stage] = count;
    }
    progress[layoutId] = { keyStats, opened };
  }
  return progress;
}

function parseDay(value: unknown, index: number): DayRecord {
  if (
    !isRecord(value) ||
    typeof value.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    !isNumber(value.activeMs) ||
    !isCount(value.lessons) ||
    !isCount(value.chars) ||
    typeof value.goalMet !== 'boolean'
  ) {
    damaged(`day ${index + 1}: bad record`);
  }
  return {
    date: value.date,
    activeMs: value.activeMs,
    lessons: value.lessons,
    chars: value.chars,
    goalMet: value.goalMet,
  };
}

function parseAchievements(value: unknown): Record<string, UnlockedAchievement> {
  if (!isRecord(value)) damaged('achievements: expected an object');
  const achievements: Record<string, UnlockedAchievement> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (
      !isRecord(entry) ||
      !isCount(entry.level) ||
      entry.level < 1 ||
      !isNumber(entry.unlockedAt)
    ) {
      damaged(`achievement "${id}": bad record`);
    }
    achievements[id] = { level: entry.level, unlockedAt: entry.unlockedAt };
  }
  return achievements;
}

/** Reads an export file. Throws `BackupError` when it cannot be imported. */
export function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError('notBackup', 'not JSON');
  }
  if (!isRecord(data) || data.format !== FORMAT) {
    throw new BackupError('notBackup', 'not a KeyEd backup');
  }
  if (data.version !== VERSION) {
    throw new BackupError('newerVersion', `backup version ${String(data.version)}`);
  }
  const { settings, lessons, days } = data;
  if (!isRecord(settings)) damaged('settings: expected an object');
  if (!isArray(lessons)) damaged('lessons: expected an array');
  if (!isArray(days)) damaged('days: expected an array');
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: isNumber(data.exportedAt) ? data.exportedAt : 0,
    settings,
    lessons: lessons.map(parseLesson),
    progress: parseProgress(data.progress),
    days: days.map(parseDay),
    achievements: parseAchievements(data.achievements),
  };
}

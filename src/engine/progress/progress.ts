import type { LearningParams } from '../params';
import { isKeyMastered, keyConfidence, type KeyStat } from '../stats/keyStats';
import type { CourseStage } from './course';

type Params = Pick<LearningParams, 'targetCpm' | 'accuracyThreshold' | 'minHitsToMaster'>;

export interface StageProgress {
  /** Open keys, in course order. */
  open: readonly string[];
  /** Closed keys, in course order. */
  closed: readonly string[];
  /** The group that opens next; null when every key is open. */
  next: readonly string[] | null;
  /** Open key with the lowest confidence: it gets more practice. */
  focus: string | null;
  mastered: ReadonlySet<string>;
  /** Open keys not mastered yet; the next group opens when this is empty. */
  blockers: readonly string[];
  confidence: Readonly<Record<string, number>>;
  /** Every key is open and mastered. */
  complete: boolean;
}

function clampOpened(stage: CourseStage, opened: number): number {
  return Math.max(0, Math.min(stage.order.length, Math.floor(opened)));
}

/**
 * Where the learner is in a stage. `opened` is the number of `order` groups
 * already opened; open keys never close again.
 */
export function evaluateStage(
  stage: CourseStage,
  opened: number,
  stats: Readonly<Record<string, KeyStat>>,
  params: Params,
  strict = false,
): StageProgress {
  const count = clampOpened(stage, opened);
  const open = [...stage.start, ...stage.order.slice(0, count).flat()];
  const closed = stage.order.slice(count).flat();

  const confidence: Record<string, number> = {};
  const mastered = new Set<string>();
  let focus: string | null = null;
  let lowest = Infinity;
  for (const key of open) {
    const value = keyConfidence(stats[key], params);
    confidence[key] = value;
    if (isKeyMastered(stats[key], params, strict)) mastered.add(key);
    // On a tie the later key wins: a key just opened has confidence 0 and comes last.
    if (value <= lowest) {
      lowest = value;
      focus = key;
    }
  }
  const blockers = open.filter((key) => !mastered.has(key));
  return {
    open,
    closed,
    next: stage.order[count] ?? null,
    focus,
    mastered,
    blockers,
    confidence,
    complete: closed.length === 0 && blockers.length === 0,
  };
}

/**
 * Checked at the end of each lesson: when every open key is mastered, the next
 * group opens. Returns the new number of opened groups.
 */
export function advanceStage(
  stage: CourseStage,
  opened: number,
  stats: Readonly<Record<string, KeyStat>>,
  params: Params,
  strict = false,
): number {
  const progress = evaluateStage(stage, opened, stats, params, strict);
  const count = clampOpened(stage, opened);
  return progress.blockers.length === 0 && progress.next !== null ? count + 1 : count;
}

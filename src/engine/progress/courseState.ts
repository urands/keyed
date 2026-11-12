import type { LearningParams } from '../params';
import { NO_ALLOWANCE, type KeyStat, type TimeAllowance } from '../stats/keyStats';
import { stageKeys, type Course, type CourseStage } from './course';
import { evaluateStage, type StageProgress } from './progress';

type Params = Pick<LearningParams, 'targetCpm' | 'accuracyThreshold' | 'minHitsToMaster'>;

export interface CourseState {
  /** The stage being learned: the first one not completed yet. */
  stage: CourseStage;
  stageIndex: number;
  progress: StageProgress;
  /** Ids of completed stages. */
  completed: readonly string[];
  /** Every open character: keys of completed stages and open keys of the current stage. */
  open: ReadonlySet<string>;
}

/**
 * Free practice has no keys of its own: it practises every key of the stages
 * before it, the weakest one most, and never ends.
 */
function freeStage(stage: CourseStage, before: readonly CourseStage[]): CourseStage {
  const keys = before.flatMap(stageKeys);
  return { ...stage, start: keys, order: [], intro: 0 };
}

/**
 * Where the learner is in the whole course (docs/learning-method.md, "Этапы
 * курса"). Stages go one after another; a stage is completed when every key is
 * open and was mastered once, so a completed stage stays completed.
 */
export function courseState(
  course: Course,
  opened: Readonly<Record<string, number>>,
  stats: Readonly<Record<string, KeyStat>>,
  params: Params,
  strict = false,
  allowance: TimeAllowance = NO_ALLOWANCE,
): CourseState {
  const completed: string[] = [];
  const open = new Set<string>();
  for (const [index, stage] of course.stages.entries()) {
    const isFree = stage.kind === 'free';
    const effective = isFree ? freeStage(stage, course.stages.slice(0, index)) : stage;
    const count = opened[stage.id] ?? 0;
    const done = evaluateStage(effective, count, stats, params, false, allowance);
    if (!isFree && done.complete) {
      completed.push(stage.id);
      for (const key of stageKeys(stage)) open.add(key);
      continue;
    }
    const progress = strict
      ? evaluateStage(effective, count, stats, params, true, allowance)
      : done;
    for (const key of progress.open) open.add(key);
    return { stage: effective, stageIndex: index, progress, completed, open };
  }
  // Every stage completed and no free practice in the course: stay on the last one.
  const index = course.stages.length - 1;
  const stage = course.stages[index];
  if (!stage) throw new Error(`Course ${course.layoutId} has no stages`);
  return {
    stage,
    stageIndex: index,
    progress: evaluateStage(stage, opened[stage.id] ?? 0, stats, params, strict, allowance),
    completed,
    open,
  };
}

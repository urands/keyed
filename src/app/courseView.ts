import { stageKeys, type CourseStage } from '../engine/progress/course';
import type { CourseState } from '../engine/progress/courseState';
import { isKeyMastered, keyConfidence, type KeyStat } from '../engine/stats/keyStats';
import type { LayoutKit } from './layouts';
import { learningParams } from './settings';

/** How one key of the course looks on the screens. */
export interface KeyView {
  open: boolean;
  mastered: boolean;
  /** 0–1, with the Shift allowance. */
  confidence: number;
}

export type StageStatus = 'done' | 'current' | 'locked';

export interface StageView {
  stage: CourseStage;
  status: StageStatus;
  /** Keys of the stage in the order they open; none for free practice. */
  keys: readonly string[];
}

/**
 * The state of every key of the course: keys of passed stages are open and
 * mastered (in strict mode only while they are fast and accurate now), keys of
 * the current stage follow its progress, later keys are closed.
 */
export function keyViews(
  kit: LayoutKit,
  keyStats: Readonly<Record<string, KeyStat>>,
  course: CourseState,
  strict: boolean,
): Map<string, KeyView> {
  const views = new Map<string, KeyView>();
  // The course state was evaluated with the same settings; it changes when they do.
  const params = learningParams();
  for (const [index, stage] of kit.course.stages.entries()) {
    if (stage.kind === 'free') continue;
    for (const key of stageKeys(stage)) {
      const allowance = kit.allowance(key);
      const confidence = keyConfidence(keyStats[key], params, allowance);
      if (index < course.stageIndex) {
        const mastered = !strict || isKeyMastered(keyStats[key], params, true, allowance);
        views.set(key, { open: true, mastered, confidence });
      } else if (index === course.stageIndex) {
        const open = course.progress.open.includes(key);
        views.set(key, { open, mastered: course.progress.mastered.has(key), confidence });
      } else {
        views.set(key, { open: false, mastered: false, confidence });
      }
    }
  }
  return views;
}

/** The stages of the course with their status. */
export function stageViews(kit: LayoutKit, course: CourseState): StageView[] {
  return kit.course.stages.map((stage, index) => ({
    stage,
    status: index < course.stageIndex ? 'done' : index === course.stageIndex ? 'current' : 'locked',
    keys: stage.kind === 'free' ? [] : stageKeys(stage),
  }));
}

/** Open keys from the weakest, for free practice. */
export function weakestKeys(views: ReadonlyMap<string, KeyView>, count: number): string[] {
  return [...views]
    .filter(([, view]) => view.open)
    .sort(([, a], [, b]) => a.confidence - b.confidence)
    .slice(0, count)
    .map(([key]) => key);
}

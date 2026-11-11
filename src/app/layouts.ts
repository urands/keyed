import {
  ansiGeometry,
  englishContent,
  enUsQwerty,
  enUsQwertyCourse,
  ruJcuken,
  ruJcukenCourse,
  russianContent,
  type LanguageContent,
} from '../content';
import type { Layout, LayoutId } from '../engine/layout/layout';
import type { Course, CourseStage } from '../engine/progress/course';

/** Everything the app needs to teach one layout. */
export interface LayoutKit {
  layout: Layout;
  /** The stage being learned; later stages arrive in phase 5. */
  stage: CourseStage;
  content: LanguageContent;
}

function letterStage(course: Course): CourseStage {
  const stage = course.stages.find((s) => s.id === 'letters');
  if (!stage) throw new Error(`The ${course.layoutId} course has no "letters" stage`);
  return stage;
}

const KITS: Record<LayoutId, LayoutKit> = {
  'en-us-qwerty': {
    layout: enUsQwerty,
    stage: letterStage(enUsQwertyCourse),
    content: englishContent,
  },
  'ru-jcuken': {
    layout: ruJcuken,
    stage: letterStage(ruJcukenCourse),
    content: russianContent,
  },
};

export function kitFor(layoutId: LayoutId): LayoutKit {
  return KITS[layoutId];
}

/** Layouts in the order the switch shows them. */
export const PRACTICE_LAYOUTS: readonly LayoutId[] = ['en-us-qwerty', 'ru-jcuken'];

/** One keyboard type until ISO arrives with the settings for it (task 6.3). */
export const practiceGeometry = ansiGeometry;

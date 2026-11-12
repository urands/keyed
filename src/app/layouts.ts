import {
  ansiGeometry,
  englishContent,
  enUsQwerty,
  enUsQwertyCourse,
  ruJcuken,
  ruJcukenCourse,
  russianContent,
  russianYoContent,
  type LanguageContent,
} from '../content';
import { shiftAllowance, type Layout, type LayoutId } from '../engine/layout/layout';
import { DEFAULT_PARAMS } from '../engine/params';
import { withOptionalKeys, type Course, type CourseStage } from '../engine/progress/course';
import type { TimeAllowance } from '../engine/stats/keyStats';

/** Everything the app needs to teach one layout. */
export interface LayoutKit {
  layout: Layout;
  /** The whole course, with optional keys as the settings say. */
  course: Course;
  /** The letters stage: achievements and the first screen are about it. */
  letters: CourseStage;
  content: LanguageContent;
  /** More time for keys typed with Shift. */
  allowance: TimeAllowance;
}

/** Settings that change a kit. */
export interface KitOptions {
  /** Teach "ё" in the Russian course. */
  yoLetter: boolean;
}

function lettersStage(course: Course): CourseStage {
  const stage = course.stages.find((s) => s.kind === 'letters');
  if (!stage) throw new Error(`The ${course.layoutId} course has no letters stage`);
  return stage;
}

function makeKit(layout: Layout, fullCourse: Course, content: LanguageContent, optional: string[]) {
  const course = withOptionalKeys(fullCourse, new Set(optional));
  return {
    layout,
    course,
    letters: lettersStage(course),
    content,
    allowance: shiftAllowance(layout, DEFAULT_PARAMS.shiftAllowance),
  };
}

const english = makeKit(enUsQwerty, enUsQwertyCourse, englishContent, []);
const russian = makeKit(ruJcuken, ruJcukenCourse, russianContent, []);
const russianYo = makeKit(ruJcuken, ruJcukenCourse, russianYoContent, ['ё']);

export function kitFor(layoutId: LayoutId, options: KitOptions): LayoutKit {
  if (layoutId === 'en-us-qwerty') return english;
  return options.yoLetter ? russianYo : russian;
}

/** Layouts in the order the switch shows them. */
export const PRACTICE_LAYOUTS: readonly LayoutId[] = ['en-us-qwerty', 'ru-jcuken'];

/** One keyboard type until ISO arrives with the settings for it (task 6.3). */
export const practiceGeometry = ansiGeometry;

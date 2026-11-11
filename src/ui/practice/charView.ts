import type { LessonState } from '../../engine/session/lesson';

/** Character states from docs/screens.md, "Состояния знака в тексте". */
export type CharView = 'pending' | 'current' | 'correct' | 'corrected' | 'error';

export function charView(lesson: LessonState, index: number): CharView {
  if (index < lesson.position) {
    return (lesson.chars[index]?.typos.length ?? 0) > 0 ? 'corrected' : 'correct';
  }
  if (index === lesson.position && lesson.status !== 'finished') {
    return lesson.errorNow ? 'error' : 'current';
  }
  return 'pending';
}

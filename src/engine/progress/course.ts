import { LAYOUT_IDS, type LayoutId } from '../layout/layout';
import { isArray, isOneOf, isRecord, isSingleChar } from '../validate';

/** One course stage (docs/learning-method.md, "Этапы курса"). */
export interface CourseStage {
  id: string;
  /** Keys open from the first lesson. */
  start: readonly string[];
  /** Groups of keys in the order they open; a group opens as a whole. */
  order: readonly (readonly string[])[];
}

export interface Course {
  layoutId: LayoutId;
  stages: readonly CourseStage[];
}

/**
 * Reads a course file. In the file each `order` entry is a string of the keys
 * that open together: `["dk", "sl", "a", "e"]`.
 */
export function parseCourse(data: unknown): Course {
  if (!isRecord(data)) throw new Error('Course: expected an object');
  const { layoutId } = data;
  if (!isOneOf(LAYOUT_IDS, layoutId)) {
    throw new Error(`Course: unknown layout "${String(layoutId)}"`);
  }
  if (!isArray(data.stages) || data.stages.length === 0) {
    throw new Error(`Course ${layoutId}: "stages" must be a non-empty array`);
  }
  const stages = data.stages.map((stage, s): CourseStage => {
    if (!isRecord(stage) || typeof stage.id !== 'string') {
      throw new Error(`Course ${layoutId}: stage ${s} needs an id`);
    }
    const { id } = stage;
    if (!isArray(stage.start) || !stage.start.every(isSingleChar) || stage.start.length === 0) {
      throw new Error(`Course ${layoutId}/${id}: "start" must list single characters`);
    }
    if (!isArray(stage.order)) {
      throw new Error(`Course ${layoutId}/${id}: "order" must be an array`);
    }
    const order = stage.order.map((group) => {
      if (typeof group !== 'string' || group === '') {
        throw new Error(`Course ${layoutId}/${id}: every "order" entry must be a non-empty string`);
      }
      return [...group];
    });
    const keys = [...stage.start, ...order.flat()];
    const repeated = keys.find((key, i) => keys.indexOf(key) !== i);
    if (repeated !== undefined) {
      throw new Error(`Course ${layoutId}/${id}: key "${repeated}" repeats`);
    }
    return { id, start: stage.start, order };
  });
  return { layoutId, stages };
}

/** All keys of a stage in the order they open. */
export function stageKeys(stage: CourseStage): string[] {
  return [...stage.start, ...stage.order.flat()];
}

import { LAYOUT_IDS, type LayoutId } from '../layout/layout';
import { isArray, isOneOf, isRecord, isSingleChar } from '../validate';

/** What a stage teaches (docs/learning-method.md, "Этапы курса"); it shapes the lesson text. */
export const STAGE_KINDS = ['letters', 'capitals', 'punctuation', 'digits', 'free'] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

/** One course stage. */
export interface CourseStage {
  id: string;
  kind: StageKind;
  /** Keys open from the first lesson of the stage. */
  start: readonly string[];
  /** Groups of keys in the order they open; a group opens as a whole. */
  order: readonly (readonly string[])[];
  /**
   * How many first groups of `order` belong to the starting set of introductory
   * lessons, such as F J → D K → S L → A (docs/learning-method.md).
   */
  intro: number;
  /** Keys that exist only when a setting turns them on, such as "ё". */
  optional: readonly string[];
}

export interface Course {
  layoutId: LayoutId;
  stages: readonly CourseStage[];
}

function parseStage(layoutId: LayoutId, stage: unknown, s: number): CourseStage {
  if (!isRecord(stage) || typeof stage.id !== 'string') {
    throw new Error(`Course ${layoutId}: stage ${s} needs an id`);
  }
  const { id } = stage;
  const kind = stage.kind ?? 'letters';
  if (!isOneOf(STAGE_KINDS, kind)) throw new Error(`Course ${layoutId}/${id}: unknown kind`);
  if (!isArray(stage.start) || !stage.start.every(isSingleChar)) {
    throw new Error(`Course ${layoutId}/${id}: "start" must list single characters`);
  }
  // Only free practice has no keys of its own.
  if (stage.start.length === 0 && kind !== 'free') {
    throw new Error(`Course ${layoutId}/${id}: "start" must not be empty`);
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
  const intro = stage.intro ?? 0;
  if (typeof intro !== 'number' || !Number.isInteger(intro) || intro < 0 || intro > order.length) {
    throw new Error(`Course ${layoutId}/${id}: "intro" must be a number of order groups`);
  }
  const optional = stage.optional ?? [];
  if (!isArray(optional) || !optional.every(isSingleChar)) {
    throw new Error(`Course ${layoutId}/${id}: "optional" must list single characters`);
  }
  return { id, kind, start: stage.start, order, intro, optional };
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
  const stages = data.stages.map((stage, s) => parseStage(layoutId, stage, s));

  const keys = stages.flatMap(stageKeys);
  const repeated = keys.find((key, i) => keys.indexOf(key) !== i);
  if (repeated !== undefined) throw new Error(`Course ${layoutId}: key "${repeated}" repeats`);
  const ids = stages.map((stage) => stage.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Course ${layoutId}: stage ids repeat`);
  return { layoutId, stages };
}

/** All keys of a stage in the order they open. */
export function stageKeys(stage: CourseStage): string[] {
  return [...stage.start, ...stage.order.flat()];
}

/** The starting set: keys of the introductory lessons. */
export function startSetKeys(stage: CourseStage): string[] {
  return [...stage.start, ...stage.order.slice(0, stage.intro).flat()];
}

/** The course without optional keys that are switched off; groups left empty disappear. */
export function withOptionalKeys(course: Course, enabled: ReadonlySet<string>): Course {
  return {
    ...course,
    stages: course.stages.map((stage) => {
      const keep = (key: string) => !stage.optional.includes(key) || enabled.has(key);
      return {
        ...stage,
        start: stage.start.filter(keep),
        order: stage.order.map((group) => group.filter(keep)).filter((group) => group.length > 0),
      };
    }),
  };
}

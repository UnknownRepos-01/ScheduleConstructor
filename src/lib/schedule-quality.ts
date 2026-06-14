export const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const;
export const SCHOOL_LESSONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type ScheduleQuality = {
  gapPenalty: number;
  classGaps: number;
  teacherGaps: number;
  distributionPenalty: number;
  repeatedSubjectsPenalty: number;
  secondaryPenalty: number;
};

export type QualityLesson = {
  classId: number;
  subjectId: number;
  teacherId: number;
  day: number;
  lessonNumber: number;
};

const makeEntityDayKey = (entityId: number, day: number) => `${entityId}:${day}`;
const makeClassSubjectKey = (classId: number, subjectId: number) => `${classId}:${subjectId}`;
const makeClassSubjectDayKey = (classId: number, subjectId: number, day: number) =>
  `${classId}:${subjectId}:${day}`;

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const appendLessonNumber = (map: Map<string, number[]>, key: string, lessonNumber: number) => {
  const lessonNumbers = map.get(key) ?? [];
  lessonNumbers.push(lessonNumber);
  map.set(key, lessonNumbers);
};

export function countWindows(lessonNumbers: Iterable<number>): number {
  const occupied = [...new Set(lessonNumbers)].sort((left, right) => left - right);
  if (occupied.length < 2) return 0;
  return occupied[occupied.length - 1] - occupied[0] + 1 - occupied.length;
}

export function calculateLoadImbalance(loads: readonly number[]): number {
  let penalty = 0;
  for (let left = 0; left < loads.length; left += 1) {
    for (let right = left + 1; right < loads.length; right += 1) {
      const difference = loads[left] - loads[right];
      penalty += difference * difference;
    }
  }
  return penalty;
}

export function compareScheduleQuality(left: ScheduleQuality, right: ScheduleQuality): number {
  return (
    left.gapPenalty - right.gapPenalty ||
    left.classGaps - right.classGaps ||
    left.teacherGaps - right.teacherGaps ||
    left.distributionPenalty - right.distributionPenalty ||
    left.repeatedSubjectsPenalty - right.repeatedSubjectsPenalty ||
    left.secondaryPenalty - right.secondaryPenalty
  );
}

export function calculateScheduleQuality(lessons: readonly QualityLesson[]): ScheduleQuality {
  const classLessonsByDay = new Map<string, number[]>();
  const teacherLessonsByDay = new Map<string, number[]>();
  const classDayLoad = new Map<string, number>();
  const subjectDayLoad = new Map<string, number>();
  const classIds = new Set<number>();
  const classSubjects = new Map<string, { classId: number; subjectId: number }>();

  for (const lesson of lessons) {
    classIds.add(lesson.classId);
    classSubjects.set(makeClassSubjectKey(lesson.classId, lesson.subjectId), {
      classId: lesson.classId,
      subjectId: lesson.subjectId,
    });
    appendLessonNumber(classLessonsByDay, makeEntityDayKey(lesson.classId, lesson.day), lesson.lessonNumber);
    appendLessonNumber(teacherLessonsByDay, makeEntityDayKey(lesson.teacherId, lesson.day), lesson.lessonNumber);
    increment(classDayLoad, makeEntityDayKey(lesson.classId, lesson.day));
    increment(subjectDayLoad, makeClassSubjectDayKey(lesson.classId, lesson.subjectId, lesson.day));
  }

  const classGaps = [...classLessonsByDay.values()].reduce((sum, lessonNumbers) => sum + countWindows(lessonNumbers), 0);
  const teacherGaps = [...teacherLessonsByDay.values()].reduce(
    (sum, lessonNumbers) => sum + countWindows(lessonNumbers),
    0,
  );

  let distributionPenalty = 0;
  for (const classId of classIds) {
    distributionPenalty += calculateLoadImbalance(
      SCHOOL_DAYS.map((day) => classDayLoad.get(makeEntityDayKey(classId, day)) ?? 0),
    );
  }

  let repeatedSubjectsPenalty = 0;
  for (const { classId, subjectId } of classSubjects.values()) {
    const dailyLoads = SCHOOL_DAYS.map(
      (day) => subjectDayLoad.get(makeClassSubjectDayKey(classId, subjectId, day)) ?? 0,
    );
    distributionPenalty += calculateLoadImbalance(dailyLoads);
    repeatedSubjectsPenalty += dailyLoads.reduce((sum, count) => sum + (count * (count - 1)) / 2, 0);
  }

  return {
    gapPenalty: classGaps * 2 + teacherGaps,
    classGaps,
    teacherGaps,
    distributionPenalty,
    repeatedSubjectsPenalty,
    secondaryPenalty: lessons.reduce((sum, lesson) => sum + lesson.lessonNumber, 0),
  };
}

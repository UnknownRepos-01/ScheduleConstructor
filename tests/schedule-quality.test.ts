import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLoadImbalance,
  calculateScheduleQuality,
  compareScheduleQuality,
  countWindows,
  type ScheduleQuality,
} from "../src/lib/schedule-quality";

test("countWindows counts only empty slots between occupied lessons", () => {
  assert.equal(countWindows([1, 2, 3]), 0);
  assert.equal(countWindows([2, 4]), 1);
  assert.equal(countWindows([1, 4, 6]), 3);
});

test("calculateLoadImbalance penalizes concentrated weekly load", () => {
  assert.equal(calculateLoadImbalance([2, 2, 2, 2, 2]), 0);
  assert.ok(calculateLoadImbalance([5, 5, 0, 0, 0]) > calculateLoadImbalance([2, 2, 2, 2, 2]));
});

test("class windows have a higher penalty than teacher windows", () => {
  const classWindow = calculateScheduleQuality([
    { classId: 1, subjectId: 1, teacherId: 1, day: 1, lessonNumber: 1 },
    { classId: 1, subjectId: 2, teacherId: 2, day: 1, lessonNumber: 3 },
  ]);
  const teacherWindow = calculateScheduleQuality([
    { classId: 1, subjectId: 1, teacherId: 1, day: 1, lessonNumber: 1 },
    { classId: 2, subjectId: 2, teacherId: 1, day: 1, lessonNumber: 3 },
  ]);

  assert.equal(classWindow.classGaps, 1);
  assert.equal(teacherWindow.teacherGaps, 1);
  assert.ok(classWindow.gapPenalty > teacherWindow.gapPenalty);
});

test("quality comparison is lexicographic by required priorities", () => {
  const base: ScheduleQuality = {
    gapPenalty: 0,
    classGaps: 0,
    teacherGaps: 0,
    distributionPenalty: 0,
    repeatedSubjectsPenalty: 0,
    secondaryPenalty: 0,
  };

  assert.ok(
    compareScheduleQuality(
      { ...base, gapPenalty: 1 },
      { ...base, distributionPenalty: 100, repeatedSubjectsPenalty: 100 },
    ) > 0,
  );
  assert.ok(
    compareScheduleQuality(
      { ...base, distributionPenalty: 1 },
      { ...base, repeatedSubjectsPenalty: 100 },
    ) > 0,
  );
  assert.ok(
    compareScheduleQuality(
      { ...base, repeatedSubjectsPenalty: 1 },
      { ...base, secondaryPenalty: 100 },
    ) > 0,
  );
});

test("repeated subjects in one day receive a penalty", () => {
  const repeated = calculateScheduleQuality([
    { classId: 1, subjectId: 1, teacherId: 1, day: 1, lessonNumber: 1 },
    { classId: 1, subjectId: 1, teacherId: 1, day: 1, lessonNumber: 2 },
  ]);
  const distributed = calculateScheduleQuality([
    { classId: 1, subjectId: 1, teacherId: 1, day: 1, lessonNumber: 1 },
    { classId: 1, subjectId: 1, teacherId: 1, day: 2, lessonNumber: 1 },
  ]);

  assert.ok(repeated.repeatedSubjectsPenalty > distributed.repeatedSubjectsPenalty);
});

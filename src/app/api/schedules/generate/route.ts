import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import {
  classes,
  classSubjectTeachers,
  curriculumPlans,
  grades,
  lessonClassrooms,
  lessonTeachers,
  schedules,
  scheduleChanges,
  teacherDefaultClassrooms,
} from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";
import {
  calculateLoadImbalance,
  compareScheduleQuality,
  countWindows,
  SCHOOL_DAYS,
  SCHOOL_LESSONS,
  type ScheduleQuality,
} from "@/lib/schedule-quality";

const DAYS = SCHOOL_DAYS;
const LESSONS = SCHOOL_LESSONS;

type ScheduleEntry = typeof schedules.$inferSelect;

type GeneratedLesson = {
  listId: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  day: number;
  lessonNumber: number;
  classroomIds: number[];
};

type LessonRequest = {
  classId: number;
  subjectId: number;
  subjectHoursPerWeek: number;
};

type SlotCandidate = {
  day: number;
  lessonNumber: number;
  quality: ScheduleQuality;
  subjectCountInDay: number;
  isConsecutive: boolean;
  classGapDelta: number;
  teacherGapDelta: number;
};

const makeSlotKey = (day: number, lessonNumber: number) => `${day}:${lessonNumber}`;
const makeCountKey = (classId: number, subjectId: number) => `${classId}:${subjectId}`;
const makeDayKey = (classId: number, day: number) => `${classId}:${day}`;
const makeSubjectDayKey = (classId: number, subjectId: number, day: number) => `${classId}:${subjectId}:${day}`;

const addBusySlot = (map: Map<number, Set<string>>, entityId: number, slotKey: string) => {
  const slots = map.get(entityId) ?? new Set<string>();
  slots.add(slotKey);
  map.set(entityId, slots);
};

const increment = (map: Map<string, number>, key: string, value = 1) => {
  map.set(key, (map.get(key) ?? 0) + value);
};

const appendToMap = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
};

const groupRelationIdsByScheduleId = <T>(
  rows: T[],
  getScheduleId: (row: T) => number,
  getRelationId: (row: T) => number,
) => {
  const grouped = new Map<number, number[]>();
  rows.forEach((row) => appendToMap(grouped, getScheduleId(row), getRelationId(row)));
  return grouped;
};

const addClassSubjectLesson = (
  classSubjectByDaySlot: Map<string, number>,
  classDayLoad: Map<string, number>,
  subjectDayLoad: Map<string, number>,
  lesson: { classId: number; subjectId: number; day: number; lessonNumber: number },
) => {
  classSubjectByDaySlot.set(`${lesson.classId}:${lesson.day}:${lesson.lessonNumber}`, lesson.subjectId);
  increment(classDayLoad, makeDayKey(lesson.classId, lesson.day));
  increment(subjectDayLoad, makeSubjectDayKey(lesson.classId, lesson.subjectId, lesson.day));
};

const hasConsecutiveSubject = (
  classSubjectByDaySlot: Map<string, number>,
  request: LessonRequest,
  day: number,
  lessonNumber: number,
) =>
  classSubjectByDaySlot.get(`${request.classId}:${day}:${lessonNumber - 1}`) === request.subjectId ||
  classSubjectByDaySlot.get(`${request.classId}:${day}:${lessonNumber + 1}`) === request.subjectId;

const countDayGaps = (busySlots: Set<string> | undefined, day: number, addedLessonNumber?: number) => {
  const occupiedLessons = LESSONS.filter(
    (lessonNumber) => lessonNumber === addedLessonNumber || busySlots?.has(makeSlotKey(day, lessonNumber)),
  );
  return countWindows(occupiedLessons);
};

const getDailyLoads = (loadMap: Map<string, number>, makeKey: (day: number) => string) =>
  DAYS.map((day) => loadMap.get(makeKey(day)) ?? 0);

const createBalancedRequests = (plans: { subjectId: number; missingHours: number; hoursPerWeek: number }[]) => {
  const requests: LessonRequest[] = [];
  const maxHours = Math.max(0, ...plans.map((plan) => plan.missingHours));

  for (let hourIndex = 0; hourIndex < maxHours; hourIndex += 1) {
    for (const plan of plans) {
      if (hourIndex < plan.missingHours) {
        requests.push({
          classId: 0,
          subjectId: plan.subjectId,
          subjectHoursPerWeek: plan.hoursPerWeek,
        });
      }
    }
  }

  return requests;
};

async function loadScheduleRelations(entries: ScheduleEntry[]) {
  const ids = entries.map((entry) => entry.id);
  if (ids.length === 0) return { classrooms: [], teachers: [] };

  const [classroomRows, teacherRows] = await Promise.all([
    db.select().from(lessonClassrooms).where(inArray(lessonClassrooms.scheduleId, ids)),
    db.select().from(lessonTeachers).where(inArray(lessonTeachers.scheduleId, ids)),
  ]);

  return { classrooms: classroomRows, teachers: teacherRows };
}

function toResponseEntry(
  entry: ScheduleEntry,
  classroomIdsByScheduleId: Map<number, number[]>,
  teacherIdsByScheduleId: Map<number, number[]>,
) {
  const teacherIds = teacherIdsByScheduleId.get(entry.id) ?? [];
  return {
    ...entry,
    teacherIds,
    teacherId: teacherIds[0] ?? null,
    classroomIds: classroomIdsByScheduleId.get(entry.id) ?? [],
  };
}

function findBestSlot({
  request,
  teacherId,
  defaultClassroomId,
  classBusySlots,
  teacherBusySlots,
  classroomBusySlots,
  classDayLoad,
  subjectDayLoad,
  classSubjectByDaySlot,
}: {
  request: LessonRequest;
  teacherId: number;
  defaultClassroomId?: number;
  classBusySlots: Map<number, Set<string>>;
  teacherBusySlots: Map<number, Set<string>>;
  classroomBusySlots: Map<number, Set<string>>;
  classDayLoad: Map<string, number>;
  subjectDayLoad: Map<string, number>;
  classSubjectByDaySlot: Map<string, number>;
}): SlotCandidate | null {
  const candidates: SlotCandidate[] = [];

  for (const day of DAYS) {
    for (const lessonNumber of LESSONS) {
      const slotKey = makeSlotKey(day, lessonNumber);
      if (classBusySlots.get(request.classId)?.has(slotKey)) continue;
      if (teacherBusySlots.get(teacherId)?.has(slotKey)) continue;
      if (defaultClassroomId && classroomBusySlots.get(defaultClassroomId)?.has(slotKey)) continue;

      const subjectCountInDay = subjectDayLoad.get(makeSubjectDayKey(request.classId, request.subjectId, day)) ?? 0;
      const classLessonsInDay = classDayLoad.get(makeDayKey(request.classId, day)) ?? 0;
      const isConsecutive = hasConsecutiveSubject(classSubjectByDaySlot, request, day, lessonNumber);
      const classSlots = classBusySlots.get(request.classId);
      const teacherSlots = teacherBusySlots.get(teacherId);
      const classGapDelta =
        countDayGaps(classSlots, day, lessonNumber) -
        countDayGaps(classSlots, day);
      const teacherGapDelta =
        countDayGaps(teacherSlots, day, lessonNumber) -
        countDayGaps(teacherSlots, day);
      const classLoads = getDailyLoads(classDayLoad, (loadDay) => makeDayKey(request.classId, loadDay));
      const subjectLoads = getDailyLoads(
        subjectDayLoad,
        (loadDay) => makeSubjectDayKey(request.classId, request.subjectId, loadDay),
      );
      const currentDistributionPenalty =
        calculateLoadImbalance(classLoads) + calculateLoadImbalance(subjectLoads);
      classLoads[day - 1] += 1;
      subjectLoads[day - 1] += 1;

      candidates.push({
        day,
        lessonNumber,
        subjectCountInDay,
        isConsecutive,
        classGapDelta,
        teacherGapDelta,
        quality: {
          gapPenalty: classGapDelta * 2 + teacherGapDelta,
          classGaps: classGapDelta,
          teacherGaps: teacherGapDelta,
          distributionPenalty:
            calculateLoadImbalance(classLoads) +
            calculateLoadImbalance(subjectLoads) -
            currentDistributionPenalty,
          repeatedSubjectsPenalty: subjectCountInDay,
          secondaryPenalty: (isConsecutive ? 100 : 0) + classLessonsInDay * 10 + lessonNumber,
        },
      });
    }
  }

  return candidates.sort(
    (left, right) =>
      compareScheduleQuality(left.quality, right.quality) ||
      left.subjectCountInDay - right.subjectCountInDay ||
      left.day - right.day ||
      left.lessonNumber - right.lessonNumber,
  )[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const listId = Number.parseInt(String(body.listId), 10);
    const replaceExisting = body.replaceExisting === true;
    const append = body.mode === "append" || body.append === true;

    if (!listId) {
      return NextResponse.json({ error: "Выберите лист расписания для генерации" }, { status: 400 });
    }

    const existingEntries = await db.select().from(schedules).where(eq(schedules.listId, listId));
    if (existingEntries.length > 0 && !replaceExisting && !append) {
      return NextResponse.json(
        { error: "В выбранном листе уже есть расписание. Подтвердите замену существующих данных." },
        { status: 409 },
      );
    }

    const [classRows, gradeRows, curriculumRows, assignmentRows, defaultClassroomRows] = await Promise.all([
      db.select().from(classes),
      db.select().from(grades),
      db.select().from(curriculumPlans),
      db.select().from(classSubjectTeachers),
      db.select().from(teacherDefaultClassrooms),
    ]);

    if (classRows.length === 0) {
      return NextResponse.json({ error: "Не добавлены классы для генерации расписания" }, { status: 400 });
    }

    const { classrooms: existingClassrooms, teachers: existingTeachers } = append
      ? await loadScheduleRelations(existingEntries)
      : { classrooms: [], teachers: [] };

    const gradeById = new Map(gradeRows.map((grade) => [grade.id, grade]));
    const plansByGradeId = new Map<number, typeof curriculumRows>();
    curriculumRows.forEach((plan) => {
      const current = plansByGradeId.get(plan.gradeId) ?? [];
      current.push(plan);
      plansByGradeId.set(plan.gradeId, current);
    });
    const assignmentByClassSubject = new Map(
      assignmentRows.map((assignment) => [makeCountKey(assignment.classId, assignment.subjectId), assignment]),
    );
    const defaultClassroomByTeacherId = new Map(defaultClassroomRows.map((row) => [row.teacherId, row.classroomId]));

    const existingTeachersByScheduleId = groupRelationIdsByScheduleId(
      existingTeachers,
      (row) => row.scheduleId,
      (row) => row.teacherId,
    );
    const existingClassroomsByScheduleId = groupRelationIdsByScheduleId(
      existingClassrooms,
      (row) => row.scheduleId,
      (row) => row.classroomId,
    );

    const classBusySlots = new Map<number, Set<string>>();
    const teacherBusySlots = new Map<number, Set<string>>();
    const classroomBusySlots = new Map<number, Set<string>>();
    const existingHoursByClassSubject = new Map<string, number>();
    const existingHoursByClass = new Map<number, number>();
    const classDayLoad = new Map<string, number>();
    const subjectDayLoad = new Map<string, number>();
    const classSubjectByDaySlot = new Map<string, number>();
    const warnings: string[] = [];

    if (append) {
      for (const entry of existingEntries) {
        const slotKey = makeSlotKey(entry.day, entry.lessonNumber);
        addBusySlot(classBusySlots, entry.classId, slotKey);
        existingHoursByClass.set(entry.classId, (existingHoursByClass.get(entry.classId) ?? 0) + 1);

        if (entry.subjectId) {
          const countKey = makeCountKey(entry.classId, entry.subjectId);
          existingHoursByClassSubject.set(countKey, (existingHoursByClassSubject.get(countKey) ?? 0) + 1);
          addClassSubjectLesson(classSubjectByDaySlot, classDayLoad, subjectDayLoad, {
            classId: entry.classId,
            subjectId: entry.subjectId,
            day: entry.day,
            lessonNumber: entry.lessonNumber,
          });
        } else {
          increment(classDayLoad, makeDayKey(entry.classId, entry.day));
        }

        const teacherIds = existingTeachersByScheduleId.get(entry.id) ?? [];
        teacherIds.forEach((teacherId) => addBusySlot(teacherBusySlots, teacherId, slotKey));

        const classroomIds = existingClassroomsByScheduleId.get(entry.id) ?? [];
        classroomIds.forEach((classroomId) => addBusySlot(classroomBusySlots, classroomId, slotKey));
      }
    }

    const generatedLessons: GeneratedLesson[] = [];

    for (const classItem of classRows) {
      const grade = gradeById.get(classItem.gradeId);
      if (!grade) {
        return NextResponse.json({ error: `Для класса ${classItem.letter} не найдена параллель` }, { status: 400 });
      }

      const className = `${grade.number}${classItem.letter}`;
      const plans = plansByGradeId.get(classItem.gradeId) ?? [];
      if (plans.length === 0) {
        return NextResponse.json({ error: `Не заполнен учебный план для ${grade.number} класса` }, { status: 400 });
      }

      const totalPlanHours = plans.reduce((sum, plan) => sum + plan.hoursPerWeek, 0);
      if (totalPlanHours > grade.hours) {
        return NextResponse.json(
          { error: `${grade.number} класс: учебный план (${totalPlanHours}) превышает лимит ${grade.hours} часов в неделю` },
          { status: 400 },
        );
      }

      const existingClassHours = existingHoursByClass.get(classItem.id) ?? 0;
      if (append && existingClassHours > grade.hours) {
        return NextResponse.json(
          { error: `В расписании класса ${className} уже стоит ${existingClassHours} уроков при лимите ${grade.hours}` },
          { status: 400 },
        );
      }

      const requestPlans = [];
      for (const plan of plans) {
        const existingSubjectHours = existingHoursByClassSubject.get(makeCountKey(classItem.id, plan.subjectId)) ?? 0;
        if (append && existingSubjectHours > plan.hoursPerWeek) {
          return NextResponse.json(
            { error: `В расписании класса ${className} по предмету #${plan.subjectId} уже стоит больше уроков, чем в учебном плане` },
            { status: 400 },
          );
        }

        requestPlans.push({
          subjectId: plan.subjectId,
          hoursPerWeek: plan.hoursPerWeek,
          missingHours: append ? plan.hoursPerWeek - existingSubjectHours : plan.hoursPerWeek,
        });
      }

      const lessonRequests = createBalancedRequests(requestPlans).map((requestItem) => ({
        ...requestItem,
        classId: classItem.id,
      }));

      const finalClassHours = existingClassHours + lessonRequests.length;
      if (finalClassHours > grade.hours) {
        return NextResponse.json(
          { error: `После дополнения у класса ${className} получится ${finalClassHours} уроков при лимите ${grade.hours}` },
          { status: 400 },
        );
      }

      for (const requestItem of lessonRequests) {
        const assignment = assignmentByClassSubject.get(makeCountKey(requestItem.classId, requestItem.subjectId));
        if (!assignment) {
          return NextResponse.json(
            { error: `Не указан преподаватель для класса ${className} и предмета #${requestItem.subjectId}` },
            { status: 400 },
          );
        }

        const defaultClassroomId = defaultClassroomByTeacherId.get(assignment.teacherId);
        const slot = findBestSlot({
          request: requestItem,
          teacherId: assignment.teacherId,
          defaultClassroomId,
          classBusySlots,
          teacherBusySlots,
          classroomBusySlots,
          classDayLoad,
          subjectDayLoad,
          classSubjectByDaySlot,
        });

        if (!slot) {
          return NextResponse.json({ error: `Не хватает свободных слотов для класса ${className}` }, { status: 400 });
        }

        if (requestItem.subjectHoursPerWeek <= DAYS.length && slot.subjectCountInDay > 0) {
          warnings.push(
            `${className}, предмет #${requestItem.subjectId}: пришлось поставить второй урок предмета в один день`,
          );
        }

        if (slot.isConsecutive) {
          warnings.push(`${className}, предмет #${requestItem.subjectId}: урок поставлен рядом с таким же предметом`);
        }

        const slotKey = makeSlotKey(slot.day, slot.lessonNumber);
        addBusySlot(classBusySlots, requestItem.classId, slotKey);
        addBusySlot(teacherBusySlots, assignment.teacherId, slotKey);
        if (defaultClassroomId) addBusySlot(classroomBusySlots, defaultClassroomId, slotKey);
        addClassSubjectLesson(classSubjectByDaySlot, classDayLoad, subjectDayLoad, {
          classId: requestItem.classId,
          subjectId: requestItem.subjectId,
          day: slot.day,
          lessonNumber: slot.lessonNumber,
        });

        generatedLessons.push({
          listId,
          classId: requestItem.classId,
          subjectId: requestItem.subjectId,
          teacherId: assignment.teacherId,
          day: slot.day,
          lessonNumber: slot.lessonNumber,
          classroomIds: defaultClassroomId ? [defaultClassroomId] : [],
        });
      }
    }

    if (existingEntries.length > 0 && replaceExisting) {
      const scheduleIds = existingEntries.map((entry) => entry.id);
      await Promise.all([
        db.delete(lessonClassrooms).where(inArray(lessonClassrooms.scheduleId, scheduleIds)),
        db.delete(lessonTeachers).where(inArray(lessonTeachers.scheduleId, scheduleIds)),
        db.delete(scheduleChanges).where(inArray(scheduleChanges.scheduleId, scheduleIds)),
        db.delete(schedules).where(inArray(schedules.id, scheduleIds)),
      ]);
    }

    const insertedEntries: ScheduleEntry[] = [];
    const insertedClassroomsByScheduleId = new Map<number, number[]>();
    const insertedTeachersByScheduleId = new Map<number, number[]>();

    for (const lesson of generatedLessons) {
      const [result] = await db.insert(schedules).values({
        listId: lesson.listId,
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        day: lesson.day,
        lessonNumber: lesson.lessonNumber,
      });
      const scheduleId = result.insertId;
      await db.insert(lessonTeachers).values({ scheduleId, teacherId: lesson.teacherId });
      for (const classroomId of lesson.classroomIds) {
        await db.insert(lessonClassrooms).values({ scheduleId, classroomId });
      }

      insertedEntries.push({
        id: scheduleId,
        listId,
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        day: lesson.day,
        lessonNumber: lesson.lessonNumber,
      });
      insertedTeachersByScheduleId.set(scheduleId, [lesson.teacherId]);
      insertedClassroomsByScheduleId.set(scheduleId, lesson.classroomIds);
    }

    const responseEntries = [
      ...(append
        ? existingEntries.map((entry) => toResponseEntry(entry, existingClassroomsByScheduleId, existingTeachersByScheduleId))
        : []),
      ...insertedEntries.map((entry) => toResponseEntry(entry, insertedClassroomsByScheduleId, insertedTeachersByScheduleId)),
    ];

    return NextResponse.json({
      message: append ? "Расписание дополнено" : "Расписание сгенерировано",
      entries: responseEntries,
      warnings,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

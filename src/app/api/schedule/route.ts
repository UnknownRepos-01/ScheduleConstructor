import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import {
  classes,
  classrooms,
  grades,
  lessonClassrooms,
  lessonTeachers,
  lists,
  scheduleChanges,
  schedules,
  subjects,
  users,
} from "@/db/schema";
import { apiErrorResponse } from "@/lib/api/route-helpers";

const toTeacherShortName = (teacher: { surname: string | null; name: string | null; patronymic: string | null }) =>
  `${teacher.surname ?? ""} ${teacher.name?.[0] ?? ""}.${teacher.patronymic?.[0] ? teacher.patronymic[0] + "." : ""}`.trim();

const toTeacherFullName = (teacher: { surname: string | null; name: string | null; patronymic: string | null }) =>
  `${teacher.surname ?? ""} ${teacher.name ?? ""} ${teacher.patronymic ?? ""}`.trim();

const appendToMapList = <TValue>(map: Map<number, TValue[]>, key: number, value: TValue) => {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
};

const toIdMap = <TItem extends { id: number }>(items: TItem[]) => new Map(items.map((item) => [item.id, item]));

const isDefined = <TValue>(value: TValue | undefined | null): value is TValue => value !== undefined && value !== null;

export async function GET() {
  try {
    const activeLists = await db.select().from(lists).where(eq(lists.isActive, true));
    if (activeLists.length === 0) {
      return NextResponse.json({ message: "Активный лист расписания не найден", data: null });
    }

    const activeList = activeLists[0];
    const entries = await db.select().from(schedules).where(eq(schedules.listId, activeList.id));

    const [allClasses, allGrades, allSubjects, allTeachers, allClassrooms, allLessonClassrooms, allLessonTeachers, allChanges] =
      await Promise.all([
        db.select().from(classes),
        db.select().from(grades),
        db.select().from(subjects),
        db
          .select({
            id: users.id,
            name: users.name,
            surname: users.surname,
            patronymic: users.patronymic,
          })
          .from(users),
        db.select().from(classrooms),
        db.select().from(lessonClassrooms),
        db.select().from(lessonTeachers),
        db.select().from(scheduleChanges).catch(() => []),
      ]);

    const classById = toIdMap(allClasses);
    const gradeById = toIdMap(allGrades);
    const subjectById = toIdMap(allSubjects);
    const teacherById = toIdMap(allTeachers);
    const classroomById = toIdMap(allClassrooms);
    const changedScheduleIds = new Set(allChanges.map((item) => item.scheduleId));

    const teachersByScheduleId = new Map<number, number[]>();
    allLessonTeachers.forEach((row) => appendToMapList(teachersByScheduleId, row.scheduleId, row.teacherId));

    const classroomsByScheduleId = new Map<number, number[]>();
    allLessonClassrooms.forEach((row) => appendToMapList(classroomsByScheduleId, row.scheduleId, row.classroomId));

    const scheduleData = entries.map((entry) => {
      const cls = classById.get(entry.classId);
      const grade = cls ? gradeById.get(cls.gradeId) : null;
      const subject = entry.subjectId ? subjectById.get(entry.subjectId) : null;
      const teacherIds = teachersByScheduleId.get(entry.id) ?? [];
      const teacherRows = teacherIds.map((id) => teacherById.get(id)).filter(isDefined);

      const teacherNames = teacherRows.map(toTeacherShortName).filter(Boolean);
      const teacherFullNames = teacherRows.map(toTeacherFullName).filter(Boolean);

      const rooms = (classroomsByScheduleId.get(entry.id) ?? [])
        .map((classroomId) => classroomById.get(classroomId))
        .filter(isDefined);
      const hasChanges = changedScheduleIds.has(entry.id);

      return {
        id: entry.id,
        day: entry.day,
        lessonNumber: entry.lessonNumber,
        classId: entry.classId,
        className: grade ? `${grade.number}${cls!.letter}` : cls?.letter || "",
        subjectName: subject?.name || "",
        teacherName: teacherNames.join(", "),
        teacherFullName: teacherFullNames.join(", "),
        teacherNames,
        teacherFullNames,
        classrooms: rooms.map((room) => room.number),
        hasChanges,
      };
    });

    const classList = allClasses
      .map((c) => {
        const grade = gradeById.get(c.gradeId);
        return {
          id: c.id,
          displayName: grade ? `${grade.number}${c.letter}` : c.letter,
          gradeNumber: grade?.number || 0,
          letter: c.letter,
        };
      })
      .sort((a, b) => {
        if (a.gradeNumber !== b.gradeNumber) return a.gradeNumber - b.gradeNumber;
        return a.letter.localeCompare(b.letter);
      });

    return NextResponse.json({
      listName: activeList.name,
      classList,
      schedule: scheduleData,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

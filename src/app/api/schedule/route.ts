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

const toTeacherShortName = (teacher: { surname: string | null; name: string | null; patronymic: string | null }) =>
  `${teacher.surname ?? ""} ${teacher.name?.[0] ?? ""}.${teacher.patronymic?.[0] ? teacher.patronymic[0] + "." : ""}`.trim();

const toTeacherFullName = (teacher: { surname: string | null; name: string | null; patronymic: string | null }) =>
  `${teacher.surname ?? ""} ${teacher.name ?? ""} ${teacher.patronymic ?? ""}`.trim();

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

    const teachersByScheduleId = new Map<number, number[]>();
    allLessonTeachers.forEach((row) => {
      const current = teachersByScheduleId.get(row.scheduleId) ?? [];
      current.push(row.teacherId);
      teachersByScheduleId.set(row.scheduleId, current);
    });

    const scheduleData = entries.map((entry) => {
      const cls = allClasses.find((c) => c.id === entry.classId);
      const grade = cls ? allGrades.find((g) => g.id === cls.gradeId) : null;
      const subject = entry.subjectId ? allSubjects.find((s) => s.id === entry.subjectId) : null;
      const teacherIds = teachersByScheduleId.get(entry.id) ?? (entry.teacherId ? [entry.teacherId] : []);
      const teacherRows = teacherIds
        .map((id) => allTeachers.find((teacher) => teacher.id === id))
        .filter(Boolean) as Array<{ id: number; name: string | null; surname: string | null; patronymic: string | null }>;

      const teacherNames = teacherRows.map(toTeacherShortName).filter(Boolean);
      const teacherFullNames = teacherRows.map(toTeacherFullName).filter(Boolean);

      const rooms = allLessonClassrooms
        .filter((lc) => lc.scheduleId === entry.id)
        .map((lc) => allClassrooms.find((cr) => cr.id === lc.classroomId))
        .filter(Boolean);
      const hasChanges = allChanges.some((ch) => ch.scheduleId === entry.id);

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
        classrooms: rooms.map((r: any) => r.number),
        hasChanges,
      };
    });

    const classList = allClasses
      .map((c) => {
        const grade = allGrades.find((g) => g.id === c.gradeId);
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

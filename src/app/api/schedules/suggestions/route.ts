import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { lessonClassrooms, lessonTeachers, schedules } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

type SubjectSuggestion = {
  subjectId: number;
  count: number;
};

const incrementCounter = (counter: Map<string, number>, key: string) => {
  counter.set(key, (counter.get(key) ?? 0) + 1);
};

const appendToMapList = <TValue>(map: Map<number, TValue[]>, key: number, value: TValue) => {
  const existing = map.get(key) ?? [];
  existing.push(value);
  map.set(key, existing);
};

export async function GET(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const { searchParams } = new URL(request.url);
    const classIdRaw = searchParams.get("classId");
    const subjectIdRaw = searchParams.get("subjectId");
    const teacherIdRaw = searchParams.get("teacherId");

    const classId = classIdRaw ? Number.parseInt(classIdRaw, 10) : null;
    const subjectId = subjectIdRaw ? Number.parseInt(subjectIdRaw, 10) : null;
    const teacherId = teacherIdRaw ? Number.parseInt(teacherIdRaw, 10) : null;

    if (!classId || Number.isNaN(classId)) {
      return NextResponse.json({ error: "Параметр classId обязателен" }, { status: 400 });
    }

    const [scheduleRows, lessonTeacherRows, lessonClassroomRows] = await Promise.all([
      db.select({ id: schedules.id, classId: schedules.classId, subjectId: schedules.subjectId }).from(schedules),
      db.select({ scheduleId: lessonTeachers.scheduleId, teacherId: lessonTeachers.teacherId }).from(lessonTeachers),
      db.select({ scheduleId: lessonClassrooms.scheduleId, classroomId: lessonClassrooms.classroomId }).from(lessonClassrooms),
    ]);

    const teachersByScheduleId = new Map<number, number[]>();
    lessonTeacherRows.forEach((row) => appendToMapList(teachersByScheduleId, row.scheduleId, row.teacherId));

    const classroomsByScheduleId = new Map<number, number[]>();
    lessonClassroomRows.forEach((row) => appendToMapList(classroomsByScheduleId, row.scheduleId, row.classroomId));

    const subjectTeacherCounter = new Map<string, number>();
    const classTeacherCounter = new Map<string, number>();
    const classTeacherClassroomCounter = new Map<string, number>();
    const classTeacherSubjectCounter = new Map<string, number>();

    scheduleRows.forEach((row) => {
      const teacherIds = teachersByScheduleId.get(row.id) ?? [];

      teacherIds.forEach((currentTeacherId) => {
        if (row.subjectId) {
          const key = `${row.subjectId}:${currentTeacherId}`;
          incrementCounter(subjectTeacherCounter, key);
        }

        const classTeacherKey = `${row.classId}:${currentTeacherId}`;
        incrementCounter(classTeacherCounter, classTeacherKey);

        if (row.subjectId) {
          const key = `${row.classId}:${currentTeacherId}:${row.subjectId}`;
          incrementCounter(classTeacherSubjectCounter, key);
        }

        const classrooms = classroomsByScheduleId.get(row.id) ?? [];
        classrooms.forEach((classroomId) => {
          const key = `${row.classId}:${currentTeacherId}:${classroomId}`;
          incrementCounter(classTeacherClassroomCounter, key);
        });
      });
    });

    const teachersBySubject = subjectId
      ? Array.from(subjectTeacherCounter.entries())
          .map(([key, count]) => {
            const [subjectIdPart, teacherIdPart] = key.split(":").map(Number);
            return { subjectId: subjectIdPart, teacherId: teacherIdPart, count };
          })
          .filter((item) => item.subjectId === subjectId)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map(({ teacherId: teacherSuggestionId, count }) => ({ teacherId: teacherSuggestionId, count }))
      : [];

    const teachersByClass = Array.from(classTeacherCounter.entries())
      .map(([key, count]) => {
        const [classIdPart, teacherIdPart] = key.split(":").map(Number);
        return { classId: classIdPart, teacherId: teacherIdPart, count };
      })
      .filter((item) => item.classId === classId)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ teacherId: teacherSuggestionId, count }) => ({ teacherId: teacherSuggestionId, count }));

    const classroomsByTeacher = teacherId
      ? Array.from(classTeacherClassroomCounter.entries())
          .map(([key, count]) => {
            const [classIdPart, teacherIdPart, classroomIdPart] = key.split(":").map(Number);
            return { classId: classIdPart, teacherId: teacherIdPart, classroomId: classroomIdPart, count };
          })
          .filter((item) => item.classId === classId && item.teacherId === teacherId)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map(({ classroomId, count }) => ({ classroomId, count }))
      : [];

    const subjectsByTeacher: SubjectSuggestion[] = teacherId
      ? Array.from(classTeacherSubjectCounter.entries())
          .map(([key, count]) => {
            const [classIdPart, teacherIdPart, subjectIdPart] = key.split(":").map(Number);
            return { classId: classIdPart, teacherId: teacherIdPart, subjectId: subjectIdPart, count };
          })
          .filter((item) => item.classId === classId && item.teacherId === teacherId)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map(({ subjectId: suggestedSubjectId, count }) => ({ subjectId: suggestedSubjectId, count }))
      : [];

    const strictTeachersBySubject = subjectId
      ? teachersBySubject.filter((item) => {
          const exactMatches = classTeacherSubjectCounter.get(`${classId}:${item.teacherId}:${subjectId}`) ?? 0;
          return exactMatches > 0;
        })
      : [];

    return NextResponse.json({
      teachersBySubject: strictTeachersBySubject,
      subjectsByTeacher,
      classroomsByTeacher: teacherId ? classroomsByTeacher : [],
      teachersByClass,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { lessonClassrooms, lessonTeachers, scheduleChanges, schedules } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

const normalizeIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
};

export async function GET(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json({ error: "Параметр listId обязателен" }, { status: 400 });
    }

    const entries = await db.select().from(schedules).where(eq(schedules.listId, Number.parseInt(listId, 10)));

    const entriesWithRelations = await Promise.all(
      entries.map(async (entry) => {
        const [rooms, teachers] = await Promise.all([
          db.select().from(lessonClassrooms).where(eq(lessonClassrooms.scheduleId, entry.id)),
          db.select().from(lessonTeachers).where(eq(lessonTeachers.scheduleId, entry.id)),
        ]);

        const teacherIds = teachers.map((row) => row.teacherId);

        return {
          ...entry,
          teacherIds,
          teacherId: teacherIds[0] ?? null,
          classroomIds: rooms.map((row) => row.classroomId),
        };
      }),
    );

    return NextResponse.json(entriesWithRelations);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const { listId, classId, day, lessonNumber, subjectId } = body;
    const bodyTeacherId =
      body.teacherId === null || body.teacherId === undefined
        ? null
        : Number.parseInt(String(body.teacherId), 10);
    const teacherIdsFromBody = normalizeIds(body.teacherIds);
    const teacherIds =
      teacherIdsFromBody.length > 0 || !bodyTeacherId || Number.isNaN(bodyTeacherId)
        ? teacherIdsFromBody
        : [bodyTeacherId];
    const classroomIds = normalizeIds(body.classroomIds);

    if (!listId || !classId || !day || !lessonNumber) {
      return NextResponse.json({ error: "Не заполнены обязательные поля" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.listId, listId),
          eq(schedules.classId, classId),
          eq(schedules.day, day),
          eq(schedules.lessonNumber, lessonNumber),
        ),
      );

    let scheduleId: number;

    if (existing.length > 0) {
      const old = existing[0];
      const [oldTeacherRows] = await Promise.all([
        db.select().from(lessonTeachers).where(eq(lessonTeachers.scheduleId, old.id)),
      ]);
      const oldTeacherIds = oldTeacherRows.map((row) => row.teacherId).sort((a, b) => a - b);
      const nextTeacherIds = [...teacherIds].sort((a, b) => a - b);

      const changes: { field: string; oldVal: string | null; newVal: string | null }[] = [];

      if (old.subjectId !== (subjectId || null)) {
        changes.push({ field: "subjectId", oldVal: String(old.subjectId ?? ""), newVal: String(subjectId ?? "") });
      }

      if (JSON.stringify(oldTeacherIds) !== JSON.stringify(nextTeacherIds)) {
        changes.push({
          field: "teacherIds",
          oldVal: oldTeacherIds.join(","),
          newVal: nextTeacherIds.join(","),
        });
      }

      await db
        .update(schedules)
        .set({
          subjectId: subjectId || null,
        })
        .where(eq(schedules.id, old.id));

      scheduleId = old.id;

      for (const change of changes) {
        await db.insert(scheduleChanges).values({
          scheduleId,
          fieldChanged: change.field,
          oldValue: change.oldVal,
          newValue: change.newVal,
        });
      }
    } else {
      const [result] = await db.insert(schedules).values({
        listId,
        classId,
        day,
        lessonNumber,
        subjectId: subjectId || null,
      });
      scheduleId = result.insertId;
    }

    await Promise.all([
      db.delete(lessonClassrooms).where(eq(lessonClassrooms.scheduleId, scheduleId)),
      db.delete(lessonTeachers).where(eq(lessonTeachers.scheduleId, scheduleId)),
    ]);

    if (classroomIds.length > 0) {
      for (const classroomId of classroomIds) {
        await db.insert(lessonClassrooms).values({ classroomId, scheduleId });
      }
    }

    if (teacherIds.length > 0) {
      for (const teacherId of teacherIds) {
        await db.insert(lessonTeachers).values({ teacherId, scheduleId });
      }
    }

    return NextResponse.json({ message: "Ячейка расписания сохранена", scheduleId });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const { searchParams } = new URL(request.url);
    const scheduleIdParam = searchParams.get("scheduleId");
    const listIdParam = searchParams.get("listId");
    const classIdParam = searchParams.get("classId");
    const dayParam = searchParams.get("day");
    const lessonNumberParam = searchParams.get("lessonNumber");

    let targetId: number | null = scheduleIdParam ? Number.parseInt(scheduleIdParam, 10) : null;

    if (!targetId) {
      if (!listIdParam || !classIdParam || !dayParam || !lessonNumberParam) {
        return NextResponse.json({ error: "Передайте scheduleId или полные координаты ячейки" }, { status: 400 });
      }

      const found = await db
        .select({ id: schedules.id })
        .from(schedules)
        .where(
          and(
            eq(schedules.listId, Number.parseInt(listIdParam, 10)),
            eq(schedules.classId, Number.parseInt(classIdParam, 10)),
            eq(schedules.day, Number.parseInt(dayParam, 10)),
            eq(schedules.lessonNumber, Number.parseInt(lessonNumberParam, 10)),
          ),
        );

      if (found.length === 0) {
        return NextResponse.json({ message: "Ячейка расписания уже пуста" });
      }

      targetId = found[0].id;
    }

    await Promise.all([
      db.delete(lessonClassrooms).where(eq(lessonClassrooms.scheduleId, targetId)),
      db.delete(lessonTeachers).where(eq(lessonTeachers.scheduleId, targetId)),
      db.delete(scheduleChanges).where(eq(scheduleChanges.scheduleId, targetId)),
      db.delete(schedules).where(eq(schedules.id, targetId)),
    ]);

    return NextResponse.json({ message: "Ячейка расписания удалена", scheduleId: targetId });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

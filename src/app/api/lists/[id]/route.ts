import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { lessonClassrooms, lessonTeachers, lists, scheduleChanges, schedules } from "@/db/schema";
import {
  apiErrorResponse,
  invalidIdResponse,
  parseRouteId,
  requireAdmin,
} from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Лист не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [result] = await db.update(lists).set(updateData).where(eq(lists.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Лист успешно обновлён" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    await db.update(lists).set({ isActive: false });
    const [result] = await db.update(lists).set({ isActive: true }).where(eq(lists.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Лист успешно активирован" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const sourceId = parseRouteId(params.id);
    if (!sourceId) return invalidIdResponse();

    const [sourceList] = await db.select().from(lists).where(eq(lists.id, sourceId));
    if (!sourceList) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
    const newName = nameRaw || `${sourceList.name} (копия)`;

    const [newListResult] = await db.insert(lists).values({ name: newName, isActive: false });
    const newListId = newListResult.insertId;

    const sourceSchedules = await db.select().from(schedules).where(eq(schedules.listId, sourceId));
    const scheduleIdMap = new Map<number, number>();

    for (const sourceSchedule of sourceSchedules) {
      const [newScheduleResult] = await db.insert(schedules).values({
        listId: newListId,
        classId: sourceSchedule.classId,
        subjectId: sourceSchedule.subjectId,
        teacherId: sourceSchedule.teacherId,
        day: sourceSchedule.day,
        lessonNumber: sourceSchedule.lessonNumber,
      });
      scheduleIdMap.set(sourceSchedule.id, newScheduleResult.insertId);
    }

    if (sourceSchedules.length > 0) {
      const sourceScheduleIds = sourceSchedules.map((item) => item.id);
      const [sourceLessonClassrooms, sourceLessonTeachers] = await Promise.all([
        db.select().from(lessonClassrooms).where(inArray(lessonClassrooms.scheduleId, sourceScheduleIds)),
        db.select().from(lessonTeachers).where(inArray(lessonTeachers.scheduleId, sourceScheduleIds)),
      ]);

      for (const item of sourceLessonClassrooms) {
        const mappedScheduleId = scheduleIdMap.get(item.scheduleId);
        if (!mappedScheduleId) continue;
        await db.insert(lessonClassrooms).values({
          scheduleId: mappedScheduleId,
          classroomId: item.classroomId,
        });
      }

      for (const item of sourceLessonTeachers) {
        const mappedScheduleId = scheduleIdMap.get(item.scheduleId);
        if (!mappedScheduleId) continue;
        await db.insert(lessonTeachers).values({
          scheduleId: mappedScheduleId,
          teacherId: item.teacherId,
        });
      }
    }

    return NextResponse.json({ message: "Лист успешно продублирован", insertId: newListId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const listSchedules = await db.select({ id: schedules.id }).from(schedules).where(eq(schedules.listId, id));
    const scheduleIds = listSchedules.map((item) => item.id);

    if (scheduleIds.length > 0) {
      await db.delete(lessonClassrooms).where(inArray(lessonClassrooms.scheduleId, scheduleIds));
      await db.delete(lessonTeachers).where(inArray(lessonTeachers.scheduleId, scheduleIds));
      await db.delete(scheduleChanges).where(inArray(scheduleChanges.scheduleId, scheduleIds));
      await db.delete(schedules).where(inArray(schedules.id, scheduleIds));
    }

    const [result] = await db.delete(lists).where(eq(lists.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Лист успешно удалён" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

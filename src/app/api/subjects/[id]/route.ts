import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "../../../../db/index";
import { classSubjectTeachers, curriculumPlans, schedules, subjects, teacherSubjects } from "../../../../db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Предмет не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Название предмета обязательно" }, { status: 400 });

    const [duplicate] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.name, name), ne(subjects.id, id)));
    if (duplicate) {
      return NextResponse.json({ error: "Предмет с таким названием уже существует" }, { status: 409 });
    }

    const [result] = await db.update(subjects).set({ name }).where(eq(subjects.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Предмет успешно обновлён" });
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

    const [scheduleEntry] = await db.select({ id: schedules.id }).from(schedules).where(eq(schedules.subjectId, id));
    if (scheduleEntry) {
      return NextResponse.json({ error: "Нельзя удалить предмет: он используется в расписании" }, { status: 409 });
    }

    await db.delete(classSubjectTeachers).where(eq(classSubjectTeachers.subjectId, id));
    await db.delete(curriculumPlans).where(eq(curriculumPlans.subjectId, id));
    await db.delete(teacherSubjects).where(eq(teacherSubjects.subjectId, id));

    const [result] = await db.delete(subjects).where(eq(subjects.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Предмет успешно удалён" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

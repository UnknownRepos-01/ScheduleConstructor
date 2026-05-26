import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "../../../../db/index";
import { classrooms, lessonClassrooms, teacherDefaultClassrooms } from "../../../../db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Кабинет не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json();
    const number = typeof body.number === "string" ? body.number.trim() : "";
    if (!number) return NextResponse.json({ error: "Номер кабинета обязателен" }, { status: 400 });

    const [duplicate] = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(and(eq(classrooms.number, number), ne(classrooms.id, id)));
    if (duplicate) {
      return NextResponse.json({ error: "Кабинет с таким номером уже существует" }, { status: 409 });
    }

    const [result] = await db.update(classrooms).set({ number }).where(eq(classrooms.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Кабинет успешно обновлён" });
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

    const [currentClassroom] = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.id, id));
    if (!currentClassroom) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const [lessonEntry] = await db
      .select({ id: lessonClassrooms.id })
      .from(lessonClassrooms)
      .where(eq(lessonClassrooms.classroomId, id));
    if (lessonEntry) {
      return NextResponse.json({ error: "Нельзя удалить кабинет: он используется в расписании" }, { status: 409 });
    }

    await db.delete(teacherDefaultClassrooms).where(eq(teacherDefaultClassrooms.classroomId, id));

    const [result] = await db.delete(classrooms).where(eq(classrooms.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Кабинет успешно удалён" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

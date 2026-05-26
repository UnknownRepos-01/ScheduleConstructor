import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "../../../../db/index";
import { classes, classSubjectTeachers, schedules, users } from "../../../../db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Класс не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const [currentClass] = await db.select().from(classes).where(eq(classes.id, id));
    if (!currentClass) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const body = await request.json();
    const gradeId = body.gradeId !== undefined ? Number.parseInt(String(body.gradeId), 10) : undefined;
    const letter = typeof body.letter === "string" ? body.letter.trim() : undefined;
    const updateData: Partial<typeof classes.$inferInsert> = {};
    if (gradeId) updateData.gradeId = gradeId;
    if (letter) updateData.letter = letter;

    const effectiveGradeId = updateData.gradeId ?? currentClass.gradeId;
    const effectiveLetter = updateData.letter ?? currentClass.letter;
    const [duplicate] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.gradeId, effectiveGradeId), eq(classes.letter, effectiveLetter), ne(classes.id, id)));
    if (duplicate) {
      return NextResponse.json({ error: "Класс с такой параллелью и буквой уже существует" }, { status: 409 });
    }

    const [result] = await db.update(classes).set(updateData).where(eq(classes.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Класс успешно обновлён" });
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

    const [currentClass] = await db.select({ id: classes.id }).from(classes).where(eq(classes.id, id));
    if (!currentClass) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const [scheduleEntry] = await db.select({ id: schedules.id }).from(schedules).where(eq(schedules.classId, id));
    if (scheduleEntry) {
      return NextResponse.json({ error: "Нельзя удалить класс: он используется в расписании" }, { status: 409 });
    }

    const [classUser] = await db.select({ id: users.id }).from(users).where(eq(users.classId, id));
    if (classUser) {
      return NextResponse.json({ error: "Нельзя удалить класс: к нему привязаны пользователи" }, { status: 409 });
    }

    await db.delete(classSubjectTeachers).where(eq(classSubjectTeachers.classId, id));

    const [result] = await db.delete(classes).where(eq(classes.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Класс успешно удалён" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

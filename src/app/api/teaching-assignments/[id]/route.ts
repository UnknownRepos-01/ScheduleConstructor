import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classSubjectTeachers, teacherSubjects } from "@/db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Назначение не найдено";
const TEACHER_SUBJECT_MISMATCH_MESSAGE = "Выбранный преподаватель не ведёт этот предмет";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const [currentAssignment] = await db.select().from(classSubjectTeachers).where(eq(classSubjectTeachers.id, id));
    if (!currentAssignment) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const body = await request.json();
    const classId = body.classId !== undefined ? Number.parseInt(String(body.classId), 10) : undefined;
    const subjectId = body.subjectId !== undefined ? Number.parseInt(String(body.subjectId), 10) : undefined;
    const teacherId = body.teacherId !== undefined ? Number.parseInt(String(body.teacherId), 10) : undefined;

    const updateData: Partial<typeof classSubjectTeachers.$inferInsert> = {};
    if (classId) updateData.classId = classId;
    if (subjectId) updateData.subjectId = subjectId;
    if (teacherId) updateData.teacherId = teacherId;

    const effectiveSubjectId = updateData.subjectId ?? currentAssignment.subjectId;
    const effectiveTeacherId = updateData.teacherId ?? currentAssignment.teacherId;

    const [teacherSubject] = await db
      .select()
      .from(teacherSubjects)
      .where(and(eq(teacherSubjects.teacherId, effectiveTeacherId), eq(teacherSubjects.subjectId, effectiveSubjectId)));
    if (!teacherSubject) {
      return NextResponse.json({ error: TEACHER_SUBJECT_MISMATCH_MESSAGE }, { status: 400 });
    }

    const [result] = await db.update(classSubjectTeachers).set(updateData).where(eq(classSubjectTeachers.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Назначение обновлено" });
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

    const [result] = await db.delete(classSubjectTeachers).where(eq(classSubjectTeachers.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Назначение удалено" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

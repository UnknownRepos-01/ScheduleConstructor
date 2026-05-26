import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "../../../../db/index";
import { classes, curriculumPlans, grades } from "../../../../db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Параллель не найдена";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json();
    const updateData: Partial<typeof grades.$inferInsert> = {};
    const number = body.number !== undefined ? Number.parseInt(String(body.number), 10) : undefined;
    const hours = body.hours !== undefined ? Number.parseInt(String(body.hours), 10) : undefined;
    if (number) updateData.number = number;
    if (hours) updateData.hours = hours;

    if (updateData.number !== undefined) {
      const [duplicate] = await db
        .select({ id: grades.id })
        .from(grades)
        .where(and(eq(grades.number, updateData.number), ne(grades.id, id)));
      if (duplicate) {
        return NextResponse.json({ error: "Параллель с таким номером уже существует" }, { status: 409 });
      }
    }

    const [result] = await db.update(grades).set(updateData).where(eq(grades.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Параллель успешно обновлена" });
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

    const [currentGrade] = await db.select({ id: grades.id }).from(grades).where(eq(grades.id, id));
    if (!currentGrade) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    const [classEntry] = await db.select({ id: classes.id }).from(classes).where(eq(classes.gradeId, id));
    if (classEntry) {
      return NextResponse.json({ error: "Нельзя удалить параллель: для неё есть классы" }, { status: 409 });
    }

    const [planEntry] = await db
      .select({ id: curriculumPlans.id })
      .from(curriculumPlans)
      .where(eq(curriculumPlans.gradeId, id));
    if (planEntry) {
      return NextResponse.json({ error: "Нельзя удалить параллель: для неё заполнен учебный план" }, { status: 409 });
    }

    const [result] = await db.delete(grades).where(eq(grades.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Параллель успешно удалена" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

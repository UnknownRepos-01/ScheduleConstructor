import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { curriculumPlans } from "@/db/schema";
import { apiErrorResponse, invalidIdResponse, parseRouteId, requireAdmin } from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Запись учебного плана не найдена";
const INVALID_HOURS_MESSAGE = "Количество часов должно быть больше 0";
const DUPLICATE_PLAN_MESSAGE = "Для этой параллели и предмета учебный план уже задан";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const [currentPlan] = await db.select().from(curriculumPlans).where(eq(curriculumPlans.id, id));
    if (!currentPlan) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const body = await request.json();
    const gradeId = body.gradeId !== undefined ? Number.parseInt(String(body.gradeId), 10) : undefined;
    const subjectId = body.subjectId !== undefined ? Number.parseInt(String(body.subjectId), 10) : undefined;
    const hoursPerWeek =
      body.hoursPerWeek !== undefined ? Number.parseInt(String(body.hoursPerWeek), 10) : undefined;

    const updateData: Partial<typeof curriculumPlans.$inferInsert> = {};
    if (gradeId) updateData.gradeId = gradeId;
    if (subjectId) updateData.subjectId = subjectId;
    if (hoursPerWeek !== undefined) updateData.hoursPerWeek = hoursPerWeek;

    if (updateData.hoursPerWeek !== undefined && updateData.hoursPerWeek < 1) {
      return NextResponse.json({ error: INVALID_HOURS_MESSAGE }, { status: 400 });
    }

    const effectiveGradeId = updateData.gradeId ?? currentPlan.gradeId;
    const effectiveSubjectId = updateData.subjectId ?? currentPlan.subjectId;

    const [duplicate] = await db
      .select()
      .from(curriculumPlans)
      .where(and(eq(curriculumPlans.gradeId, effectiveGradeId), eq(curriculumPlans.subjectId, effectiveSubjectId)));
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: DUPLICATE_PLAN_MESSAGE }, { status: 409 });
    }

    const [result] = await db.update(curriculumPlans).set(updateData).where(eq(curriculumPlans.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Учебный план обновлён" });
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

    const [result] = await db.delete(curriculumPlans).where(eq(curriculumPlans.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Запись учебного плана удалена" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

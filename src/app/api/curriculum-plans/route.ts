import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { curriculumPlans, grades, subjects } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

const REQUIRED_FIELDS_MESSAGE = "Параллель, предмет и часы обязательны";
const DUPLICATE_PLAN_MESSAGE = "Для этой параллели и предмета учебный план уже задан";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const [plans, gradeRows, subjectRows] = await Promise.all([
      db.select().from(curriculumPlans),
      db.select().from(grades),
      db.select().from(subjects),
    ]);

    const gradeById = new Map(gradeRows.map((grade) => [grade.id, grade]));
    const subjectById = new Map(subjectRows.map((subject) => [subject.id, subject]));

    return NextResponse.json(
      plans
        .map((plan) => ({
          id: plan.id,
          gradeId: plan.gradeId,
          gradeNumber: gradeById.get(plan.gradeId)?.number ?? 0,
          subjectId: plan.subjectId,
          subjectName: subjectById.get(plan.subjectId)?.name ?? "",
          hoursPerWeek: plan.hoursPerWeek,
        }))
        .sort((a, b) => a.gradeNumber - b.gradeNumber || a.subjectName.localeCompare(b.subjectName, "ru")),
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const gradeId = Number.parseInt(String(body.gradeId), 10);
    const subjectId = Number.parseInt(String(body.subjectId), 10);
    const hoursPerWeek = Number.parseInt(String(body.hoursPerWeek), 10);

    if (!gradeId || !subjectId || !hoursPerWeek || hoursPerWeek < 1) {
      return NextResponse.json({ error: REQUIRED_FIELDS_MESSAGE }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(curriculumPlans)
      .where(and(eq(curriculumPlans.gradeId, gradeId), eq(curriculumPlans.subjectId, subjectId)));
    if (existing) {
      return NextResponse.json({ error: DUPLICATE_PLAN_MESSAGE }, { status: 409 });
    }

    const [result] = await db.insert(curriculumPlans).values({ gradeId, subjectId, hoursPerWeek });
    return NextResponse.json({ message: "Учебный план создан", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

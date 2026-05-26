import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { grades } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const allGrades = await db.select().from(grades);
    return NextResponse.json(allGrades);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const number = Number.parseInt(String(body.number), 10);
    const hours = Number.parseInt(String(body.hours), 10);
    if (!number || !hours) {
      return NextResponse.json({ error: "Номер параллели и количество часов обязательны" }, { status: 400 });
    }

    const [duplicate] = await db.select({ id: grades.id }).from(grades).where(eq(grades.number, number));
    if (duplicate) {
      return NextResponse.json({ error: "Параллель с таким номером уже существует" }, { status: 409 });
    }

    const [result] = await db.insert(grades).values({ number, hours });
    return NextResponse.json({ message: "Параллель успешно создана", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

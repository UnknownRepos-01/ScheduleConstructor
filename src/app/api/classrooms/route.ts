import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classrooms } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const all = await db.select().from(classrooms);
    return NextResponse.json(all);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const number = typeof body.number === "string" ? body.number.trim() : "";
    if (!number) {
      return NextResponse.json({ error: "Номер кабинета обязателен" }, { status: 400 });
    }

    const [duplicate] = await db.select({ id: classrooms.id }).from(classrooms).where(eq(classrooms.number, number));
    if (duplicate) {
      return NextResponse.json({ error: "Кабинет с таким номером уже существует" }, { status: 409 });
    }

    const [result] = await db.insert(classrooms).values({ number });
    return NextResponse.json({ message: "Кабинет успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

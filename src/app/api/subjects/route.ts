import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { subjects } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const all = await db.select().from(subjects);
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Название предмета обязательно" }, { status: 400 });
    }

    const [duplicate] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.name, name));
    if (duplicate) {
      return NextResponse.json({ error: "Предмет с таким названием уже существует" }, { status: 409 });
    }

    const [result] = await db.insert(subjects).values({ name });
    return NextResponse.json({ message: "Предмет успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

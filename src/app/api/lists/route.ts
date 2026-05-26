import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { lists } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const all = await db.select().from(lists);
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
    if (!body.name) {
      return NextResponse.json({ error: "Название листа обязательно" }, { status: 400 });
    }

    const [result] = await db.insert(lists).values({ name: body.name, isActive: false });
    return NextResponse.json({ message: "Лист успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { roles } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const allRoles = await db.select().from(roles);
    return NextResponse.json(allRoles);
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
      return NextResponse.json({ error: "Название роли обязательно" }, { status: 400 });
    }

    const [result] = await db.insert(roles).values({ name: body.name });
    return NextResponse.json({ message: "Роль успешно создана", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

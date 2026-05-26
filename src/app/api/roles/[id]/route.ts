import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { roles } from "@/db/schema";
import {
  apiErrorResponse,
  invalidIdResponse,
  parseRouteId,
  requireAdmin,
} from "@/lib/api/route-helpers";

const NOT_FOUND_MESSAGE = "Роль не найдена";
const NAME_REQUIRED_MESSAGE = "Название роли обязательно";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const roleId = parseRouteId(params.id);
    if (!roleId) return invalidIdResponse();

    const role = await db.select().from(roles).where(eq(roles.id, roleId));
    if (role.length === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json(role[0]);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const roleId = parseRouteId(params.id);
    if (!roleId) return invalidIdResponse();

    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: NAME_REQUIRED_MESSAGE }, { status: 400 });

    const [result] = await db.update(roles).set({ name: body.name }).where(eq(roles.id, roleId));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: "Роль успешно обновлена" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const roleId = parseRouteId(params.id);
    if (!roleId) return invalidIdResponse();

    const [result] = await db.delete(roles).where(eq(roles.id, roleId));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: "Роль успешно удалена" });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

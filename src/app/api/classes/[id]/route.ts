import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "../../../../db/index";
import { classes } from "../../../../db/schema";
import { AdminCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const NOT_FOUND_MESSAGE = "Класс не найден";

function parseId(id: string) {
  const parsed = Number.parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.gradeId) updateData.gradeId = body.gradeId;
    if (body.letter) updateData.letter = body.letter;

    const [result] = await db.update(classes).set(updateData).where(eq(classes.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Класс успешно обновлён" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const [result] = await db.delete(classes).where(eq(classes.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Класс успешно удалён" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

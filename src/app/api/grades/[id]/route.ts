import { NextResponse } from "next/server";
import { db } from "../../../../db/index";
import { grades } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { AdminCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const NOT_FOUND_MESSAGE = "Параллель не найдена";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const body = await request.json();
    const updateData: any = {};
    if (body.number !== undefined) updateData.number = body.number;
    if (body.hours !== undefined) updateData.hours = body.hours;

    const [result] = await db.update(grades).set(updateData).where(eq(grades.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Параллель успешно обновлена" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const [result] = await db.delete(grades).where(eq(grades.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Параллель успешно удалена" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

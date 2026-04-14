import { NextResponse } from "next/server";
import { db } from "../../../../db/index";
import { subjects } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { AdminCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const NOT_FOUND_MESSAGE = "Предмет не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "Название предмета обязательно" }, { status: 400 });

    const [result] = await db.update(subjects).set({ name: body.name }).where(eq(subjects.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Предмет успешно обновлён" });
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

    const [result] = await db.delete(subjects).where(eq(subjects.id, id));
    if (result.affectedRows === 0) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    return NextResponse.json({ message: "Предмет успешно удалён" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

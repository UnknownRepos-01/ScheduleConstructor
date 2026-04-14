import { NextResponse } from "next/server";

import { db } from "../../../db/index";
import { roles } from "../../../db/schema";
import { AdminCheck, getSession } from "@/lib/auth";

const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const UNAUTHORIZED_MESSAGE = "Требуется авторизация";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const allRoles = await db.select().from(roles);
    return NextResponse.json(allRoles);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Название роли обязательно" }, { status: 400 });
    }

    const [result] = await db.insert(roles).values({ name: body.name });
    return NextResponse.json({ message: "Роль успешно создана", insertId: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

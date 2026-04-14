import { NextResponse } from "next/server";
import { db } from "../../../db/index";
import { grades } from "../../../db/schema";
import { AdminCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const allGrades = await db.select().from(grades);
    return NextResponse.json(allGrades);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const body = await request.json();
    if (!body.number || !body.hours) {
      return NextResponse.json({ error: "Номер параллели и количество часов обязательны" }, { status: 400 });
    }

    const [result] = await db.insert(grades).values({ number: body.number, hours: body.hours });
    return NextResponse.json({ message: "Параллель успешно создана", insertId: result.insertId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

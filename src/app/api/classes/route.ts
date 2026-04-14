import { NextResponse } from "next/server";
import { db } from "../../../db/index";
import { classes, grades } from "../../../db/schema";
import { AdminCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const allClasses = await db.select().from(classes);
    const allGrades = await db.select().from(grades);

    const result = allClasses.map((c) => {
      const grade = allGrades.find((g) => g.id === c.gradeId);
      return {
        ...c,
        gradeNumber: grade?.number,
        gradeHours: grade?.hours,
        displayName: grade ? `${grade.number}${c.letter}` : c.letter,
      };
    });

    result.sort((a, b) => {
      if (a.gradeNumber !== b.gradeNumber) return (a.gradeNumber || 0) - (b.gradeNumber || 0);
      return a.letter.localeCompare(b.letter);
    });

    return NextResponse.json(result);
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
    if (!body.gradeId || !body.letter) {
      return NextResponse.json({ error: "Параллель и буква класса обязательны" }, { status: 400 });
    }

    const [result] = await db.insert(classes).values({
      gradeId: body.gradeId,
      letter: body.letter,
    });

    return NextResponse.json({ message: "Класс успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

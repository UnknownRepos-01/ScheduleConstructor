import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classes, grades } from "@/db/schema";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const allClasses = await db.select().from(classes);
    const allGrades = await db.select().from(grades);
    const gradeById = new Map(allGrades.map((grade) => [grade.id, grade]));

    const result = allClasses.map((classItem) => {
      const grade = gradeById.get(classItem.gradeId);
      return {
        ...classItem,
        gradeNumber: grade?.number,
        gradeHours: grade?.hours,
        displayName: grade ? `${grade.number}${classItem.letter}` : classItem.letter,
      };
    });

    result.sort((a, b) => {
      if (a.gradeNumber !== b.gradeNumber) return (a.gradeNumber || 0) - (b.gradeNumber || 0);
      return a.letter.localeCompare(b.letter);
    });

    return NextResponse.json(result);
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json();
    const gradeId = Number.parseInt(String(body.gradeId), 10);
    const letter = typeof body.letter === "string" ? body.letter.trim() : "";
    if (!gradeId || !letter) {
      return NextResponse.json({ error: "Параллель и буква класса обязательны" }, { status: 400 });
    }

    const [duplicate] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.gradeId, gradeId), eq(classes.letter, letter)));
    if (duplicate) {
      return NextResponse.json({ error: "Класс с такой параллелью и буквой уже существует" }, { status: 409 });
    }

    const [result] = await db.insert(classes).values({ gradeId, letter });

    return NextResponse.json({ message: "Класс успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

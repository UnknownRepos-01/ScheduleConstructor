import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "../../../../db/index";
import { classes, classrooms, grades, lists, roles, subjects, users } from "../../../../db/schema";
import { ROLE_TEACHER } from "@/lib/access";
import { apiErrorResponse, requireAdmin } from "@/lib/api/route-helpers";

type CountRow = { count: number | string };

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
};

async function countAllFrom(table: typeof classes | typeof classrooms | typeof grades | typeof lists | typeof subjects) {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(table);
  return toNumber((row as CountRow | undefined)?.count);
}

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const [teacherRole] = await db.select().from(roles).where(eq(roles.name, ROLE_TEACHER));
    let teachers = 0;

    if (teacherRole) {
      const [teachersRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.roleId, teacherRole.id));
      teachers = toNumber((teachersRow as CountRow | undefined)?.count);
    }

    const [classesCount, classroomsCount, subjectsCount, gradesCount, listsCount] = await Promise.all([
      countAllFrom(classes),
      countAllFrom(classrooms),
      countAllFrom(subjects),
      countAllFrom(grades),
      countAllFrom(lists),
    ]);

    return NextResponse.json({
      teachers,
      classes: classesCount,
      classrooms: classroomsCount,
      subjects: subjectsCount,
      grades: gradesCount,
      lists: listsCount,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

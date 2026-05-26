import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classrooms, roles, subjects, teacherDefaultClassrooms, teacherSubjects, users } from "@/db/schema";
import { AdminOnlyCheck, hashPassword, validateNewPassword } from "@/lib/auth";
import { ROLE_MANAGER, ROLE_TEACHER } from "@/lib/access";
import { apiErrorResponse, requireAdmin, requireAdminSession } from "@/lib/api/route-helpers";

const normalizeIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
};

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const teacherRole = await db.select().from(roles).where(eq(roles.name, ROLE_TEACHER));
    if (teacherRole.length === 0) {
      return NextResponse.json([]);
    }

    const [teachers, defaults, classroomRows, teacherSubjectRows, subjectRows] = await Promise.all([
      db.select().from(users).where(eq(users.roleId, teacherRole[0].id)),
      db.select().from(teacherDefaultClassrooms),
      db.select().from(classrooms),
      db.select().from(teacherSubjects),
      db.select().from(subjects),
    ]);

    const defaultsByTeacherId = new Map(defaults.map((row) => [row.teacherId, row.classroomId]));
    const classroomById = new Map(classroomRows.map((row) => [row.id, row.number]));
    const subjectById = new Map(subjectRows.map((row) => [row.id, row.name]));
    const subjectIdsByTeacherId = new Map<number, number[]>();
    teacherSubjectRows.forEach((row) => {
      const current = subjectIdsByTeacherId.get(row.teacherId) ?? [];
      current.push(row.subjectId);
      subjectIdsByTeacherId.set(row.teacherId, current);
    });

    return NextResponse.json(
      teachers.map((teacher) => {
        const defaultClassroomId = defaultsByTeacherId.get(teacher.id) ?? null;
        const subjectIds = subjectIdsByTeacherId.get(teacher.id) ?? [];

        return {
          id: teacher.id,
          name: teacher.name,
          surname: teacher.surname,
          patronymic: teacher.patronymic,
          login: teacher.login,
          defaultClassroomId,
          defaultClassroomNumber:
            defaultClassroomId !== null ? classroomById.get(defaultClassroomId) ?? null : null,
          subjectIds,
          subjectNames: subjectIds.map((subjectId) => subjectById.get(subjectId)).filter(Boolean),
        };
      }),
    );
  } catch (err: unknown) {
    return apiErrorResponse(err, "Неизвестная ошибка");
  }
}

export async function POST(request: Request) {
  try {
    const { error: adminError, session } = await requireAdminSession();
    if (adminError) return adminError;
    if (!session) return apiErrorResponse(null, "Неизвестная ошибка");

    const body = await request.json();
    const { name, surname, patronymic, login, password } = body;
    const roleNameRaw = typeof body.roleName === "string" ? body.roleName : ROLE_TEACHER;
    const roleName = roleNameRaw === ROLE_MANAGER ? ROLE_MANAGER : ROLE_TEACHER;
    const defaultClassroomIdRaw = body.defaultClassroomId;
    const defaultClassroomId =
      defaultClassroomIdRaw === null || defaultClassroomIdRaw === undefined
        ? null
        : Number.parseInt(String(defaultClassroomIdRaw), 10);
    const subjectIds = normalizeIds(body.subjectIds);

    if (!name || !surname || !login || !password) {
      return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
    }

    const passwordValidationError = validateNewPassword(password);
    if (passwordValidationError) {
      return NextResponse.json({ error: passwordValidationError }, { status: 400 });
    }

    if (roleName === ROLE_MANAGER && !(await AdminOnlyCheck(session))) {
      return NextResponse.json({ error: "Только администратор может создавать менеджеров" }, { status: 403 });
    }

    const selectedRole = await db.select().from(roles).where(eq(roles.name, roleName));
    const roleId = selectedRole[0]?.id;
    if (!roleId) {
      return NextResponse.json({ error: "Роль не найдена в системе" }, { status: 500 });
    }

    const passwordHash = await hashPassword(password);

    const [result] = await db.insert(users).values({
      name,
      surname,
      patronymic: patronymic || null,
      login,
      password: passwordHash,
      roleId,
    });

    if (defaultClassroomId !== null && !Number.isNaN(defaultClassroomId)) {
      await db.insert(teacherDefaultClassrooms).values({
        teacherId: result.insertId,
        classroomId: defaultClassroomId,
      });
    }

    if (roleName === ROLE_TEACHER && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        await db.insert(teacherSubjects).values({ teacherId: result.insertId, subjectId });
      }
    }

    return NextResponse.json({ message: "Пользователь создан", insertId: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    if (message.includes("Duplicate")) {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 409 });
    }
    return apiErrorResponse(err, "Неизвестная ошибка");
  }
}

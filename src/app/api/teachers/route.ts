import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { classrooms, roles, teacherDefaultClassrooms, users } from "@/db/schema";
import { AdminCheck, AdminOnlyCheck, getSession, hashPassword, validateNewPassword } from "@/lib/auth";
import { ROLE_MANAGER, ROLE_TEACHER } from "@/lib/access";

const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const UNAUTHORIZED_MESSAGE = "Требуется авторизация";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const teacherRole = await db.select().from(roles).where(eq(roles.name, ROLE_TEACHER));
    if (teacherRole.length === 0) {
      return NextResponse.json([]);
    }

    const [teachers, defaults, classroomRows] = await Promise.all([
      db.select().from(users).where(eq(users.roleId, teacherRole[0].id)),
      db.select().from(teacherDefaultClassrooms),
      db.select().from(classrooms),
    ]);

    const defaultsByTeacherId = new Map(defaults.map((row) => [row.teacherId, row.classroomId]));
    const classroomById = new Map(classroomRows.map((row) => [row.id, row.number]));

    return NextResponse.json(
      teachers.map((teacher) => {
        const defaultClassroomId = defaultsByTeacherId.get(teacher.id) ?? null;

        return {
          id: teacher.id,
          name: teacher.name,
          surname: teacher.surname,
          patronymic: teacher.patronymic,
          login: teacher.login,
          defaultClassroomId,
          defaultClassroomNumber:
            defaultClassroomId !== null ? classroomById.get(defaultClassroomId) ?? null : null,
        };
      }),
    );
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
    const { name, surname, patronymic, login, password } = body;
    const roleNameRaw = typeof body.roleName === "string" ? body.roleName : ROLE_TEACHER;
    const roleName = roleNameRaw === ROLE_MANAGER ? ROLE_MANAGER : ROLE_TEACHER;
    const defaultClassroomIdRaw = body.defaultClassroomId;
    const defaultClassroomId =
      defaultClassroomIdRaw === null || defaultClassroomIdRaw === undefined
        ? null
        : Number.parseInt(String(defaultClassroomIdRaw), 10);

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

    return NextResponse.json({ message: "Пользователь создан", insertId: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    if (message.includes("Duplicate")) {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

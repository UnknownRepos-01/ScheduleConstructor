import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { roles, teacherDefaultClassrooms, users } from "@/db/schema";
import { AdminCheck, AdminOnlyCheck, getSession, hashPassword, validateNewPassword } from "@/lib/auth";
import { ROLE_MANAGER, ROLE_TEACHER } from "@/lib/access";

const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const NOT_FOUND_MESSAGE = "Пользователь не найден";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = Number.parseInt(params.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const body = await request.json();
    const { name, surname, patronymic, login, password } = body;
    const roleNameRaw = typeof body.roleName === "string" ? body.roleName : undefined;
    const defaultClassroomIdRaw = body.defaultClassroomId;
    const hasDefaultClassroomField = body.defaultClassroomId !== undefined;
    const defaultClassroomId =
      defaultClassroomIdRaw === null || defaultClassroomIdRaw === undefined
        ? null
        : Number.parseInt(String(defaultClassroomIdRaw), 10);

    const updateData: Partial<typeof users.$inferInsert> = {};
    if (name) updateData.name = name;
    if (surname) updateData.surname = surname;
    if (patronymic !== undefined) updateData.patronymic = patronymic || null;
    if (login) updateData.login = login;

    if (password) {
      const passwordValidationError = validateNewPassword(password);
      if (passwordValidationError) {
        return NextResponse.json({ error: passwordValidationError }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    if (roleNameRaw) {
      const roleName = roleNameRaw === ROLE_MANAGER ? ROLE_MANAGER : ROLE_TEACHER;
      if (roleName === ROLE_MANAGER && !(await AdminOnlyCheck(session))) {
        return NextResponse.json({ error: "Только администратор может назначать роль менеджера" }, { status: 403 });
      }

      const selectedRole = await db.select().from(roles).where(eq(roles.name, roleName));
      const roleId = selectedRole[0]?.id;
      if (!roleId) {
        return NextResponse.json({ error: "Роль не найдена в системе" }, { status: 500 });
      }

      updateData.roleId = roleId;
    }

    const [result] = await db.update(users).set(updateData).where(eq(users.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    if (hasDefaultClassroomField) {
      await db.delete(teacherDefaultClassrooms).where(eq(teacherDefaultClassrooms.teacherId, id));

      if (defaultClassroomId !== null && !Number.isNaN(defaultClassroomId)) {
        await db.insert(teacherDefaultClassrooms).values({
          teacherId: id,
          classroomId: defaultClassroomId,
        });
      }
    }

    return NextResponse.json({ message: "Пользователь обновлён" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const id = Number.parseInt(params.id, 10);
    if (Number.isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    await db.delete(teacherDefaultClassrooms).where(eq(teacherDefaultClassrooms.teacherId, id));

    const [result] = await db.delete(users).where(eq(users.id, id));
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: "Пользователь удалён" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

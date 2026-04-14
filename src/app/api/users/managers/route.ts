import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { roles, users } from "@/db/schema";
import { AdminOnlyCheck, getSession, hashPassword, validateNewPassword } from "@/lib/auth";
import { ROLE_MANAGER } from "@/lib/access";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "Только администратор может создавать менеджеров";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminOnlyCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const surname = typeof body.surname === "string" ? body.surname.trim() : "";
    const patronymic = typeof body.patronymic === "string" ? body.patronymic.trim() : "";
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !surname || !login || !password) {
      return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
    }

    const passwordValidationError = validateNewPassword(password);
    if (passwordValidationError) {
      return NextResponse.json({ error: passwordValidationError }, { status: 400 });
    }

    const existingRole = await db.select().from(roles).where(eq(roles.name, ROLE_MANAGER));
    const roleId = existingRole[0]?.id;
    if (!roleId) {
      return NextResponse.json({ error: "Роль 'Менеджер' не найдена в системе" }, { status: 500 });
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

    return NextResponse.json({ message: "Менеджер успешно создан", insertId: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    if (message.includes("Duplicate")) {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    if (!(await AdminOnlyCheck(session))) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });

    const existingRole = await db.select().from(roles).where(eq(roles.name, ROLE_MANAGER));
    const roleId = existingRole[0]?.id;
    if (!roleId) {
      return NextResponse.json([]);
    }

    const managers = await db.select().from(users).where(eq(users.roleId, roleId));
    return NextResponse.json(
      managers.map((user) => ({
        id: user.id,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic,
        login: user.login,
      })),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

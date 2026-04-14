import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { ipAuths, statuses, users } from "@/db/schema";
import { AdminOnlyCheck, getIpAuthStatusIds, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    if (!(await AdminOnlyCheck(session))) {
      return NextResponse.json({ error: "Только администратор может подтверждать IP-входы" }, { status: 403 });
    }

    const rows = await db.select().from(ipAuths).orderBy(desc(ipAuths.createdAt));

    const [usersRows, statusRows] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          surname: users.surname,
          patronymic: users.patronymic,
          login: users.login,
          roleId: users.roleId,
        })
        .from(users),
      db.select().from(statuses),
    ]);

    const statusById = new Map(statusRows.map((status) => [status.id, status.name]));
    const userById = new Map(
      usersRows.map((user) => [
        user.id,
        {
          id: user.id,
          name: user.name,
          surname: user.surname,
          patronymic: user.patronymic,
          login: user.login,
          roleId: user.roleId,
        },
      ]),
    );

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        ip: row.ip,
        statusId: row.statusId,
        statusName: statusById.get(row.statusId) ?? null,
        deviceName: row.deviceName,
        browser: row.browser,
        createdAt: row.createdAt,
        user: userById.get(row.userId) ?? null,
      })),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    if (!(await AdminOnlyCheck(session))) {
      return NextResponse.json({ error: "Только администратор может подтверждать IP-входы" }, { status: 403 });
    }

    const body = await request.json();
    const id = Number.parseInt(String(body.id), 10);

    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }

    const approved = body.approved !== false;
    const { confirmedStatusId, pendingStatusId } = await getIpAuthStatusIds();

    const [result] = await db
      .update(ipAuths)
      .set({ statusId: approved ? confirmedStatusId : pendingStatusId, createdAt: new Date() })
      .where(eq(ipAuths.id, id));

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }

    return NextResponse.json({ message: approved ? "IP подтверждён" : "IP переведён в ожидание" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

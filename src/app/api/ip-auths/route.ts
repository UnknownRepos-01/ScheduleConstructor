import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { ipAuths, statuses, users } from "@/db/schema";
import { updateIpAuthApproval } from "@/lib/api/ip-auth-status";
import { apiErrorResponse, invalidIdResponse, requireAdminOnly } from "@/lib/api/route-helpers";

const FORBIDDEN_MESSAGE = "Только администратор может подтверждать IP-входы";
const NOT_FOUND_MESSAGE = "Запись не найдена";
const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";

export async function GET() {
  try {
    const { error: adminError } = await requireAdminOnly(FORBIDDEN_MESSAGE);
    if (adminError) return adminError;

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
    return apiErrorResponse(err, UNKNOWN_ERROR_MESSAGE);
  }
}

export async function PATCH(request: Request) {
  try {
    const { error: adminError } = await requireAdminOnly(FORBIDDEN_MESSAGE);
    if (adminError) return adminError;

    const body = await request.json();
    const id = Number.parseInt(String(body.id), 10);

    if (Number.isNaN(id)) return invalidIdResponse();

    const approved = body.approved !== false;
    const result = await updateIpAuthApproval(id, approved);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: approved ? "IP подтверждён" : "IP переведён в ожидание" });
  } catch (err: unknown) {
    return apiErrorResponse(err, UNKNOWN_ERROR_MESSAGE);
  }
}

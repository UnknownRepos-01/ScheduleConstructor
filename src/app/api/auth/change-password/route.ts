import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";

import { changePasswordForUser, getClientIp, getIpAuthStatusIds, getSession, validateNewPassword } from "@/lib/auth";
import { db } from "@/db/index";
import { ipAuths } from "@/db/schema";
import { apiErrorResponse } from "@/lib/api/route-helpers";

const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";

const parsePasswordChangeBody = (body: any) => ({
  currentPassword: typeof body.currentPassword === "string" ? body.currentPassword : "",
  newPassword: typeof body.newPassword === "string" ? body.newPassword : "",
  confirmPassword: typeof body.confirmPassword === "string" ? body.confirmPassword : "",
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = parsePasswordChangeBody(body);

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Новый пароль и подтверждение не совпадают" }, { status: 400 });
    }

    const passwordValidationError = validateNewPassword(newPassword);
    if (passwordValidationError) {
      return NextResponse.json({ error: passwordValidationError }, { status: 400 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "Новый пароль должен отличаться от текущего" }, { status: 400 });
    }

    const changed = await changePasswordForUser(session.id, currentPassword, newPassword);
    if (!changed) {
      return NextResponse.json({ error: "Текущий пароль неверный" }, { status: 401 });
    }

    const { confirmedStatusId, pendingStatusId } = await getIpAuthStatusIds();
    const currentIp = await getClientIp(request);

    await db
      .update(ipAuths)
      .set({ statusId: pendingStatusId })
      .where(and(eq(ipAuths.userId, session.id), ne(ipAuths.ip, currentIp), eq(ipAuths.statusId, confirmedStatusId)));

    return NextResponse.json({ message: "Пароль успешно изменён" });
  } catch (err: unknown) {
    return apiErrorResponse(err, UNKNOWN_ERROR_MESSAGE);
  }
}

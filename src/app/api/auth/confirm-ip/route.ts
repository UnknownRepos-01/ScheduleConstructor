import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { ipAuths } from "@/db/schema";
import { createSessionToken, getClientIp, getIpAuthStatusIds, validateUserCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const pendingAuthIdRaw = body.pendingAuthId;
    const pendingAuthId =
      pendingAuthIdRaw === undefined || pendingAuthIdRaw === null
        ? null
        : Number.parseInt(String(pendingAuthIdRaw), 10);

    if (!login || !password || (pendingAuthId !== null && Number.isNaN(pendingAuthId))) {
      return NextResponse.json({ error: "Некорректные параметры подтверждения IP" }, { status: 400 });
    }

    const user = await validateUserCredentials(login, password);
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const ip = await getClientIp(request);
    const records = await db
      .select()
      .from(ipAuths)
      .where(and(eq(ipAuths.userId, user.id), eq(ipAuths.ip, ip)));

    const record = pendingAuthId !== null ? records.find((item) => item.id === pendingAuthId) : records[0];
    if (!record) {
      return NextResponse.json({ error: "Заявка на подтверждение IP не найдена или не принадлежит пользователю" }, { status: 403 });
    }

    const { confirmedStatusId, pendingStatusId } = await getIpAuthStatusIds();
    if (record.statusId !== pendingStatusId && record.statusId !== confirmedStatusId) {
      return NextResponse.json({ error: "Невозможно подтвердить этот IP-адрес" }, { status: 400 });
    }

    await db.update(ipAuths).set({ statusId: confirmedStatusId, createdAt: new Date() }).where(eq(ipAuths.id, record.id));

    const token = createSessionToken(user);
    const response = NextResponse.json({
      message: "IP-адрес успешно подтверждён, вход выполнен",
      user,
    });

    response.cookies.set("schedule_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

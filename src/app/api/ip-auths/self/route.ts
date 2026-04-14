import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { ipAuths } from "@/db/schema";
import { getIpAuthStatusIds, getSession, isCurrentRequestFromTrustedIp } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "Подтверждение нового IP возможно только с уже подтверждённого IP-адреса";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const canConfirm = await isCurrentRequestFromTrustedIp(request, session.id);
    const { pendingStatusId } = await getIpAuthStatusIds();
    const records = await db
      .select({
        id: ipAuths.id,
        ip: ipAuths.ip,
        createdAt: ipAuths.createdAt,
      })
      .from(ipAuths)
      .where(and(eq(ipAuths.userId, session.id), eq(ipAuths.statusId, pendingStatusId)))
      .orderBy(desc(ipAuths.createdAt));

    return NextResponse.json({
      canConfirmFromCurrentIp: canConfirm,
      records,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const canConfirm = await isCurrentRequestFromTrustedIp(request, session.id);
    if (!canConfirm) {
      return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
    }

    const body = await request.json();
    const id = Number.parseInt(String(body.id), 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Некорректный ID заявки" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(ipAuths)
      .where(and(eq(ipAuths.id, id), eq(ipAuths.userId, session.id)));
    const record = rows[0];
    if (!record) {
      return NextResponse.json({ error: "Заявка на подтверждение IP не найдена" }, { status: 404 });
    }

    const { confirmedStatusId, pendingStatusId } = await getIpAuthStatusIds();
    if (record.statusId === confirmedStatusId) {
      return NextResponse.json({ message: "Этот IP-адрес уже подтверждён" });
    }

    if (record.statusId !== pendingStatusId) {
      return NextResponse.json({ error: "Невозможно подтвердить этот IP-адрес" }, { status: 400 });
    }

    await db.update(ipAuths).set({ statusId: confirmedStatusId, createdAt: new Date() }).where(eq(ipAuths.id, id));

    return NextResponse.json({ message: "IP-адрес успешно подтверждён" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

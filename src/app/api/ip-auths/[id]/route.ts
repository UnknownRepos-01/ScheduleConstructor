import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/index";
import { ipAuths } from "@/db/schema";
import { AdminOnlyCheck, getIpAuthStatusIds, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    if (!(await AdminOnlyCheck(session))) {
      return NextResponse.json({ error: "Только администратор может подтверждать IP-входы" }, { status: 403 });
    }

    const id = Number.parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
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

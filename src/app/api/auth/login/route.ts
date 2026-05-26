import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api/route-helpers";
import { setSessionCookie } from "@/lib/api/session-cookie";
import { authenticateUser, createSessionToken, getClientIp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!login || !password) {
      return NextResponse.json({ error: "Логин и пароль обязательны" }, { status: 400 });
    }

    const ip = await getClientIp(request);
    const result = await authenticateUser(login, password, ip);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, pending: result.pending, pendingAuthId: result.pendingAuthId },
        { status: result.pending ? 403 : 401 },
      );
    }

    const token = createSessionToken(result.user!);
    const response = NextResponse.json({
      message: result.message,
      user: result.user,
    });

    setSessionCookie(response.cookies, token);

    return response;
  } catch (err) {
    return apiErrorResponse(err);
  }
}

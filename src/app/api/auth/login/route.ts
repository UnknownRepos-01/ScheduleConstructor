import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, getClientIp } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json({ error: "Логин и пароль обязательны" }, { status: 400 });
    }

    const ip = await getClientIp(request);
    const result = await authenticateUser(login, password, ip);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, pending: result.pending, pendingAuthId: result.pendingAuthId },
        { status: result.pending ? 403 : 401 }
      );
    }

    const token = createSessionToken(result.user!);
    const response = NextResponse.json({
      message: result.message,
      user: result.user,
    });

    response.cookies.set("schedule_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

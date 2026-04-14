import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Выход выполнен" });
  response.cookies.set("schedule_session", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

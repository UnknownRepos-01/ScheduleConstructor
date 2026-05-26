import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/api/session-cookie";

export async function POST() {
  const response = NextResponse.json({ message: "Выход выполнен" });
  clearSessionCookie(response.cookies);
  return response;
}

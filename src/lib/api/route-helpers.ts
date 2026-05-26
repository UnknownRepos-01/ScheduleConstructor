import { NextResponse } from "next/server";

import { AdminCheck, AdminOnlyCheck, getSession } from "@/lib/auth";

const UNAUTHORIZED_MESSAGE = "Требуется авторизация";
const FORBIDDEN_MESSAGE = "У вас нет прав для выполнения этого действия";
const INVALID_ID_MESSAGE = "Некорректный ID";
const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function requireAdmin() {
  const { error } = await requireAdminSession();
  return error;
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!session) return { error: jsonError(UNAUTHORIZED_MESSAGE, 401), session: null };
  if (!(await AdminCheck(session))) {
    return { error: jsonError(FORBIDDEN_MESSAGE, 403), session: null };
  }

  return { error: null, session };
}

export async function requireAdminOnly(forbiddenMessage = FORBIDDEN_MESSAGE) {
  const session = await getSession();
  if (!session) return { error: jsonError(UNAUTHORIZED_MESSAGE, 401), session: null };
  if (!(await AdminOnlyCheck(session))) {
    return { error: jsonError(forbiddenMessage, 403), session: null };
  }

  return { error: null, session };
}

export function parseRouteId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

export function invalidIdResponse() {
  return jsonError(INVALID_ID_MESSAGE, 400);
}

export function apiErrorResponse(error: unknown, fallback = UNKNOWN_ERROR_MESSAGE) {
  console.error(error);
  return jsonError(fallback, 500);
}

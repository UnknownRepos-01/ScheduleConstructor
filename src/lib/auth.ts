import { compare, hash } from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "../db/index";
import { ipAuths, roles, statuses, users } from "../db/schema";
import { canAccessAdminPanel, ROLE_ADMIN } from "./access";

const SESSION_COOKIE = "schedule_session";
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-session-secret-change-me";
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);

const STATUS_CONFIRMED = "Подтверждён";
const STATUS_PENDING = "Ожидание подтверждения";

const INVALID_LOGIN_MESSAGE = "Неверный логин или пароль";

const getSafeRounds = (): number => {
  if (Number.isNaN(BCRYPT_ROUNDS)) return 12;
  return Math.min(15, Math.max(10, BCRYPT_ROUNDS));
};

const isBcryptHash = (value: string): boolean => /^\$2[aby]\$\d{2}\$/.test(value);

const signSessionPayload = (payload: string): string =>
  createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");

const auditAuthEvent = (event: string, payload: Record<string, unknown>) => {
  console.info(`[auth] ${event}`, payload);
};

const toSessionUser = (user: typeof users.$inferSelect, roleName: string): SessionUser => ({
  id: user.id,
  name: user.name,
  surname: user.surname,
  patronymic: user.patronymic,
  login: user.login,
  roleId: user.roleId,
  roleName,
});

async function getStatusIdByName(statusName: string): Promise<number> {
  const existing = await db.select().from(statuses).where(eq(statuses.name, statusName));
  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await db.insert(statuses).values({ name: statusName });
  return result.insertId;
}

async function verifyPasswordAndMigrate(userId: number, storedPassword: string, candidatePassword: string): Promise<boolean> {
  if (isBcryptHash(storedPassword)) {
    return compare(candidatePassword, storedPassword);
  }

  if (storedPassword !== candidatePassword) {
    return false;
  }

  const passwordHash = await hash(candidatePassword, getSafeRounds());
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));
  return true;
}

export async function validateUserCredentials(login: string, password: string): Promise<SessionUser | null> {
  const userResults = await db.select().from(users).where(eq(users.login, login));
  if (userResults.length === 0) return null;

  const user = userResults[0];
  const passwordMatches = await verifyPasswordAndMigrate(user.id, user.password, password);
  if (!passwordMatches) return null;

  const roleResults = await db.select().from(roles).where(eq(roles.id, user.roleId));
  const roleName = roleResults.length > 0 ? roleResults[0].name : "Неизвестная роль";
  return toSessionUser(user, roleName);
}

export interface SessionUser {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
  roleId: number;
  roleName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, getSafeRounds());
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 8) return "Пароль должен быть не короче 8 символов";
  if (!/[A-Za-zА-Яа-яЁё]/.test(password)) return "Пароль должен содержать хотя бы одну букву";
  if (!/\d/.test(password)) return "Пароль должен содержать хотя бы одну цифру";
  return null;
}

export async function getClientIp(request: Request): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstForwardedIp = forwarded.split(",")[0]?.trim();
    if (firstForwardedIp) {
      const ip = firstForwardedIp.match(/\b((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\b/)?.[1] ?? null;;
      if (ip) return ip
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    const ip = realIp.match(/\b((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\b/)?.[1] ?? null;
    if (ip) {
      return ip
    }
  }

  return "127.0.0.1";
}

export async function authenticateUser(
  login: string,
  password: string,
  ip: string,
): Promise<{ success: boolean; message: string; user?: SessionUser; pending?: boolean; pendingAuthId?: number }> {
  try {
    const userResults = await db.select().from(users).where(eq(users.login, login));
    if (userResults.length === 0) {
      return { success: false, message: INVALID_LOGIN_MESSAGE };
    }

    const user = userResults[0];
    const passwordMatches = await verifyPasswordAndMigrate(user.id, user.password, password);
    if (!passwordMatches) {
      return { success: false, message: INVALID_LOGIN_MESSAGE };
    }

    const roleResults = await db.select().from(roles).where(eq(roles.id, user.roleId));
    const roleName = roleResults.length > 0 ? roleResults[0].name : "Неизвестная роль";
    const sessionUser = toSessionUser(user, roleName);

    const allUserIpAuths = await db.select().from(ipAuths).where(eq(ipAuths.userId, user.id));
    const confirmedStatusId = await getStatusIdByName(STATUS_CONFIRMED);
    const pendingStatusId = await getStatusIdByName(STATUS_PENDING);

    if (allUserIpAuths.length === 0) {
      await db.insert(ipAuths).values({
        userId: user.id,
        ip,
        statusId: confirmedStatusId,
      });
      auditAuthEvent("first_login_confirmed", { userId: user.id, ip });

      return {
        success: true,
        message: "Вход выполнен успешно",
        user: sessionUser,
      };
    }

    const existingIpAuth = allUserIpAuths.find((record) => record.ip === ip);
    if (!existingIpAuth) {
      const [insertResult] = await db.insert(ipAuths).values({ userId: user.id, ip, statusId: pendingStatusId });
      auditAuthEvent("new_ip_pending", { userId: user.id, ip, ipAuthId: insertResult.insertId });

      return {
        success: false,
        pending: true,
        pendingAuthId: insertResult.insertId,
        message: "Вход с нового IP-адреса требует подтверждения из уже доверенной сессии",
      };
    }

    if (existingIpAuth.statusId === confirmedStatusId) {

      await db.update(ipAuths).set({ createdAt: new Date() }).where(eq(ipAuths.id, existingIpAuth.id));
      auditAuthEvent("trusted_ip_login", { userId: user.id, ip, ipAuthId: existingIpAuth.id });
      return {
        success: true,
        message: "Вход выполнен успешно",
        user: sessionUser,
      };
    }

    if (existingIpAuth.statusId !== pendingStatusId) {
      await db.update(ipAuths).set({ statusId: pendingStatusId, createdAt: new Date() }).where(eq(ipAuths.id, existingIpAuth.id));
    }
    auditAuthEvent("pending_ip_login", { userId: user.id, ip, ipAuthId: existingIpAuth.id });

    return {
      success: false,
      pending: true,
      pendingAuthId: existingIpAuth.id,
      message: "Вход с этого IP-адреса ожидает подтверждения из уже доверенной сессии",
    };
  } catch (error: unknown) {
    console.error("Auth error:", error);
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return { success: false, message: `Ошибка сервера: ${message}` };
  }
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    id: user.id,
    login: user.login,
    name: user.name,
    surname: user.surname,
    patronymic: user.patronymic,
    roleId: user.roleId,
    roleName: user.roleName,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  });

  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = signSessionPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionToken(token: string): SessionUser | null {
  try {
    const [encodedPayload, tokenSignature] = token.split(".");
    if (!encodedPayload || !tokenSignature) {
      return null;
    }

    const expectedSignature = signSessionPayload(encodedPayload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(tokenSignature);

    if (expectedBuffer.length !== actualBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return {
      id: payload.id,
      login: payload.login,
      name: payload.name,
      surname: payload.surname,
      patronymic: payload.patronymic,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function AdminCheck(sessionUser: SessionUser): Promise<boolean> {
  const roleResults = await db.select().from(roles).where(eq(roles.id, sessionUser.roleId));
  const roleName = roleResults[0]?.name ?? sessionUser.roleName;
  return canAccessAdminPanel(roleName);
}

export async function AdminOnlyCheck(sessionUser: SessionUser): Promise<boolean> {
  const roleResults = await db.select().from(roles).where(eq(roles.id, sessionUser.roleId));
  const roleName = roleResults[0]?.name ?? sessionUser.roleName;
  return roleName === ROLE_ADMIN;
}

export async function getIpAuthStatusIds(): Promise<{ confirmedStatusId: number; pendingStatusId: number }> {
  const [confirmedStatusId, pendingStatusId] = await Promise.all([
    getStatusIdByName(STATUS_CONFIRMED),
    getStatusIdByName(STATUS_PENDING),
  ]);

  return { confirmedStatusId, pendingStatusId };
}

export async function isCurrentRequestFromTrustedIp(request: Request, userId: number): Promise<boolean> {
  const { confirmedStatusId } = await getIpAuthStatusIds();
  const currentIp = await getClientIp(request);
  const rows = await db
    .select()
    .from(ipAuths)
    .where(and(eq(ipAuths.userId, userId), eq(ipAuths.ip, currentIp)));

  const trustedRow = rows.find((row) => row.statusId === confirmedStatusId);
  if (!trustedRow) {
    return false;
  }

  return true;
}

export async function changePasswordForUser(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  const userResults = await db.select().from(users).where(eq(users.id, userId));
  if (userResults.length === 0) {
    return false;
  }

  const user = userResults[0];
  const passwordMatches = await verifyPasswordAndMigrate(user.id, user.password, currentPassword);
  if (!passwordMatches) {
    return false;
  }

  const newPasswordHash = await hashPassword(newPassword);
  await db.update(users).set({ password: newPasswordHash }).where(eq(users.id, userId));
  auditAuthEvent("password_changed", { userId });
  return true;
}

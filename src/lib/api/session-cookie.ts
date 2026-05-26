import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

const SESSION_COOKIE_NAME = "schedule_session";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
};
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function setSessionCookie(cookies: ResponseCookies, token: string) {
  cookies.set(SESSION_COOKIE_NAME, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(cookies: ResponseCookies) {
  cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

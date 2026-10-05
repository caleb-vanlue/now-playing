import { createHmac, timingSafeEqual } from "node:crypto";

export const STATUS_COOKIE = "np_status";
export const STATUS_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

// The status page is off entirely unless a key is configured
export function statusKey(): string | null {
  return process.env.STATUS_KEY?.trim() || null;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isValidKey(candidate: string): boolean {
  const key = statusKey();
  return !!key && safeEqual(candidate, key);
}

// The cookie holds a value derived from the key rather than the key itself;
// changing STATUS_KEY signs everyone out
export function sessionToken(): string | null {
  const key = statusKey();
  return key ? createHmac("sha256", key).update("now-playing-status-session").digest("hex") : null;
}

export function isValidSession(cookie: string | undefined): boolean {
  const expected = sessionToken();
  return !!cookie && !!expected && safeEqual(cookie, expected);
}

/** Cookie from the status page, or `Authorization: Bearer <key>` for scripts. */
export function isAuthorizedRequest(request: Request, cookie: string | undefined): boolean {
  if (isValidSession(cookie)) return true;
  const auth = request.headers.get("authorization");
  return !!auth?.startsWith("Bearer ") && isValidKey(auth.slice("Bearer ".length).trim());
}

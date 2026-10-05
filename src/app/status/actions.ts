"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { describeClient, monitor } from "../../../utils/monitor";
import {
  isValidKey,
  sessionToken,
  STATUS_COOKIE,
  STATUS_COOKIE_MAX_AGE_S,
} from "../../../utils/statusAuth";

// Slows guessing; the key itself should be long and random
const FAILED_LOGIN_DELAY_MS = 1_000;

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const key = String(formData.get("key") ?? "");
  const requestHeaders = await headers();

  if (!isValidKey(key)) {
    const { ip, country } = describeClient({ headers: requestHeaders });
    monitor.log("warn", `Failed status login from ${ip}${country ? ` (${country})` : ""}`);
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { error: "That key isn't right." };
  }

  (await cookies()).set(STATUS_COOKIE, sessionToken()!, {
    httpOnly: true,
    // Behind Cloudflare/Railway the origin sees http, so trust the proxy's header
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    sameSite: "strict",
    path: "/",
    maxAge: STATUS_COOKIE_MAX_AGE_S,
  });
  redirect("/status");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(STATUS_COOKIE);
  redirect("/status");
}

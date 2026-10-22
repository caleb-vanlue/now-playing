"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { readInstance, updateInstance } from "../../../utils/instanceStore";
import { describeClient, monitor } from "../../../utils/monitor";
import { setupState } from "../../../utils/plexConfig";
import {
  checkPin,
  createPin,
  findWorkingUri,
  getOwnedServers,
  getUser,
  plexAuthUrl,
} from "../../../utils/plexTv";
import {
  checkSetupCode,
  discardSetupCode,
  newSetupCookie,
  readSetupCookie,
  SETUP_COOKIE,
  SETUP_COOKIE_MAX_AGE_S,
} from "../../../utils/setupAuth";
import { endSetupSessions, getSetupSession, SetupView, viewOf } from "../../../utils/setupFlow";
import { sessionHub } from "../../../utils/sessionHub";

// Slows guessing on top of the code being retired after repeated misses
const FAILED_CODE_DELAY_MS = 1_000;

export interface CodeState {
  error?: string;
}

export async function submitCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  if (setupState() !== "unclaimed") redirect("/setup");

  const requestHeaders = await headers();
  const result = checkSetupCode(String(formData.get("code") ?? ""));
  if (result !== "ok") {
    const { ip, country } = describeClient({ headers: requestHeaders });
    monitor.log("warn", `Wrong setup code from ${ip}${country ? ` (${country})` : ""}`);
    await new Promise((resolve) => setTimeout(resolve, FAILED_CODE_DELAY_MS));
    return {
      error:
        result === "retired"
          ? "Too many wrong codes, so that one no longer works. A new code is in the server logs."
          : "That code isn't right. Copy it from the server logs.",
    };
  }

  const { value } = newSetupCookie();
  (await cookies()).set(SETUP_COOKIE, value, {
    httpOnly: true,
    // Behind Cloudflare/Railway the origin sees http, so trust the proxy's header
    secure: requestHeaders.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/setup",
    maxAge: SETUP_COOKIE_MAX_AGE_S,
  });
  redirect("/setup");
}

export type StepResult<T = SetupView> = { ok: true; value: T } | { ok: false; error: string };

// Every step re-checks the cookie and that nobody has claimed the instance since
async function currentSessionId(): Promise<string | null> {
  if (setupState() !== "unclaimed") return null;
  return readSetupCookie((await cookies()).get(SETUP_COOKIE)?.value);
}

const SESSION_EXPIRED = "Setup timed out. Reload the page and enter the setup code again.";

export async function startSignIn(): Promise<StepResult<string>> {
  const id = await currentSessionId();
  if (!id) return { ok: false, error: SESSION_EXPIRED };

  try {
    const pin = await createPin();
    const session = getSetupSession(id);
    session.pinId = pin.id;
    session.user = undefined;
    session.servers = undefined;

    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
    return { ok: true, value: plexAuthUrl(pin, readInstance().clientId, `${proto}://${host}/setup`) };
  } catch (err) {
    console.error("Could not start Plex sign-in:", err);
    return { ok: false, error: "Couldn't reach plex.tv. Try again in a moment." };
  }
}

export async function pollSignIn(): Promise<StepResult> {
  const id = await currentSessionId();
  if (!id) return { ok: false, error: SESSION_EXPIRED };

  const session = getSetupSession(id);
  if (!session.pinId || session.servers) return { ok: true, value: viewOf(session) };

  let token: string | null;
  try {
    token = await checkPin(session.pinId);
  } catch (err) {
    session.pinId = undefined;
    const expired = err instanceof Error && err.message === "expired";
    return {
      ok: false,
      error: expired
        ? "The Plex sign-in expired. Start it again."
        : "Couldn't check the Plex sign-in. Start it again.",
    };
  }
  if (!token) return { ok: true, value: viewOf(session) };

  try {
    const [user, servers] = await Promise.all([getUser(token), getOwnedServers(token)]);
    // The sign-in token is done with; only a server's own token is kept
    session.pinId = undefined;
    session.user = user;
    session.servers = servers;
    return { ok: true, value: viewOf(session) };
  } catch (err) {
    console.error("Could not read the Plex account:", err);
    session.pinId = undefined;
    return { ok: false, error: "Signed in, but couldn't read your Plex servers. Start again." };
  }
}

export async function connectServer(serverId: string, address: string): Promise<StepResult<null>> {
  const id = await currentSessionId();
  if (!id) return { ok: false, error: SESSION_EXPIRED };

  const session = getSetupSession(id);
  const server = session.servers?.find((s) => s.id === serverId);
  if (!session.user || !server) return { ok: false, error: "Pick one of your servers." };

  const preferred: string[] = [];
  const typed = address.trim();
  if (typed) {
    if (!/^https?:\/\/[^\s]+$/i.test(typed)) {
      return { ok: false, error: "Enter an address like http://192.168.1.10:32400." };
    }
    preferred.push(typed);
  }
  // A non-secret override, e.g. host.docker.internal when Plex runs alongside
  const envUrl = process.env.PLEX_URL?.trim();
  if (envUrl) preferred.push(envUrl);

  const url = await findWorkingUri(server, preferred);
  if (!url) {
    return {
      ok: false,
      error: `This instance couldn't reach ${server.name} at any of its addresses. Enter the address this instance should use.`,
    };
  }

  const user = session.user;
  try {
    updateInstance((data) => ({
      ...data,
      owner: { uuid: user.uuid, username: user.username, claimedAt: Date.now() },
      plex: { url, token: server.token, serverId: server.id, serverName: server.name },
    }));
  } catch (err) {
    console.error("Could not save the Plex connection:", err);
    return {
      ok: false,
      error: "Couldn't save the connection. Check that DATA_DIR is on a writable volume.",
    };
  }

  discardSetupCode();
  endSetupSessions();
  (await cookies()).delete({ name: SETUP_COOKIE, path: "/setup" });
  monitor.log("info", `Instance claimed by Plex account ${user.username}; connected to ${server.name}`);
  sessionHub.reconfigure("plex");
  return { ok: true, value: null };
}

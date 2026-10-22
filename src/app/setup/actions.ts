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
  isOwnerCookie,
  isOwnerUuid,
  newOwnerCookie,
  newSetupCookie,
  OWNER_COOKIE,
  OWNER_COOKIE_MAX_AGE_S,
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

async function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Behind Cloudflare/Railway the origin sees http, so trust the proxy's header
    secure: (await headers()).get("x-forwarded-proto") === "https",
    // Lax, not strict: Plex's sign-in page sends the browser back here
    sameSite: "lax" as const,
    path: "/setup",
    maxAge,
  };
}

async function clientLabel(): Promise<string> {
  const { ip, country } = describeClient({ headers: await headers() });
  return `${ip}${country ? ` (${country})` : ""}`;
}

export async function submitCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  if (setupState() !== "unclaimed") redirect("/setup");

  const result = checkSetupCode(String(formData.get("code") ?? ""));
  if (result !== "ok") {
    monitor.log("warn", `Wrong setup code from ${await clientLabel()}`);
    await new Promise((resolve) => setTimeout(resolve, FAILED_CODE_DELAY_MS));
    return {
      error:
        result === "retired"
          ? "Too many wrong codes, so that one no longer works. A new code is in the server logs."
          : "That code isn't right. Copy it from the server logs.",
    };
  }

  (await cookies()).set(SETUP_COOKIE, newSetupCookie().value, await cookieOptions(SETUP_COOKIE_MAX_AGE_S));
  redirect("/setup");
}

export type StepResult<T = SetupView> = { ok: true; value: T } | { ok: false; error: string };

const SESSION_EXPIRED = "Setup timed out. Reload the page and start again.";
const NOT_OWNER = "Sign in as the owner first.";

/**
 * The sign-in session for this browser. Claiming needs one made by entering the
 * setup code; on a claimed instance anyone may start a Plex sign-in, since only
 * the owner's account gets anywhere with it.
 */
async function signInSessionId(create = false): Promise<string | null> {
  const state = setupState();
  if (state === "env") return null;

  const jar = await cookies();
  const id = readSetupCookie(jar.get(SETUP_COOKIE)?.value);
  if (id || state !== "claimed" || !create) return id;

  const cookie = newSetupCookie();
  jar.set(SETUP_COOKIE, cookie.value, await cookieOptions(SETUP_COOKIE_MAX_AGE_S));
  return cookie.id;
}

async function isOwner(): Promise<boolean> {
  return setupState() === "claimed" && isOwnerCookie((await cookies()).get(OWNER_COOKIE)?.value);
}

export async function startSignIn(): Promise<StepResult<string>> {
  const id = await signInSessionId(true);
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
  const id = await signInSessionId();
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

  // The sign-in token is only used here; a server's own token is what's kept
  session.pinId = undefined;
  try {
    const user = await getUser(token);
    if (setupState() === "claimed") {
      if (!isOwnerUuid(user.uuid)) {
        monitor.log("warn", `Owner sign-in refused for Plex account ${user.username} from ${await clientLabel()}`);
        return { ok: false, error: "This instance belongs to another Plex account." };
      }
      (await cookies()).set(
        OWNER_COOKIE,
        newOwnerCookie(user.uuid),
        await cookieOptions(OWNER_COOKIE_MAX_AGE_S)
      );
      monitor.log("info", `Owner signed in to /setup from ${await clientLabel()}`);
    }
    session.user = user;
    session.servers = await getOwnedServers(token);
    return { ok: true, value: viewOf(session) };
  } catch (err) {
    console.error("Could not read the Plex account:", err);
    return { ok: false, error: "Signed in, but couldn't read your Plex servers. Start again." };
  }
}

function parseAddress(address: string): string | null | undefined {
  const typed = address.trim();
  if (!typed) return null;
  return /^https?:\/\/[^\s]+$/i.test(typed) ? typed : undefined;
}

const BAD_ADDRESS = "Enter an address like http://192.168.1.10:32400.";

export async function connectServer(serverId: string, address: string): Promise<StepResult<null>> {
  const id = await signInSessionId();
  if (!id) return { ok: false, error: SESSION_EXPIRED };

  const claiming = setupState() === "unclaimed";
  if (!claiming && !(await isOwner())) return { ok: false, error: NOT_OWNER };

  const session = getSetupSession(id);
  const server = session.servers?.find((s) => s.id === serverId);
  if (!session.user || !server) return { ok: false, error: "Pick one of your servers." };

  const preferred: string[] = [];
  const typed = parseAddress(address);
  if (typed === undefined) return { ok: false, error: BAD_ADDRESS };
  if (typed) preferred.push(typed);
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
      // Claiming and connecting are saved together, so stopping halfway never
      // leaves an owner with no server, or a server with no owner
      owner: data.owner ?? { uuid: user.uuid, username: user.username, claimedAt: Date.now() },
      plex: { url, token: server.token, serverId: server.id, serverName: server.name },
    }));
  } catch (err) {
    console.error("Could not save the Plex connection:", err);
    return {
      ok: false,
      error: "Couldn't save the connection. Check that DATA_DIR is on a writable volume.",
    };
  }

  const jar = await cookies();
  if (claiming) {
    discardSetupCode();
    endSetupSessions();
    // Whoever claimed it is the owner; skip a second sign-in to manage it
    jar.set(OWNER_COOKIE, newOwnerCookie(user.uuid), await cookieOptions(OWNER_COOKIE_MAX_AGE_S));
    monitor.log("info", `Instance claimed by Plex account ${user.username}; connected to ${server.name}`);
  } else {
    // The servers listed came with tokens; don't keep them around
    session.servers = undefined;
    session.user = undefined;
    monitor.log("info", `Owner connected Plex server ${server.name}`);
  }
  jar.delete({ name: SETUP_COOKIE, path: "/setup" });
  sessionHub.reconfigure("plex");
  return { ok: true, value: null };
}

export async function changeAddress(address: string): Promise<StepResult<null>> {
  if (!(await isOwner())) return { ok: false, error: NOT_OWNER };

  const plex = readInstance().plex;
  if (!plex) return { ok: false, error: "Connect a server first." };
  const typed = parseAddress(address);
  if (!typed) return { ok: false, error: BAD_ADDRESS };

  const url = await findWorkingUri(
    { id: plex.serverId, name: plex.serverName, token: plex.token, uris: [] },
    [typed]
  );
  if (!url) return { ok: false, error: `${plex.serverName} didn't answer at that address.` };

  try {
    updateInstance((data) => (data.plex ? { ...data, plex: { ...data.plex, url } } : data));
  } catch (err) {
    console.error("Could not save the Plex address:", err);
    return { ok: false, error: "Couldn't save. Check that DATA_DIR is on a writable volume." };
  }
  monitor.log("info", "Owner changed the Plex server address");
  sessionHub.reconfigure("plex");
  return { ok: true, value: null };
}

export async function disconnect(): Promise<StepResult<null>> {
  if (!(await isOwner())) return { ok: false, error: NOT_OWNER };

  try {
    // The owner stays, so only they can connect a server again
    updateInstance((data) => {
      const next = { ...data };
      delete next.plex;
      return next;
    });
  } catch (err) {
    console.error("Could not remove the Plex connection:", err);
    return { ok: false, error: "Couldn't save. Check that DATA_DIR is on a writable volume." };
  }
  monitor.log("info", "Owner disconnected Plex");
  sessionHub.reconfigure("plex");
  return { ok: true, value: null };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: OWNER_COOKIE, path: "/setup" });
  jar.delete({ name: SETUP_COOKIE, path: "/setup" });
  redirect("/setup");
}

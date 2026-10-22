import type { OwnedServer, PlexUser } from "./plexTv";
import { SETUP_COOKIE_MAX_AGE_S } from "./setupAuth";

/**
 * A sign-in in progress, keyed by the setup cookie's session id. It stays on
 * the server, so the PIN to check and the token it yields can't be swapped or
 * read by the browser.
 */
export interface SetupSession {
  expiresAt: number;
  pinId?: number;
  user?: PlexUser;
  servers?: OwnedServer[];
}

/** What the setup page may show; no tokens or addresses. */
export type SetupView =
  | { step: "signIn" }
  | { step: "waiting" }
  | { step: "pickServer"; username: string; servers: { id: string; name: string }[] };

const globalForFlow = globalThis as typeof globalThis & {
  __setupSessions?: Map<string, SetupSession>;
};

function sessions(): Map<string, SetupSession> {
  return (globalForFlow.__setupSessions ??= new Map());
}

export function getSetupSession(id: string): SetupSession {
  const all = sessions();
  const now = Date.now();
  for (const [key, session] of all) {
    if (session.expiresAt <= now) all.delete(key);
  }
  let session = all.get(id);
  if (!session) {
    session = { expiresAt: now + SETUP_COOKIE_MAX_AGE_S * 1000 };
    all.set(id, session);
  }
  return session;
}

export function endSetupSessions(): void {
  sessions().clear();
}

export function viewOf(session: SetupSession): SetupView {
  if (session.user && session.servers) {
    return {
      step: "pickServer",
      username: session.user.username,
      servers: session.servers.map(({ id, name }) => ({ id, name })),
    };
  }
  return session.pinId ? { step: "waiting" } : { step: "signIn" };
}

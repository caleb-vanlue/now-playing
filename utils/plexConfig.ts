import { readInstance } from "./instanceStore";

export interface PlexConfig {
  url: string;
  token: string;
}

export type SetupState =
  // Waiting for the operator to claim it with the setup code
  | "unclaimed"
  | "claimed"
  // PLEX_TOKEN is set, so sign-in is off
  | "env";

export const PLEX_PRODUCT = "Now Playing";

function envToken(): string | null {
  return process.env.PLEX_TOKEN?.trim() || null;
}

/** The Plex server to use: the signed-in connection, else the legacy env vars. */
export function getPlexConfig(): PlexConfig | null {
  const { plex } = readInstance();
  if (plex) return { url: plex.url, token: plex.token };

  const url = process.env.PLEX_URL?.trim();
  const token = envToken();
  return url && token ? { url, token } : null;
}

export function setupState(): SetupState {
  if (readInstance().owner) return "claimed";
  return envToken() ? "env" : "unclaimed";
}

/** Headers for any Plex request. The token goes here, never in a URL, so it can't leak through logged or echoed URLs. */
export function plexHeaders(token?: string, accept = "application/json"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "X-Plex-Client-Identifier": readInstance().clientId,
    "X-Plex-Product": PLEX_PRODUCT,
  };
  if (token) headers["X-Plex-Token"] = token;
  return headers;
}

/** Plex answered 401: the token was revoked or expired, so retrying won't help. */
export class PlexAuthError extends Error {
  constructor() {
    super("Plex rejected the token (401)");
    this.name = "PlexAuthError";
  }
}

let warnedEnvToken = false;

export function warnIfEnvToken(): void {
  if (warnedEnvToken || !envToken()) return;
  warnedEnvToken = true;
  console.warn(
    "PLEX_TOKEN is deprecated: anyone who can read the environment can use it. " +
      "Remove it and sign in with Plex at /setup instead."
  );
}

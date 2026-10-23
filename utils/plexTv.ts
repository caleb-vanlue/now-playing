import { fetchWithTimeout } from "./plexApi";
import { plexHeaders, PLEX_PRODUCT } from "./plexConfig";

/**
 * plex.tv calls for signing in: Plex's PIN flow gives the instance a token of
 * its own, listed as "Now Playing" under the account's Authorized Devices.
 */

const PLEX_TV = "https://plex.tv/api/v2";
const PLEX_CLIENTS = "https://clients.plex.tv/api/v2";
// Each candidate address gets this long to answer
const CONNECTION_TEST_TIMEOUT_MS = 4_000;

export interface PlexPin {
  id: number;
  code: string;
}

export interface PlexUser {
  uuid: string;
  username: string;
}

interface ResourceConnection {
  uri: string;
  local: boolean;
  relay: boolean;
}

interface Resource {
  name: string;
  clientIdentifier: string;
  provides: string;
  owned: boolean;
  accessToken?: string;
  connections?: ResourceConnection[];
}

export interface OwnedServer {
  id: string;
  name: string;
  token: string;
  // Best first: local, then remote, then Plex's relay
  uris: string[];
}

async function plexTvJson<T>(
  url: string,
  init: Parameters<typeof fetchWithTimeout>[1] = {}
): Promise<T> {
  const res = await fetchWithTimeout(url, init);
  if (!res.ok) throw new Error(`plex.tv ${res.status}`);
  return res.json();
}

export async function createPin(): Promise<PlexPin> {
  const { id, code } = await plexTvJson<PlexPin>(`${PLEX_TV}/pins?strong=true`, {
    method: "POST",
    headers: plexHeaders(),
  });
  return { id, code };
}

/** Where the operator signs in; Plex sends them back to `forwardUrl` afterwards. */
export function plexAuthUrl(pin: PlexPin, clientId: string, forwardUrl: string): string {
  const params = new URLSearchParams({
    clientID: clientId,
    code: pin.code,
    "context[device][product]": PLEX_PRODUCT,
    forwardUrl,
  });
  // Plex's auth app reads its parameters from the fragment
  return `https://app.plex.tv/auth#?${params.toString()}`;
}

/** The token once the operator has signed in; null while waiting. Throws once the PIN expires. */
export async function checkPin(id: number): Promise<string | null> {
  const res = await fetchWithTimeout(`${PLEX_TV}/pins/${id}`, { headers: plexHeaders() });
  if (res.status === 404) throw new Error("expired");
  if (!res.ok) throw new Error(`plex.tv ${res.status}`);
  const pin: { authToken?: string | null; expiresIn?: number } = await res.json();
  if (pin.authToken) return pin.authToken;
  if (pin.expiresIn !== undefined && pin.expiresIn <= 0) throw new Error("expired");
  return null;
}

export async function getUser(token: string): Promise<PlexUser> {
  const { uuid, username } = await plexTvJson<PlexUser>(`${PLEX_TV}/user`, {
    headers: plexHeaders(token),
  });
  return { uuid, username };
}

function connectionRank(c: ResourceConnection): number {
  if (c.relay) return 2;
  return c.local ? 0 : 1;
}

/** Servers the account owns. History needs /accounts, which only the owner can read. */
export async function getOwnedServers(token: string): Promise<OwnedServer[]> {
  const resources = await plexTvJson<Resource[]>(
    `${PLEX_CLIENTS}/resources?includeHttps=1&includeRelay=1`,
    { headers: plexHeaders(token) }
  );
  return resources
    .filter((r) => r.owned && r.accessToken && r.provides.split(",").includes("server"))
    .map((r) => ({
      id: r.clientIdentifier,
      name: r.name,
      token: r.accessToken!,
      uris: [...(r.connections ?? [])]
        .sort((a, b) => connectionRank(a) - connectionRank(b))
        .map((c) => c.uri),
    }));
}

// Checks the address answers as this server, not just any Plex server
async function isServerAt(uri: string, server: OwnedServer): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${uri.replace(/\/+$/, "")}/identity`,
      { headers: plexHeaders(server.token) },
      CONNECTION_TEST_TIMEOUT_MS
    );
    if (!res.ok) {
      console.warn(`Plex address test: ${uri} answered ${res.status}`);
      return false;
    }
    const body: { MediaContainer?: { machineIdentifier?: string } } = await res.json();
    if (body.MediaContainer?.machineIdentifier === server.id) return true;
    console.warn(`Plex address test: ${uri} is a different Plex server`);
    return false;
  } catch (err) {
    // fetch hides the network error (refused, TLS, DNS) in `cause`
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    const code = (cause as { code?: string })?.code;
    const message = cause instanceof Error ? cause.message : String(cause);
    console.warn(`Plex address test: ${uri} failed: ${code ? `${code} ` : ""}${message}`);
    return false;
  }
}

/** The first address, in order of preference, where the instance can reach `server`. */
export async function findWorkingUri(server: OwnedServer, preferred: string[]): Promise<string | null> {
  const candidates = [...new Set([...preferred, ...server.uris])];
  const results = await Promise.all(candidates.map((uri) => isServerAt(uri, server)));
  const index = results.indexOf(true);
  return index === -1 ? null : candidates[index].replace(/\/+$/, "");
}

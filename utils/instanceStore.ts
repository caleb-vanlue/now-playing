import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Settings the instance keeps for itself, in a JSON file under DATA_DIR. It
 * holds the Plex token, so it lives on a volume (not in env vars, which a host
 * can leak) and is readable only by the server's user.
 */

export interface PlexConnection {
  url: string;
  token: string;
  // The server's machineIdentifier
  serverId: string;
  serverName: string;
}

export interface InstanceOwner {
  // Plex account uuid; the proof of ownership when signing back in
  uuid: string;
  username: string;
  claimedAt: number;
}

export interface InstanceData {
  version: 1;
  // Signs setup and owner cookies; replacing it signs everyone out
  secret: string;
  // X-Plex-Client-Identifier, so the instance is one device in Plex's
  // Authorized Devices however often it signs in
  clientId: string;
  owner?: InstanceOwner;
  plex?: PlexConnection;
}

const FILE_NAME = "instance.json";

export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR?.trim() || "data");
}

function filePath(): string {
  return path.join(dataDir(), FILE_NAME);
}

function fresh(): InstanceData {
  return { version: 1, secret: randomBytes(32).toString("hex"), clientId: randomUUID() };
}

function write(data: InstanceData): void {
  const target = filePath();
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  // Write then rename, so a crash mid-write can't leave a truncated file
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  renameSync(temp, target);
}

function load(): InstanceData {
  let data: InstanceData;
  try {
    data = JSON.parse(readFileSync(filePath(), "utf8"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // A corrupt file must not be silently replaced: it would unclaim the instance
      throw new Error(`Could not read ${filePath()}: ${(err as Error).message}`);
    }
    data = fresh();
    try {
      write(data);
    } catch (writeErr) {
      console.warn(
        `Could not create ${filePath()}; settings won't survive a restart until DATA_DIR is writable:`,
        (writeErr as Error).message
      );
    }
  }

  // Operator-only recovery: setting an env var takes access to the host
  if (process.env.RESET_OWNER?.trim() === "true" && (data.owner || data.plex)) {
    console.warn(
      "RESET_OWNER=true: removed the owner and the Plex connection. Remove RESET_OWNER, " +
        "then claim the instance again with the setup code below."
    );
    data = { ...fresh(), clientId: data.clientId };
    write(data);
  }
  return data;
}

// Shared across route bundles and dev reloads, like the hub and monitor
const globalForStore = globalThis as typeof globalThis & { __instanceStore?: InstanceData };

export function readInstance(): InstanceData {
  return (globalForStore.__instanceStore ??= load());
}

/** Applies `change` and saves. Throws if the file can't be written. */
export function updateInstance(change: (data: InstanceData) => InstanceData): InstanceData {
  const next = change(readInstance());
  write(next);
  globalForStore.__instanceStore = next;
  return next;
}

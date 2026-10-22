import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readInstance } from "./instanceStore";
import { setupState } from "./plexConfig";

/**
 * The gate in front of claiming a fresh instance. The setup code is printed
 * only to the server logs, so whoever can read them (the operator) can claim
 * the instance and a visitor who finds the URL first can't. It lives in memory
 * and changes on every restart.
 */

// Holds a Plex sign-in in progress: for claiming (only after the setup code)
// or for the owner signing back in
export const SETUP_COOKIE = "np_setup";
export const SETUP_COOKIE_MAX_AGE_S = 15 * 60;
// Proves the owner signed in with the claiming Plex account
export const OWNER_COOKIE = "np_owner";
export const OWNER_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

// Retiring the code after this many misses keeps guessing hopeless: each new
// code is 60 random bits that only the logs show
const MAX_FAILED_ATTEMPTS = 10;
// Reprints on /setup visits, so the code is still findable after logs scroll
const REPRINT_MIN_GAP_MS = 60_000;

// Crockford base32: no I, L, O or U to misread
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

interface SetupCodeState {
  code: string;
  failures: number;
  printedAt: number;
}

const globalForSetup = globalThis as typeof globalThis & { __setupCode?: SetupCodeState };

function generateCode(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b & 31]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

function print(state: SetupCodeState): void {
  state.printedAt = Date.now();
  const lines = [
    "Now Playing setup code",
    "",
    state.code,
    "",
    "Open /setup and enter it to connect your server.",
  ];
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  console.log(
    [
      "",
      `┌${"─".repeat(width)}┐`,
      ...lines.map((l) => `│  ${l.padEnd(width - 2)}│`),
      `└${"─".repeat(width)}┘`,
      "",
    ].join("\n")
  );
}

function current(): SetupCodeState {
  return (globalForSetup.__setupCode ??= { code: generateCode(), failures: 0, printedAt: 0 });
}

function retire(): void {
  globalForSetup.__setupCode = { code: generateCode(), failures: 0, printedAt: 0 };
}

/** Prints the code while the instance is unclaimed; at most once a minute unless `force`. */
export function announceSetupCode(force = false): void {
  if (setupState() !== "unclaimed") return;
  const state = current();
  if (force || Date.now() - state.printedAt >= REPRINT_MIN_GAP_MS) print(state);
}

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type CodeCheck = "ok" | "wrong" | "retired";

export function checkSetupCode(input: string): CodeCheck {
  const state = current();
  if (safeEqual(normalize(input), normalize(state.code))) return "ok";
  if (++state.failures < MAX_FAILED_ATTEMPTS) return "wrong";

  retire();
  console.warn(`${MAX_FAILED_ATTEMPTS} wrong setup codes: that code no longer works. New one:`);
  announceSetupCode(true);
  return "retired";
}

/** Called once the instance is claimed, so the code can't be used again. */
export function discardSetupCode(): void {
  globalForSetup.__setupCode = undefined;
}

// ── Setup cookie ─────────────────────────────────────────────────────────────
// "<session id>.<expiry>.<signature>": the id keys the in-progress sign-in, the
// expiry bounds it, and the signature uses the instance secret

function sign(payload: string): string {
  return createHmac("sha256", readInstance().secret).update(`setup:${payload}`).digest("hex");
}

export function newSetupCookie(): { id: string; value: string } {
  const id = randomBytes(16).toString("hex");
  const payload = `${id}.${Date.now() + SETUP_COOKIE_MAX_AGE_S * 1000}`;
  return { id, value: `${payload}.${sign(payload)}` };
}

/** The setup session id, if the cookie is genuine and unexpired. */
export function readSetupCookie(value: string | undefined): string | null {
  const [id, expiry, signature] = value?.split(".") ?? [];
  if (!id || !expiry || !signature) return null;
  if (!safeEqual(signature, sign(`${id}.${expiry}`))) return null;
  return Number(expiry) > Date.now() ? id : null;
}

// ── Owner cookie ─────────────────────────────────────────────────────────────
// "<expiry>.<signature>", signed over the owner's Plex uuid, so it stops
// working if the instance is reset or claimed by someone else

function signOwner(uuid: string, expiry: string): string {
  return createHmac("sha256", readInstance().secret).update(`owner:${uuid}:${expiry}`).digest("hex");
}

export function newOwnerCookie(uuid: string): string {
  const expiry = String(Date.now() + OWNER_COOKIE_MAX_AGE_S * 1000);
  return `${expiry}.${signOwner(uuid, expiry)}`;
}

export function isOwnerCookie(value: string | undefined): boolean {
  const owner = readInstance().owner;
  const [expiry, signature] = value?.split(".") ?? [];
  if (!owner || !expiry || !signature) return false;
  return safeEqual(signature, signOwner(owner.uuid, expiry)) && Number(expiry) > Date.now();
}

export function isOwnerUuid(uuid: string): boolean {
  const owner = readInstance().owner;
  return !!owner && safeEqual(uuid, owner.uuid);
}

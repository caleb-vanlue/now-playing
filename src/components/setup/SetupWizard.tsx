"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { connectServer, pollSignIn, startSignIn } from "../../app/setup/actions";
import type { SetupView } from "../../../utils/setupFlow";
import { SETUP_BUTTON, SETUP_INPUT } from "./SetupNotice";

// plex.tv is asked about the PIN this often while the operator signs in
const PIN_POLL_MS = 2_000;

/**
 * claim: a new instance, after the setup code. ownerSignIn: proving ownership
 * of a claimed one. owner: reconnecting or switching server once signed in.
 */
export type WizardMode = "claim" | "ownerSignIn" | "owner";

const COPY: Record<WizardMode, { title?: string; body: string; button: string }> = {
  claim: {
    title: "Connect Plex",
    body: "Sign in with the Plex account that owns your server. This instance gets its own token, listed as “Now Playing” under Authorized Devices on plex.tv.",
    button: "Sign in with Plex",
  },
  ownerSignIn: {
    title: "Sign in as the owner",
    body: "This instance is already set up. Sign in with the Plex account that claimed it to manage the connection.",
    button: "Sign in with Plex",
  },
  owner: {
    body: "Signs in with Plex again to get a new token, e.g. after removing the device on plex.tv, and lets you pick a server.",
    button: "Reconnect or switch server",
  },
};

export default function SetupWizard({
  initial,
  mode,
  currentServerId,
}: {
  initial: SetupView;
  mode: WizardMode;
  currentServerId?: string;
}) {
  const [view, setView] = useState<SetupView>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Back from Plex's sign-in page: wait for plex.tv to hand over the token
  useEffect(() => {
    if (view.step !== "waiting") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const result = await pollSignIn();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setView({ step: "signIn" });
      } else if (result.value.step === "waiting") {
        timer = setTimeout(check, PIN_POLL_MS);
      } else if (mode === "ownerSignIn") {
        // Now signed in as the owner; the page renders the owner view
        router.refresh();
      } else {
        setView(result.value);
      }
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view.step, mode, router]);

  const signIn = () =>
    startTransition(async () => {
      setError(null);
      const result = await startSignIn();
      if (result.ok) window.location.assign(result.value);
      else setError(result.error);
    });

  const copy = COPY[mode];
  return (
    <div className="space-y-4">
      {view.step === "pickServer" ? (
        <ServerPicker
          view={view}
          currentServerId={currentServerId}
          onError={setError}
          onConnected={() => (mode === "claim" ? router.push("/") : router.refresh())}
        />
      ) : (
        <>
          <div className="space-y-1">
            {copy.title && <h1 className="text-lg font-semibold">{copy.title}</h1>}
            <p className="text-sm text-gray-400">{copy.body}</p>
          </div>
          {view.step === "waiting" ? (
            <p className="text-sm text-gray-300">Waiting for Plex to confirm your sign-in…</p>
          ) : (
            <button type="button" onClick={signIn} disabled={pending} className={SETUP_BUTTON}>
              {pending ? "Opening Plex…" : copy.button}
            </button>
          )}
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ServerPicker({
  view,
  currentServerId,
  onError,
  onConnected,
}: {
  view: Extract<SetupView, { step: "pickServer" }>;
  currentServerId?: string;
  onError: (error: string | null) => void;
  onConnected: () => void;
}) {
  const [serverId, setServerId] = useState(
    view.servers.find((s) => s.id === currentServerId)?.id ?? view.servers[0]?.id ?? ""
  );
  const [address, setAddress] = useState("");
  const [pending, startTransition] = useTransition();

  if (view.servers.length === 0) {
    return (
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">No servers to connect</h1>
        <p className="text-sm text-gray-400">
          {view.username} doesn&apos;t own a Plex server. Now Playing needs the owner&apos;s account,
          because only the owner can read watch history. Reload and sign in with that account.
        </p>
      </div>
    );
  }

  const connect = () =>
    startTransition(async () => {
      onError(null);
      const result = await connectServer(serverId, address);
      if (result.ok) onConnected();
      else onError(result.error);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        connect();
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Choose a server</h2>
        <p className="text-sm text-gray-400">Signed in as {view.username}.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="sr-only">Server</legend>
        {view.servers.map((server) => (
          <label
            key={server.id}
            className="flex items-center gap-3 rounded-lg bg-[var(--background)] px-3 py-2 text-sm ring-1 ring-white/10 has-[:checked]:ring-[var(--accent)]"
          >
            <input
              type="radio"
              name="server"
              value={server.id}
              checked={serverId === server.id}
              onChange={() => setServerId(server.id)}
            />
            {server.name}
            {server.id === currentServerId && <span className="text-xs text-gray-500">current</span>}
          </label>
        ))}
      </fieldset>
      <div className="space-y-1">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          inputMode="url"
          spellCheck={false}
          aria-label="Server address (optional)"
          placeholder="Server address (optional)"
          className={SETUP_INPUT}
        />
        <p className="text-xs text-gray-500">
          Leave blank to use the addresses Plex lists. Fill it in if this instance reaches Plex
          another way, e.g. http://host.docker.internal:32400.
        </p>
      </div>
      <button type="submit" disabled={pending || !serverId} className={SETUP_BUTTON}>
        {pending ? "Testing the connection…" : "Connect"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { connectServer, pollSignIn, startSignIn } from "../../app/setup/actions";
import type { SetupView } from "../../../utils/setupFlow";
import { SETUP_BUTTON, SETUP_CARD, SETUP_INPUT } from "./SetupNotice";

// plex.tv is asked about the PIN this often while the operator signs in
const PIN_POLL_MS = 2_000;

export default function SetupWizard({ initial }: { initial: SetupView }) {
  const [view, setView] = useState<SetupView>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      } else {
        setView(result.value);
      }
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view.step]);

  const signIn = () =>
    startTransition(async () => {
      setError(null);
      const result = await startSignIn();
      if (result.ok) window.location.assign(result.value);
      else setError(result.error);
    });

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className={SETUP_CARD}>
        {view.step === "pickServer" ? (
          <ServerPicker view={view} onError={setError} />
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">Connect Plex</h1>
              <p className="text-sm text-gray-400">
                Sign in with the Plex account that owns your server. This instance gets its own
                token, listed as &ldquo;Now Playing&rdquo; under Authorized Devices on plex.tv.
              </p>
            </div>
            {view.step === "waiting" ? (
              <p className="text-sm text-gray-300">Waiting for Plex to confirm your sign-in…</p>
            ) : (
              <button type="button" onClick={signIn} disabled={pending} className={SETUP_BUTTON}>
                {pending ? "Opening Plex…" : "Sign in with Plex"}
              </button>
            )}
          </>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}

function ServerPicker({
  view,
  onError,
}: {
  view: Extract<SetupView, { step: "pickServer" }>;
  onError: (error: string | null) => void;
}) {
  const [serverId, setServerId] = useState(view.servers[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      if (result.ok) router.push("/");
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
        <h1 className="text-lg font-semibold">Choose a server</h1>
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

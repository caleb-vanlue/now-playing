"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeAddress, disconnect, signOut } from "../../app/setup/actions";
import type { SetupView } from "../../../utils/setupFlow";
import { SETUP_BUTTON, SETUP_INPUT } from "./SetupNotice";
import SetupWizard from "./SetupWizard";

export interface OwnerConnection {
  serverId: string;
  serverName: string;
  url: string;
}

const SECONDARY_BUTTON =
  "rounded-lg px-3 py-2 text-sm ring-1 ring-white/10 hover:ring-white/30 disabled:opacity-60";

export default function OwnerPanel({
  username,
  connection,
  health,
  view,
}: {
  username: string;
  connection: OwnerConnection | null;
  // From the session hub; null while nobody has the dashboard open
  health: string | null;
  view: SetupView;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setNotice(done);
      setConfirming(false);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Instance settings</h1>
          <p className="text-sm text-gray-400">Signed in as {username}, the owner.</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-gray-400 hover:text-white">
            Sign out
          </button>
        </form>
      </div>

      <section className="space-y-1" aria-labelledby="connection-heading">
        <h2 id="connection-heading" className="text-sm font-medium text-gray-300">
          Plex
        </h2>
        {connection ? (
          <p className="text-sm text-gray-400">
            {connection.serverName}
            {health && <> · {health}</>}
          </p>
        ) : (
          <p className="text-sm text-gray-400">Not connected. The dashboard shows no Plex sessions.</p>
        )}
      </section>

      <SetupWizard
        // A fresh sign-in, or a saved choice, starts the flow over
        key={view.step}
        mode="owner"
        initial={view}
        currentServerId={connection?.serverId}
      />

      {connection && (
        <>
          <AddressForm
            // Picks up an address changed by reconnecting
            key={connection.url}
            current={connection.url}
            pending={pending}
            onSave={(address) => run(() => changeAddress(address), "Address saved.")}
          />

          <section className="space-y-2" aria-labelledby="disconnect-heading">
            <h2 id="disconnect-heading" className="text-sm font-medium text-gray-300">
              Disconnect
            </h2>
            <p className="text-xs text-gray-500">
              Removes the saved token from this instance. You stay the owner, so only you can
              connect a server again. Also remove &ldquo;Now Playing&rdquo; under{" "}
              <a
                href="https://app.plex.tv/desktop/#!/settings/devices/all"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Authorized Devices
              </a>{" "}
              on plex.tv so the token stops working everywhere.
            </p>
            {confirming ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(disconnect, "Plex disconnected.")}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Disconnect Plex
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={SECONDARY_BUTTON}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={SECONDARY_BUTTON}>
                Disconnect…
              </button>
            )}
          </section>
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
    </div>
  );
}

function AddressForm({
  current,
  pending,
  onSave,
}: {
  current: string;
  pending: boolean;
  onSave: (address: string) => void;
}) {
  const [address, setAddress] = useState(current);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(address);
      }}
    >
      <label htmlFor="plex-address" className="text-sm font-medium text-gray-300">
        Server address
      </label>
      <input
        id="plex-address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        inputMode="url"
        spellCheck={false}
        className={SETUP_INPUT}
      />
      <button
        type="submit"
        disabled={pending || address.trim() === current}
        className={SETUP_BUTTON}
      >
        {pending ? "Testing…" : "Test and save address"}
      </button>
    </form>
  );
}

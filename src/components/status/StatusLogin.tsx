"use client";

import { useActionState } from "react";
import { login, LoginState } from "../../app/status/actions";

export default function StatusLogin() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-xl bg-[var(--card-background)] p-6 shadow-lg space-y-4"
      >
        <div>
          <h1 className="text-lg font-semibold">Instance status</h1>
          <p className="text-sm text-gray-400">Enter the status key to continue.</p>
        </div>
        <input
          name="key"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-label="Status key"
          placeholder="Status key"
          className="w-full rounded-lg bg-[var(--background)] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--accent)]"
        />
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}

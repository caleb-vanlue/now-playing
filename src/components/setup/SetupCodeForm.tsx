"use client";

import { useActionState } from "react";
import { submitCode, CodeState } from "../../app/setup/actions";
import { SETUP_BUTTON, SETUP_CARD, SETUP_INPUT } from "./SetupNotice";

export default function SetupCodeForm() {
  const [state, action, pending] = useActionState<CodeState, FormData>(submitCode, {});

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <form action={action} className={SETUP_CARD}>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Set up Now Playing</h1>
          <p className="text-sm text-gray-400">
            Enter the setup code from this instance&apos;s server logs. Only someone who runs the
            instance can see it.
          </p>
        </div>
        <input
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          required
          aria-label="Setup code"
          placeholder="XXXX-XXXX-XXXX"
          className={`${SETUP_INPUT} font-mono tracking-wider`}
        />
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button type="submit" disabled={pending} className={SETUP_BUTTON}>
          {pending ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

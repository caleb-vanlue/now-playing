import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import OwnerPanel from "../../components/setup/OwnerPanel";
import SetupCodeForm from "../../components/setup/SetupCodeForm";
import SetupNotice, { SetupCard } from "../../components/setup/SetupNotice";
import SetupWizard from "../../components/setup/SetupWizard";
import { readInstance } from "../../../utils/instanceStore";
import { setupState } from "../../../utils/plexConfig";
import {
  announceSetupCode,
  isOwnerCookie,
  OWNER_COOKIE,
  readSetupCookie,
  SETUP_COOKIE,
} from "../../../utils/setupAuth";
import { getSetupSession, SetupView, viewOf } from "../../../utils/setupFlow";
import { sessionHub } from "../../../utils/sessionHub";

export const metadata: Metadata = {
  title: "Setup · Now Playing",
  robots: { index: false, follow: false },
};

const HEALTH_LABELS = {
  live: "Live",
  polling: "Connected",
  connecting: "Connecting",
  error: "Unreachable",
  unauthorized: "Signed out: reconnect below",
} as const;

export default async function SetupPage() {
  // Claim state lives on disk and in memory, so never prerender
  await connection();

  const state = setupState();
  if (state === "env") {
    return (
      <SetupNotice title="Configured with environment variables">
        Plex is connected through <code>PLEX_TOKEN</code>. To sign in with Plex instead, remove{" "}
        <code>PLEX_TOKEN</code> from the environment and restart.
      </SetupNotice>
    );
  }

  const jar = await cookies();
  const sessionId = readSetupCookie(jar.get(SETUP_COOKIE)?.value);
  const view: SetupView = sessionId ? viewOf(getSetupSession(sessionId)) : { step: "signIn" };

  if (state === "unclaimed") {
    if (!sessionId) {
      announceSetupCode();
      return <SetupCodeForm />;
    }
    return (
      <SetupCard>
        <SetupWizard mode="claim" initial={view} />
      </SetupCard>
    );
  }

  if (!isOwnerCookie(jar.get(OWNER_COOKIE)?.value)) {
    return (
      <SetupCard>
        {/* Servers are only listed once the sign-in proves ownership */}
        <SetupWizard mode="ownerSignIn" initial={view.step === "waiting" ? view : { step: "signIn" }} />
      </SetupCard>
    );
  }

  const { owner, plex } = readInstance();
  const mode = sessionHub.getStatus().sources.find((s) => s.source === "plex")?.mode;
  return (
    <SetupCard>
      <OwnerPanel
        username={owner!.username}
        connection={
          plex ? { serverId: plex.serverId, serverName: plex.serverName, url: plex.url } : null
        }
        health={mode ? HEALTH_LABELS[mode] : null}
        view={view}
      />
    </SetupCard>
  );
}

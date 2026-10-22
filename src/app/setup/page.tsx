import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import SetupCodeForm from "../../components/setup/SetupCodeForm";
import SetupNotice from "../../components/setup/SetupNotice";
import SetupWizard from "../../components/setup/SetupWizard";
import { setupState } from "../../../utils/plexConfig";
import { announceSetupCode, readSetupCookie, SETUP_COOKIE } from "../../../utils/setupAuth";
import { getSetupSession, viewOf } from "../../../utils/setupFlow";

export const metadata: Metadata = {
  title: "Setup · Now Playing",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  // Claim state lives on disk and in memory, so never prerender
  await connection();

  const state = setupState();
  if (state === "claimed") {
    return (
      <SetupNotice title="Already set up">
        This instance is connected and has an owner.
      </SetupNotice>
    );
  }
  if (state === "env") {
    return (
      <SetupNotice title="Configured with environment variables">
        Plex is connected through <code>PLEX_TOKEN</code>. To sign in with Plex instead, remove{" "}
        <code>PLEX_TOKEN</code> from the environment and restart.
      </SetupNotice>
    );
  }

  const sessionId = readSetupCookie((await cookies()).get(SETUP_COOKIE)?.value);
  if (!sessionId) {
    announceSetupCode();
    return <SetupCodeForm />;
  }
  return <SetupWizard initial={viewOf(getSetupSession(sessionId))} />;
}

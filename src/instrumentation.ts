export async function register() {
  // Reads the data directory and prints to the server log, so Node only
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { readInstance } = await import("../utils/instanceStore");
  const { warnIfEnvToken } = await import("../utils/plexConfig");
  const { announceSetupCode } = await import("../utils/setupAuth");

  // Loading the store at boot applies RESET_OWNER and surfaces an unreadable file early
  readInstance();
  warnIfEnvToken();
  announceSetupCode(true);
}

import Link from "next/link";
import type { BaseMedia, ServiceHealth, SetupState } from "../../types/media";

const SOURCE_LABELS: Record<BaseMedia["source"], string> = { plex: "Plex", jellyfin: "Jellyfin" };

/** Shown in place of the tabs while no media server is connected. */
export function NotConnected({ setup }: { setup: SetupState }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-sm text-center space-y-3" role="status">
        <div className="text-4xl" aria-hidden="true">
          🔌
        </div>
        <h2 className="text-xl font-semibold">No media server connected</h2>
        <p className="text-gray-400">This dashboard isn&apos;t connected to a media server yet.</p>
        {setup === "unclaimed" ? (
          <p className="text-sm text-gray-500">
            Running this instance? Open{" "}
            <Link href="/setup" className="text-[var(--accent)] hover:underline">
              /setup
            </Link>{" "}
            and enter the setup code from the server logs.
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            The owner can reconnect it from{" "}
            <Link href="/setup" className="text-[var(--accent)] hover:underline">
              /setup
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

/** One line per configured server that isn't working; healthy ones still show their sessions. */
export function SourceProblems({ sources }: { sources: ServiceHealth }) {
  const problems = (Object.keys(sources) as BaseMedia["source"][]).filter(
    (source) => sources[source] !== "connected"
  );
  if (problems.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-3 space-y-2" role="status" aria-live="polite">
      {problems.map((source) => {
        const label = SOURCE_LABELS[source];
        const signedOut = sources[source] === "unauthorized";
        return (
          <div
            key={source}
            className={`rounded-lg px-4 py-2 text-sm ring-1 ${
              signedOut
                ? "bg-red-950/60 text-red-200 ring-red-500/30"
                : "bg-amber-950/60 text-amber-200 ring-amber-500/30"
            }`}
          >
            {signedOut ? (
              <>
                {label} is signed out. The owner can reconnect it from{" "}
                <Link href="/setup" className="underline">
                  /setup
                </Link>
                .
              </>
            ) : (
              `Can't reach ${label} right now. Retrying automatically.`
            )}
          </div>
        );
      })}
    </div>
  );
}
